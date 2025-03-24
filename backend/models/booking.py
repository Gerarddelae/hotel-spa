from ..extensions import db
from datetime import datetime

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    habitacion_id = db.Column(db.Integer, db.ForeignKey('room.id'), nullable=False)
    check_in = db.Column(db.DateTime, nullable=False)  # Cambiado a DateTime
    check_out = db.Column(db.DateTime, nullable=False)  # Cambiado a DateTime
    tipo_habitacion = db.Column(db.String(50), nullable=False)
    num_huespedes = db.Column(db.Integer, nullable=False)
    metodo_pago = db.Column(db.String(50), nullable=False)
    estado = db.Column(db.String(20), nullable=False)
    notas = db.Column(db.Text, nullable=True)
    valor_reservacion = db.Column(db.Float, nullable=False, default=0.0)

    cliente = db.relationship("Client", backref="bookings")
    habitacion = db.relationship("Room", backref="bookings")
