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
                    alertas = [{"id": r.id, "cliente": r.cliente.nombre, "vencimiento": r.check_out} for r in proximas]
                    logger.info(f"Se encontraron {len(alertas)} reservas próximas a vencer.")
                    socketio.emit("alerta_proxima", {"alertas": alertas})

                # Verificar reservas vencidas y actualizar habitaciones
                vencidas = Booking.query.filter(
                    Booking.check_out <= ahora,
                    Booking.estado != "Finalizada"
                ).all()

                if vencidas:
                    for reserva in vencidas:
                        archivo_reserva = Archivo(
                            booking_id=reserva.id,
                            cliente_id=reserva.cliente_id,
                            habitacion_id=reserva.habitacion_id,
                            check_in=reserva.check_in,
                            check_out=reserva.check_out,
                            tipo_habitacion=reserva.tipo_habitacion,
                            num_huespedes=reserva.num_huespedes,
                            metodo_pago=reserva.metodo_pago,
                            notas=reserva.notas,
                            valor_reservacion=reserva.valor_reservacion,
                            fecha_archivo=ahora,
                            motivo="Reserva vencida"
                        )
                        db.session.add(archivo_reserva)

                        reserva.estado = "Finalizada"
                        habitacion = Room.query.get(reserva.habitacion_id)
                        if habitacion:
                            habitacion.disponibilidad = "Disponible"

                    db.session.commit()
                    logger.info(f"Se encontraron {len(vencidas)} reservas vencidas y se archivaron correctamente.")
                    socketio.emit("reserva_vencida", {"vencidas": [r.id for r in vencidas]})

            except Exception as e:
                logger.error(f"Error en verificar_reservas: {str(e)}")
                db.session.rollback()