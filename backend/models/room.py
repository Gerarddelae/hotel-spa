from extensions import db

class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    num_habitacion = db.Column(db.Integer, unique=True, nullable=False)
    tipo = db.Column(db.String(50), nullable=False)
    capacidad = db.Column(db.Integer, nullable=False)
    precio_noche = db.Column(db.Float, nullable=False)
    disponibilidad = db.Column(db.String(20), nullable=False)
    amenidades = db.Column(db.Text, nullable=True)
    vista = db.Column(db.String(50), nullable=True)
    notas = db.Column(db.Text, nullable=True)