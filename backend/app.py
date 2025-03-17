from functools import wraps
from flask import Flask, jsonify, make_response, redirect, request, render_template, url_for
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from bcrypt import gensalt, hashpw, checkpw
from datetime import timedelta, datetime
import os

app = Flask(__name__)
app.json.sort_keys = False  # No ordena las claves alfabéticamente
app.json.ensure_ascii = False  # Permite caracteres especiales en UTF-8
app.config["JWT_SECRET_KEY"] = "supersecretkey"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=9)
app.config["JWT_TOKEN_LOCATION"] = ["headers", "cookies"]

# Crear la carpeta database si no existe
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "database", "hotel.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_TOKEN_LOCATION"] = ["headers"]  # Asegurar que solo acepte tokens en headers
app.config["JWT_HEADER_NAME"] = "Authorization"  # Nombre del encabezado
app.config["JWT_HEADER_TYPE"] = "Bearer"  # Prefijo "Bearer"
app.config["JWT_SECRET_KEY"] = "supersecretkey"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=9)
app.config["JWT_COOKIE_SECURE"] = False  # Solo si estás en desarrollo, evita que use HTTPS obligatorio


db = SQLAlchemy(app)
migrate = Migrate(app, db)  # Usa una variable para Migrate
jwt = JWTManager(app)  # Usa una variable para JWTManager
CORS(app, supports_credentials=True, expose_headers=["Authorization"])


# Modelos
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False, default="Usuario")
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default="user", nullable=False)

    def set_password(self, password):
        self.password = hashpw(password.encode('utf-8'), gensalt()).decode('utf-8')

class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    documento = db.Column(db.String(20), unique=True, nullable=False)
    fecha_nacimiento = db.Column(db.String(10), nullable=False)
    preferencias = db.Column(db.String(255), nullable=True)
    comentarios = db.Column(db.Text, nullable=True)

class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    num_habitacion = db.Column(db.Integer, unique=True, nullable=False)
    tipo = db.Column(db.String(50), nullable=False)
    capacidad = db.Column(db.Integer, nullable=False)
    precio_noche = db.Column(db.Float, nullable=False)
    disponibilidad = db.Column(db.String(20), nullable=False)
    amenidades = db.Column(db.Text, nullable=True)
    vista = db.Column(db.String(50), nullable=True)
    notas = db.Column(db.Text, nullable=True)

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    habitacion_id = db.Column(db.Integer, db.ForeignKey('room.id'), nullable=False)  # Relación con Room por ID
    check_in = db.Column(db.Date, nullable=False)
    check_out = db.Column(db.Date, nullable=False)
    tipo_habitacion = db.Column(db.String(50), nullable=False)
    num_huespedes = db.Column(db.Integer, nullable=False)
    metodo_pago = db.Column(db.String(50), nullable=False)
    estado = db.Column(db.String(20), nullable=False)
    notas = db.Column(db.Text, nullable=True)
    valor_reservacion = db.Column(db.Float, nullable=False, default=0.0)  # Nuevo campo

    cliente = db.relationship("Client", backref="bookings")
    habitacion = db.relationship("Room", backref="bookings")  # Relación con Room

# Diccionario de modelos
MODELS = {"users": User, "clients": Client, "rooms": Room, "bookings": Booking}

# Inicializar la base de datos dentro del contexto
def init_db():
    with app.app_context():
        db.create_all()
        # Verificar si el usuario admin ya existe
        if not User.query.filter_by(email="admin@hotel.com").first():
            admin_user = User(
                nombre="Admin",  # Nuevo campo
                email="admin@hotel.com",
                role="admin"
            )
            admin_user.set_password("123456")
            db.session.add(admin_user)
            db.session.commit()
            print("✔ Usuario admin creado con éxito")

# Endpoints
def is_admin():
    claims = get_jwt()
    return claims.get("role") == "admin"

def remove_sensitive_fields(data, sensitive_fields=["password"]):
    """
    Elimina campos sensibles de una lista de diccionarios o de un solo diccionario.
    """
    if isinstance(data, list):  # Si es una lista de diccionarios
        return [{k: v for k, v in item.items() if k not in sensitive_fields} for item in data]
    elif isinstance(data, dict):  # Si es un solo diccionario
        return {k: v for k, v in data.items() if k not in sensitive_fields}
    else:
        return data  # Si no es ni lista ni diccionario, devolver el dato original

# Función para verificar autenticación en rutas de páginas
def login_required(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        print("Identity:", get_jwt_identity())  # Depura si hay identidad
        return f(*args, **kwargs)
    return decorated_function

@app.route("/")
def login_page():
    return render_template('login.html')

@app.route("/app")
def index_page():
    # Quitamos el @jwt_required() para permitir que la página cargue
    # La verificación del token la haremos en el JavaScript
    return render_template("index.html")


@app.route('/<path:path>')
def catch_all(path):
    if path == "api/auth/login" or path == "":
        return login_page()
    return render_template('index.html')

@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data or "email" not in data or "password" not in data:
            return jsonify({"error": "Faltan campos requeridos"}), 400

        user = User.query.filter_by(email=data["email"]).first()
        if user and checkpw(data["password"].encode('utf-8'), user.password.encode('utf-8')):
            access_token = create_access_token(identity=user.email, additional_claims={"role": user.role})
            return jsonify({"access_token": access_token, "role": user.role, "name": user.nombre}), 200

        return jsonify({"error": "Credenciales incorrectas"}), 401

    except Exception as e:
        print(f"Error en /api/auth/login: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500


@app.route("/api/me")
@jwt_required()
def get_current_user():
    current_user = get_jwt_identity()
    additional_claims = get_jwt()  # Obtiene los claims adicionales del token
    user_role = additional_claims.get("role", "user")  # Asume "user" si no hay rol

    return jsonify({
        "msg": "Acceso autorizado",
        "user": current_user,
        "role": user_role
    }), 200


# Obtener todos los registros de un modelo
@app.route("/api/<string:model>", methods=["GET"])
@jwt_required()
def get_all(model):
    if model not in MODELS:
        return jsonify({"error": "Modelo no válido"}), 400

    Model = MODELS[model]
    items = Model.query.order_by(Model.id).all()
    return jsonify(remove_sensitive_fields([
        {column.name: getattr(item, column.name) for column in item.__table__.columns}
        for item in items
    ]))

# obtener un solo registro por id
@app.route("/api/<string:model>/<int:item_id>", methods=["GET"])
@jwt_required()
def get_one(model, item_id):
    if model not in MODELS:
        return jsonify({"error": "Modelo no válido"}), 400

    Model = MODELS[model]
    item = Model.query.get(item_id)

    if not item:
        return jsonify({"error": "Registro no encontrado"}), 404

    # Convertir el objeto a un diccionario
    item_dict = {column.name: getattr(item, column.name) for column in item.__table__.columns}

    # Eliminar campos sensibles y devolver la respuesta
    return jsonify(remove_sensitive_fields(item_dict))

# Crear un nuevo registro
@app.route("/api/<string:model>", methods=["POST"])
@jwt_required()
def create(model):
    if model not in MODELS:
        return jsonify({"error": "Modelo no válido"}), 400

    Model = MODELS[model]
    data = request.get_json()

    try:
        if model == "users":
            claims = get_jwt()
            if claims.get("role") != "admin":
                return jsonify({"error": "Acceso denegado. Solo administradores pueden registrar usuarios."}), 403

            new_item = User(
                nombre=data["nombre"],
                email=data["email"],
                role=data.get("role", "user")
            )
            new_item.set_password(data["password"])  # Hashear contraseña

        elif model == "bookings":
            data["check_in"] = datetime.strptime(data["check_in"], "%Y-%m-%d").date()
            data["check_out"] = datetime.strptime(data["check_out"], "%Y-%m-%d").date()
            new_item = Booking(**data)

        else:
            new_item = Model(**data)

        db.session.add(new_item)
        db.session.commit()
        return jsonify({"message": "Registro creado exitosamente"}), 201

    except ValueError:
        return jsonify({"error": "Formato de fecha inválido, usa YYYY-MM-DD"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Actualizar un registro por ID
@app.route("/api/<string:model>/<int:item_id>", methods=["PUT"])
@jwt_required()
def update(model, item_id):
    if model not in MODELS:
        return jsonify({"error": "Modelo no válido"}), 400

    Model = MODELS[model]
    data = request.get_json()
    claims = get_jwt()

    if model == "users" and claims.get("role") != "admin":
        return jsonify({"error": "Acceso denegado. Solo administradores pueden modificar usuarios."}), 403

    item = Model.query.get(item_id)
    if not item:
        return jsonify({"error": "Registro no encontrado"}), 404

    # Validar email duplicado
    if "email" in data and data["email"] != item.email:
        existing_user = Model.query.filter_by(email=data["email"]).first()
        if existing_user:
            return jsonify({"error": "El correo ya está en uso por otro usuario"}), 400

    # Actualizar los campos
    for key, value in data.items():
        if key == "password" and model == "users":
            item.set_password(value)
        else:
            setattr(item, key, value)

    db.session.commit()
    return jsonify({"message": "Registro actualizado exitosamente"}), 200

# Eliminar un registro por ID
@app.route("/api/<string:model>/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete(model, item_id):
    if model not in MODELS:
        return jsonify({"error": "Modelo no válido"}), 400

    Model = MODELS[model]
    claims = get_jwt()

    if model == "users" and claims.get("role") != "admin":
        return jsonify({"error": "Acceso denegado. Solo administradores pueden eliminar usuarios."}), 403

    item = Model.query.get(item_id)
    if not item:
        return jsonify({"error": "Registro no encontrado"}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Registro eliminado"}), 200

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
