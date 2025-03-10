from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt
from flask_sqlalchemy import SQLAlchemy
from bcrypt import gensalt, hashpw, checkpw
from datetime import timedelta, datetime
import os

app = Flask(__name__)
app.json.sort_keys = False  # No ordena las claves alfabéticamente
app.json.ensure_ascii = False  # Permite caracteres especiales en UTF-8
app.config["JWT_SECRET_KEY"] = "supersecretkey"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)

# Crear la carpeta database si no existe
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "database", "hotel.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
JWTManager(app)
CORS(app, origins="http://127.0.0.1:3000", supports_credentials=True)

# Modelos
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
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

# Inicializar la base de datos dentro del contexto
def init_db():
    with app.app_context():
        db.create_all()
        # Verificar si el usuario admin ya existe
        if not User.query.filter_by(email="admin@hotel.com").first():
            admin_user = User(email="admin@hotel.com", role="admin")
            admin_user.set_password("123456")
            db.session.add(admin_user)
            db.session.commit()
            print("✔ Usuario admin creado con éxito")

# Endpoints
def is_admin():
    claims = get_jwt()
    return claims.get("role") == "admin"

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()
    if user and checkpw(data["password"].encode('utf-8'), user.password.encode('utf-8')):
        access_token = create_access_token(identity=user.email, additional_claims={"role": user.role})
        return jsonify({"token": access_token, "role": user.role}), 200
    return jsonify({"error": "Credenciales incorrectas"}), 401

# CRUD para Clientes, Habitaciones y Reservas
@app.route("/api/<string:model>", methods=["GET", "POST", "PUT", "DELETE"])
@jwt_required()
def handle_crud(model):
    models = {"users": User, "clients": Client, "rooms": Room, "bookings": Booking}
    if model not in models:
        return jsonify({"error": "Modelo no válido"}), 400
    Model = models[model]

    if request.method == "GET":
        items = Model.query.order_by(Model.id).all()  # Ordenar por ID
        return jsonify([
            {column.name: getattr(item, column.name) for column in item.__table__.columns}
            for item in items])

    data = request.get_json()

    if request.method == "POST":
        try:
            if model == "bookings":
                # Convertir fechas de string a objeto date
                data["check_in"] = datetime.strptime(data["check_in"], "%Y-%m-%d").date()
                data["check_out"] = datetime.strptime(data["check_out"], "%Y-%m-%d").date()
            
            if model == "users":
                new_item = User(email=data["email"], role=data.get("role", "user"))
                new_item.set_password(data["password"])
            else:
                new_item = Model(**data)

            db.session.add(new_item)
            db.session.commit()
            return jsonify({"message": "Registro creado exitosamente"}), 201
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido, usa YYYY-MM-DD"}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    elif request.method == "PUT":
        item = Model.query.get(data["id"])
        if item:
            for key, value in data.items():
                if key == "password" and model == "users":
                    item.set_password(value)
                else:
                    setattr(item, key, value)
            db.session.commit()
            return jsonify({"message": "Registro actualizado"})
        return jsonify({"error": "Registro no encontrado"}), 404
    elif request.method == "DELETE":
        item = Model.query.get(data["id"])
        if item:
            db.session.delete(item)
            db.session.commit()
            return jsonify({"message": "Registro eliminado"})
        return jsonify({"error": "Registro no encontrado"}), 404

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
