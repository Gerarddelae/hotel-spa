import logging
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_apscheduler.scheduler import APScheduler
from flask_socketio import SocketIO

# Inicializar extensiones
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
scheduler = APScheduler()
socketio = SocketIO(cors_allowed_origins='*')

# Configurar logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hotel_spa")  # Nombre personalizado para el logger