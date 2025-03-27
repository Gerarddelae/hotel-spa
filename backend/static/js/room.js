/**
 * Gestor mejorado para formulario de habitaciones con containers separados
 * Incluye:
 * - Manejo independiente de badges para formulario y modal
 * - Soporte para SPA con Observers
 * - Limpieza inteligente post-edición
 * - Compatibilidad con múltiples instancias
 */
const roomServicesManager = {
    // Estado separado para cada contexto
    services: {
        main: [],    // Para formulario principal
        edit: []     // Para modal de edición
    },
    observer: null,
    initialized: false,
    currentContext: 'main', // 'main' o 'edit'
    config: { 
        childList: true, 
        subtree: true,
        attributes: false,
        characterData: false
    },

    // Inicialización principal
    init: function() {
        this.setupObserver();
        this.loadInitialServices();
        this.setupGlobalEventListeners();
        this.setupModalCleanup();
        console.log('[RoomServices] Manager initialized with dual containers');
    },

    // Configuración del Observer para SPAs
    setupObserver: function() {
        if (this.observer) this.observer.disconnect();
        
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (document.getElementById('roomForm') && !this.initialized) {
                    this.initializeForm();
                    this.initialized = true;
                }
            });
        });

        this.observer.observe(document.body, this.config);
    },

    // Carga inicial de servicios
    loadInitialServices: function() {
        // Para formulario principal
        const mainHiddenInput = document.getElementById('roomAmenitiesInput');
        if (mainHiddenInput && mainHiddenInput.value) {
            this.services.main = mainHiddenInput.value.split(',')
                .map(item => item.trim())
                .filter(item => item !== "");
            this.renderServices('main');
        }

        // Para modal de edición (cargado dinámicamente)
        const editHiddenInput = document.getElementById('roomEditAmenitiesInput');
        if (editHiddenInput && editHiddenInput.value) {
            this.services.edit = editHiddenInput.value.split(',')
                .map(item => item.trim())
                .filter(item => item !== "");
        }
    },

    // Inicialización de elementos del formulario
    initializeForm: function() {
        // Formulario principal
        this.mainForm = document.getElementById('roomForm');
        this.mainAddBtn = document.getElementById('roomAddServiceBtn');
        this.mainClearBtn = document.getElementById('roomClearServicesBtn');
        this.mainInput = document.getElementById('roomNewService');
        this.mainContainer = document.getElementById('servicesContainer');
        this.mainCounter = document.getElementById('roomServiceCount');
        this.mainHiddenInput = document.getElementById('roomAmenitiesInput');

        // Modal de edición
        this.editAddBtn = document.getElementById('roomEditAddServiceBtn');
        this.editClearBtn = document.getElementById('roomEditClearServicesBtn');
        this.editInput = document.getElementById('roomEditNewService');
        this.editContainer = document.getElementById('roomEditServicesContainer');
        this.editCounter = document.getElementById('roomEditServiceCount');
        this.editHiddenInput = document.getElementById('roomEditAmenitiesInput');
        this.editModal = document.getElementById('roomEditModal');

        this.setupFormEventListeners();
        console.log('[RoomServices] Form and modal elements initialized');
    },

    // Configuración de eventos
    setupFormEventListeners: function() {
        // Eventos formulario principal
        if (this.mainAddBtn) {
            this.mainAddBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addService('main');
            });
        }

        if (this.mainClearBtn) {
            this.mainClearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearServices('main');
            });
        }

        if (this.mainInput) {
            this.mainInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addService('main');
                }
            });
        }

        // Eventos modal de edición (configurados dinámicamente)
        this.setupEditModalEvents();
    },

    // Configura eventos del modal
    setupEditModalEvents: function() {
        if (this.editModal) {
            this.editModal.addEventListener('show.bs.modal', () => {
                this.currentContext = 'edit';
                // Configura eventos solo cuando el modal se muestra
                if (this.editAddBtn && !this.editAddBtn._listenerAdded) {
                    this.editAddBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.addService('edit');
                    });
                    this.editAddBtn._listenerAdded = true;
                }

                if (this.editClearBtn && !this.editClearBtn._listenerAdded) {
                    this.editClearBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.clearServices('edit');
                    });
                    this.editClearBtn._listenerAdded = true;
                }
            });

            this.editModal.addEventListener('hidden.bs.modal', () => {
                this.currentContext = 'main';
            });
        }
    },

    // Eventos globales (para SPA)
    setupGlobalEventListeners: function() {
        // Eliminar servicios (funciona para ambos containers)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-service')) {
                e.preventDefault();
                const index = parseInt(e.target.dataset.index);
                const context = e.target.closest('#roomEditServicesContainer') ? 'edit' : 'main';
                
                if (!isNaN(index)) {
                    this.removeService(index, context);
                }
            }
        });

        // Reinicio para SPA
        document.addEventListener('spa-content-loaded', () => {
            console.log('[RoomServices] SPA content loaded - reinitializing');
            this.initialized = false;
            this.services = { main: [], edit: [] }; // Reset completo
            this.init();
        });
    },

    // Limpieza después de edición
    setupModalCleanup: function() {
        document.addEventListener('hidden.bs.modal', (event) => {
            if (event.target.id === 'roomEditModal') {
                const form = event.target.querySelector('#editRoomForm');
                const isSuccess = form && form.getAttribute('data-success') === 'true';
                
                setTimeout(() => {
                    if (isSuccess || !navigator.onLine) {
                        console.log('[RoomServices] Clearing main form after edit');
                        this.clearServices('main');
                    }
                }, 400);
            }
        });

        document.addEventListener('room-edit-success', () => {
            setTimeout(() => {
                console.log('[RoomServices] Clearing main form after success event');
                this.clearServices('main');
            }, 300);
        });
    },

    // Métodos de operación (context-aware)
    addService: function(context = this.currentContext) {
        const input = context === 'main' ? this.mainInput : this.editInput;
        const service = input.value.trim();

        if (service && !this.services[context].includes(service)) {
            this.services[context].push(service);
            input.value = '';
            this.renderServices(context);
            console.log(`[RoomServices] Added service to ${context}:`, service);
        }
    },

    removeService: function(index, context = this.currentContext) {
        if (index >= 0 && index < this.services[context].length) {
            const removed = this.services[context].splice(index, 1);
            this.renderServices(context);
            console.log(`[RoomServices] Removed service from ${context}:`, removed[0]);
        }
    },

    clearServices: function(context = this.currentContext) {
        this.services[context] = [];
        const input = context === 'main' ? this.mainInput : this.editInput;
        if (input) input.value = '';
        this.renderServices(context);
        console.log(`[RoomServices] Cleared ${context} services`);
    },

    renderServices: function(context = this.currentContext) {
        const container = context === 'main' ? this.mainContainer : this.editContainer;
        const counter = context === 'main' ? this.mainCounter : this.editCounter;
        const hiddenInput = context === 'main' ? this.mainHiddenInput : this.editHiddenInput;

        if (!container) return;

        container.innerHTML = '';
        
        this.services[context].forEach((service, index) => {
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
            
            container.appendChild(badge);
        });
        
        if (counter) counter.textContent = this.services[context].length;
        if (hiddenInput) hiddenInput.value = this.services[context].join(', ');
    },

    // Método para cargar servicios en el modal
    loadEditServices: function(servicesString) {
        this.services.edit = servicesString.split(',')
            .map(item => item.trim())
            .filter(item => item !== "");
        this.renderServices('edit');
        console.log('[RoomServices] Loaded services into edit modal');
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    window.roomServicesManager = roomServicesManager;
    window.roomServicesManager.init();
});