import json
import pytest

@pytest.fixture
def regular_user(session):
    """Crea un usuario regular en la base de datos para pruebas."""
    from backend.models.user import User
    
    # Verificar si ya existe
    existing_user = session.query(User).filter_by(email="user_test@hotel.com").first()
    if existing_user:
        return existing_user
    
    # Si no existe, crear nuevo usuario
    user = User(
        nombre="Regular User Test",
        email="user_test@hotel.com",
        role="user"
    )
    user.set_password("123456")
    session.add(user)
    session.commit()
    return user

@pytest.fixture
def user_token(regular_user):
    """Genera un token JWT para un usuario regular."""
    from flask_jwt_extended import create_access_token
    
    token = create_access_token(
        identity=regular_user.email,
        additional_claims={"role": regular_user.role}
    )
    return token

@pytest.fixture
def temp_user_data():
    """Datos para crear un usuario temporal."""
    return {
        "nombre": "Temp User",
        "email": "temp_user@hotel.com",
        "password": "password123",
        "role": "user"
    }

def test_get_all_users(client, admin_token):
    """Test getting all users (admin only)."""
    response = client.get(
        '/api/users',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    # Validaciones más detalladas
    assert isinstance(data, list), "La respuesta debería ser una lista"
    assert len(data) >= 1, "Debería haber al menos un usuario (admin)"
    
    # Verificar estructura de datos y seguridad
    for user in data:
        assert 'id' in user, "Cada usuario debe tener un ID"
        assert 'email' in user, "Cada usuario debe tener un email"
        assert 'password' not in user, "Las contraseñas no deben ser retornadas"

def test_get_user_by_id(client, admin_token, regular_user):
    """Test getting a user by ID."""
    # Obtener el ID del usuario regular
    response = client.get(
        '/api/users',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    users = json.loads(response.data)
    user_id = None
    
    for user in users:
        if user['email'] == regular_user.email:
            user_id = user['id']
            break
    
    assert user_id is not None, f"Usuario con email {regular_user.email} no encontrado"
    
    # Obtener el usuario por ID
    response = client.get(
        f'/api/users/{user_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['email'] == regular_user.email
    assert data['nombre'] == regular_user.nombre
    assert 'password' not in data

def test_create_user_as_admin(client, admin_token, temp_user_data):
    """Test creating a new user as admin."""
    response = client.post(
        '/api/users',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps(temp_user_data),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'message' in data
    
    # Verificar que el usuario fue creado
    users_response = client.get(
        '/api/users',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    users = json.loads(users_response.data)
    assert any(user['email'] == temp_user_data['email'] for user in users)

def test_create_user_unauthorized(client, admin_token, user_token, temp_user_data):
    """Test creating a new user como usuario regular (debería fallar)."""
    # Modificar email para evitar conflictos
    temp_data = temp_user_data.copy()
    temp_data['email'] = "unauthorized_creation@hotel.com"
    
    response = client.post(
        '/api/users',
        headers={'Authorization': f'Bearer {user_token}'},
        data=json.dumps(temp_data),
        content_type='application/json'
    )
    
    assert response.status_code == 403
    data = json.loads(response.data)
    assert 'error' in data
    
    # Verificar que el usuario no fue creado
    admin_response = client.get(
        '/api/users',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    users = json.loads(admin_response.data)
    assert not any(user['email'] == temp_data['email'] for user in users)

def test_update_user(client, admin_token, regular_user):
    """Test updating a user."""
    # Obtener ID del usuario
    users_response = client.get(
        '/api/users',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    users = json.loads(users_response.data)
    user_id = None
    
    for user in users:
        if user['email'] == regular_user.email:
            user_id = user['id']
            break
    
    assert user_id is not None, "Usuario no encontrado"
    
    # Actualizar usuario
    new_name = "Nombre Actualizado"
    response = client.put(
        f'/api/users/{user_id}',
        headers={'Authorization': f'Bearer {admin_token}'},
        data=json.dumps({
            'nombre': new_name
        }),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    
    # Verificar actualización
    get_response = client.get(
        f'/api/users/{user_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    data = json.loads(get_response.data)
    assert data['nombre'] == new_name
    assert data['email'] == regular_user.email  # El email no debe cambiar

def test_delete_user(client, admin_token, session):
    """Test deleting a user."""
    from backend.models.user import User
    
    # Crear usuario específico para eliminación
    delete_user = User(
        nombre="User To Delete",
        email="delete_me@hotel.com",
        role="user"
    )
    delete_user.set_password("password123")
    session.add(delete_user)
    session.commit()
    
    # Obtener ID del usuario creado
    users_response = client.get(
        '/api/users',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    users = json.loads(users_response.data)
    user_id = None
    
    for user in users:
        if user['email'] == "delete_me@hotel.com":
            user_id = user['id']
            break
    
    assert user_id is not None, "Usuario a eliminar no encontrado"
    
    # Eliminar usuario
    response = client.delete(
        f'/api/users/{user_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    
    # Verificar eliminación
    get_response = client.get(
        f'/api/users/{user_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert get_response.status_code == 404