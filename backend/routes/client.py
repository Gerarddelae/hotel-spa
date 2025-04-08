from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Client

client_bp = Blueprint('client', __name__)

@client_bp.route("/api/clients", methods=["GET"])
@jwt_required()
def get_all_clients():
    show_deleted = request.args.get('show_deleted', '').lower() == 'true'
    
    query = Client.query
    if not show_deleted:
        query = query.filter_by(is_deleted=False)
    
    clients = query.order_by(Client.id).all()
    
    return jsonify([{
        column.name: getattr(client, column.name)
        for column in client.__table__.columns
        if column.name not in ['is_deleted']
    } for client in clients])

@client_bp.route("/api/clients/<int:item_id>", methods=["GET"])
@jwt_required()
def get_client(item_id):
    show_deleted = request.args.get('show_deleted', '').lower() == 'true'
    
    query = Client.query.filter_by(id=item_id)
    if not show_deleted:
        query = query.filter_by(is_deleted=False)
    
    client = query.first()
    
    if not client:
        return jsonify({
            "error": "Cliente no encontrado",
            "details": f"ID {item_id} no existe o fue eliminado"
        }), 404
    
    return jsonify({
        column.name: getattr(client, column.name)
        for column in client.__table__.columns
        if column.name not in ['is_deleted']
    })

@client_bp.route("/api/clients", methods=["POST"])
@jwt_required()
def create_client():
    data = request.get_json()
    
    try:
        new_client = Client(**data)
        db.session.add(new_client)
        db.session.commit()
        return jsonify({"message": "Cliente creado"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@client_bp.route("/api/clients/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_client(item_id):
    data = request.get_json()
    
    client = Client.query.filter_by(id=item_id, is_deleted=False).first()
    if not client:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    try:
        for key, value in data.items():
            setattr(client, key, value)
        db.session.commit()
        return jsonify({"message": "Cliente actualizado"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@client_bp.route("/api/clients/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_client(item_id):
    client = Client.query.filter_by(id=item_id, is_deleted=False).first()
    if not client:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    try:
        client.is_deleted = True
        db.session.commit()
        return jsonify({"message": "Cliente marcado como eliminado"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@client_bp.route("/api/clients/<int:item_id>/restore", methods=["PATCH"])
@jwt_required()
def restore_client(item_id):
    client = Client.query.filter_by(id=item_id, is_deleted=True).first()
    if not client:
        return jsonify({"error": "Cliente eliminado no encontrado"}), 404
    
    try:
        client.is_deleted = False
        db.session.commit()
        return jsonify({"message": "Cliente restaurado"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500