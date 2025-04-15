import json
from datetime import datetime, timedelta
import pytest
from backend.models import Income, Archivo, Booking

@pytest.fixture
def test_client(client, admin_token, session):
    """Crea un cliente de prueba en la base de datos."""
    from backend.models.client import Client
    
    existing_client = session.query(Client).filter_by(email="cliente_prueba@test.com").first()
    if existing_client:
        return existing_client
    
    test_client = Client(
        nombre="Cliente Prueba",
        email="cliente_prueba@test.com",
        telefono="555-123-4567",
        documento="ABC123456789",
        fecha_nacimiento="1990-01-01",
        preferencias="Habitación con vista al mar",
        comentarios="Cliente creado para pruebas automatizadas"
    )
    
    session.add(test_client)
    session.commit()
    session.refresh(test_client)
    return test_client

@pytest.fixture
def test_room(client, admin_token, session):
    """Crea una habitación de prueba en la base de datos."""
    from backend.models.room import Room
    
    test_room = Room(
        num_habitacion=500,
        tipo="Suite Prueba",
        capacidad=2,
        precio_noche=200.00,
        disponibilidad="Disponible",
        amenidades="WiFi, TV, Minibar",
        vista="Mar",
        notas="Habitación para pruebas de reservación"
    )
    
    session.add(test_room)
    session.commit()
    session.refresh(test_room)
    return test_room

@pytest.fixture
def booking_data(test_client, test_room):
    """Datos para crear una reservación de prueba con fecha y hora."""
    tomorrow = datetime.now() + timedelta(days=1)
    three_days_later = datetime.now() + timedelta(days=3)

    return {
        'cliente_id': test_client.id,
        'habitacion_id': test_room.id,
        'check_in': tomorrow.strftime("%Y-%m-%dT%H:%M:%S"),
        'check_out': three_days_later.strftime("%Y-%m-%dT%H:%M:%S"),
        'tipo_habitacion': test_room.tipo,
        'num_huespedes': 2,
        'metodo_pago': 'Tarjeta',
        'estado': 'confirmada',
        'notas': 'Reservación de prueba',
        'valor_reservacion': test_room.precio_noche * 2
    }

@pytest.fixture
def create_test_booking(client, admin_token, booking_data, session):
    """Crea una reservación de prueba y retorna sus datos."""
    unique_note = f"Test booking {datetime.now().strftime('%Y%m%d%H%M%S')}"
    test_data = booking_data.copy()
    test_data['notas'] = unique_note
    
    response = client.post(
        '/api/bookings',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(test_data),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    booking = session.query(Booking).filter_by(notas=unique_note).first()
    assert booking is not None
    return booking

def test_create_booking_with_income(client, admin_token, booking_data, session):
    """Test que verifica la creación de Income al confirmar reserva."""
    response = client.post(
        '/api/bookings',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(booking_data),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    
    # Verificar que se creó el Income
    booking_id = data.get('id')
    income = session.query(Income).filter_by(booking_id=booking_id).first()
    assert income is not None
    assert income.estado_pago == "confirmado"

def test_update_to_confirmed_creates_income(client, admin_token, create_test_booking, session):
    """Test que verifica la creación de Income al actualizar estado a confirmada."""
    booking = create_test_booking
    
    # Cambiar estado a confirmada
    response = client.put(
        f'/api/bookings/{booking.id}',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps({'estado': 'confirmada'}),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    
    # Verificar que se creó el Income
    income = session.query(Income).filter_by(booking_id=booking.id).first()
    assert income is not None
    assert income.estado_pago == "confirmado"

def test_delete_confirmed_booking_updates_income(client, admin_token, create_test_booking, session):
    """Test que verifica la actualización de Income al eliminar reserva confirmada."""
    booking = create_test_booking
    
    # Verificar Income inicial
    initial_income = session.query(Income).filter_by(booking_id=booking.id).first()
    assert initial_income is not None
    
    # Eliminar reserva
    response = client.delete(
        f'/api/bookings/{booking.id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['income_updated'] is True
    
    # Verificar que se creó el archivo
    archived = session.query(Archivo).filter_by(booking_id=booking.id).first()
    assert archived is not None
    
    # Verificar que se actualizó el Income
    updated_income = session.query(Income).filter_by(archive_id=archived.id).first()
    assert updated_income is not None
    assert updated_income.booking_id is None
    
    # Verificar el estado del pago según el estado de la reserva
    if booking.estado == "vencida":
        assert updated_income.estado_pago == "confirmado"
    elif booking.estado == "confirmada":
        assert updated_income.estado_pago == "reembolso"
    else:
        assert updated_income.estado_pago == "completado"

def test_delete_non_confirmed_booking(client, admin_token, booking_data, session):
    """Test que verifica el manejo de reservas no confirmadas al eliminar."""
    # Crear reserva no confirmada
    test_data = booking_data.copy()
    test_data['estado'] = 'pendiente'
    test_data['notas'] = f"TEST_DELETE_PENDING_{datetime.now().strftime('%f')}"
    
    response = client.post(
        '/api/bookings',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(test_data),
        content_type='application/json'
    )
    assert response.status_code == 201
    
    # Obtener ID de la reserva
    booking = session.query(Booking).filter_by(notas=test_data['notas']).first()
    assert booking is not None
    
    # Eliminar reserva
    delete_response = client.delete(
        f'/api/bookings/{booking.id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert delete_response.status_code == 200
    data = json.loads(delete_response.data)
    assert data['income_updated'] is False
    
    # Verificar que no hay Income relacionado
    income = session.query(Income).filter_by(booking_id=booking.id).first()
    assert income is None

# Mantener pruebas existentes (get, update básico, etc.)
def test_get_all_bookings(client, admin_token, create_test_booking):
    """Test para obtener todas las reservaciones."""
    response = client.get(
        '/api/bookings',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)

def test_update_booking_basic(client, admin_token, create_test_booking):
    """Test básico para actualizar una reservación."""
    booking = create_test_booking
    
    update_data = {
        'estado': 'check-in',
        'notas': 'Actualización de prueba'
    }

    response = client.put(
        f'/api/bookings/{booking.id}',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(update_data),
        content_type='application/json'
    )
    assert response.status_code == 200