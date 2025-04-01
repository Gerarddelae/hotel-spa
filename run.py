from backend.app import create_app, init_db

# Crear la aplicación
app = create_app()

# Inicializar la base de datos
init_db(app)

# Ejecutar la aplicación
if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5000)