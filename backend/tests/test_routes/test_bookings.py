import json
from datetime import datetime, timedelta
import pytest

@pytest.fixture
def test_client(client, admin_token, session):
    """Crea un cliente de prueba en la base de datos."""
    from backend.models.client import Client
    
    # Comprobar si ya existe un cliente de prueba con el mismo email o documento
    existing_client = session.query(Client).filter_by(email="cliente_prueba@test.com").first()
    if existing_client:
        return existing_client
    
    # Crear un cliente específico para las pruebas
    test_client = Client(
        nombre="Cliente Prueba",
        email="cliente_prueba@test.com",
        telefono="555-123-4567",
        documento="ABC123456789",  # Documento único
        fecha_nacimiento="1990-01-01",
        preferencias="Habitación con vista al mar",
        comentarios="Cliente creado para pruebas automatizadas"
    )
    
    session.add(test_client)
    session.commit()
    
    session.refresh(test_client)  # Ensure the ID is populated
    return test_client
    return test_client

@pytest.fixture
def test_room(client, admin_token, session):
    """Crea una habitación de prueba en la base de datos."""
    from backend.models.room import Room
    
    # Crear una habitación específica para pruebas
    test_room = Room(
        num_habitacion=500,  # Número alto para evitar conflictos
        tipo="Suite Prueba",
        capacidad=2,
        precio_noche=200.00,
        disponibilidad="disponible",
        amenidades="WiFi, TV, Minibar",
        vista="Mar",
        notas="Habitación para pruebas de reservación"
    )
    
    session.add(test_room)
    session.commit()
    
    # Obtener la habitación con su ID
    session.refresh(test_room)  # Ensure the ID is populated
    return test_room
    return test_room
    return test_room

@pytest.fixture
def booking_data(test_client, test_room):
    """Datos para crear una reservación de prueba con fecha y hora."""
    tomorrow = datetime.now() + timedelta(days=1)
    three_days_later = datetime.now() + timedelta(days=3)

    return {
        'cliente_id': test_client.id,
        'habitacion_id': test_room.id,
        'check_in': tomorrow.strftime("%Y-%m-%dT%H:%M:%S"),  # Formato específico
        'check_out': three_days_later.strftime("%Y-%m-%dT%H:%M:%S"),  # Formato específico
        'tipo_habitacion': test_room.tipo,
        'num_huespedes': 2,
        'metodo_pago': 'Tarjeta',
        'estado': 'confirmada',
        'notas': 'Reservación de prueba',
        'valor_reservacion': test_room.precio_noche * 2
    }

@pytest.fixture
def create_test_booking(client, admin_token, booking_data):
    """Crea una reservación de prueba y retorna sus datos."""
    # Añadir una nota única para identificar fácilmente
    unique_note = f"Test booking {datetime.now().strftime('%Y%m%d%H%M%S')}"
    test_data = booking_data.copy()
    test_data['notas'] = unique_note
    
    # Crear la reservación
    response = client.post(
        '/api/bookings',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(test_data),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    
    # Obtener todas las reservaciones
    bookings_response = client.get(
        '/api/bookings',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    bookings = json.loads(bookings_response.data)
    
    # Encontrar la reservación por la nota única
    found_booking = None
    for booking in bookings:
        if booking.get('notas') == unique_note:
            found_booking = booking
            break
    
    assert found_booking is not None, f"No se encontró la reservación con nota: {unique_note}"
    return found_booking

def test_create_booking(client, admin_token, booking_data):
    """Test para crear una nueva reservación."""
    response = client.post(
        '/api/bookings',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(booking_data),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    print(response.data)  # Agregar esto para ver la respuesta completa
    assert 'message' in data
    assert 'exitosamente' in data['message'].lower()

def test_create_booking_invalid_dates(client, admin_token, booking_data):
    """Test para verificar validación de fechas (check-out antes de check-in)."""
    invalid_data = booking_data.copy()
    invalid_data['check_in'] = (datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d')
    invalid_data['check_out'] = (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')
    
    response = client.post(
        '/api/bookings',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(invalid_data),
        content_type='application/json'
    )
    
    # Debería fallar con un 400 Bad Request si tu API valida las fechas
    assert response.status_code == 400 or response.status_code == 500

def test_get_all_bookings(client, admin_token, create_test_booking):
    """Test para obtener todas las reservaciones."""
    response = client.get(
        '/api/bookings',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) >= 1
    
    # Verificar estructura de datos
    booking = data[0]
    essential_fields = ['id', 'cliente_id', 'habitacion_id', 'check_in', 
                        'check_out', 'estado', 'valor_reservacion']
    for field in essential_fields:
        assert field in booking, f"Campo '{field}' falta en la respuesta"

def test_get_booking_by_id(client, admin_token, create_test_booking):
    """Test para obtener una reservación por ID."""
    booking_id = create_test_booking['id']
    
    response = client.get(
        f'/api/bookings/{booking_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['id'] == booking_id
    assert data['cliente_id'] == create_test_booking['cliente_id']
    assert data['habitacion_id'] == create_test_booking['habitacion_id']
    assert data['estado'] == create_test_booking['estado']

def test_get_booking_nonexistent(client, admin_token):
    """Test para intentar obtener una reservación inexistente."""
    response = client.get(
        '/api/bookings/99999',  # ID que probablemente no existe
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 404

import json
from datetime import datetime

def test_update_booking(client, admin_token, create_test_booking):
    """Test para actualizar una reservación."""
    booking_id = create_test_booking['id']

    update_data = {
        'estado': 'check-in',
        'notas': 'Cliente llegó a tiempo',
        'num_huespedes': 3  # Actualizar huéspedes
    }

    response = client.put(
        f'/api/bookings/{booking_id}',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(update_data),
        content_type='application/json'
    )

    assert response.status_code == 200

    # Verificar actualización
    get_response = client.get(
        f'/api/bookings/{booking_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    data = json.loads(get_response.data)

    assert data['estado'] == update_data['estado']
    assert data['notas'] == update_data['notas']
    assert data['num_huespedes'] == update_data['num_huespedes']

    # Verificar que otros campos no cambiaron
    assert data['cliente_id'] == create_test_booking['cliente_id']
    assert data['habitacion_id'] == create_test_booking['habitacion_id']
    
    # Parsear y comparar fechas
    def parse_date(date_str):
        try:
            # Intentar parsear desde formato ISO 8601
            return datetime.fromisoformat(date_str.replace('Z', ''))
        except ValueError:
            # Si falla, intentar parsear desde formato HTTP
            return datetime.strptime(date_str, '%a, %d %b %Y %H:%M:%S GMT')

    original_date = parse_date(create_test_booking['check_in'])
    returned_date = parse_date(data['check_in'])
    
    assert original_date == returned_date, \
        f"Dates do not match. Original: {original_date}, Returned: {returned_date}"

def test_cancel_booking(client, admin_token, create_test_booking):
    """Test para cancelar una reservación."""
    booking_id = create_test_booking['id']
    
    response = client.put(
        f'/api/bookings/{booking_id}',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps({
            'estado': 'cancelada',
            'notas': 'Cancelada por prueba automatizada'
        }),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    
    # Verificar que se canceló correctamente
    get_response = client.get(
        f'/api/bookings/{booking_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    data = json.loads(get_response.data)
    assert data['estado'] == 'cancelada'

def test_delete_booking(client, admin_token, booking_data, db_session):
    """Test para eliminar una reservación con manejo adecuado de sesiones"""
    from backend.models import Booking, Archivo, Room
    
    # 1. Crear reserva con identificador único
    test_data = {
        **booking_data,
        "notas": f"TEST_DELETE_{datetime.now().strftime('%f')}",
        "valor_reservacion": 1500.00
    }
    
    # Crear reserva
    response = client.post(
        '/api/bookings',
        headers={'Authorization': f'Bearer {admin_token}'},
        json=test_data
    )
    assert response.status_code == 201
    
    # Obtener ID directamente de la base de datos
    booking = db_session.query(Booking).filter_by(notas=test_data['notas']).first()
    assert booking, "Reserva no encontrada en DB"
    booking_id = booking.id
    
    # 2. Eliminar la reserva
    delete_response = client.delete(
        f'/api/bookings/{booking_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    # Verificar respuesta
    assert delete_response.status_code == 200, (
        f"Error al eliminar. Status: {delete_response.status_code}\n"
        f"Respuesta: {delete_response.data.decode()}"
    )
    
    # 3. Verificar que se archivó
    archived = db_session.query(Archivo).filter_by(booking_id=booking_id).first()
    assert archived, "No se encontró el registro archivado"
    
    # 4. Verificar que se liberó la habitación
    room = db_session.query(Room).get(test_data["habitacion_id"])
    assert room.disponibilidad.lower() == "disponible", "Habitación no liberada"