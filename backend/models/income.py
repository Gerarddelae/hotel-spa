from sqlalchemy import func
from ..extensions import db

class Income(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # Claves foráneas condicionales (Booking o Archive)
    booking_id = db.Column(db.Integer, db.ForeignKey('booking.id'), nullable=True)
    archive_id = db.Column(db.Integer, db.ForeignKey('archivo.id'), nullable=True)
    
    # Datos del cliente (almacenados directamente para evitar joins)
    cliente_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    nombre_cliente = db.Column(db.String(120), nullable=False)
    documento = db.Column(db.String(20), nullable=False)
    
    # Datos del pago
    fecha_pago = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    monto = db.Column(db.Float, nullable=False)
    metodo_pago = db.Column(db.String(50), nullable=False)
    estado_pago = db.Column(db.String(20), nullable=False, default="confirmado")  # confirmado/reembolsado/anulado
    notas = db.Column(db.Text, nullable=True)

    # Relaciones
    booking = db.relationship("Booking", backref="incomes")
    archive = db.relationship("Archivo", backref="incomes")
    cliente = db.relationship("Client", backref="incomes")

    # Restricción: solo una FK no nula (evita ambigüedad)
    __table_args__ = (
        db.CheckConstraint(
            '(booking_id IS NOT NULL AND archive_id IS NULL) OR (booking_id IS NULL AND archive_id IS NOT NULL)',
            name='check_income_source'
        ),
    )

    def __repr__(self):
        return f"<Income {self.id} - Cliente: {self.nombre_cliente} - Monto: {self.monto}>"