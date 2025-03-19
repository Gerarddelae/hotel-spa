from flask import Flask
from config import Config
from extensions import db, migrate, jwt, cors
from models import User
from routes import register_blueprints

def create_app(config_class=Config):
    """Crea y configura la aplicación Flask."""
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.json.sort_keys = False  # No ordena las claves alfabéticamente
    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, supports_credentials=True, expose_headers=["Authorization"])
    
    # Registrar blueprints
    register_blueprints(app)
    
    return app

def init_db(app):
    """Inicializa la base de datos y crea el usuario administrador si no existe."""
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(email="admin@hotel.com").first():
            admin_user = User(
                nombre="Admin",
                email="admin@hotel.com",
                role="admin"
            )
            admin_user.set_password("123456")
            db.session.add(admin_user)
            db.session.commit()
            print("✔ Usuario admin creado con éxito")

if __name__ == "__main__":
    app = create_app()
    init_db(app)
    app.run(debug=True, port=5000)