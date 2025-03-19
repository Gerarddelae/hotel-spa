import json
import pytest
from datetime import datetime

@pytest.fixture
def unique_email():
    """Genera un email único para pruebas."""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    return f"test{timestamp}@example.com"

@pytest.fixture
def user_data(unique_email):
    """Proporciona datos para un usuario de prueba."""
    return {
        'nombre': f'Test User {datetime.now().strftime("%H%M%S")}',
        'email': unique_email,
        'password': 'password123',
        'role': 'user'
    }

def test_invalid_model(client, admin_token):
    """Test solicitud a un modelo inválido."""
    response = client.get(
        '/api/invalid_model',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 400 or response.status_code == 404
    
    # Verificar estructura de la respuesta de error
    data = json.loads(response.data)
    assert 'error' in data
    assert isinstance(data['error'], str)
    assert len(data['error']) > 0

def test_record_not_found(client, admin_token):
    """Test obtener un registro inexistente."""
    # Probar con diferentes recursos
    resources = ['users', 'clients', 'rooms', 'bookings']
    
    for resource in resources:
        response = client.get(
            f'/api/{resource}/99999999',  # ID muy alto para garantizar que no existe
            headers={'Authorization': f'Bearer {admin_token}'}
        )
        
        assert response.status_code == 404, f"Falla en recurso: {resource}"
        data = json.loads(response.data)
        assert 'error' in data
        
        # Verificación más flexible del mensaje de error
        error_lowered = data['error'].lower()
        assert any(term in error_lowered for term in [
            'no encontrad', 'not found', 'no exist', 'doesn\'t exist', 
            'inexistent', 'no hallad'
        ]), f"Mensaje de error inesperado: {data['error']}"

def test_invalid_json(client, admin_token):
    """Test enviar JSON inválido en la solicitud."""
    # Probar con varios endpoints que aceptan POST
    endpoints = ['/api/users', '/api/clients', '/api/rooms', '/api/bookings']
    
    for endpoint in endpoints:
        # Caso 1: Datos que no son JSON
        response1 = client.post(
            endpoint,
            headers={'Authorization': f'Bearer {admin_token}'},
            data="Esto no es JSON",
            content_type='application/json'
        )
        
        assert response1.status_code in [400, 422, 500], f"Falla en endpoint: {endpoint}"
        
        # Caso 2: JSON malformado
        response2 = client.post(
            endpoint,
            headers={'Authorization': f'Bearer {admin_token}'},
            data="{invalido: json",
            content_type='application/json'
        )
        
        assert response2.status_code in [400, 422, 500], f"Falla en endpoint: {endpoint}"

def test_duplicate_email_user(client, admin_token, user_data):
    """Test crear un usuario con email duplicado."""
    # Crear el primer usuario
    create_response = client.post(
        '/api/users',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(user_data),
        content_type='application/json'
    )
    assert create_response.status_code == 201
    
    # Intentar crear otro usuario con el mismo email
    response = client.post(
        '/api/users',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps({
            'nombre': 'Otro Usuario',
            'email': user_data['email'],  # Mismo email
            'password': 'otraclave123',
            'role': 'user'
        }),
        content_type='application/json'
    )
    
    assert response.status_code in [400, 409, 422, 500]
    
    # Verificar que el mensaje de error menciona el email duplicado
    data = json.loads(response.data)
    assert 'error' in data
    error_msg = data['error'].lower()
    assert 'duplica' in error_msg or 'existe' in error_msg or 'unique' in error_msg or 'email' in error_msg

def test_missing_required_fields(client, admin_token):
    """Test enviar solicitudes con campos obligatorios faltantes."""
    # Usuarios sin email (requerido)
    response = client.post(
        '/api/users',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps({
            'nombre': 'Usuario Incompleto',
            'password': 'password123',
            'role': 'user'
            # Falta email
        }),
        content_type='application/json'
    )
    
    assert response.status_code in [400, 422, 500]
    
    # Clientes sin documento (requerido)
    response = client.post(
        '/api/clients',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps({
            'nombre': 'Cliente Incompleto',
            'email': f'cliente{datetime.now().strftime("%Y%m%d%H%M%S")}@test.com',
            'telefono': '555-1234',
            'fecha_nacimiento': '1990-01-01'
            # Falta documento
        }),
        content_type='application/json'
    )
    
    assert response.status_code in [400, 422, 500]

def test_unauthorized_access(client):
    """Test acceso sin token o con token inválido."""
    # Sin token
    no_token_response = client.get('/api/users')
    assert no_token_response.status_code == 401
    
    # Token inválido
    invalid_token_response = client.get(
        '/api/users',
        headers={'Authorization': 'Bearer invalid_token_here'}
    )
    assert invalid_token_response.status_code in [401, 422]
    
    # Token con formato incorrecto
    bad_format_response = client.get(
        '/api/users',
        headers={'Authorization': 'invalid_format_token'}
    )
    assert bad_format_response.status_code in [401, 422]

def test_method_not_allowed(client, admin_token):
    """Test métodos HTTP no permitidos."""
    # Intentar usar DELETE en un endpoint que no lo soporta
    response = client.delete(
        '/api/users',  # Endpoint que no soporta DELETE a nivel de colección
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code in [404, 405], "Debería retornar 404 o 405 para método no permitido"
    
    # Intentar usar PUT en un endpoint de creación
    response = client.put(
        '/api/users',  # Endpoint que no soporta PUT a nivel de colección
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps({}),
        content_type='application/json'
    )
    
    assert response.status_code in [404, 405], "Debería retornar 404 o 405 para método no permitido"