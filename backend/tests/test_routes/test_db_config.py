import os
import pytest
from sqlalchemy import inspect

def test_using_test_database(app, session):
    """Verifica que se está usando la base de datos de prueba y no la principal."""
    
    # Verifica la URI de la base de datos
    db_uri = app.config['SQLALCHEMY_DATABASE_URI']
    print(f"\nBase de datos actual: {db_uri}")
    
    # Verifica que sea la de memoria
    assert 'sqlite:///:memory:' == db_uri, f"Se está usando {db_uri} en lugar de la base de datos en memoria"
    
    # Verifica que no sea la base de datos principal
    main_db_path = os.path.join(app.config['BASE_DIR'], "database", "hotel.db")
    main_db_uri = f"sqlite:///{main_db_path}"
    assert db_uri != main_db_uri, "Se está usando la base de datos principal"
    
    # Si llegó aquí, confirma que todo está bien
    print("✅ Confirmado: Se está usando correctamente la base de datos de prueba")

def test_db_tables_exist(app, session):
    """Verifica que las tablas existen en la base de datos de prueba."""
    from backend.extensions import db
    
    # Obtener el inspector de la base de datos
    inspector = inspect(db.engine)
    
    # Listar todas las tablas en la base de datos
    tables = inspector.get_table_names()
    print(f"\nTablas en la base de datos: {', '.join(tables)}")
    
    # Verificar que existen las tablas principales
    expected_tables = ['user', 'client', 'room', 'booking']
    for table in expected_tables:
        assert table in tables, f"La tabla '{table}' no existe en la base de datos de prueba"
    
    print("✅ Confirmado: Todas las tablas necesarias existen en la base de datos de prueba")

def test_admin_user_created(app, admin_user):
    """Verifica que el usuario admin se crea correctamente en la base de prueba."""
    # El fixture admin_user ya verifica implícitamente que se puede crear
    # y recuperar un usuario de la base de datos
    
    assert admin_user.email == "admin_test@hotel.com"
    assert admin_user.role == "admin"
    print(f"\n✅ Usuario admin creado correctamente: {admin_user.email}")