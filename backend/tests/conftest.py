import pytest
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token

# Importaciones actualizadas
from backend.app import create_app
from backend.extensions import db
from backend.models.user import User
from backend.models.client import Client
from backend.models.room import Room
from backend.models.booking import Booking
from backend.config import TestConfig  # Importar TestConfig directamente

@pytest.fixture(scope="session")
def app():
    """Crea una instancia de la aplicación en modo de prueba."""
    # Pasar TestConfig directamente como parámetro
    app = create_app(config_class=TestConfig)
    
    # Verificar que estamos usando la BD de pruebas
    assert 'memory' in app.config['SQLALCHEMY_DATABASE_URI'], "No se está usando la BD de pruebas"
    
    with app.app_context():
        db.create_all()  # Crear todas las tablas
        yield app
        db.drop_all()  # Eliminar todas las tablas después de las pruebas

@pytest.fixture
def client(app):
    """Crea un cliente de prueba para hacer solicitudes HTTP."""
    return app.test_client()

@pytest.fixture
def session(app):
    """Crea una sesión de base de datos para las pruebas."""
    with app.app_context():
        # Limpiar datos existentes antes de cada prueba
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()
        
        yield db.session
        
        # Limpiar después de la prueba
        db.session.rollback()
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()

@pytest.fixture
def admin_user(session):
    """Crea un usuario administrador en la base de datos."""
    # Verifica si el usuario ya existe
    existing_user = session.query(User).filter_by(email="admin_test@hotel.com").first()
    if existing_user:
        return existing_user

    # Si no existe, crea un nuevo usuario
    admin = User(
        nombre="Admin Test",
        email="admin_test@hotel.com",
        role="admin"
    )
    admin.set_password("123456")
    session.add(admin)
    session.commit()
    return admin

@pytest.fixture
def admin_token(admin_user):
    """Genera un token JWT para el usuario administrador."""
    token = create_access_token(
        identity=admin_user.email,
        additional_claims={"role": admin_user.role}
    )
    return token

@pytest.fixture
def db_session(app):
    """Fixture que provee una sesión de base de datos para tests"""
    with app.app_context():
        yield db.session
        db.session.rollback()  # Limpieza después de cada test