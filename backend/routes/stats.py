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
        # Consulta de ingresos diarios (booking + archive)
        booking_revenue = db.session.query(
            func.strftime('%Y-%m-%d', Booking.check_in).label('date'),
            func.sum(Income.monto).label('revenue')
        ).join(
            Income, Income.booking_id == Booking.id
        ).filter(
            Income.estado_pago == 'confirmado',
            Booking.check_in >= (datetime.now() - timedelta(days=30))
        ).group_by('date')
        
        archive_revenue = db.session.query(
            func.strftime('%Y-%m-%d', Archivo.check_in).label('date'),
            func.sum(Income.monto).label('revenue')
        ).join(
            Income, Income.archive_id == Archivo.id
        ).filter(
            Income.estado_pago == 'confirmado',
            Archivo.check_in >= (datetime.now() - timedelta(days=30))
        ).group_by('date')
        
        # Combinar resultados
        revenue_data = booking_revenue.union(archive_revenue).all()
        
        # Procesar para sumar por fecha
        revenue_by_date = {}
        for date, revenue in revenue_data:
            revenue_by_date[date] = revenue_by_date.get(date, 0) + (float(revenue) if revenue else 0.0)
        
        result = [{
            "time": date,
            "revenue": amount
        } for date, amount in revenue_by_date.items()]
        
        result.sort(key=lambda x: x['time'])
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@stats_bp.route("/api/stats/daily-clients", methods=["GET"])
@jwt_required()
def get_daily_clients():
    try:
        # Consulta de clientes diarios usando fecha_pago de Income
        clients_data = db.session.query(
            func.strftime('%Y-%m-%d', Income.fecha_pago).label('date'),
            func.count(func.distinct(Income.cliente_id)).label('clients')
        ).filter(
            Income.fecha_pago >= (datetime.now() - timedelta(days=30)),
            Income.estado_pago == 'confirmado'  # Solo pagos confirmados
        ).group_by(
            func.strftime('%Y-%m-%d', Income.fecha_pago)
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
        # Usando fecha_pago en lugar de check_in para reflejar cuando se recibió el pago
        booking_revenue = db.session.query(
            func.strftime('%Y-%m', Income.fecha_pago).label('month'),
            func.sum(Income.monto).label('revenue')
        ).filter(
            Income.booking_id.isnot(None),
            Income.estado_pago == 'confirmado',
            Income.fecha_pago >= (datetime.now() - timedelta(days=365))
        ).group_by('month')
        
        archive_revenue = db.session.query(
            func.strftime('%Y-%m', Income.fecha_pago).label('month'),
            func.sum(Income.monto).label('revenue')
        ).filter(
            Income.archive_id.isnot(None),
            Income.estado_pago == 'confirmado',
            Income.fecha_pago >= (datetime.now() - timedelta(days=365))
        ).group_by('month')
        
        # Combinar resultados
        revenue_data = booking_revenue.union(archive_revenue).all()
        
        # Procesar para sumar por mes
        revenue_by_month = {}
        for month, revenue in revenue_data:
            revenue_by_month[month] = revenue_by_month.get(month, 0) + (float(revenue) if revenue else 0.0)
        
        # Formatear para Lightweight Charts
        result = [{
            "time": f"{month}-01",
            "value": amount,
            "color": "#4CAF50"
        } for month, amount in revenue_by_month.items()]
        
        result.sort(key=lambda x: x['time'])
        
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@stats_bp.route("/api/stats/current-month-payments", methods=["GET"])
@jwt_required()
def get_current_month_payments():
    try:
        today = datetime.now()
        first_day_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Consulta para todos los métodos de pago
        payments_data = db.session.query(
            Income.metodo_pago,
            func.sum(Income.monto).label('total'),
            func.count(Income.id).label('count')
        ).filter(
            Income.fecha_pago >= first_day_of_month,
            Income.estado_pago == 'confirmado'
        ).group_by(
            Income.metodo_pago
        ).all()
        
        # Procesar resultados
        payment_methods = {}
        total = 0.0
        total_transactions = 0
        
        for metodo, monto, count in payments_data:
            key = metodo.lower()
            payment_methods[key] = {
                "amount": float(monto) if monto else 0.0,
                "count": int(count) if count else 0
            }
            total += float(monto) if monto else 0.0
            total_transactions += int(count) if count else 0
        
        return jsonify({
            "month": today.strftime("%Y-%m"),
            "payment_methods": payment_methods,
            "total": total,
            "total_transactions": total_transactions,
            "currency": "USD"
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@stats_bp.route("/api/stats/quick-stats", methods=["GET"])
@jwt_required()
def get_quick_stats():
    try:
        today = datetime.now()
        first_day_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 1. Ingresos este mes
        monthly_revenue = db.session.query(
            func.sum(Income.monto)
        ).filter(
            Income.fecha_pago >= first_day_of_month,
            Income.estado_pago == 'confirmado'
        ).scalar() or 0.0
        
        # 2. Clientes este mes (únicos) - BASADO EN PAGOS CONFIRMADOS
        monthly_clients = db.session.query(
            func.count(func.distinct(Income.cliente_id))
        ).filter(
            Income.fecha_pago >= first_day_of_month,
            Income.estado_pago == 'confirmado'
        ).scalar() or 0
        
        # 3. Ocupación actual
        total_rooms = db.session.query(func.count(Room.id)).scalar() or 1  # Evitar división por cero
        occupied_rooms = db.session.query(func.count(Room.id)).filter(
            Room.disponibilidad != "Disponible"
        ).scalar() or 0
        occupancy_percentage = (occupied_rooms / total_rooms) * 100
        
        # 4. Pagos hoy
        today_payments = db.session.query(
            func.count(Income.id)
        ).filter(
            Income.fecha_pago >= today_start,
            Income.estado_pago == 'confirmado'
        ).scalar() or 0
        
        return jsonify({
            "monthly_revenue": float(monthly_revenue),
            "monthly_clients": int(monthly_clients),
            "occupancy_percentage": round(float(occupancy_percentage), 2),
            "today_payments": int(today_payments),
            "last_updated": today.isoformat(),
            "currency": "USD"
        })
        
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
        total_rooms = db.session.query(func.count(Room.id)).scalar() or 1
        occupied_rooms = db.session.query(func.count(Room.id)).filter(
            Room.disponibilidad != "Disponible"
        ).scalar() or 0
        
        # Asegurar que el porcentaje no sea None
        occupancy_percentage = round((occupied_rooms / total_rooms) * 100, 2) if total_rooms > 0 else 0.0
        
        return jsonify({
            "total_habitaciones": total_rooms,
            "habitaciones_ocupadas": occupied_rooms,
            "porcentaje_ocupacion": occupancy_percentage,
            "unidad": "porcentaje"
        })
    
    except Exception as e:
        return jsonify({
            "total_habitaciones": 1,
            "habitaciones_ocupadas": 0,
            "porcentaje_ocupacion": 0.0,
            "unidad": "porcentaje",
            "error": str(e)
        }), 500