from datetime import datetime, timedelta
from ..extensions import db, socketio, scheduler, logger
from ..models import Booking, Room, Archivo

def register_tasks():
    @scheduler.task('interval', id='verificar_reservas', minutes=1)
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
                    alertas = [{"id": r.id, "cliente": r.cliente.nombre, "vencimiento": r.check_out.isoformat()} for r in proximas]
                    logger.info(f"Se encontraron {len(alertas)} reservas próximas a vencer.")
                    socketio.emit("alerta_proxima", {"alertas": alertas})

                # Verificar reservas vencidas y actualizar habitaciones
                vencidas = Booking.query.filter(
                    Booking.check_out <= ahora
                ).all()

                if vencidas:
                    vencidas_data = [{"id": r.id, "cliente": r.cliente.nombre, "vencimiento": r.check_out.isoformat()} for r in vencidas]
                    logger.info(f"Se encontraron {len(vencidas)} reservas vencidas y se archivaron correctamente.")
                    socketio.emit("reserva_vencida", {"vencidas": vencidas_data})

            except Exception as e:
                logger.error(f"Error en verificar_reservas: {str(e)}")
                db.session.rollback()