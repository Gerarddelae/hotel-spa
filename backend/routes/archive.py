from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Archivo
from datetime import datetime

archive_bp = Blueprint('archive', __name__)

@archive_bp.route("/api/archives", methods=["GET"])
@jwt_required()
def get_all_archives():
    try:
        archives = Archivo.query.order_by(Archivo.fecha_archivo.desc()).all()
        
        resultado = []
        for archive in archives:
            archive_dict = {
                "id": archive.id,
                "booking_id": archive.booking_id,
                "cliente_id": archive.cliente_id,
                "habitacion_id": archive.habitacion_id,
                "nombre_cliente": archive.cliente.nombre if archive.cliente else "No asignado",
                "num_habitacion": archive.habitacion.num_habitacion if archive.habitacion else "No asignado",
                "check_in": archive.check_in.isoformat(),
                "check_out": archive.check_out.isoformat(),
                "tipo_habitacion": archive.tipo_habitacion,
                "num_huespedes": archive.num_huespedes,
                "metodo_pago": archive.metodo_pago,
                "notas": archive.notas,
                "valor_reservacion": archive.valor_reservacion,
                "estado": archive.estado,
                "fecha_archivo": archive.fecha_archivo.isoformat()
            }
            resultado.append(archive_dict)

        return jsonify(resultado)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@archive_bp.route("/api/archives/<int:item_id>", methods=["GET"])
@jwt_required()
def get_archive(item_id):
    try:
        item = Archivo.query.get(item_id)
        if not item:
            return jsonify({"error": "Registro archivado no encontrado"}), 404
        
        item_dict = {
            "id": item.id,
            "booking_id": item.booking_id,
            "cliente_id": item.cliente_id,
            "habitacion_id": item.habitacion_id,
            "nombre_cliente": item.cliente.nombre if item.cliente else "No asignado",
            "num_habitacion": item.habitacion.num_habitacion if item.habitacion else "No asignado",
            "check_in": item.check_in.isoformat(),
            "check_out": item.check_out.isoformat(),
            "tipo_habitacion": item.tipo_habitacion,
            "num_huespedes": item.num_huespedes,
            "metodo_pago": item.metodo_pago,
            "notas": item.notas,
            "valor_reservacion": item.valor_reservacion,
            "estado": item.estado,
            "fecha_archivo": item.fecha_archivo.isoformat()
        }
        
        return jsonify(item_dict)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@archive_bp.route("/api/archives/estado/<string:estado>", methods=["GET"])
@jwt_required()
def get_archives_by_status(estado):
    try:
        archives = Archivo.query.filter_by(estado=estado).order_by(Archivo.fecha_archivo.desc()).all()
        
        resultado = []
        for archive in archives:
            archive_dict = {
                "id": archive.id,
                "booking_id": archive.booking_id,
                "cliente_id": archive.cliente_id,
                "habitacion_id": archive.habitacion_id,
                "nombre_cliente": archive.cliente.nombre if archive.cliente else "No asignado",
                "num_habitacion": archive.habitacion.num_habitacion if archive.habitacion else "No asignado",
                "check_in": archive.check_in.isoformat(),
                "check_out": archive.check_out.isoformat(),
                "tipo_habitacion": archive.tipo_habitacion,
                "num_huespedes": archive.num_huespedes,
                "metodo_pago": archive.metodo_pago,
                "notas": archive.notas,
                "valor_reservacion": archive.valor_reservacion,
                "fecha_archivo": archive.fecha_archivo.isoformat()
            }
            resultado.append(archive_dict)

        return jsonify(resultado)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@archive_bp.route("/api/archives/cliente/<int:cliente_id>", methods=["GET"])
@jwt_required()
def get_archives_by_client(cliente_id):
    try:
        archives = Archivo.query.filter_by(cliente_id=cliente_id).order_by(Archivo.fecha_archivo.desc()).all()
        
        resultado = []
        for archive in archives:
            archive_dict = {
                "id": archive.id,
                "booking_id": archive.booking_id,
                "habitacion_id": archive.habitacion_id,
                "num_habitacion": archive.habitacion.num_habitacion if archive.habitacion else "No asignado",
                "check_in": archive.check_in.isoformat(),
                "check_out": archive.check_out.isoformat(),
                "tipo_habitacion": archive.tipo_habitacion,
                "num_huespedes": archive.num_huespedes,
                "metodo_pago": archive.metodo_pago,
                "notas": archive.notas,
                "valor_reservacion": archive.valor_reservacion,
                "estado": archive.estado,
                "fecha_archivo": archive.fecha_archivo.isoformat()
            }
            resultado.append(archive_dict)

        return jsonify(resultado)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500