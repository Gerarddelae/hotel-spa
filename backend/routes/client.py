from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Client
from ..utils.helpers import remove_sensitive_fields

client_bp = Blueprint('client', __name__)

@client_bp.route("/api/clients", methods=["GET"])
@jwt_required()
def get_all_clients():
    items = Client.query.order_by(Client.id).all()
    return jsonify([
        {column.name: getattr(item, column.name) for column in item.__table__.columns}
        for item in items
    ])

@client_bp.route("/api/clients/<int:item_id>", methods=["GET"])
@jwt_required()
def get_client(item_id):
    item = Client.query.get(item_id)
    if not item:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    item_dict = {column.name: getattr(item, column.name) for column in item.__table__.columns}
    return jsonify(item_dict)

@client_bp.route("/api/clients", methods=["POST"])
@jwt_required()
def create_client():
    data = request.get_json()
    
    try:
        new_item = Client(**data)
        db.session.add(new_item)
        db.session.commit()
        return jsonify({"message": "Cliente creado exitosamente"}), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@client_bp.route("/api/clients/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_client(item_id):
    data = request.get_json()
    item = Client.query.get(item_id)
    
    if not item:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    for key, value in data.items():
        setattr(item, key, value)
    
    db.session.commit()
    return jsonify({"message": "Cliente actualizado exitosamente"}), 200

@client_bp.route("/api/clients/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_client(item_id):
    item = Client.query.get(item_id)
    if not item:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Cliente eliminado"}), 200