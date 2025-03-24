from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Booking
from datetime import datetime
from ..utils.helpers import remove_sensitive_fields

booking_bp = Blueprint('booking', __name__)

@booking_bp.route("/api/bookings", methods=["GET"])
@jwt_required()
def get_all_bookings():
    items = Booking.query.order_by(Booking.id).all()
    return jsonify([
        {column.name: getattr(item, column.name) for column in item.__table__.columns}
        for item in items
    ])

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
        # Verificar que ambos campos de fecha existen
        if "check_in" not in data or "check_out" not in data:
            return jsonify({"error": "Se requieren las fechas de check-in y check-out"}), 400
            
        # Convertir fechas de string a Date
        try:
            check_in = datetime.strptime(data["check_in"], "%Y-%m-%d").date()
            check_out = datetime.strptime(data["check_out"], "%Y-%m-%d").date()
            
            # Validar que check-out sea posterior a check-in
            if check_out <= check_in:
                return jsonify({
                    "error": "La fecha de check-out debe ser posterior a la fecha de check-in"
                }), 400
                
            # Actualizar datos con fechas convertidas
            data["check_in"] = check_in
            data["check_out"] = check_out
            
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DD"}), 400
            
        new_item = Booking(**data)
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
            data["check_in"] = datetime.strptime(data["check_in"], "%Y-%m-%d").date()
        if "check_out" in data:
            data["check_out"] = datetime.strptime(data["check_out"], "%Y-%m-%d").date()
            
        for key, value in data.items():
            setattr(item, key, value)
        
        db.session.commit()
        return jsonify({"message": "Reserva actualizada exitosamente"}), 200
    
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido, usa YYYY-MM-DD"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@booking_bp.route("/api/bookings/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_booking(item_id):
    item = Booking.query.get(item_id)
    if not item:
        return jsonify({"error": "Reserva no encontrada"}), 404
    
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Reserva eliminada"}), 200