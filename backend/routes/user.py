from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from ..extensions import db
from ..models import User
from ..utils.helpers import remove_sensitive_fields

user_bp = Blueprint('user', __name__)

@user_bp.route("/api/users", methods=["GET"])
@jwt_required()
def get_all_users():
    items = User.query.order_by(User.id).all()
    return jsonify(remove_sensitive_fields([
        {column.name: getattr(item, column.name) for column in item.__table__.columns}
        for item in items
    ]))

@user_bp.route("/api/users/<int:item_id>", methods=["GET"])
@jwt_required()
def get_user(item_id):
    item = User.query.get(item_id)
    if not item:
        return jsonify({"error": "Registro no encontrado"}), 404
    
    item_dict = {column.name: getattr(item, column.name) for column in item.__table__.columns}
    return jsonify(remove_sensitive_fields(item_dict))

@user_bp.route("/api/users", methods=["POST"])
@jwt_required()
def create_user():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Acceso denegado. Solo administradores pueden registrar usuarios."}), 403
    
    data = request.get_json()
    
    try:
        new_item = User(
            nombre=data["nombre"],
            email=data["email"],
            role=data.get("role", "user")
        )
        new_item.set_password(data["password"])
        
        db.session.add(new_item)
        db.session.commit()
        return jsonify({"message": "Usuario creado exitosamente"}), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_bp.route("/api/users/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_user(item_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Acceso denegado. Solo administradores pueden modificar usuarios."}), 403
    
    data = request.get_json()
    item = User.query.get(item_id)
    
    if not item:
        return jsonify({"error": "Usuario no encontrado"}), 404
    
    if "email" in data and data["email"] != item.email:
        existing_user = User.query.filter_by(email=data["email"]).first()
        if existing_user:
            return jsonify({"error": "El correo ya está en uso por otro usuario"}), 400
    
    for key, value in data.items():
        if key == "password":
            item.set_password(value)
        else:
            setattr(item, key, value)
    
    db.session.commit()
    return jsonify({"message": "Usuario actualizado exitosamente"}), 200

@user_bp.route("/api/users/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_user(item_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Acceso denegado. Solo administradores pueden eliminar usuarios."}), 403
    
    item = User.query.get(item_id)
    if not item:
        return jsonify({"error": "Usuario no encontrado"}), 404
    
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Usuario eliminado"}), 200