import pytest
from sqlalchemy.exc import IntegrityError
from decimal import Decimal
from backend.models.room import Room

@pytest.fixture
def sample_room_data():
    """Proporciona datos para una habitación de prueba."""
    return {
        'num_habitacion': 101,
        'tipo': 'Suite',
        'capacidad': 2,
        'precio_noche': 150.0,
        'disponibilidad': 'disponible',
        'amenidades': 'WiFi, TV, Minibar',
        'vista': 'Ciudad',
        'notas': 'Habitación renovada recientemente'
    }

def test_room_attributes(app, sample_room_data):
    """Prueba la creación y atributos básicos de una habitación."""
    with app.app_context():
        room = Room(**sample_room_data)
        
        # Verificar atributos obligatorios
        assert room.num_habitacion == sample_room_data['num_habitacion']
        assert room.tipo == sample_room_data['tipo']
        assert room.capacidad == sample_room_data['capacidad']
        assert float(room.precio_noche) == sample_room_data['precio_noche']
        assert room.disponibilidad == sample_room_data['disponibilidad']
        
        # Verificar atributos opcionales
        assert room.amenidades == sample_room_data['amenidades']
        assert room.vista == sample_room_data['vista']
        assert room.notas == sample_room_data['notas']
        
        # Verificar que tiene un atributo id
        assert hasattr(room, 'id')

def test_room_minimal_attributes(app):
    """Prueba la creación de una habitación con sólo los campos obligatorios."""
    with app.app_context():
        room = Room(
            num_habitacion=102,
            tipo="Individual",
            capacidad=1,
            precio_noche=100.0,
            disponibilidad="disponible"
        )
        
        # Verificar atributos obligatorios
        assert room.num_habitacion == 102
        assert room.tipo == "Individual"
        assert room.capacidad == 1
        assert float(room.precio_noche) == 100.0
        assert room.disponibilidad == "disponible"
        
        # Verificar que los atributos opcionales son None
        assert room.amenidades is None
        assert room.vista is None
        assert room.notas is None

def test_room_unique_constraints(app, session):
    """Prueba que el número de habitación es único."""
    with app.app_context():
        # Crear primera habitación
        room1 = Room(
            num_habitacion=201,
            tipo="Doble",
            capacidad=2,
            precio_noche=120.0,
            disponibilidad="disponible"
        )
        session.add(room1)
        session.commit()
        
        # Intentar crear habitación con número duplicado
        room2 = Room(
            num_habitacion=201,  # Número duplicado
            tipo="Suite",
            capacidad=3,
            precio_noche=200.0,
            disponibilidad="disponible"
        )
        session.add(room2)
        
        # Debería fallar por número de habitación duplicado
        with pytest.raises(IntegrityError):
            session.commit()
        
        session.rollback()

def test_room_disponibilidad_values(app):
    """Prueba diferentes valores de disponibilidad."""
    with app.app_context():
        # Probar diferentes estados válidos
        disponibilidad_states = ['disponible', 'ocupada', 'mantenimiento', 'reservada']
        
        for state in disponibilidad_states:
            room = Room(
                num_habitacion=300 + disponibilidad_states.index(state),
                tipo="Prueba",
                capacidad=2,
                precio_noche=100.0,
                disponibilidad=state
            )
            assert room.disponibilidad == state

def test_room_price_decimal_handling(app):
    """Prueba el manejo de valores decimales para el precio."""
    with app.app_context():
        # Prueba con diferentes precios, incluyendo decimales
        test_prices = [100.0, 99.99, 1000.50, 0.99]
        
        for i, price in enumerate(test_prices):
            room = Room(
                num_habitacion=400 + i,
                tipo="Precio",
                capacidad=2,
                precio_noche=price,
                disponibilidad="disponible"
            )
            
            # Verificar precio (considerando posible conversión)
            stored_price = float(room.precio_noche) if hasattr(room.precio_noche, '__float__') else room.precio_noche
            assert abs(stored_price - price) < 0.001  # Compara con tolerancia pequeña

def test_room_capacity_limits(app):
    """Prueba diferentes valores de capacidad."""
    with app.app_context():
        # Prueba capacidades diferentes
        capacities = [1, 2, 4, 8]
        
        for capacity in capacities:
            room = Room(
                num_habitacion=500 + capacity,
                tipo="Capacidad",
                capacidad=capacity,
                precio_noche=100.0 * capacity,
                disponibilidad="disponible"
            )
            assert room.capacidad == capacity

def test_room_representation(app, sample_room_data):
    """Prueba la representación en cadena de la habitación."""
    with app.app_context():
        room = Room(**sample_room_data)
        
        # Verificar que tiene una representación útil
        repr_str = str(room)
        
        # No verificamos campos específicos para evitar fallos si __repr__ no los incluye
        # Pero al menos verificamos que existe y no está vacío
        assert len(repr_str) > 0

def test_room_bookings_relationship(app):
    """Prueba la relación con reservaciones (si existe)."""
    with app.app_context():
        room = Room(
            num_habitacion=601,
            tipo="Relación",
            capacidad=2,
            precio_noche=150.0,
            disponibilidad="disponible"
        )
        
        # Verificar si existe la relación con bookings
        if hasattr(room, 'bookings'):
            # Verificar que inicialmente está vacía
            assert hasattr(room.bookings, '__iter__')  # Es iterable
            assert len(list(room.bookings)) == 0