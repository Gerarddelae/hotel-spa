from .auth import auth_bp
from .user import user_bp
from .client import client_bp
from .room import room_bp
from .booking import booking_bp

def register_blueprints(app):
    """Registra todos los blueprints en la aplicación."""
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(client_bp)
    app.register_blueprint(room_bp)
    app.register_blueprint(booking_bp)