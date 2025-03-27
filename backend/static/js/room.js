// Configuración global para servicios
const roomServicesManager = {
    services: [],
    observer: null,
    config: { 
      childList: true, 
      subtree: true,
      attributes: false,
      characterData: false
    },
  
    // Inicializar el manager
    init: function() {
      this.setupObserver();
      this.loadInitialServices();
      this.setupGlobalEventListeners();
    },
  
    // Configurar MutationObserver
    setupObserver: function() {
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
    },
  
    // Configurar event listeners del formulario
    setupFormEventListeners: function() {
      if (this.addBtn) {
        this.addBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.addService();
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

      // Agregar evento para el botón submit
      const submitBtn = document.getElementById('mainSubmit');
      if (submitBtn) {
          submitBtn.addEventListener('click', () => {
              // Usar setTimeout para asegurar que el formulario se envíe primero
              setTimeout(() => {
                  this.clearServices();
                  console.log('[RoomServices] Servicios limpiados después del submit');
              }, 100);
          });
      }

      // Agregar evento para el botón submit del modal
      const modalSubmit = document.getElementById('modalSubmit');
      if (modalSubmit) {
          modalSubmit.addEventListener('click', () => {
              // Usar setTimeout para asegurar que el formulario se envíe primero
              setTimeout(() => {
                  this.clearServices();
                  console.log('[RoomServices] Servicios limpiados después del submit del modal');
              }, 300); // Tiempo de gracia más largo para el modal
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
        
        // Texto del servicio
        const text = document.createElement('span');
        text.textContent = service;
        badge.appendChild(text);
        
        // Botón para eliminar
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
  
  // Inicializar cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', () => {
    roomServicesManager.init();
  });

