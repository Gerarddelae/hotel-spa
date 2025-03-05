from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json

app = Flask(__name__)
app.json.sort_keys = False
app.json.ensure_ascii = False

CORS(app)

# 📂 Carpeta donde se almacenarán los datos
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

# 📌 Inicializar un archivo JSON con una lista vacía si no existe
def initialize_data_file(file_name):
    file_path = os.path.join(DATA_DIR, file_name)
    if not os.path.exists(file_path):
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False)
    return file_path

# 📌 Leer datos de un archivo JSON específico
def read_data(file_name):
    file_path = initialize_data_file(file_name)
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

# 📌 Escribir datos en un archivo JSON
def write_data(file_name, data):
    file_path = initialize_data_file(file_name)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# 📌 Eliminar campos sensibles como la contraseña
def remove_sensitive_fields(data, sensitive_fields=["password"]):
    return [{k: v for k, v in item.items() if k not in sensitive_fields} for item in data]

# 📌 Autenticación de usuario
@app.route("/api/auth/login", methods=["POST"])
def login():
    credentials = request.get_json()

    if not credentials or "email" not in credentials or "password" not in credentials:
        return jsonify({"error": "Faltan credenciales"}), 400

    email = credentials["email"]
    password = credentials["password"]

    users = read_data("users.json")
    user = next((u for u in users if u["email"] == email), None)

    if not user or user["password"] != password:
        return jsonify({"error": "Credenciales incorrectas"}), 401

    return jsonify({"message": "Login exitoso", "token": "fake-jwt-token"}), 200

# 📌 CRUD para cualquier entidad (usuarios, reservas, clientes, etc.)

# 📍 Obtener todos los registros de un archivo JSON (sin contraseñas)
@app.route("/api/<file_name>", methods=["GET"])
def get_all(file_name):
    file_name = f"{file_name}.json"
    try:
        data = read_data(file_name)
        return jsonify(remove_sensitive_fields(data)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 📍 Obtener un solo registro por ID
@app.route("/api/<file_name>/<int:item_id>", methods=["GET"])
def get_one(file_name, item_id):
    file_name = f"{file_name}.json"
    data = read_data(file_name)

    item = next((i for i in data if i.get("id") == item_id), None)
    if not item:
        return jsonify({"error": "ID no encontrado"}), 404

    return jsonify(item), 200

# 📍 Agregar un nuevo registro
@app.route("/api/<file_name>", methods=["POST"])
def add_item(file_name):
    file_name = f"{file_name}.json"
    new_entry = request.get_json()

    if not new_entry or "id" not in new_entry:
        return jsonify({"error": "El objeto debe tener un ID"}), 400

    data = read_data(file_name)
    if any(item["id"] == new_entry["id"] for item in data):
        return jsonify({"error": "El ID ya existe"}), 400

    data.append(new_entry)
    write_data(file_name, data)
    return jsonify({"message": "Dato agregado correctamente"}), 201

# 📍 Actualizar un registro por ID
@app.route("/api/<file_name>/<int:item_id>", methods=["PUT"])
def update_item(file_name, item_id):
    file_name = f"{file_name}.json"
    updated_entry = request.get_json()

    if not updated_entry:
        return jsonify({"error": "No se enviaron datos"}), 400

    data = read_data(file_name)
    for index, item in enumerate(data):
        if item.get("id") == item_id:
            data[index] = {**item, **updated_entry}  # 🔹 Mezcla los datos
            write_data(file_name, data)
            return jsonify({"message": "Dato actualizado correctamente"}), 200

    return jsonify({"error": "ID no encontrado"}), 404

# 📍 Eliminar un registro por ID
@app.route("/api/<file_name>/<int:item_id>", methods=["DELETE"])
def delete_item(file_name, item_id):
    file_name = f"{file_name}.json"
    data = read_data(file_name)

    filtered_data = [item for item in data if item.get("id") != item_id]

    if len(filtered_data) == len(data):
        return jsonify({"error": "ID no encontrado"}), 404

    write_data(file_name, filtered_data)
    return jsonify({"message": "Dato eliminado correctamente"}), 200

# 🔥 Ejecutar la API
if __name__ == "__main__":
    app.run(debug=True, port=5000)
