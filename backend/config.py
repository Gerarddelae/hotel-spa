import os
from datetime import timedelta

class Config:
    # Rutas de la base de datos
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DB_PATH = os.path.join(BASE_DIR, "database", "hotel.db")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Configuración JSON
    JSON_SORT_KEYS = False
    JSON_ENSURE_ASCII = False
    
    # Configuración de la base de datos
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{DB_PATH}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuración JWT
    JWT_SECRET_KEY = "supersecretkey"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=9)
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JWT_COOKIE_SECURE = False  # Cambiar a True en producción

class TestConfig(Config):
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'  # Base de datos en memoria
    TESTING = True
    JWT_SECRET_KEY = 'test_secret_key'  # Clave secreta para pruebas