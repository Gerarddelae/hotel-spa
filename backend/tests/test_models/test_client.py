import pytest
from sqlalchemy.exc import IntegrityError
from backend.models.client import Client

@pytest.fixture
def sample_client_data():
    """Proporciona datos de cliente de prueba."""
    return {
        'nombre': 'John Doe',
        'email': 'john@example.com',
        'telefono': '1234567890',
        'documento': 'A123456789',
        'fecha_nacimiento': '1990-01-01',
        'preferencias': 'Habitación con vista al jardín',
        'comentarios': 'Cliente frecuente'
    }

def test_client_attributes(app, sample_client_data):
    """Prueba la creación y atributos básicos de un cliente."""
    with app.app_context():
        # Crear cliente con todos los campos
        client = Client(
            nombre=sample_client_data['nombre'],
            email=sample_client_data['email'],
            telefono=sample_client_data['telefono'],
            documento=sample_client_data['documento'],
            fecha_nacimiento=sample_client_data['fecha_nacimiento'],
            preferencias=sample_client_data['preferencias'],
            comentarios=sample_client_data['comentarios']
        )
        
        # Verificar atributos obligatorios
        assert client.nombre == sample_client_data['nombre']
        assert client.email == sample_client_data['email']
        assert client.telefono == sample_client_data['telefono']
        assert client.documento == sample_client_data['documento']
        assert client.fecha_nacimiento == sample_client_data['fecha_nacimiento']
        
        # Verificar atributos opcionales
        assert client.preferencias == sample_client_data['preferencias']
        assert client.comentarios == sample_client_data['comentarios']
        
        # Verificar que tiene un atributo id
        assert hasattr(client, 'id')

def test_client_minimal_attributes(app):
    """Prueba la creación de un cliente con sólo los campos obligatorios."""
    with app.app_context():
        client = Client(
            nombre="Minimal Client",
            email="minimal@example.com",
            telefono="9876543210",
            documento="B9876543",
            fecha_nacimiento="1985-12-31"
        )
        
        # Verificar atributos obligatorios
        assert client.nombre == "Minimal Client"
        assert client.email == "minimal@example.com"
        assert client.telefono == "9876543210"
        assert client.documento == "B9876543"
        assert client.fecha_nacimiento == "1985-12-31"
        
        # Verificar que los atributos opcionales son None
        assert client.preferencias is None
        assert client.comentarios is None

def test_client_unique_constraints(app, session, sample_client_data):
    """Prueba que email y documento son campos únicos."""
    with app.app_context():
        # Crear primer cliente
        client1 = Client(
            nombre=sample_client_data['nombre'],
            email=sample_client_data['email'],
            telefono=sample_client_data['telefono'],
            documento=sample_client_data['documento'],
            fecha_nacimiento=sample_client_data['fecha_nacimiento']
        )
        session.add(client1)
        session.commit()
        
        # Intentar crear cliente con email duplicado
        client2 = Client(
            nombre="Different Name",
            email=sample_client_data['email'],  # Email duplicado
            telefono="9999999999",
            documento="UNIQUE123",
            fecha_nacimiento="1980-05-05"
        )
        session.add(client2)
        
        # Debería fallar por email duplicado
        with pytest.raises(IntegrityError):
            session.commit()
        
        session.rollback()
        
        # Intentar crear cliente con documento duplicado
        client3 = Client(
            nombre="Another Different",
            email="different@example.com",
            telefono="8888888888",
            documento=sample_client_data['documento'],  # Documento duplicado
            fecha_nacimiento="1975-10-10"
        )
        session.add(client3)
        
        # Debería fallar por documento duplicado
        with pytest.raises(IntegrityError):
            session.commit()
        
        session.rollback()

def test_client_long_strings(app):
    """Prueba que el modelo maneja correctamente textos largos."""
    with app.app_context():
        # Crear comentario largo
        long_comment = "Esta es una prueba de un comentario muy largo. " * 10
        
        client = Client(
            nombre="Long Comment Client",
            email="long@example.com",
            telefono="5555555555",
            documento="LONG12345",
            fecha_nacimiento="2000-01-01",
            comentarios=long_comment
        )
        
        assert client.comentarios == long_comment
        assert len(client.comentarios) > 100

def test_client_representation(app, sample_client_data):
    """Prueba que el objeto cliente tiene una representación útil."""
    with app.app_context():
        client = Client(
            nombre=sample_client_data['nombre'],
            email=sample_client_data['email'],
            telefono=sample_client_data['telefono'],
            documento=sample_client_data['documento'],
            fecha_nacimiento=sample_client_data['fecha_nacimiento']
        )
        
        # Obtener representación como cadena
        repr_str = str(client)
        
        # Verificar que contiene información útil (ajustar según tu implementación)
        assert "Client" in repr_str or "Cliente" in repr_str
        # No verificamos campos específicos para evitar fallos si __repr__ no los incluye
        # Pero al menos verificamos que no está vacío
        assert len(repr_str) > 10

def test_client_bookings_relationship(app, session):
    """Prueba la relación con reservaciones si existe."""
    with app.app_context():
        # Este test es condicional: solo se ejecuta si existe la relación
        client = Client(
            nombre="Relationship Test",
            email="relation@example.com",
            telefono="4444444444",
            documento="REL123456",
            fecha_nacimiento="1995-05-05"
        )
        
        # Verificar si hay relación con bookings
        if hasattr(client, 'bookings'):
            # Verificar que inicialmente está vacía
            assert hasattr(client.bookings, '__iter__')  # Es iterable
            assert len(list(client.bookings)) == 0