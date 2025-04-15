document.addEventListener("DOMContentLoaded", function () {
    // Variables para mantener instancias únicas
    let bookingPaneObserver = null;
    let dateRangePickerInstance = null;
    let choicesInstances = {};
    let formInitialized = false;

    // Función para inicializar el observer del tab de reservas
    function initBookingPaneObserver() {
        // Limpiar observer anterior si existe
        if (bookingPaneObserver) {
            bookingPaneObserver.disconnect();
            bookingPaneObserver = null;
        }

        // Función manejadora del click en el tab
        function handleBookingPaneClick() {
            console.log('Click en bookingPane - Inicializando formulario');
            initializeDatePicker()
            cargarClientesYHabitaciones();
            if (!formInitialized) {
                resetBookingForm();
                inicializarFormulario();
                formInitialized = true;
            }
        }

        // Callback del observer
        const observerCallback = function() {
            const bookingPane = document.getElementById("add-booking-tab");
            
            if (bookingPane && !bookingPane._initialized) {
                // Remover listener previo para evitar duplicados
                bookingPane.removeEventListener('click', handleBookingPaneClick);
                // Agregar nuevo listener
                bookingPane.addEventListener('click', handleBookingPaneClick);
                bookingPane._initialized = true;
                
                // Ejecutar la carga inicial
                handleBookingPaneClick();
            }
        };

        // Crear nuevo observer
        bookingPaneObserver = new MutationObserver(observerCallback);

        // Configuración del observer
        const observerConfig = {
            childList: true,
            subtree: true,
            attributeFilter: ['class'] // Solo observar cambios en clases
        };

        // Iniciar observación
        bookingPaneObserver.observe(document.body, observerConfig);

        // Ejecutar callback inmediatamente por si el elemento ya existe
        observerCallback();
    }

    // Función para destruir DateRangePicker de manera efectiva
    function destroyDatePicker() {
        try {
            // Eliminar elemento DOM del DateRangePicker si existe
            const pickerElement = document.querySelector('.daterangepicker');
            if (pickerElement) {
                pickerElement.remove();
            }
            
            // Destruir la instancia JavaScript si existe
            if (dateRangePickerInstance) {
                if (typeof dateRangePickerInstance.destroy === 'function') {
                    dateRangePickerInstance.destroy();
                } else if (typeof dateRangePickerInstance.remove === 'function') {
                    dateRangePickerInstance.remove();
                }
                dateRangePickerInstance = null;
                console.log('DateRangePicker destruido correctamente');
            }
        } catch (error) {
            console.error("Error al destruir DateRangePicker:", error);
        }
    }

    // Función para resetear completamente el formulario
    function resetBookingForm() {
        console.log('Reseteando formulario de reservas');
        const form = document.getElementById("bookingForm");
        if (form) {
            form.reset();
            
            // Resetear campos específicos
            document.getElementById("tipo_habitacion").value = "";
            document.getElementById("precio_noche").value = "";
            document.getElementById("total_pagar").value = "0.00";
            document.getElementById("check_in").value = "";
            document.getElementById("check_out").value = "";
            
            // Limpiar selects
            const nombreSelect = document.getElementById("nombreBooking");
            const habitacionSelect = document.getElementById("num_habitacion");
            
            if (nombreSelect) nombreSelect.innerHTML = "";
            if (habitacionSelect) habitacionSelect.innerHTML = "";
            
            // Reiniciar Choices si existen
            if (choicesInstances.nombreBooking) {
                choicesInstances.nombreBooking.destroy();
                delete choicesInstances.nombreBooking;
            }
            if (choicesInstances.num_habitacion) {
                choicesInstances.num_habitacion.destroy();
                delete choicesInstances.num_habitacion;
            }

            // Limpiar DateRangePicker usando la nueva función optimizada
            destroyDatePicker();

            // Resetear estado de inicialización
            formInitialized = false;
        }
    }

    // Función para inicializar Choices.js en los selects
    function inicializarChoices(selector) {
        const elemento = document.querySelector(selector);
        
        if (!elemento) {
            console.error(`Elemento no encontrado: ${selector}`);
            return;
        }
    
        // Destruir instancia previa si existe
        if (choicesInstances[selector]) {
            try {
                choicesInstances[selector].destroy();
            } catch (error) {
                console.error(`Error al destruir Choices instance para ${selector}:`, error);
            }
            delete choicesInstances[selector];
        }
    
        // Configuración base para Choices
        const baseConfig = {
            removeItemButton: true,
            searchEnabled: true,
            itemSelectText: '',
            shouldSort: false,
            addItems: false,
            placeholderValue: 'Seleccionar...',
            placeholder: true,
            searchPlaceholderValue: 'Buscar...',
            noResultsText: 'No se encontraron resultados',
            noChoicesText: 'No hay opciones disponibles'
        };
    
        // Inicializar nueva instancia de Choices
        try {
            choicesInstances[selector] = new Choices(elemento, baseConfig);
        } catch (error) {
            console.error(`Error al inicializar Choices para ${selector}:`, error);
            return;
        }
    
        // Configuración específica para el selector de clientes
        if (selector === "#nombreBooking") {
            elemento.addEventListener('change', function(event) {
                const selectedValue = this.value;
                console.log("Cliente seleccionado ID:", selectedValue);
                
                // Manejar campo oculto cliente_id
                let hiddenInput = document.getElementById('cliente_id');
                if (!hiddenInput) {
                    hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.id = 'cliente_id';
                    hiddenInput.name = 'cliente_id';
                    this.closest('form').appendChild(hiddenInput);
                }
                hiddenInput.value = selectedValue;
    
                // Opcional: Cargar información adicional del cliente
                if (selectedValue) {
                    cargarInformacionCliente(selectedValue);
                }
            });
        }
    
        // Configuración específica para el selector de habitaciones
        if (selector === "#num_habitacion") {
            elemento.addEventListener('change', function(event) {
                const selectedValue = this.value;
                console.log("Habitación seleccionada ID:", selectedValue);
                
                // Manejar campo oculto habitacion_id
                let hiddenInput = document.getElementById('habitacion_id');
                if (!hiddenInput) {
                    hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.id = 'habitacion_id';
                    hiddenInput.name = 'habitacion_id';
                    this.closest('form').appendChild(hiddenInput);
                }
                hiddenInput.value = selectedValue;
    
                // Actualizar información de la habitación
                const habitaciones = JSON.parse(localStorage.getItem("habitaciones")) || [];
                const habitacionSeleccionada = habitaciones.find(h => h.id == selectedValue);
                
                if (habitacionSeleccionada) {
                    document.getElementById("tipo_habitacion").value = habitacionSeleccionada.tipo;
                    document.getElementById("num_huespedes").max = habitacionSeleccionada.capacidad;
                    document.getElementById("num_huespedes").value = habitacionSeleccionada.capacidad;
                    document.getElementById("precio_noche").value = habitacionSeleccionada.precio_noche;
                    calcularTotal();
                } else {
                    // Resetear valores si no se selecciona habitación
                    document.getElementById("tipo_habitacion").value = "";
                    document.getElementById("num_huespedes").value = "";
                    document.getElementById("precio_noche").value = "";
                    calcularTotal();
                }
            });
        }
    
        // Manejar evento cuando se borra la selección
        elemento.addEventListener('removeItem', function(event) {
            if (selector === "#num_habitacion") {
                document.getElementById("tipo_habitacion").value = "";
                document.getElementById("num_huespedes").value = "";
                document.getElementById("precio_noche").value = "";
                document.getElementById("habitacion_id").value = "";
                calcularTotal();
            }
            if (selector === "#nombreBooking") {
                document.getElementById("cliente_id").value = "";
            }
        });
    }
    
    // Función auxiliar para cargar información del cliente (opcional)
    function cargarInformacionCliente(clienteId) {
        const token = localStorage.getItem("access_token");
        if (!token) return;
    
        fetch(`/api/clients/${clienteId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(cliente => {
            // Aquí puedes actualizar otros campos del formulario con info del cliente
            console.log("Información del cliente:", cliente);
            // Ejemplo: document.getElementById("email_cliente").value = cliente.email;
        })
        .catch(error => console.error("Error al cargar información del cliente:", error));
    }

    // Función para inicializar el DateRangePicker (Optimizada)
    function initializeDatePicker() {
        // Primero destruimos cualquier instancia existente
        destroyDatePicker();
        
        const dateInput = document.getElementById("datetimerange-input1");
        console.log(dateInput);
        if (!dateInput) {
            console.error("No se encontró el elemento datetimerange-input1");
            return;
        }

        // Clonar el elemento para limpiar completamente los event listeners
        const newDateInput = dateInput.cloneNode(true);
        dateInput.parentNode.replaceChild(newDateInput, dateInput);

        // Prevenir entrada manual
        newDateInput.addEventListener('keydown', function(e) {
            e.preventDefault();
            return false;
        });
        newDateInput.setAttribute('readonly', 'readonly');
        
        // Configurar nuevo DateRangePicker
        dateRangePickerInstance = new DateRangePicker(newDateInput, { 
            timePicker: true, 
            alwaysShowCalendars: true,
            startDate: moment().startOf('day'),
            endDate: moment().startOf('day').add(1, 'days'),
            locale: { 
                format: "YYYY-MM-DD HH:mm",
                applyLabel: "Aplicar",
                cancelLabel: "Cancelar",
                daysOfWeek: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"],
                monthNames: [
                    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                ]
            },
            showDropdowns: true,
            opens: "center",
            autoApply: true
        }, function(start, end) {
            newDateInput.value = start.format('YYYY-MM-DD HH:mm') + ' - ' + end.format('YYYY-MM-DD HH:mm');
            
            // Asegurar que los campos ocultos reciban los valores correctos
            const checkInField = document.getElementById("check_in");
            const checkOutField = document.getElementById("check_out");
            
            if (checkInField) checkInField.value = start.format('YYYY-MM-DDTHH:mm:ss');
            if (checkOutField) checkOutField.value = end.format('YYYY-MM-DDTHH:mm:ss');
            
            calcularTotal();
        });
        
        // Establecer valores iniciales
        newDateInput.value = moment().startOf('day').format('YYYY-MM-DD HH:mm') + ' - ' + 
                              moment().startOf('day').add(1, 'days').format('YYYY-MM-DD HH:mm');
        
        // Asegurar que los campos ocultos tengan los valores iniciales correctos
        const checkInField = document.getElementById("check_in");
        const checkOutField = document.getElementById("check_out");
        
        if (checkInField) checkInField.value = moment().startOf('day').format('YYYY-MM-DDTHH:mm:ss');
        if (checkOutField) checkOutField.value = moment().startOf('day').add(1, 'days').format('YYYY-MM-DDTHH:mm:ss');
        
        console.log('DateRangePicker inicializado correctamente');
        
        return dateRangePickerInstance;
    }

    // Función para cargar clientes y habitaciones desde la API
    function cargarClientesYHabitaciones() {
        const token = localStorage.getItem("access_token");
        if (!token) {
            console.error("No se encontró el token de autenticación.");
            return;
        }

        // Cargar clientes
        fetch("/api/clients", {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => {
            const nombreSelect = document.getElementById("nombreBooking");
            if (!nombreSelect) return;
            nombreSelect.innerHTML = "";

            data.forEach(cliente => {
                let option = document.createElement("option");
                option.value = cliente.id;
                option.textContent = cliente.nombre;
                option.setAttribute('data-client-id', cliente.id);
                nombreSelect.appendChild(option);
            });

            inicializarChoices("#nombreBooking");
        })
        .catch(error => console.error("Error al cargar clientes:", error));

        // Cargar habitaciones
        fetch("/api/rooms", {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => {
            const habitacionSelect = document.getElementById("num_habitacion");
            if (!habitacionSelect) return;
            habitacionSelect.innerHTML = "";
            
            // Agregar opción por defecto
            let placeholderOption = document.createElement("option");
            placeholderOption.value = "";
            placeholderOption.textContent = "Seleccionar habitación...";
            placeholderOption.selected = true;
            habitacionSelect.appendChild(placeholderOption);

            // Filtrar solo habitaciones disponibles
            const habitacionesDisponibles = data.filter(hab => hab.disponibilidad === "Disponible");
            console.log("Habitaciones disponibles:", habitacionesDisponibles);
            
            // Guardar en localStorage para uso posterior
            localStorage.setItem("habitaciones", JSON.stringify(habitacionesDisponibles));

            // Llenar el select
            habitacionesDisponibles.forEach(hab => {
                let option = document.createElement("option");
                option.value = hab.id;
                option.textContent = `Habitación ${hab.num_habitacion}`;
                option.setAttribute('data-habitacion-id', hab.id);
                habitacionSelect.appendChild(option);
            });

            inicializarChoices("#num_habitacion");
        })
        .catch(error => console.error("Error al cargar habitaciones:", error));
    }

    // Función para calcular el total de la reserva
    function calcularTotal() {
        const precioNocheInput = document.getElementById("precio_noche");
        const totalPagarInput = document.getElementById("total_pagar");
        const checkInValue = document.getElementById("check_in")?.value;
        const checkOutValue = document.getElementById("check_out")?.value;

        if (!checkInValue || !checkOutValue) {
            totalPagarInput.value = "0.00";
            return;
        }

        const checkIn = moment(checkInValue);
        const checkOut = moment(checkOutValue);

        if (checkIn.isValid() && checkOut.isValid()) {
            let horas = checkOut.diff(checkIn, 'hours', true);
            let dias = Math.ceil(horas / 24);
            let precioPorNoche = parseFloat(precioNocheInput.value) || 0;
            totalPagarInput.value = dias > 0 ? `${(dias * precioPorNoche).toFixed(2)}` : "0.00";
        }
    }

    // Función principal para inicializar el formulario
    function inicializarFormulario() {
        console.log('Inicializando formulario de reserva');
        initializeDatePicker();
        inicializarChoices("#nombreBooking");
        inicializarChoices("#num_habitacion");
        formInitialized = true;
    }

    // Hacer funciones disponibles globalmente
    window.cargarClientesYHabitaciones = cargarClientesYHabitaciones;
    window.inicializarFormulario = inicializarFormulario;
    window.resetBookingForm = resetBookingForm;
    window.calcularTotal = calcularTotal;
    window.destroyDatePicker = destroyDatePicker;

    // Inicializar el observer
    initBookingPaneObserver();
});