from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os
import json
from datetime import timedelta
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.json.sort_keys = False
app.json.ensure_ascii = False
app.config["JWT_SECRET_KEY"] = "supersecretkey"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
CORS(app, origins="http://127.0.0.1:3000", supports_credentials=True)
JWTManager(app)

DATA_DIR = "backend/data"
os.makedirs(DATA_DIR, exist_ok=True)

def initialize_data_file(file_name):
    """ Verifica si el archivo existe, si no lo crea vacío. """
    file_path = os.path.join(DATA_DIR, file_name)
    if not os.path.exists(file_path):
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False)
    return file_path

def read_data(file_name):
    """ Lee datos de un archivo JSON. """
    file_path = initialize_data_file(file_name)
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_data(file_name, data):
    """ Escribe datos en un archivo JSON. """
    file_path = initialize_data_file(file_name)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def hash_passwords():
    """ Convierte las contraseñas de users.json a formato hash y las guarda en users_hashed.json. """
    users = read_data("users.json")
    hashed_users = []

    for user in users:
        hashed_user = user.copy()
        if not hashed_user["password"].startswith("$pbkdf2-sha256$"):  # Evita re-hashear si ya está en hash
            hashed_user["password"] = generate_password_hash(user["password"])
        hashed_users.append(hashed_user)

    write_data("users_hashed.json", hashed_users)
    print("✅ Se ha generado users_hashed.json con contraseñas hasheadas.")

def remove_sensitive_fields(data, sensitive_fields=["password"]):
    """ Elimina campos sensibles de una lista de diccionarios """
    return [{k: v for k, v in item.items() if k not in sensitive_fields} for item in data]

# 🔹 Generar el archivo con contraseñas hasheadas al iniciar
hash_passwords()

@app.route("/api/auth/login", methods=["POST"])
def login():
    """ Verifica credenciales y genera un JWT si son correctas. """
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    users_hashed = read_data("users_hashed.json")
    user = next((u for u in users_hashed if u["email"] == email), None)

    if user:
        if check_password_hash(user["password"], password):
            access_token = create_access_token(identity=email)
            return jsonify({"token": access_token}), 200

    return jsonify({"error": "Credenciales incorrectas"}), 401

@app.route("/api/<file_name>", methods=["GET"])
@jwt_required()
def get_data(file_name):
    """ Obtiene datos de un archivo JSON. """
    file_name = f"{file_name}.json"
    try:
        data = read_data(file_name)
        return jsonify(remove_sensitive_fields(data)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/<file_name>", methods=["POST"])
@jwt_required()
def add_data(file_name):
    """ Agrega un nuevo dato a un archivo JSON. """
    file_name = f"{file_name}.json"
    new_entry = request.get_json()

    if not new_entry:
        return jsonify({"error": "No se enviaron datos"}), 400

    data = read_data(file_name)
    data.append(new_entry)
    write_data(file_name, data)

    return jsonify({"message": "Dato agregado correctamente"}), 201

@app.route("/api/<file_name>/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_data(file_name, item_id):
    """ Actualiza un dato en un archivo JSON. """
    file_name = f"{file_name}.json"
    updated_entry = request.get_json()

    if not updated_entry:
        return jsonify({"error": "No se enviaron datos"}), 400

    data = read_data(file_name)
    for index, item in enumerate(data):
        if item.get("id") == item_id:
            data[index] = {**item, **updated_entry}
            write_data(file_name, data)
            return jsonify({"message": "Dato actualizado correctamente"}), 200

    return jsonify({"error": "ID no encontrado"}), 404

@app.route("/api/<file_name>/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_data(file_name, item_id):
    """ Elimina un dato de un archivo JSON. """
    file_name = f"{file_name}.json"
    data = read_data(file_name)
    filtered_data = [item for item in data if item.get("id") != item_id]

    if len(filtered_data) == len(data):
        return jsonify({"error": "ID no encontrado"}), 404

    write_data(file_name, filtered_data)
    return jsonify({"message": "Dato eliminado correctamente"}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)
