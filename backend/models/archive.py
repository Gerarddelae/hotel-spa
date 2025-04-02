from ..extensions import db
from datetime import datetime
from sqlalchemy import func  # Importa func para usar now()

class Archivo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, nullable=False)  # Referencia al ID original
    cliente_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    habitacion_id = db.Column(db.Integer, db.ForeignKey('room.id'), nullable=False)
    check_in = db.Column(db.DateTime, nullable=False)
    check_out = db.Column(db.DateTime, nullable=False)
    tipo_habitacion = db.Column(db.String(50), nullable=False)
    num_huespedes = db.Column(db.Integer, nullable=False)
    metodo_pago = db.Column(db.String(50), nullable=False)
    notas = db.Column(db.Text, nullable=True)
    valor_reservacion = db.Column(db.Float, nullable=False, default=0.0)

    # Nuevos campos
    fecha_archivo = db.Column(db.DateTime, server_default=func.now(), nullable=False)

    cliente = db.relationship("Client", backref="archivos")
    habitacion = db.relationship("Room", backref="archivos")
