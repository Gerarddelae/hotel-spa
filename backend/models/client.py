from ..extensions import db

class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    documento = db.Column(db.String(20), unique=True, nullable=False)
    fecha_nacimiento = db.Column(db.String(10), nullable=False)
    preferencias = db.Column(db.String(255), nullable=True)
    comentarios = db.Column(db.Text, nullable=True)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)