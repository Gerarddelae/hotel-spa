from .user import User
from .client import Client
from .room import Room
from .booking import Booking
from .archive import Archivo

# Diccionario de modelos para acceso dinámico
MODELS = {
    "users": User,
    "clients": Client,
    "rooms": Room,
    "bookings": Booking,
    "archives": Archivo,
}