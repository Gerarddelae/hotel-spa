from flask import Blueprint
from datetime import datetime, timedelta
from ..extensions import db, socketio, scheduler, logger  # Importar logger
from ..models import Booking, Room

tareas_bp = Blueprint('tareas', __name__)

@scheduler.task('interval', minutes=1)
def verificar_reservas():
    with scheduler.app.app_context():
        try:
            ahora = datetime.now()
            umbral = ahora + timedelta(minutes=10)
            logger.info(f"Ejecutando verificación de reservas en {ahora.strftime('%Y-%m-%d %H:%M:%S')}")

            # Verificar reservas próximas a vencer
            proximas = Booking.query.filter(
                Booking.check_out <= umbral,
                Booking.check_out > ahora,
                Booking.notificado == False
            ).all()

            if proximas:
                alertas = [{"id": r.id, "cliente": r.cliente, "vencimiento": r.check_out.isoformat()} for r in proximas]
                logger.info(f"Se encontraron {len(alertas)} reservas próximas a vencer.")
                socketio.emit("alerta_proxima", {"alertas": alertas})

            # Verificar reservas vencidas y actualizar habitaciones
            vencidas = Booking.query.filter(
                Booking.check_out <= ahora,
                Booking.estado != "Finalizada"
            ).all()

            if vencidas:
                for reserva in vencidas:
                    reserva.estado = "Finalizada"
                    habitacion = Room.query.get(reserva.habitacion_id)
                    if habitacion:
                        habitacion.disponibilidad = "Disponible"

                vencidas_data = [{
                    "id": r.id,
                    "cliente": r.cliente,
                    "vencimiento": r.check_out.isoformat()
                } for r in vencidas]

                db.session.commit()
                logger.info(f"Se encontraron {len(vencidas_data)} reservas vencidas.")
                socketio.emit("reserva_vencida", {"vencidas": vencidas_data})

        except Exception as e:
            logger.error(f"Error en verificar_reservas: {str(e)}")
            db.session.rollback()