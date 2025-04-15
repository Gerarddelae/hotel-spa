# Hotel SPA - Sistema de Gestión Hotelera

## Descripción General

Hotel SPA es una aplicación de página única (SPA) diseñada para pequeños hoteles que buscan gestionar eficientemente clientes, reservas, habitaciones y otras operaciones esenciales. La plataforma proporciona una interfaz intuitiva para que el personal del hotel maneje las operaciones diarias mientras mantiene una base de datos centralizada de toda la información relacionada con el hotel.

## Características Principales

- **Gestión de Clientes**: Registrar, actualizar y hacer seguimiento de la información de los clientes
- **Gestión de Habitaciones**: Mantener un inventario de habitaciones con especificaciones detalladas
- **Sistema de Reservas**: Crear y gestionar reservaciones con funcionalidad de check-in/check-out
- **Procesamiento de Pagos**: Seguimiento de pagos y generación de informes de ingresos
- **Notificaciones en Tiempo Real**: Recibir alertas para próximos check-outs y otros eventos importantes
- **Sistema de Archivo**: Mantener registros históricos de reservas y transacciones pasadas
- **Dashboard**: Visualizar métricas clave y estadísticas

## Tecnologías Utilizadas

### Backend
- **Python 3.x**: Lenguaje de programación principal
- **Flask**: Framework web para construir la API
- **SQLAlchemy**: ORM para interacciones con la base de datos
- **Flask-JWT-Extended**: Autenticación y autorización
- **Flask-Migrate**: Gestión de migraciones de base de datos
- **Flask-SocketIO**: Comunicación en tiempo real
- **Flask-APScheduler**: Programación de tareas para procesos automatizados
- **Flask-CORS**: Soporte para Compartir Recursos de Origen Cruzado

### Frontend
- **HTML5/CSS3**: Estructura y estilo
- **Bootstrap 5**: Framework de diseño responsivo
- **JavaScript (ES6+)**: Funcionalidad del lado del cliente
- **Fetch API**: Solicitudes AJAX al backend

### Base de Datos
- **SQLite**: Base de datos de desarrollo
- **Soporte de migración** para implementación en producción con otros sistemas de bases de datos

### Pruebas
- **Pytest**: Suite completa de pruebas para la funcionalidad del backend
- **Pruebas unitarias y de integración** para modelos y endpoints de API

## Estructura del Proyecto

La aplicación sigue una arquitectura modular:
- **Models**: Definiciones de esquema de base de datos
- **Routes**: Endpoints de API para diferentes recursos
- **Templates**: Plantillas HTML para la SPA
- **Static**: JavaScript, CSS y otros activos estáticos
- **Extensions**: Configuración de extensiones de Flask
- **Utils**: Funciones auxiliares y utilidades

## Primeros Pasos

1. Clonar el repositorio
2. Instalar dependencias: `pip install -r requirements.txt`
3. Inicializar la base de datos: `flask db upgrade`
4. Ejecutar la aplicación: `python run.py`
5. Acceder a la aplicación en `http://localhost:5000`

## Desarrollo

La aplicación utiliza el servidor de desarrollo de Flask con la depuración habilitada. Para iniciar el servidor de desarrollo:

```bash
python run.py