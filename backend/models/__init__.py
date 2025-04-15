from .user import User
from .client import Client
from .room import Room
from .booking import Booking
from .archive import Archivo
from .income import Income

# Diccionario de modelos para acceso dinámico
MODELS = {
    "users": User,
    "clients": Client,
    "rooms": Room,
    "bookings": Booking,
    "archives": Archivo,
    "incomes": Income,
}