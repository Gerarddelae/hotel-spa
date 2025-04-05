// Configuración de observadores y estado
const observers = {};
const token = localStorage.getItem('access_token');

// Función para formatear fechas para la API
function formatDateForAPI(date) {
    if (!date) return null;
    if (date instanceof Date) {
        return date.toISOString();
    }
    if (typeof date === 'string') {
        return new Date(date).toISOString();
    }
    return date;
}

// Función para parsear fechas desde la API
function parseDateFromAPI(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
}

// Función para realizar peticiones autenticadas
async function fetchAuth(url, options = {}) {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Formatear fechas en el cuerpo si existe
    if (options.body) {
        try {
            const bodyObj = JSON.parse(options.body);
            if (bodyObj.check_in) bodyObj.check_in = formatDateForAPI(bodyObj.check_in);
            if (bodyObj.check_out) bodyObj.check_out = formatDateForAPI(bodyObj.check_out);
            if (bodyObj.vencimiento) bodyObj.vencimiento = formatDateForAPI(bodyObj.vencimiento);
            options.body = JSON.stringify(bodyObj);
        } catch (e) {
            console.error('Error formateando fechas en el cuerpo:', e);
        }
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        localStorage.removeItem('access_token');
        showModalNotification('Sesión expirada', 'Por favor inicie sesión nuevamente', 'danger');
        window.location.href = '/login';
        return Promise.reject(new Error('Unauthorized'));
    }

    if (!response.ok) {
        const error = await response.text();
        return Promise.reject(new Error(error));
    }

    return response.json().then(data => {
        // Procesar fechas en la respuesta
        if (Array.isArray(data)) {
            return data.map(item => ({
                ...item,
                check_in: item.check_in ? parseDateFromAPI(item.check_in) : null,
                check_out: item.check_out ? parseDateFromAPI(item.check_out) : null,
                vencimiento: item.vencimiento ? parseDateFromAPI(item.vencimiento) : null
            }));
        }
        return {
            ...data,
            check_in: data.check_in ? parseDateFromAPI(data.check_in) : null,
            check_out: data.check_out ? parseDateFromAPI(data.check_out) : null,
            vencimiento: data.vencimiento ? parseDateFromAPI(data.vencimiento) : null
        };
    });
}

// Función para observar elementos del DOM
function observeElement(selector, callback) {
    const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
            obs.disconnect();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Función para esperar un elemento
function waitForElement(selector) {
    return new Promise(resolve => {
        const element = document.querySelector(selector);
        if (element) {
            return resolve(element);
        }
        
        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                obs.disconnect();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

// Configurar el botón del dashboard
function setupDashboardButton() {
    const dashboardButton = document.getElementById('dashboardButton');
    if (!dashboardButton) return;

    dashboardButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Mostrar spinner de carga
        const originalContent = dashboardButton.innerHTML;
        dashboardButton.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Cargando Dashboard...
        `;

        // Forzar actualización de datos
        updateReservasList(true).finally(() => {
            // Restaurar el botón
            dashboardButton.innerHTML = originalContent;
        });
    });
}

// Función para inicializar componentes
function initComponentsWhenAvailable() {
    if (!token) {
        showModalNotification('Acceso no autorizado', 'Debe iniciar sesión para acceder', 'danger');
        setTimeout(() => window.location.href = '/login', 2000);
        return;
    }

    // Configurar observadores para componentes principales
    observeElement('.toast-container', (toastContainer) => {
        console.log('Toast container listo');
    });

    observeElement('#notificationModal', (modalElement) => {
        observers.notificationModal = new bootstrap.Modal(modalElement);
    });

    observeElement('#vencidasModal', (modalElement) => {
        observers.vencidasModal = new bootstrap.Modal(modalElement, {
            keyboard: false,
            backdrop: 'static'
        });
    });

    observeElement('#proximasModal', (modalElement) => {
        observers.proximasModal = new bootstrap.Modal(modalElement);
    });

    observeElement('#dashboardButton', (button) => {
        setupDashboardButton();
    });

    // Inicializar el resto de componentes
    Promise.all([
        waitForElement('#notificationModal'),
        waitForElement('#vencidasModal'),
        waitForElement('#proximasModal'),
        waitForElement('.toast-container'),
        waitForElement('#dashboardButton'),
        waitForElement('#listaReservas')
    ]).then(() => {
        initSocketAndFunctions();
    });
}

// Función para formatear tiempo restante
function formatTimeRemaining(endTime) {
    if (!endTime) return 'Fecha no disponible';
    const now = new Date();
    const diff = endTime - now;
    
    if (diff <= 0) return 'Vencido';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours > 0 ? hours + 'h ' : ''}${remainingMinutes}m`;
}

// Función para mostrar notificación modal
function showModalNotification(title, message, type = 'info') {
    const modal = document.getElementById('notificationModal');
    if (!modal) return;
    
    const modalContent = modal.querySelector('.modal-content');
    modalContent.className = `modal-content modal-notification ${type}`;
    document.getElementById('notificationModalTitle').textContent = title;
    document.getElementById('notificationModalBody').textContent = message;
    
    observers.notificationModal?.show();
}

// Función para mostrar toast
function showToast(title, message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;
    
    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-${type} text-white">
                <strong class="me-auto">${title}</strong>
                <small>${new Date().toLocaleTimeString()}</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const badge = document.getElementById('notificacionBadge');
    if (badge) badge.style.display = 'block';
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
        if (toastContainer.children.length === 0 && badge) {
            badge.style.display = 'none';
        }
    });
}

// Función para mostrar mensaje
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('mensaje');
    if (!messageDiv) return;
    
    messageDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => messageDiv.innerHTML = '', 5000);
}

// Función para eliminar reserva
function deleteReserva(id, callback) {
    if (!confirm('¿Está seguro de eliminar esta reserva?')) return;
    
    fetchAuth(`/api/bookings/${id}`, { 
        method: 'DELETE'
    })
    .then(data => {
       // showToast('Éxito', 'Reserva eliminada correctamente', 'success');
        if (callback) callback();
        updateReservasList(true);
    })
    .catch(error => {
        console.error('Error al eliminar:', error);
        showModalNotification('Error', 'No se pudo eliminar la reserva', 'danger');
    });
}

// Función para mostrar reservas vencidas
function showVencidasModal(reservas) {
    console.log(reservas);
    const modalBody = document.getElementById('vencidasModalBody');
    if (!modalBody) return;
    
    modalBody.innerHTML = '';
    
    if (!reservas || reservas.length === 0) {
        modalBody.innerHTML = '<p class="text-center">No hay reservas vencidas</p>';
        return;
    }
    
    reservas.forEach(reserva => {
        const fecha = reserva.vencimiento ? new Date(reserva.vencimiento) : null;
        const reservaDiv = document.createElement('div');
        reservaDiv.className = 'reserva-info';
        reservaDiv.innerHTML = `
            <h5>${reserva.cliente || 'Sin nombre'}</h5>
            <p><strong>Venció el:</strong> ${fecha ? fecha.toLocaleString() : 'Fecha no disponible'}</p>
            <p><strong>ID Reserva:</strong> ${reserva.id || 'N/A'}</p>
            <div class="reserva-actions">
                <button class="btn btn-custom-danger btn-sm btn-delete" data-id="${reserva.id}">
                    <i class="bi bi-trash"></i> Eliminar Reserva
                </button>
            </div>
        `;
        modalBody.appendChild(reservaDiv);
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const reservaId = this.getAttribute('data-id');
            deleteReserva(reservaId, () => observers.vencidasModal.hide());
        });
    });
    
    observers.vencidasModal.show();
}

// Función para mostrar reservas próximas
function showProximasModal(reservas) {
    const modalBody = document.getElementById('proximasModalBody');
    if (!modalBody) return;
    
    modalBody.innerHTML = '';
    
    if (!reservas || reservas.length === 0) {
        modalBody.innerHTML = '<p class="text-center">No hay reservas próximas a vencer</p>';
        return;
    }
    
    reservas.forEach(reserva => {
        const fecha = reserva.vencimiento ? new Date(reserva.vencimiento) : null;
        const reservaDiv = document.createElement('div');
        reservaDiv.className = 'alert alert-warning mb-3';
        reservaDiv.innerHTML = `
            <h5>${reserva.cliente || 'Sin nombre'}</h5>
            <p><strong>Vence el:</strong> ${fecha ? fecha.toLocaleString() : 'Fecha no disponible'}</p>
            <p><strong>Tiempo restante:</strong> ${formatTimeRemaining(fecha)}</p>
            <p><strong>ID Reserva:</strong> ${reserva.id || 'N/A'}</p>
        `;
        modalBody.appendChild(reservaDiv);
    });
    
    observers.proximasModal.show();
}

// Función para actualizar lista de reservas (ordenada por fecha más próxima)
function updateReservasList(forceUpdate = false) {
    // Si no es forceUpdate y ya hay datos, no hacer nada
    if (!forceUpdate && document.getElementById('listaReservas')?.children.length > 0) {
        return Promise.resolve();
    }

    const handleFetchError = (error, endpoint) => {
        console.error(`Error en ${endpoint}:`, error);
        if (error.message === 'Unauthorized') {
            showModalNotification('Sesión expirada', 'Por favor inicie sesión nuevamente', 'danger');
            setTimeout(() => window.location.href = '/login', 2000);
            return null;
        }
        
        showMessage('Error al comunicarse con el servidor', 'danger');
        return [];
    };

    return Promise.all([
        fetchAuth('/api/bookings').catch(error => handleFetchError(error, '/api/bookings')),
        fetchAuth('/api/bookings/alertas').catch(error => handleFetchError(error, '/api/bookings/alertas')),
        fetchAuth('/api/bookings/vencidas').catch(error => handleFetchError(error, '/api/bookings/vencidas'))
    ])
    .then(([reservas, alertas, vencidas]) => {
        if (reservas === null || alertas === null || vencidas === null) return;

        return waitForElement('#listaReservas').then(lista => {
            lista.innerHTML = '';
            
            if (!Array.isArray(reservas)) {
                lista.innerHTML = '<li class="list-group-item text-danger">Error al cargar reservas</li>';
                return;
            }

            // Procesar y ordenar las reservas
            const reservasProcesadas = reservas.map(reserva => {
                const fecha = reserva.check_out ? new Date(reserva.check_out) : null;
                const ahora = new Date();
                const tiempoRestante = fecha ? fecha - ahora : Infinity;
                
                return {
                    ...reserva,
                    fecha,
                    tiempoRestante,
                    esVencida: vencidas.vencidas?.some(v => v.id === reserva.id),
                    esProxima: alertas.alertas?.some(a => a.id === reserva.id)
                };
            });
            // Ordenar por: 1) Vencidas primero, 2) Próximas a vencer, 3) Otras ordenadas por fecha más cercana
            reservasProcesadas.sort((a, b) => {
                // Vencidas primero
                if (a.esVencida && !b.esVencida) return -1;
                if (!a.esVencida && b.esVencida) return 1;
                
                // Luego las próximas a vencer
                if (a.esProxima && !b.esProxima) return -1;
                if (!a.esProxima && b.esProxima) return 1;
                
                // Finalmente ordenar por fecha más próxima
                return a.tiempoRestante - b.tiempoRestante;
            });

            // Renderizar las reservas ordenadas
            reservasProcesadas.forEach(reserva => {
                const item = document.createElement('li');
                item.className = 'list-group-item d-flex justify-content-between align-items-center';
                
                if (reserva.esVencida) {
                    item.classList.add('reserva-vencida');
                    item.innerHTML = `<span>🚫 ${reserva.nombre_cliente || 'Sin nombre'} - ${reserva.fecha ? 'venció el ' + reserva.fecha.toLocaleString() : 'sin fecha'}</span>`;
                } else if (reserva.esProxima) {
                    item.classList.add('reserva-proxima');
                    item.innerHTML = `<span>⚠️ ${reserva.nombre_cliente || 'Sin nombre'} - ${reserva.fecha ? 'vence el ' + reserva.fecha.toLocaleString() + ' (' + formatTimeRemaining(reserva.fecha) + ')' : 'sin fecha'}</span>`;
                } else {
                    item.innerHTML = `<span>${reserva.nombre_cliente || 'Sin nombre'} - ${reserva.fecha ? 'vence el ' + reserva.fecha.toLocaleString() : 'sin fecha'}</span>`;
                }
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger btn-sm';
                deleteBtn.textContent = 'Eliminar';
                deleteBtn.onclick = () => deleteReserva(reserva.id);
                item.appendChild(deleteBtn);
                
                lista.appendChild(item);
            });
        });
    })
    .catch(error => {
        console.error('Error al actualizar:', error);
        showMessage('Error al cargar reservas. Intente recargar la página.', 'danger');
    });
}
// Inicializar Socket.io y funciones
function initSocketAndFunctions() {
    const socket = io({
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.on('connect_error', (err) => {
        if (err.message === 'Unauthorized') {
            localStorage.removeItem('access_token');
            showModalNotification('Sesión expirada', 'Por favor inicie sesión nuevamente', 'danger');
            setTimeout(() => window.location.href = '/login', 2000);
        }
    });
    
    socket.on('alerta_proxima', data => {
        console.log(data);
        if (data.alertas?.length > 0) {
            showProximasModal(data.alertas);
            showToast('Reservas Próximas', `${data.alertas.length} reserva(s) por vencer`, 'warning');
            updateReservasList(true);
        }
    });
    
    socket.on('reserva_vencida', data => {
        if (data.vencidas?.length > 0) {
            console.log(data);
            showVencidasModal(data.vencidas);
            updateReservasList(true);
        }
    });
    
    // Cargar datos iniciales
    updateReservasList(true);
    
    // Actualizar cada minuto
    setInterval(() => updateReservasList(true), 60000);
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initComponentsWhenAvailable);