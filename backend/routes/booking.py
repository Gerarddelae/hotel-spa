from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Booking, Room, Archivo
from datetime import datetime, timedelta
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
        # Verificar que todos los campos obligatorios existen
        required_fields = [
            "cliente_id", "habitacion_id", "check_in", "check_out",
            "tipo_habitacion", "num_huespedes", "metodo_pago", "estado", "valor_reservacion"
        ]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({"error": f"Faltan los siguientes campos obligatorios: {', '.join(missing_fields)}"}), 400
            
        # Verificar si la habitación existe y está disponible
        room = Room.query.get(data["habitacion_id"])
        if not room:
            return jsonify({"error": "La habitación no existe"}), 404
        if room.disponibilidad == "Ocupada":
            return jsonify({"error": "La habitación no está disponible"}), 400

        # Convertir fechas de string a datetime
        try:
            check_in = datetime.strptime(data["check_in"], "%Y-%m-%dT%H:%M:%S")
            check_out = datetime.strptime(data["check_out"], "%Y-%m-%dT%H:%M:%S")
            
            # Validar que check-out sea posterior a check-in
            if check_out <= check_in:
                return jsonify({
                    "error": "La fecha de check-out debe ser posterior a la fecha de check-in"
                }), 400
                
            # Actualizar datos con fechas convertidas
            data["check_in"] = check_in
            data["check_out"] = check_out
            
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DDTHH:MM:SS"}), 400
            
        new_item = Booking(**data)
        # Cambiar disponibilidad de la habitación a Ocupada
        room.disponibilidad = "Ocupada"
        
        db.session.add(new_item)
        db.session.commit()
        return jsonify({"message": "Reserva creada exitosamente"}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@booking_bp.route("/api/bookings/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_booking(item_id):
    data = request.get_json()
    item = Booking.query.get(item_id)
    
    if not item:
        return jsonify({"error": "Reserva no encontrada"}), 404
    
    try:
        # Convertir fechas si están presentes
        if "check_in" in data:
            data["check_in"] = datetime.strptime(data["check_in"], "%Y-%m-%dT%H:%M:%S")
        if "check_out" in data:
            data["check_out"] = datetime.strptime(data["check_out"], "%Y-%m-%dT%H:%M:%S")
            
        for key, value in data.items():
            setattr(item, key, value)
        
        db.session.commit()
        
        # Preparar la respuesta con las fechas en el formato correcto
        response_data = {
            "id": item.id,
            "cliente_id": item.cliente_id,
            "habitacion_id": item.habitacion_id,
            "check_in": item.check_in.strftime("%Y-%m-%dT%H:%M:%S"),
            "check_out": item.check_out.strftime("%Y-%m-%dT%H:%M:%S"),
            "tipo_habitacion": item.tipo_habitacion,
            "num_huespedes": item.num_huespedes,
            "metodo_pago": item.metodo_pago,
            "estado": item.estado,
            "notas": item.notas,
            "valor_reservacion": item.valor_reservacion
        }
        
        return jsonify(response_data), 200
    
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido, usa YYYY-MM-DDTHH:MM:SS"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@booking_bp.route("/api/bookings/<int:booking_id>", methods=["DELETE"])
@jwt_required()
def delete_booking(booking_id):
    try:
        # Obtener la reserva
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({"error": "Reserva no encontrada"}), 404

        # Determinar el estado para el archivo según el estado actual de la reserva
        if booking.estado == "vencida":
            estado_archivo = "vencida"
        elif booking.estado == "pendiente":
            estado_archivo = "cancelada"
        elif booking.estado == "confirmada":
            estado_archivo = "reembolso"
        else:
            estado_archivo = booking.estado  # Por si hay otros estados no contemplados

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
            estado=estado_archivo,  # Asignar el estado determinado
            fecha_archivo=datetime.utcnow()
        )

        # Liberar habitación
        room = Room.query.get(booking.habitacion_id)
        if room:
            room.disponibilidad = "Disponible"
            db.session.add(room)

        # Realizar operaciones atómicas
        db.session.add(archivo)
        db.session.delete(booking)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Reserva archivada y eliminada",
            "archived_id": archivo.id,
            "archived_status": estado_archivo  # Incluir el estado en la respuesta
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "delete_failed",
            "message": "Error interno al procesar la eliminación"
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
