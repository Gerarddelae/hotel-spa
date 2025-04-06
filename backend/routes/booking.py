from zoneinfo import ZoneInfo
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Booking, Room, Archivo, Client, Income
from datetime import datetime, timedelta, timezone
from ..utils.helpers import remove_sensitive_fields

booking_bp = Blueprint('booking', __name__)

@booking_bp.route("/api/bookings", methods=["GET"])
@jwt_required()
def get_all_bookings():
    bookings = Booking.query.order_by(Booking.id).all()
    
    resultado = []
    for booking in bookings:
        booking_dict = {
            "id": booking.id,
            "cliente_id": booking.cliente_id,  # Agregar este campo
            "habitacion_id": booking.habitacion_id,  # Agregar este campo
            "nombre_cliente": booking.cliente.nombre if booking.cliente else "No asignado",
            "num_habitacion": booking.habitacion.num_habitacion if booking.habitacion else "No asignado",
            "tipo_habitacion": booking.habitacion.tipo if booking.habitacion else "No asignado",
           "check_in": booking.check_in.isoformat(),  # Cambia a isoformat()
            "check_out": booking.check_out.isoformat(),  # Cambia a isoformat()
            "num_huespedes": booking.num_huespedes,
            "metodo_pago": booking.metodo_pago,
            "estado": booking.estado,
            "notas": booking.notas,
            "valor_reservacion": booking.valor_reservacion
        }
        resultado.append(booking_dict)

    return jsonify(resultado)



@booking_bp.route("/api/bookings/<int:item_id>", methods=["GET"])
@jwt_required()
def get_booking(item_id):
    item = Booking.query.get(item_id)
    if not item:
        return jsonify({"error": "Reserva no encontrada"}), 404
    
    item_dict = {column.name: getattr(item, column.name) for column in item.__table__.columns}
    return jsonify(item_dict)

@booking_bp.route("/api/bookings", methods=["POST"])
@jwt_required()
def create_booking():
    data = request.get_json()
    
    try:
        # Verificación de campos obligatorios
        required_fields = [
            "cliente_id", "habitacion_id", "check_in", "check_out",
            "tipo_habitacion", "num_huespedes", "metodo_pago", "estado", "valor_reservacion"
        ]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({"error": f"Faltan campos obligatorios: {', '.join(missing_fields)}"}), 400
            
        # Validación de habitación
        room = Room.query.get(data["habitacion_id"])
        if not room:
            return jsonify({"error": "Habitación no encontrada"}), 404
        if room.disponibilidad != "Disponible":
            return jsonify({"error": "Habitación no disponible"}), 400

        # Conversión de fechas
        try:
            data["check_in"] = datetime.strptime(data["check_in"], "%Y-%m-%dT%H:%M:%S")
            data["check_out"] = datetime.strptime(data["check_out"], "%Y-%m-%dT%H:%M:%S")
            if data["check_out"] <= data["check_in"]:
                return jsonify({"error": "check_out debe ser posterior a check_in"}), 400
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DDTHH:MM:SS"}), 400

        # Creación de la reserva
        new_booking = Booking(**data)
        room.disponibilidad = "Ocupada"
        
        db.session.add(new_booking)
        db.session.flush()  # Para obtener el ID de la reserva

        # Creación automática de Income si está confirmada
        if new_booking.estado == "confirmada":
            client = Client.query.get(new_booking.cliente_id)
            if not client:
                return jsonify({"error": "Cliente no encontrado"}), 404
            
            income = Income(
                booking_id=new_booking.id,
                cliente_id=client.id,
                nombre_cliente=client.nombre,
                documento=client.documento,  # Usando el campo 'documento' del modelo Income
                monto=new_booking.valor_reservacion,
                metodo_pago=new_booking.metodo_pago,
                estado_pago="confirmado",
                fecha_pago=datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None),
                notas=f"Pago por reserva #{new_booking.id}"
            )
            db.session.add(income)

        db.session.commit()
        return jsonify({
            "message": "Reserva creada exitosamente",
            "id": new_booking.id,
            "income_created": new_booking.estado == "confirmada"  # Indica si se creó el income
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@booking_bp.route("/api/bookings/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_booking(item_id):
    data = request.get_json()
    booking = Booking.query.get(item_id)
    
    if not booking:
        return jsonify({"error": "Reserva no encontrada"}), 404
    
    try:
        # Guardar valores originales para comparación
        original_room_id = booking.habitacion_id
        original_status = booking.estado
        
        # Convertir fechas si están presentes
        if "check_in" in data:
            data["check_in"] = datetime.strptime(data["check_in"], "%Y-%m-%dT%H:%M:%S")
        if "check_out" in data:
            data["check_out"] = datetime.strptime(data["check_out"], "%Y-%m-%dT%H:%M:%S")
            
        # Aplicar cambios a la reserva
        for key, value in data.items():
            setattr(booking, key, value)
        
        # Verificar si se cambió la habitación
        new_room_id = booking.habitacion_id
        if original_room_id != new_room_id:
            old_room = Room.query.get(original_room_id)
            new_room = Room.query.get(new_room_id)
            
            if old_room:
                old_room.disponibilidad = "Disponible"
            if new_room:
                new_room.disponibilidad = "Ocupada"
        
        # Crear Income si el estado cambió a "confirmada"
        if booking.estado == "confirmada" and original_status != "confirmada":
            client = Client.query.get(booking.cliente_id)
            if not client:
                return jsonify({"error": "Cliente no encontrado"}), 404
            
            # Verificar si ya existe un Income para esta reserva
            existing_income = Income.query.filter_by(booking_id=booking.id).first()
            if not existing_income:
                income = Income(
                    booking_id=booking.id,
                    cliente_id=client.id,
                    nombre_cliente=client.nombre,
                    documento=client.documento,
                    monto=booking.valor_reservacion,
                    metodo_pago=booking.metodo_pago,
                    estado_pago="confirmado",
                    notas=f"Pago por reserva #{booking.id} (actualizada)"
                )
                db.session.add(income)
        
        db.session.commit()
        
        # Preparar respuesta
        response_data = {
            "id": booking.id,
            "cliente_id": booking.cliente_id,
            "habitacion_id": booking.habitacion_id,
            "check_in": booking.check_in.strftime("%Y-%m-%dT%H:%M:%S"),
            "check_out": booking.check_out.strftime("%Y-%m-%dT%H:%M:%S"),
            "tipo_habitacion": booking.tipo_habitacion,
            "num_huespedes": booking.num_huespedes,
            "metodo_pago": booking.metodo_pago,
            "estado": booking.estado,
            "notas": booking.notas,
            "valor_reservacion": booking.valor_reservacion,
            "income_created": booking.estado == "confirmada" and original_status != "confirmada"
        }
        
        return jsonify(response_data), 200
    
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DDTHH:MM:SS"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500
    
@booking_bp.route("/api/bookings/<int:booking_id>", methods=["DELETE"])
@jwt_required()
def delete_booking(booking_id):
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({"error": "Reserva no encontrada"}), 404

        # Determinar estado para el archivo
        if booking.estado == "vencida":
            estado_archivo = "vencida"
        elif booking.estado == "pendiente":
            estado_archivo = "cancelada"
        elif booking.estado == "confirmada":
            estado_archivo = "completada"
        else:
            estado_archivo = booking.estado

        # Crear registro archivado
        archivo = Archivo(
            booking_id=booking.id,
            cliente_id=booking.cliente_id,
            habitacion_id=booking.habitacion_id,
            check_in=booking.check_in,
            check_out=booking.check_out,
            tipo_habitacion=booking.tipo_habitacion,
            num_huespedes=booking.num_huespedes,
            metodo_pago=booking.metodo_pago,
            notas=booking.notas or "",
            valor_reservacion=booking.valor_reservacion or 0.0,
            estado=estado_archivo,
            fecha_archivo=datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None)
        )

        db.session.add(archivo)
        db.session.flush()  # Asegurar que tenemos el ID del archivo

        # Manejo seguro del Income
        income_updated = False
        if booking.estado == "confirmada":
            income = Income.query.filter_by(booking_id=booking.id).first()
            if income:
                # Crear nuevo registro de Income para el archivo
                new_income = Income(
                    archive_id=archivo.id,
                    cliente_id=income.cliente_id,
                    nombre_cliente=income.nombre_cliente,
                    documento=income.documento,
                    fecha_pago=income.fecha_pago,
                    monto=income.monto,
                    metodo_pago=income.metodo_pago,
                    estado_pago="completado",
                    notas=f"Reserva archivada como {estado_archivo} (original: {income.id})"
                )
                db.session.add(new_income)
                
                # Eliminar el registro antiguo
                db.session.delete(income)
                income_updated = True

        # Liberar habitación
        room = Room.query.get(booking.habitacion_id)
        if room:
            room.disponibilidad = "Disponible"
            db.session.add(room)

        db.session.delete(booking)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Reserva archivada y eliminada",
            "archived_id": archivo.id,
            "archived_status": estado_archivo,
            "income_updated": income_updated,
            "new_income_id": new_income.id if income_updated else None
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "delete_failed",
            "message": f"Error interno al procesar la eliminación: {str(e)}",
            "type": e.__class__.__name__
        }), 500

# Ruta para obtener reservas próximas a vencer
@booking_bp.route("/api/bookings/alertas", methods=["GET"])
@jwt_required()
def alertas_reservas():
    try:
        ahora = datetime.now()
        umbral = ahora + timedelta(minutes=10)
        reservas = Booking.query.filter(
            Booking.check_out <= umbral,
            Booking.check_out > ahora
        ).all()
        return jsonify({
            "alertas": [{
                "id": r.id,
                "cliente": r.cliente.nombre,
                "habitacion": r.habitacion.num_habitacion,
                "vencimiento": r.check_out.isoformat()
            } for r in reservas]
        })
    except Exception as e:
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

# Ruta para obtener reservas vencidas
@booking_bp.route("/api/bookings/vencidas", methods=["GET"])
@jwt_required()
def reservas_vencidas():
    try:
        ahora = datetime.now()
        reservas = Booking.query.filter(Booking.check_out <= ahora).all()
        return jsonify({
            "vencidas": [{
                "id": r.id,
                "cliente": r.cliente.nombre,
                "habitacion": r.habitacion.num_habitacion,
                "vencimiento": r.check_out.isoformat()
            } for r in reservas]
        })
    except Exception as e:
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500
