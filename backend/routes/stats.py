from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Income, Booking, Client, Archivo, Room
from datetime import datetime, timedelta
from sqlalchemy import extract, func, case, Date

stats_bp = Blueprint('stats', __name__)

@stats_bp.route("/api/stats/daily-revenue", methods=["GET"])
@jwt_required()
def get_daily_revenue():
    try:
        # Consulta de ingresos diarios (usando check_in como referencia)
        revenue_data = db.session.query(
            func.strftime('%Y-%m-%d', Booking.check_in).label('date'),
            func.sum(Income.monto).label('revenue')
        ).join(
            Income, Income.booking_id == Booking.id
        ).filter(
            Income.estado_pago == 'confirmado',
            Booking.check_in >= (datetime.now() - timedelta(days=30))
        ).group_by(
            func.strftime('%Y-%m-%d', Booking.check_in)
        ).order_by(
            'date'
        ).all()

        result = [{
            "time": date,
            "revenue": float(revenue) if revenue else 0.0
        } for date, revenue in revenue_data]

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@stats_bp.route("/api/stats/daily-clients", methods=["GET"])
@jwt_required()
def get_daily_clients():
    try:
        # Consulta de clientes diarios usando check_in
        clients_data = db.session.query(
            func.strftime('%Y-%m-%d', Booking.check_in).label('date'),
            func.count(func.distinct(Booking.cliente_id)).label('clients')
        ).filter(
            Booking.check_in >= (datetime.now() - timedelta(days=30))
        ).group_by(
            func.strftime('%Y-%m-%d', Booking.check_in)
        ).order_by(
            'date'
        ).all()

        result = [{
            "time": date,
            "clients": int(clients) if clients else 0
        } for date, clients in clients_data]

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@stats_bp.route("/api/stats/monthly-revenue", methods=["GET"])
@jwt_required()
def get_monthly_revenue():
    try:
        # Consulta para ingresos mensuales (últimos 12 meses)
        monthly_data = db.session.query(
            func.strftime('%Y-%m', Booking.check_in).label('month'),
            func.sum(Income.monto).label('revenue')
        ).join(
            Income, Income.booking_id == Booking.id
        ).filter(
            Income.estado_pago == 'confirmado',
            Booking.check_in >= (datetime.now() - timedelta(days=365))
        ).group_by(
            func.strftime('%Y-%m', Booking.check_in)
        ).order_by(
            'month'
        ).all()

        # Formatear para Lightweight Charts (gráfico de barras)
        result = [{
            "time": f"{month}-01",  # Lightweight Charts necesita día completo
            "value": float(revenue) if revenue else 0.0,
            "color": "#4CAF50"  # Color verde para las barras
        } for month, revenue in monthly_data]

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@stats_bp.route("/api/stats/current-month-payments", methods=["GET"])
@jwt_required()
def get_current_month_payments():
    try:
        # Obtener el primer día del mes actual
        today = datetime.now()
        first_day_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Consulta para tarjeta
        card_payments = db.session.query(
            func.sum(Income.monto).label('total')
        ).filter(
            Income.metodo_pago.ilike('%tarjeta%'),
            Income.fecha_pago >= first_day_of_month,
            Income.estado_pago == 'confirmado'
        ).scalar() or 0.0
        
        # Consulta para efectivo
        cash_payments = db.session.query(
            func.sum(Income.monto).label('total')
        ).filter(
            Income.metodo_pago.ilike('%efectivo%'),
            Income.fecha_pago >= first_day_of_month,
            Income.estado_pago == 'confirmado'
        ).scalar() or 0.0
        
        # Formatear respuesta
        result = {
            "month": today.strftime("%Y-%m"),
            "payment_methods": {
                "tarjeta": float(card_payments),
                "efectivo": float(cash_payments)
            },
            "total": float(card_payments + cash_payments)
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@stats_bp.route("/api/stats/top-spenders", methods=["GET"])
@jwt_required()
def get_top_spenders():
    try:
        current_year = datetime.now().year
        
        top_spenders = db.session.query(
            Income.cliente_id,
            Client.nombre,
            Client.documento,
            func.count(Income.id).label('total_transacciones'),
            func.sum(Income.monto).label('total_gastado'),
            func.sum(
                case(
                    (Income.booking_id.isnot(None), 1),
                    else_=0
                )
            ).label('reservas_booking'),
            func.sum(
                case(
                    (Income.archive_id.isnot(None), 1),
                    else_=0
                )
            ).label('reservas_archive')
        ).join(
            Client, Client.id == Income.cliente_id
        ).filter(
            Income.estado_pago == 'confirmado',
            extract('year', Income.fecha_pago) == current_year
        ).group_by(
            Income.cliente_id,
            Client.nombre,
            Client.documento
        ).order_by(
            func.sum(Income.monto).desc()
        ).limit(10).all()
        
        result = [{
            "rank": idx + 1,
            "cliente_id": cliente_id,
            "nombre": nombre,
            "documento": documento,
            "total_transacciones": int(total_transacciones),
            "total_gastado": float(total_gastado),
            "reservas_booking": int(reservas_booking),
            "reservas_archive": int(reservas_archive),
            "total_reservaciones": int(reservas_booking + reservas_archive),
            "moneda": "USD",
            "gasto_promedio": round(float(total_gastado) / (reservas_booking + reservas_archive), 2) if (reservas_booking + reservas_archive) > 0 else 0.0
        } for idx, (cliente_id, nombre, documento, total_transacciones, total_gastado, reservas_booking, reservas_archive) in enumerate(top_spenders)]
        
        return jsonify({
            "year": current_year,
            "top_clientes": result
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@stats_bp.route("/api/stats/current-occupancy", methods=["GET"])
@jwt_required()
def get_current_occupancy():
    try:
        # Consulta para contar habitaciones totales
        total_rooms = db.session.query(func.count(Room.id)).scalar()
        
        # Consulta para contar habitaciones ocupadas (no disponibles)
        occupied_rooms = db.session.query(func.count(Room.id)).filter(
            Room.disponibilidad != "Disponible"
        ).scalar()
        
        # Calcular porcentaje
        occupancy_percentage = (occupied_rooms / total_rooms) * 100 if total_rooms > 0 else 0.0
        
        return jsonify({
            "total_habitaciones": total_rooms,
            "habitaciones_ocupadas": occupied_rooms,
            "porcentaje_ocupacion": round(occupancy_percentage, 2),
            "unidad": "porcentaje"
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500