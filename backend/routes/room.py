from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Room
from ..utils.helpers import remove_sensitive_fields

room_bp = Blueprint('room', __name__)

@room_bp.route("/api/rooms", methods=["GET"])
@jwt_required()
def get_all_rooms():
    items = Room.query.order_by(Room.id).all()
    return jsonify([
        {column.name: getattr(item, column.name) for column in item.__table__.columns}
        for item in items
    ])

@room_bp.route("/api/rooms/<int:item_id>", methods=["GET"])
@jwt_required()
def get_room(item_id):
    item = Room.query.get(item_id)
    if not item:
        return jsonify({"error": "Habitación no encontrada"}), 404
    
    item_dict = {column.name: getattr(item, column.name) for column in item.__table__.columns}
    return jsonify(item_dict)

@room_bp.route("/api/rooms", methods=["POST"])
@jwt_required()
def create_room():
    data = request.get_json()
    
    # Verificar si ya existe una habitación con ese número
    if 'num_habitacion' in data:
        existing_room = Room.query.filter_by(num_habitacion=data.get('num_habitacion')).first()
        if existing_room:
            return jsonify({"error": "Ya existe una habitación con ese número"}), 400
    
    try:
        new_item = Room(**data)
        db.session.add(new_item)
        db.session.commit()
        return jsonify({"message": "Habitación creada exitosamente"}), 201
    
    except Exception as e:
        db.session.rollback()  # Importante: hacer rollback en caso de error
        
        # Detectar si es un error de integridad (como duplicados)
        if "UNIQUE constraint failed" in str(e) or "duplicate key" in str(e):
            return jsonify({"error": "Ya existe una habitación con ese número"}), 400
            
        return jsonify({"error": str(e)}), 500

@room_bp.route("/api/rooms/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_room(item_id):
    data = request.get_json()
    item = Room.query.get(item_id)
    
    if not item:
        return jsonify({"error": "Habitación no encontrada"}), 404
    
    for key, value in data.items():
        setattr(item, key, value)
    
    db.session.commit()
    return jsonify({"message": "Habitación actualizada exitosamente"}), 200

@room_bp.route("/api/rooms/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_room(item_id):
    item = Room.query.get(item_id)
    if not item:
        return jsonify({"error": "Habitación no encontrada"}), 404
    
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Habitación eliminada"}), 200