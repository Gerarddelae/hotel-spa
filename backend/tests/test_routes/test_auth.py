import json
import pytest

def test_login_success(client, admin_user):
    """Test successful login."""
    response = client.post(
        '/api/auth/login',
        data=json.dumps({
            'email': admin_user.email,  # Usar el email del fixture admin_user
            'password': '123456'       # Contraseña definida en el fixture
        }),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'access_token' in data
    assert data['role'] == 'admin'
    assert data['name'] == 'Admin Test'

def test_login_invalid_credentials(client, admin_user):
    """Test login with invalid credentials."""
    response = client.post(
        '/api/auth/login',
        data=json.dumps({
            'email': admin_user.email,  # Usar el email del fixture admin_user
            'password': 'wrong_password'  # Contraseña incorrecta
        }),
        content_type='application/json'
    )
    
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'error' in data

def test_login_missing_fields(client):
    """Test login with missing fields."""
    response = client.post(
        '/api/auth/login',
        data=json.dumps({
            'email': 'admin_test@hotel.com'  # Falta el campo 'password'
        }),
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

def test_get_current_user(client, admin_token, admin_user):
    """Test getting current user info."""
    response = client.get(
        '/api/me',
        headers={'Authorization': f'Bearer {admin_token}'}  # Usar el token del fixture
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['user'] == admin_user.email  # Usar el email del fixture admin_user
    assert data['role'] == 'admin'

def test_unauthorized_access(client):
    """Test access without authentication."""
    response = client.get('/api/users')
    
    assert response.status_code == 401