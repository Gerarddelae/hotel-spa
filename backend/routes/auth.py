from flask import Blueprint, jsonify, request, render_template
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from models import User
from extensions import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/")
def login_page():
    return render_template('login.html')

@auth_bp.route("/app")
def index_page():
    return render_template("index.html")

@auth_bp.route('/<path:path>')
def catch_all(path):
    if path == "api/auth/login" or path == "":
        return login_page()
    return render_template('index.html')

@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data or "email" not in data or "password" not in data:
            return jsonify({"error": "Faltan campos requeridos"}), 400

        user = User.query.filter_by(email=data["email"]).first()
        if user and user.check_password(data["password"]):
            access_token = create_access_token(identity=user.email, additional_claims={"role": user.role})
            return jsonify({"access_token": access_token, "role": user.role, "name": user.nombre}), 200

        return jsonify({"error": "Credenciales incorrectas"}), 401

    except Exception as e:
        print(f"Error en /api/auth/login: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@auth_bp.route("/api/me")
@jwt_required()
def get_current_user():
    current_user = get_jwt_identity()
    additional_claims = get_jwt()
    user_role = additional_claims.get("role", "user")

    return jsonify({
        "msg": "Acceso autorizado",
        "user": current_user,
        "role": user_role
    }), 200