from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Income, Booking, Archivo, Client
from datetime import datetime

income_bp = Blueprint('income', __name__)

@income_bp.route("/api/incomes", methods=["GET"])
@jwt_required()
def get_all_incomes():
    try:
        incomes = Income.query.order_by(Income.fecha_pago.desc()).all()
        
        resultado = []
        for income in incomes:
            # Determinar si el ingreso está vinculado a Booking o Archive
            source = "booking" if income.booking_id else "archive"
            source_id = income.booking_id if income.booking_id else income.archive_id
            
            income_dict = {
                "id": income.id,
                "source": source,
                "source_id": source_id,
                "cliente_id": income.cliente_id,
                "nombre_cliente": income.nombre_cliente,
                "documento": income.documento,
                "fecha_pago": income.fecha_pago.isoformat(),
                "monto": income.monto,
                "metodo_pago": income.metodo_pago,
                "estado_pago": income.estado_pago,
                "notas": income.notas
            }
            resultado.append(income_dict)

        return jsonify(resultado)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@income_bp.route("/api/incomes/<int:income_id>", methods=["GET"])
@jwt_required()
def get_income(income_id):
    try:
        income = Income.query.get(income_id)
        if not income:
            return jsonify({"error": "Registro de ingreso no encontrado"}), 404
        
        # Determinar la fuente del ingreso
        source = "booking" if income.booking_id else "archive"
        source_id = income.booking_id if income.booking_id else income.archive_id
        
        income_dict = {
            "id": income.id,
            "source": source,
            "source_id": source_id,
            "cliente_id": income.cliente_id,
            "nombre_cliente": income.nombre_cliente,
            "documento_cliente": income.documento_cliente,
            "fecha_pago": income.fecha_pago.isoformat(),
            "monto": income.monto,
            "metodo_pago": income.metodo_pago,
            "estado_pago": income.estado_pago,
            "notas": income.notas
        }
        
        return jsonify(income_dict)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@income_bp.route("/api/incomes/booking/<int:booking_id>", methods=["GET"])
@jwt_required()
def get_income_by_booking(booking_id):
    try:
        income = Income.query.filter_by(booking_id=booking_id).first()
        if not income:
            return jsonify({"error": "No se encontró ingreso para esta reserva activa"}), 404
        
        income_dict = {
            "id": income.id,
            "cliente_id": income.cliente_id,
            "nombre_cliente": income.nombre_cliente,
            "documento_cliente": income.documento_cliente,
            "fecha_pago": income.fecha_pago.isoformat(),
            "monto": income.monto,
            "metodo_pago": income.metodo_pago,
            "estado_pago": income.estado_pago,
            "notas": income.notas
        }
        
        return jsonify(income_dict)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@income_bp.route("/api/incomes/archive/<int:archive_id>", methods=["GET"])
@jwt_required()
def get_income_by_archive(archive_id):
    try:
        income = Income.query.filter_by(archive_id=archive_id).first()
        if not income:
            return jsonify({"error": "No se encontró ingreso para esta reserva archivada"}), 404
        
        income_dict = {
            "id": income.id,
            "cliente_id": income.cliente_id,
            "nombre_cliente": income.nombre_cliente,
            "documento_cliente": income.documento_cliente,
            "fecha_pago": income.fecha_pago.isoformat(),
            "monto": income.monto,
            "metodo_pago": income.metodo_pago,
            "estado_pago": income.estado_pago,
            "notas": income.notas
        }
        
        return jsonify(income_dict)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@income_bp.route("/api/incomes/client/<int:cliente_id>", methods=["GET"])
@jwt_required()
def get_incomes_by_client(cliente_id):
    try:
        incomes = Income.query.filter_by(cliente_id=cliente_id).order_by(Income.fecha_pago.desc()).all()
        
        resultado = []
        for income in incomes:
            source = "booking" if income.booking_id else "archive"
            source_id = income.booking_id if income.booking_id else income.archive_id
            
            income_dict = {
                "id": income.id,
                "source": source,
                "source_id": source_id,
                "fecha_pago": income.fecha_pago.isoformat(),
                "monto": income.monto,
                "metodo_pago": income.metodo_pago,
                "estado_pago": income.estado_pago
            }
            resultado.append(income_dict)

        return jsonify(resultado)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@income_bp.route("/api/incomes/status/<string:estado>", methods=["GET"])
@jwt_required()
def get_incomes_by_status(estado):
    try:
        incomes = Income.query.filter_by(estado_pago=estado).order_by(Income.fecha_pago.desc()).all()
        
        resultado = []
        for income in incomes:
            source = "booking" if income.booking_id else "archive"
            
            income_dict = {
                "id": income.id,
                "source": source,
                "cliente_id": income.cliente_id,
                "nombre_cliente": income.nombre_cliente,
                "monto": income.monto,
                "fecha_pago": income.fecha_pago.isoformat()
            }
            resultado.append(income_dict)

        return jsonify(resultado)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500