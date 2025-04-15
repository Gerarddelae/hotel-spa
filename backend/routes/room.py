from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from datetime import datetime
from ..extensions import db
from ..models import Room

room_bp = Blueprint('room', __name__)

@room_bp.route("/api/rooms", methods=["GET"])
@jwt_required()
def get_all_rooms():
    show_deleted = request.args.get('show_deleted', '').lower() == 'true'
    
    query = Room.query
    if not show_deleted:
        query = query.filter_by(is_deleted=False)
    
    rooms = query.order_by(Room.id).all()
    
    return jsonify([{
        column.name: getattr(room, column.name)
        for column in room.__table__.columns
        if column.name not in ['is_deleted']  # Excluir campo técnico
    } for room in rooms])

@room_bp.route("/api/rooms/<int:item_id>", methods=["GET"])
@jwt_required()
def get_room(item_id):
    show_deleted = request.args.get('show_deleted', '').lower() == 'true'
    
    query = Room.query.filter_by(id=item_id)
    if not show_deleted:
        query = query.filter_by(is_deleted=False)
    
    room = query.first()
    
    if not room:
        return jsonify({
            "error": "Habitación no encontrada",
            "details": f"ID {item_id} no existe o fue eliminada"
        }), 404
    
    return jsonify({
        column.name: getattr(room, column.name)
        for column in room.__table__.columns
        if column.name not in ['is_deleted']
    })

@room_bp.route("/api/rooms", methods=["POST"])
@jwt_required()
def create_room():
    data = request.get_json()
    
    try:
        new_room = Room(**data)
        db.session.add(new_room)
        db.session.commit()
        return jsonify({"message": "Habitación creada"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@room_bp.route("/api/rooms/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_room(item_id):
    data = request.get_json()
    
    room = Room.query.filter_by(id=item_id, is_deleted=False).first()
    if not room:
        return jsonify({"error": "Habitación no encontrada"}), 404
    
    try:
        for key, value in data.items():
            setattr(room, key, value)
        db.session.commit()
        return jsonify({"message": "Habitación actualizada"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@room_bp.route("/api/rooms/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_room(item_id):
    room = Room.query.filter_by(id=item_id, is_deleted=False).first()
    if not room:
        return jsonify({"error": "Habitación no encontrada"}), 404
    
    try:
        room.is_deleted = True
        db.session.commit()
        return jsonify({"message": "Habitación marcada como eliminada"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@room_bp.route("/api/rooms/<int:item_id>/restore", methods=["PATCH"])
@jwt_required()
def restore_room(item_id):
    room = Room.query.filter_by(id=item_id, is_deleted=True).first()
    if not room:
        return jsonify({"error": "Habitación eliminada no encontrada"}), 404
    
    try:
        room.is_deleted = False
        db.session.commit()
        return jsonify({"message": "Habitación restaurada"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500