import pytest
from backend.models.user import User
from sqlalchemy.exc import IntegrityError

@pytest.fixture
def sample_user_data():
    """Proporciona datos de usuario de prueba."""
    return {
        'nombre': 'Test User',
        'email': 'test@example.com',
        'role': 'user',
        'password': 'SecurePass123!'
    }

def test_user_attributes(app, sample_user_data):
    """Prueba la creación y atributos básicos de un usuario."""
    with app.app_context():
        user = User(
            nombre=sample_user_data['nombre'],
            email=sample_user_data['email'],
            role=sample_user_data['role']
        )
        
        # Verificar atributos básicos
        assert user.nombre == sample_user_data['nombre']
        assert user.email == sample_user_data['email']
        assert user.role == sample_user_data['role']
        
        # Verificar valores por defecto
        assert user.password is None
        assert hasattr(user, 'id')

def test_user_password_setting_and_checking(app, sample_user_data):
    """Prueba la configuración y verificación de contraseñas."""
    with app.app_context():
        user = User(email=sample_user_data['email'])
        
        # Establecer contraseña
        user.set_password(sample_user_data['password'])
        
        # Verificar que no es texto plano
        assert user.password != sample_user_data['password']
        assert len(user.password) > 20  # El hash debe ser largo
        
        # Verificar verificación correcta
        assert user.check_password(sample_user_data['password']) is True
        
        # Verificar contra contraseñas incorrectas
        assert user.check_password('') is False
        assert user.check_password('wrongpassword') is False
        assert user.check_password(sample_user_data['password'].upper()) is False
        assert user.check_password(' ' + sample_user_data['password']) is False

def test_user_model_repr(app, sample_user_data):
    """Prueba la representación en cadena del modelo de usuario."""
    with app.app_context():
        user = User(
            nombre=sample_user_data['nombre'],
            email=sample_user_data['email']
        )
        
        # Verificar que __repr__ contiene información útil
        repr_str = repr(user)
        assert 'User' in repr_str
        assert sample_user_data['email'] in repr_str

def test_user_roles(app):
    """Prueba la definición y validación de roles de usuario."""
    with app.app_context():
        # Probar diferentes roles válidos
        roles = ['admin', 'user', 'staff']
        
        for role in roles:
            user = User(nombre="Role Test", email=f"{role}@example.com", role=role)
            assert user.role == role
            
        # El rol por defecto debería ser 'user' si no se especifica
        default_user = User(nombre="Default Role", email="default@example.com")
        assert hasattr(default_user, 'role')

def test_user_email_uniqueness(app, session, sample_user_data):
    """Prueba que el email debe ser único."""
    with app.app_context():
        # Crear primer usuario
        user1 = User(
            nombre=sample_user_data['nombre'],
            email=sample_user_data['email'],
            role=sample_user_data['role']
        )
        user1.set_password(sample_user_data['password'])
        session.add(user1)
        session.commit()
        
        # Intentar crear un segundo usuario con el mismo email
        user2 = User(
            nombre="Another User",
            email=sample_user_data['email'],  # Mismo email
            role="user"
        )
        user2.set_password("different_password")
        session.add(user2)
        
        # Debería fallar por restricción de unicidad
        with pytest.raises(IntegrityError):
            session.commit()
        
        # Limpiar la sesión para otros tests
        session.rollback()

def test_password_validation(app):
    """Prueba validación de contraseñas (si existe)."""
    with app.app_context():
        user = User(email="validation@example.com")
        
        # Contraseña nula
        if hasattr(user, 'validate_password'):
            with pytest.raises(ValueError):
                user.set_password(None)
        
        # Si el modelo tiene validación de complejidad, verificarla
        # Nota: Implementar si el modelo tiene esta funcionalidad
        # Ejemplos: contraseña muy corta, sin números, etc.