document.addEventListener("DOMContentLoaded", function () {
    function inicializarChoices(selector) {
        const elemento = document.querySelector(selector);
    
        if (elemento && !elemento.choicesInstance) {
            // Primero, guardamos el valor seleccionado actual (si existe)
            const currentValue = elemento.value;
            
            // Inicializar Choices con configuración específica
            elemento.choicesInstance = new Choices(elemento, {
                removeItemButton: true,
                searchEnabled: true,
                itemSelectText: '',
                shouldSort: false,
                // Deshabilitar la selección automática del primer elemento
                addItems: false,
                // Evitar que seleccione un elemento por defecto
                placeholderValue: 'Seleccionar...',
                placeholder: true
            });
    
            // Para el selector de clientes, configurar el manejo del ID
            if (selector === "#nombreBooking") {
                // Configurar el evento change para actualizar el campo oculto
                elemento.addEventListener('change', function(event) {
                    console.log(this.value);
                    const selectedValue = this.value;
                    console.log("Cliente seleccionado, ID:", selectedValue);
                    
                    // Actualizar o crear el campo oculto con el ID
                    let hiddenInput = document.getElementById('cliente_id_hidden');
                    if (!hiddenInput) {
                        hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.id = 'cliente_id_hidden';
                        hiddenInput.name = 'cliente_id';
                        this.closest('form').appendChild(hiddenInput);
                    }
                    hiddenInput.value = selectedValue;
                });
            }
        }
    }

    function cargarClientesYHabitaciones() {
        const token = localStorage.getItem("access_token");
        if (!token) {
            console.error("No se encontró el token de autenticación.");
            return;
        }


    // Obtener clientes desde la API
    fetch("/api/clients", {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        const nombreSelect = document.getElementById("nombreBooking");
        if (!nombreSelect) return;
        nombreSelect.innerHTML = ""; // Limpiar opciones previas

        data.forEach(cliente => {
            let option = document.createElement("option");
            option.value = cliente.id;
            option.textContent = cliente.nombre;
            // Agregar un atributo data para mayor seguridad
            option.setAttribute('data-client-id', cliente.id);
            nombreSelect.appendChild(option);
        });

        inicializarChoices("#nombreBooking");
        
        // Después de inicializar Choices, configurar el campo oculto
        if (nombreSelect.options.length > 0) {
            // Obtener el valor del primer cliente
            const firstClientId = nombreSelect.options[0].value;
            
            // Crear o actualizar el campo oculto
            let hiddenInput = document.getElementById('client_id_hidden');
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.id = 'client_id_hidden';
                hiddenInput.name = 'client_id';
                nombreSelect.closest('form').appendChild(hiddenInput);
            }
            hiddenInput.value = firstClientId;
            
            console.log("Valor inicial de client_id:", firstClientId);
        }
    })
    .catch(error => console.error("Error al cargar clientes:", error));

    // Obtener habitaciones desde la API
    fetch("/api/rooms", {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        const habitacionSelect = document.getElementById("num_habitacion");
        if (!habitacionSelect) return;
        habitacionSelect.innerHTML = ""; // Limpiar opciones previas

        // Filtrar solo habitaciones disponibles
        const habitacionesDisponibles = data.filter(hab => hab.disponibilidad === "Disponible");
        console.log("Habitaciones disponibles:", habitacionesDisponibles);

        localStorage.setItem("habitaciones", JSON.stringify(habitacionesDisponibles)); // Guardar en localStorage

        habitacionesDisponibles.forEach(hab => {
            let option = document.createElement("option");
            option.value = hab.num_habitacion;
            option.textContent = `Habitación ${hab.num_habitacion}`;
            habitacionSelect.appendChild(option);
        });

        inicializarChoices("#num_habitacion");
    })
    .catch(error => console.error("Error al cargar habitaciones:", error));

    }

    window.cargarClientesYHabitaciones = cargarClientesYHabitaciones;

    function inicializarFormulario() {
        const habitacionSelect = document.getElementById("num_habitacion");
        if (!habitacionSelect) return;
    
        habitacionSelect.addEventListener("change", function () {
            const habitaciones = JSON.parse(localStorage.getItem("habitaciones")) || [];
            const habitacionSeleccionada = habitaciones.find(h => h.num_habitacion == habitacionSelect.value);
            
            if (habitacionSeleccionada) {
                document.getElementById("tipo_habitacion").value = habitacionSeleccionada.tipo;
                document.getElementById("num_huespedes").max = habitacionSeleccionada.capacidad;
                document.getElementById("num_huespedes").value = habitacionSeleccionada.capacidad;
                document.getElementById("precio_noche").value = habitacionSeleccionada.precio_noche;
                calcularTotal();
            }
        });
    
        // Deshabilitar la escritura manual en el campo de fecha
        const dateInput = document.getElementById("datetimerange-input1");
        if (dateInput) {
            // Prevenir entrada de teclado
            dateInput.addEventListener('keydown', function(e) {
                e.preventDefault();
                return false;
            });
            
            // Establecer como solo lectura
            dateInput.setAttribute('readonly', 'readonly');
            
            // Inicializar el DateRangePicker
            new DateRangePicker('datetimerange-input1', { 
                timePicker: true, 
                alwaysShowCalendars: true,
                startDate: moment().startOf('day'),
                endDate: moment().startOf('day').add(1, 'days'),
                locale: { format: "YYYY-MM-DD HH:mm" },
                showDropdowns: true
            }, function (start, end) {
                // Actualizar el input visible con el formato correcto
                dateInput.value = start.format('YYYY-MM-DD HH:mm') + ' - ' + end.format('YYYY-MM-DD HH:mm');
                
                // Actualizar los campos ocultos
                document.getElementById("check_in").value = start.toISOString();
                document.getElementById("check_out").value = end.toISOString();
                
                calcularTotal();
            });
        }
    }
    
    window.inicializarFormulario = inicializarFormulario;

    function calcularTotal() {
        const precioNocheInput = document.getElementById("precio_noche");
        const totalPagarInput = document.getElementById("total_pagar");
        const checkInValue = document.getElementById("check_in")?.value;
        const checkOutValue = document.getElementById("check_out")?.value;

        if (!checkInValue || !checkOutValue) {
            totalPagarInput.value = "$0.00";
            return;
        }

        const checkIn = moment(checkInValue);
        const checkOut = moment(checkOutValue);

        if (checkIn.isValid() && checkOut.isValid()) {
            let horas = checkOut.diff(checkIn, 'hours', true);
            let dias = Math.ceil(horas / 24);
            let precioPorNoche = parseFloat(precioNocheInput.value) || 0;
            totalPagarInput.value = dias > 0 ? `$${(dias * precioPorNoche).toFixed(2)}` : "$0.00";
        }
    }
});
