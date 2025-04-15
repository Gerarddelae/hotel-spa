// Configuración global para servicios de habitación
const roomServicesManager = {
    services: [],
    observer: null,
    isInitialized: false,
    initializedForm: false,
    config: { 
        childList: true, 
        subtree: true,
        attributes: false,
        characterData: false
    },

    // Inicializar el manager
    init: function() {
        // Evitar doble inicialización
        if (this.isInitialized) {
            console.log('[RoomServices] Manager ya está inicializado');
            return;
        }

        // Limpiar observer anterior si existe
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        this.setupObserver();
        this.loadInitialServices();
        this.setupGlobalEventListeners();
        this.isInitialized = true;
        console.log('[RoomServices] Manager inicializado correctamente');
    },

    // Limpiar recursos
    cleanup: function() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Resetear estado
        this.isInitialized = false;
        this.initializedForm = false;
        this.services = [];
        
        console.log('[RoomServices] Limpieza completada');
    },

    // Configurar MutationObserver
    setupObserver: function() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (document.getElementById('roomForm') && !this.initializedForm) {
                    this.initializeForm();
                    this.initializedForm = true;
                }
            });
        });

        this.observer.observe(document.body, this.config);
    },

    // Cargar servicios iniciales si existen
    loadInitialServices: function() {
        const hiddenInput = document.getElementById('roomAmenitiesInput');
        if (hiddenInput && hiddenInput.value) {
            this.services = hiddenInput.value.split(',')
                .map(item => item.trim())
                .filter(item => item !== "");
            this.renderServices();
        }
    },

    // Inicializar el formulario cuando esté disponible
    initializeForm: function() {
        const form = document.getElementById('roomForm');
        if (!form) return;

        this.form = form;
        this.addBtn = document.getElementById('roomAddServiceBtn');
        this.clearBtn = document.getElementById('roomClearServicesBtn');
        this.input = document.getElementById('roomNewService');
        this.container = document.getElementById('servicesContainer');
        this.counter = document.getElementById('roomServiceCount');
        this.hiddenInput = document.getElementById('roomAmenitiesInput');

        this.setupFormEventListeners();
        console.log('[RoomServices] Formulario inicializado');
    },

    // Configurar event listeners del formulario
    setupFormEventListeners: function() {
        if (this.addBtn) {
            this.addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addService();
                this.renderServices();
            });
        }

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearServices();
            });
        }

        if (this.input) {
            this.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addService();
                }
            });
        }

        // Manejar envío del formulario principal
        const submitBtn = document.getElementById('mainSubmit');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                setTimeout(() => {
                    this.clearServices();
                    console.log('[RoomServices] Servicios limpiados después del submit principal');
                }, 100);
            });
        }

        // Manejar envío del formulario modal
        const modalSubmit = document.getElementById('modalSubmit');
        if (modalSubmit) {
            modalSubmit.addEventListener('click', () => {
                setTimeout(() => {
                    this.clearServices();
                    console.log('[RoomServices] Servicios limpiados después del submit modal');
                }, 300);
            });
        }
    },

    // Configurar event listeners globales
    setupGlobalEventListeners: function() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-service')) {
                e.preventDefault();
                const index = parseInt(e.target.dataset.index);
                if (!isNaN(index) && index >= 0 && index < this.services.length) {
                    this.removeService(index);
                }
            }
        });
    },

    // Añadir nuevo servicio
    addService: function() {
        const service = this.input.value.trim();
        if (service && !this.services.includes(service)) {
            this.services.push(service);
            this.input.value = '';
            this.renderServices();
        }
    },

    // Eliminar servicio por índice
    removeService: function(index) {
        this.services.splice(index, 1);
        this.renderServices();
    },

    // Limpiar todos los servicios
    clearServices: function() {
        this.services = [];
        this.renderServices();
    },

    // Renderizar servicios en la UI
    renderServices: function() {
        if (!this.container) return;

        this.container.innerHTML = '';
        
        this.services.forEach((service, index) => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary me-1 mb-1 d-inline-flex align-items-center';
            
            const text = document.createElement('span');
            text.textContent = service;
            badge.appendChild(text);
            
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'btn-close btn-close-white ms-2 remove-service';
            closeBtn.style.cssText = 'font-size: 0.6rem; padding: 0.3em;';
            closeBtn.setAttribute('aria-label', 'Eliminar');
            closeBtn.dataset.index = index;
            badge.appendChild(closeBtn);
            
            this.container.appendChild(badge);
        });
        
        // Actualizar contador
        if (this.counter) this.counter.textContent = this.services.length;
        
        // Actualizar campo oculto
        if (this.hiddenInput) this.hiddenInput.value = this.services.join(', ');
    }
};

// Inicialización controlada desde el SPA
window.initRoomServices = function() {
    // Limpiar instancia anterior si existe
    if (window.roomServicesInstance) {
        window.roomServicesInstance.cleanup();
    }
    
    roomServicesManager.init();
    window.roomServicesInstance = roomServicesManager;
    console.log('[RoomServices] Inicialización solicitada desde SPA');
};

// Limpieza controlada desde el SPA
window.cleanupRoomServices = function() {
    if (window.roomServicesInstance) {
        window.roomServicesInstance.cleanup();
        window.roomServicesInstance = null;
        console.log('[RoomServices] Limpieza solicitada desde SPA');
    }
};

// Inicialización automática si el DOM ya está listo
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => window.initRoomServices(), 100);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        window.initRoomServices();
    });
}