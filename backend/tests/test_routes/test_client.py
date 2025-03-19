import json
import pytest
from datetime import datetime

@pytest.fixture
def client_data():
    """Proporciona datos para un cliente de prueba."""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    return {
        'nombre': f'Cliente Prueba {timestamp}',
        'email': f'cliente{timestamp}@test.com',
        'telefono': f'555{timestamp[-6:]}',
        'documento': f'DOC{timestamp}',
        'fecha_nacimiento': '1990-01-01',
        'preferencias': 'Habitación tranquila',
        'comentarios': 'Cliente creado para pruebas automatizadas'
    }

@pytest.fixture
def create_test_client(client, admin_token, client_data):
    """Crea un cliente de prueba y retorna sus datos."""
    response = client.post(
        '/api/clients',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(client_data),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    
    # Buscar el cliente creado por su email único
    clients_response = client.get(
        '/api/clients',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    clients = json.loads(clients_response.data)
    
    test_client = next((c for c in clients if c['email'] == client_data['email']), None)
    assert test_client is not None, f"No se encontró el cliente con email {client_data['email']}"
    
    return test_client

def test_create_client(client, admin_token, client_data):
    """Test para crear un nuevo cliente."""
    response = client.post(
        '/api/clients',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(client_data),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'message' in data
    assert 'exitosamente' in data['message'].lower()
    
    # Verificar que el cliente fue creado
    clients_response = client.get(
        '/api/clients',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    clients = json.loads(clients_response.data)
    
    created_client = next((c for c in clients if c['email'] == client_data['email']), None)
    assert created_client is not None
    assert created_client['nombre'] == client_data['nombre']
    assert created_client['documento'] == client_data['documento']

def test_create_client_duplicate_email(client, admin_token, create_test_client, client_data):
    """Test para verificar que no se puede crear un cliente con email duplicado."""
    # Usar los mismos datos pero cambiar el documento para que sea único
    duplicate_data = client_data.copy()
    duplicate_data['email'] = create_test_client['email']  # Email duplicado
    duplicate_data['documento'] = f"UNIQUE{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    response = client.post(
        '/api/clients',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(duplicate_data),
        content_type='application/json'
    )
    
    # Debería fallar por email duplicado
    assert response.status_code in [400, 409, 500], "Debería rechazar email duplicado"

def test_create_client_duplicate_documento(client, admin_token, create_test_client, client_data):
    """Test para verificar que no se puede crear un cliente con documento duplicado."""
    # Usar los mismos datos pero cambiar el email para que sea único
    duplicate_data = client_data.copy()
    duplicate_data['documento'] = create_test_client['documento']  # Documento duplicado
    duplicate_data['email'] = f"unique{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
    
    response = client.post(
        '/api/clients',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(duplicate_data),
        content_type='application/json'
    )
    
    # Debería fallar por documento duplicado
    assert response.status_code in [400, 409, 500], "Debería rechazar documento duplicado"

def test_get_all_clients(client, admin_token, create_test_client):
    """Test para obtener todos los clientes."""
    response = client.get(
        '/api/clients',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) >= 1
    
    # Verificar estructura de datos
    client_obj = data[0]
    essential_fields = ['id', 'nombre', 'email', 'telefono', 'documento']
    for field in essential_fields:
        assert field in client_obj, f"Campo '{field}' falta en la respuesta"
    
    # Verificar que nuestro cliente de prueba está en la lista
    client_ids = [c['id'] for c in data]
    assert create_test_client['id'] in client_ids, "El cliente creado no aparece en la lista"

def test_get_client_by_id(client, admin_token, create_test_client):
    """Test para obtener un cliente por ID."""
    client_id = create_test_client['id']
    
    response = client.get(
        f'/api/clients/{client_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['id'] == client_id
    assert data['nombre'] == create_test_client['nombre']
    assert data['email'] == create_test_client['email']
    assert data['documento'] == create_test_client['documento']

def test_get_client_nonexistent(client, admin_token):
    """Test para intentar obtener un cliente que no existe."""
    response = client.get(
        '/api/clients/99999',  # ID probablemente inexistente
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 404

def test_update_client(client, admin_token, create_test_client):
    """Test para actualizar un cliente."""
    client_id = create_test_client['id']
    
    update_data = {
        'telefono': '555-UPDATED',
        'preferencias': 'Habitación actualizada prueba',
        'comentarios': 'Comentarios actualizados'
    }
    
    response = client.put(
        f'/api/clients/{client_id}',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(update_data),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    
    # Verificar actualización
    get_response = client.get(
        f'/api/clients/{client_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    data = json.loads(get_response.data)
    
    assert data['telefono'] == update_data['telefono']
    assert data['preferencias'] == update_data['preferencias']
    assert data['comentarios'] == update_data['comentarios']
    
    # Verificar que campos no actualizados permanecen iguales
    assert data['nombre'] == create_test_client['nombre']
    assert data['email'] == create_test_client['email']
    assert data['documento'] == create_test_client['documento']

def test_delete_client(client, admin_token, client_data):
    """Test para eliminar un cliente."""
    # Crear un cliente específico para eliminar
    delete_data = client_data.copy()
    delete_data['nombre'] = 'Cliente Para Eliminar'
    delete_data['email'] = f'delete{datetime.now().strftime("%Y%m%d%H%M%S")}@test.com'
    delete_data['documento'] = f'DEL{datetime.now().strftime("%Y%m%d%H%M%S")}'
    
    create_response = client.post(
        '/api/clients',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(delete_data),
        content_type='application/json'
    )
    assert create_response.status_code == 201
    
    # Encontrar el cliente creado
    clients_response = client.get(
        '/api/clients',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    clients = json.loads(clients_response.data)
    client_to_delete = next((c for c in clients if c['email'] == delete_data['email']), None)
    assert client_to_delete is not None
    
    # Eliminar el cliente
    delete_response = client.delete(
        f'/api/clients/{client_to_delete["id"]}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert delete_response.status_code == 200
    
    # Verificar que fue eliminado
    get_response = client.get(
        f'/api/clients/{client_to_delete["id"]}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert get_response.status_code == 404