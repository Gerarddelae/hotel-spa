from datetime import datetime, timedelta
from ..extensions import db, socketio, scheduler, logger
from ..models import Booking, Room

def register_tasks():
    @scheduler.task('interval', id='verificar_reservas', minutes=1)
    def verificar_reservas():
        with scheduler.app.app_context():
            try:
                ahora = datetime.now()
                umbral = ahora + timedelta(minutes=10)
                logger.info(f"Ejecutando verificación de reservas en {ahora.strftime('%Y-%m-%d %H:%M:%S')}")

                # 1. Verificar reservas próximas a vencer (para notificaciones)
                proximas = Booking.query.filter(
                    Booking.check_out <= umbral,
                    Booking.check_out > ahora,
                    Booking.notificado == False,
                    Booking.estado != 'vencida'
                ).all()

                if proximas:
                    alertas = [{"id": r.id, "cliente": r.cliente.nombre, "vencimiento": r.check_out.isoformat()} for r in proximas]
                    logger.info(f"Reservas próximas a vencer: {len(alertas)}")
                    socketio.emit("alerta_proxima", {"alertas": alertas})

                    for reserva in proximas:
                        reserva.notificado = True
                    db.session.commit()

                # 2. Procesar reservas vencidas
                vencidas = Booking.query.filter(
                    Booking.check_out <= ahora
                ).all()

                if vencidas:
                    for reserva in vencidas:
                        # Cambiar estado de la reserva
                        reserva.estado = 'vencida'
                        
                        # Liberar la habitación
                        if reserva.habitacion:
                            habitacion = Room.query.get(reserva.habitacion.id)
                            if habitacion:
                                habitacion.estado = 'disponible'
                    
                    db.session.commit()
                    
                    vencidas_data = [{"id": r.id, "cliente": r.cliente.nombre, "vencimiento": r.check_out.isoformat()} for r in vencidas]
                    logger.info(f"Reservas marcadas como vencidas: {len(vencidas)}")
                    socketio.emit("reserva_vencida", {"vencidas": vencidas_data})

            except Exception as e:
                logger.error(f"Error al verificar reservas: {str(e)}")
                db.session.rollback()