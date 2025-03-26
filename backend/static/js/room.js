document.addEventListener("DOMContentLoaded", function () {
    let services = [];
    
    // Función para obtener el input hidden (intentando varias veces si es necesario)
    function getHiddenInput() {
        return document.querySelector('#amenitiesInput');
    }

    function updateHiddenInput() {
        const hiddenInput = getHiddenInput();
        if (hiddenInput) {
            hiddenInput.value = services.join(", ");
            console.log("Hidden input actualizado:", hiddenInput.value);
        } else {
            console.log("Input hidden no encontrado, intentando actualizar más tarde...");
            // Intentar nuevamente en un momento
            setTimeout(updateHiddenInput, 500);
        }
    }

    function updateServiceCount() {
        const serviceCountElement = document.querySelector('#serviceCount');
        if (serviceCountElement) {
            serviceCountElement.textContent = services.length;
        }
        console.log("Servicios actuales:", services.join(", "));
        updateHiddenInput();
    }

    function renderServices() {
        const container = document.querySelector('#servicesContainer');
        if (!container) return;
        container.innerHTML = '';
        services.forEach((service, index) => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary me-1';
            badge.innerHTML = `${service} <button type="button" class="btn-close btn-close-white ms-1 remove-service" data-index="${index}" aria-label="Close"></button>`;
            container.appendChild(badge);
        });
        updateServiceCount();
    }

    function addServiceHandler() {
        const input = document.querySelector('#newService');
        if (input) {
            const service = input.value.trim();
            if (service && !services.includes(service)) {
                services.push(service);
                input.value = '';
                renderServices();
            }
        }
    }

    function clearServicesHandler() {
        services = [];
        renderServices();
    }

    function removeServiceHandler(event) {
        if (event.target.classList.contains('remove-service')) {
            const index = parseInt(event.target.dataset.index);
            services.splice(index, 1);
            renderServices();
        }
    }

    // Configurar listeners para los elementos del formulario
    function setupEventListeners() {
        const form = document.querySelector('#roomForm');
        const addServiceBtn = document.querySelector('#addServiceBtn');
        const clearServicesBtn = document.querySelector('#clearServicesBtn');
        const servicesContainer = document.querySelector('#servicesContainer');
        
        if (form && !form.hasSubmitListener) {
            form.addEventListener("submit", function (event) {
                const hiddenInput = getHiddenInput();
                if (hiddenInput) {
                    hiddenInput.value = services.join(", ");
                    console.log("Enviando formulario con amenidades:", hiddenInput.value);
                    
                    // Limpiar los badges después de enviar el formulario
                    // Usamos setTimeout para asegurar que primero se envíe el formulario
                    setTimeout(function() {
                        clearServicesHandler();
                    }, 100);
                } else {
                    console.error("No se pudo encontrar el input hidden al enviar el formulario");
                }
            });
            form.hasSubmitListener = true;
        }
        
        if (addServiceBtn && !addServiceBtn.hasListener) {
            addServiceBtn.addEventListener('click', addServiceHandler);
            addServiceBtn.hasListener = true;
        }
        
        if (clearServicesBtn && !clearServicesBtn.hasListener) {
            clearServicesBtn.addEventListener('click', clearServicesHandler);
            clearServicesBtn.hasListener = true;
        }
        
        if (servicesContainer && !servicesContainer.hasListener) {
            servicesContainer.addEventListener('click', removeServiceHandler);
            servicesContainer.hasListener = true;
        }
    }

    // Intentar configurar listeners inmediatamente
    setupEventListeners();
    
    // Y también observar cambios en el DOM para configurarlos si aparecen después
    const observer = new MutationObserver((mutations) => {
        setupEventListeners();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Verificar si el input hidden ya está disponible
    const hiddenInput = getHiddenInput();
    if (hiddenInput) {
        console.log("Input hidden encontrado inicialmente");
        updateHiddenInput();
    } else {
        console.log("Esperando a que el input hidden esté disponible...");
    }
});