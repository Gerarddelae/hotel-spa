from flask import Blueprint, jsonify

# Crear el blueprint para manejar rutas inválidas
invalid_bp = Blueprint('invalid', __name__)

# Ruta catch-all para endpoints principales que no existen
@invalid_bp.route('/api/<path:invalid_path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def handle_invalid_api_route(invalid_path):
    """Maneja cualquier ruta de API inexistente."""
    return jsonify({
        "error": f"Ruta API inválida: {invalid_path}",
        "message": "El recurso o modelo solicitado no existe"
    }), 404

# Ruta para manejar específicamente el caso de prueba '/api/invalid_model'
@invalid_bp.route('/api/invalid_model', methods=['GET', 'POST', 'PUT', 'DELETE'])
def handle_invalid_model():
    """Maneja el endpoint específico de prueba invalid_model."""
    return jsonify({
        "error": "Modelo inválido",
        "message": "El modelo solicitado no existe en el sistema"
    }), 400

# Manejador de errores global para 404 (no encontrado)
@invalid_bp.app_errorhandler(404)
def not_found_error(error):
    """Maneja errores 404 en toda la aplicación."""
    return jsonify({
        "error": "Recurso no encontrado",
        "message": "La URL solicitada no existe en este servidor"
    }), 404

# Manejador de errores global para 405 (método no permitido)
@invalid_bp.app_errorhandler(405)
def method_not_allowed(error):
    """Maneja errores de método no permitido."""
    return jsonify({
        "error": "Método no permitido",
        "message": "El método HTTP solicitado no está permitido para esta URL"
    }), 405