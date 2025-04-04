document.addEventListener("DOMContentLoaded", () => {
  const tabObserver = new MutationObserver((mutationsList, observer) => {
    const tabs = document.querySelectorAll(".nav-link.search");
    tabs.forEach((button) => {
      if (!button.hasEventListener) {
        button.addEventListener("click", (event) => {
          const { path, head, body } = event.target.dataset;
          console.log(path);
          console.log(head);
          if (path && head && body) {
            loadTableData(path, head, body);
          } else {
            console.error("Faltan atributos en el botón:", event.target);
          }
        });
        button.hasEventListener = true;
      }
    });
  });

  tabObserver.observe(document.body, { childList: true, subtree: true });

  console.log("El DOM está completamente cargado.");

});

// Variable global para evitar llamadas duplicadas
let isLoadingTable = false;

async function loadTableData(path, head, body) {
    console.log(head);
    if (isLoadingTable) {
        console.warn("La tabla ya se está cargando. Ignorando llamada duplicada.");
        return;
    }

    isLoadingTable = true;

    try {
        const response = await fetch(path, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
        });
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        let data = await response.json();

        if (!data.length) throw new Error("El JSON está vacío o mal formateado");

        // Filtrar y formatear datos para la ruta de reservas
        if (path === "/api/bookings") {
            data = data.map((item) => {
                const { cliente_id, habitacion_id, ...filteredItem } = item;

                // Formatear fechas
                if (filteredItem.check_in) {
                    filteredItem.check_in = formatDate(filteredItem.check_in);
                }
                if (filteredItem.check_out) {
                    filteredItem.check_out = formatDate(filteredItem.check_out);
                }

                return filteredItem;
            });
        }

        console.log("Generando encabezados para el ID:", head);
        //ensureTableStructure("bookingTable"); // Asegurar la estructura de la tabla
        generateTableHeaders(Object.keys(data[0]), head); // Generar encabezados
        cleanTableContainer(body); // Limpiar el contenido del cuerpo de la tabla
        initializeTable(data, body, path); // Inicializar la tabla
        console.log(head);
        applyTableHeaderTheme(head); // Aplicar tema al encabezado
    } catch (error) {
        console.error("Error:", error);
        alert("Error al cargar los datos. Revisa la consola.");
    } finally {
        isLoadingTable = false;
    }
}

// Función auxiliar para formatear fechas
function formatDate(isoString) {
  if (!isoString) return "N/A";

  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formateando fecha:", error);
    return isoString; // Devolver la cadena original si hay error
  }
}

function generateTableHeaders(headers, head) {
  const tableHead = document.getElementById(head);
  if (!tableHead) throw new Error("No se encontró tableHead");

  // Limpiar el contenido del <thead> antes de agregar nuevos encabezados
  tableHead.innerHTML = "";

  // Crear una nueva fila de encabezados
  const tr = document.createElement("tr");
  tr.innerHTML = headers
    .map((header) => `<th data-field="${header}">${header}</th>`)
    .join("");

  // Agregar la columna de acciones
  tr.innerHTML += '<th data-field="actions">Acciones</th>';

  // Agregar la fila al <thead>
  tableHead.appendChild(tr);

  // Aplicar el tema al encabezado
  applyTableHeaderTheme(head);
}

function initializeTable(data, jsonBody, jsonUrl) {
  // Destruir la tabla existente si hay una
  $("#" + jsonBody).bootstrapTable("destroy");

  // Crear las columnas, manteniendo la columna de acciones
  const columns = Object.keys(data[0]).map((key) => ({
    field: key,
    title: key,
    sortable: true,
  }));

  // Agregar columna de acciones
  columns.push({
    field: "actions",
    title: "Acciones",
    formatter: (value, row, index) =>
      actionFormatter(value, row, index, jsonUrl),
  });

  // Inicializar la tabla con todas las opciones
  $("#" + jsonBody).bootstrapTable({
    data: data,
    columns: columns,
    search: true,
    pagination: true,
    showRefresh: true, // Activar el botón de refrescar integrado
    onRefresh: function () {
      // Obtener el tab activo basado en la tabla actual
      const tableId = jsonBody.replace("Body", "");
      const activeTab = document.querySelector(
        `.nav-link.search[data-body="${jsonBody}"]`
      );

      if (activeTab) {
        const path = activeTab.dataset.path;
        const head = activeTab.dataset.head;
        const body = activeTab.dataset.body;

        if (path && head && body) {
          loadTableData(path, head, body);
        }
      }
    },
  });

  console.log("Tabla inicializada con éxito");
}

function actionFormatter(value, row, index, jsonUrl) {
  // Mapeo de rutas de API a IDs de formularios
  const formMapping = {
    "/api/clients": "editClientForm", // Formulario para clientes
    "/api/rooms": "editRoomForm", // Formulario para habitaciones
    "/api/bookings": "editBookingForm", // Formulario para reservas
    "/api/users": "userEditForm", // Formulario para usuarios
  };

  // Extraer la parte base de jsonUrl (por ejemplo, "/api/users/1" -> "/api/users")
  const baseUrl = jsonUrl.replace(/^https?:\/\/[^\/]+(\/api\/\w+).*$/, "$1");

  // Obtener el ID del formulario basado en la ruta base
  const formId = formMapping[baseUrl] || "defaultForm"; // Usa un formulario por defecto si no hay coincidencia

  console.log(`Ruta base extraída: ${baseUrl}, ID del formulario: ${formId}`);

  return `
    <button 
      class="btn btn-warning btn-sm" 
      data-index="${index}" 
      data-id="${row.id}" 
      data-path="${jsonUrl}" 
      data-form="${formId}"
      onclick="editRow(this)"
    >
      Editar
    </button>
    <button 
      class="btn btn-danger btn-sm" 
      data-index="${index}" 
      data-id="${row.id}" 
      data-path="${jsonUrl}" 
      onclick="deleteRow(this)"
    >
      Eliminar
    </button>
  `;
}

async function deleteRow(button) {
  const id = button.dataset.id;
  const path = button.dataset.path;
  const token = localStorage.getItem("access_token");
  
  if (!confirm(`¿Eliminar reserva #${id}? Se archivará automáticamente.`)) return;

  try {
      // Mostrar estado de carga
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      button.disabled = true;

      const response = await fetch(`${path}/${id}`, {
          method: "DELETE",
          headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
          }
      });

      const data = await response.json();

      if (!response.ok) {
          throw new Error(data.message || "Error al eliminar");
      }

      // Actualizar tabla
      const table = $(button).closest('table');
      table.bootstrapTable('remove', {
          field: 'id',
          values: [parseInt(id)]
      });

      // Mostrar notificación
      mostrarToast("success", `Reserva #${id} archivada y eliminada`);

  } catch (error) {
      console.error("Delete error:", error);
      mostrarToast("error", error.message || "Error interno del servidor");
      
      // Recargar tabla si es error 500
      if (error.message.includes("500")) {
          const tableId = $(button).closest('table').attr('id');
          $(`#${tableId}`).bootstrapTable('refresh');
      }
  } finally {
      // Restaurar botón
      button.innerHTML = '<i class="fas fa-trash"></i>';
      button.disabled = false;
  }
}

async function editRow(button) {
    const id = button.getAttribute("data-id");
    const jsonUrl = button.getAttribute("data-path");
    const formId = button.getAttribute("data-form");

    console.log(`Editando registro con ID: ${id}, URL: ${jsonUrl}, Formulario: ${formId}`);

    if (!formId) {
        console.error("No se proporcionó un ID de formulario válido.");
        return;
    }

    try {
        // Obtener los datos del registro desde la API
        const response = await fetch(`${jsonUrl}/${id}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Error al obtener datos: ${response.statusText}`);
        }

        const record = await response.json();
        console.log("Datos del registro:", record);

        if (!record) {
            alert("No se encontró el registro.");
            return;
        }

        // Obtener el formulario por su ID
        const form = document.getElementById(formId);
        if (!form) {
            console.error(`No se encontró el formulario con ID: ${formId}`);
            return;
        }

        // Cambiar la acción del formulario para actualizar
        form.action = `${jsonUrl}/${id}`;
        form.method = "PUT";

        // Llenar el formulario con los datos del registro
        fillFormWithData(record, form);

        // Inicializar componentes específicos según el tipo de formulario
        if (formId === "editBookingForm") {
            await prepareBookingModalForEdit(record, form);
        }

        // Obtener el modal asociado al formulario
        const modalElement = form.closest(".modal");
        if (!modalElement) {
            console.error("No se encontró el modal asociado al formulario.");
            return;
        }

        // Mostrar el modal usando Bootstrap
        const modal = new bootstrap.Modal(modalElement);
        
        // Configurar el evento para cuando el modal esté completamente visible
        const handleModalShown = () => {
            // Eliminar el listener para evitar múltiples ejecuciones
            modalElement.removeEventListener('shown.bs.modal', handleModalShown);
            
            // Manejar específicamente el formulario de habitaciones
            if (formId === "editRoomForm") {
                // Inicializar el array global de servicios si no existe
                window.editServices = window.editServices || [];
                
                // Convertir las amenidades del registro a array
                if (record.amenidades) {
                    window.editServices = record.amenidades.split(',')
                        .map(item => item.trim())
                        .filter(item => item !== "");
                }

                // Renderizar las badges iniciales
                renderAmenitiesBadges(
                    window.editServices,
                    '#roomEditServicesContainer',
                    '#roomEditServiceCount',
                    '#roomEditAmenitiesInput'
                );

                // Configurar el botón para añadir nuevos servicios
                const addBtn = document.querySelector('#roomEditAddServiceBtn');
                const newServiceInput = document.querySelector('#roomEditNewService');
                
                if (addBtn) {
                    addBtn.onclick = () => {
                        const service = newServiceInput?.value.trim();
                        if (service && !window.editServices.includes(service)) {
                            window.editServices.push(service);
                            if (newServiceInput) newServiceInput.value = '';
                            renderAmenitiesBadges(
                                window.editServices,
                                '#roomEditServicesContainer',
                                '#roomEditServiceCount',
                                '#roomEditAmenitiesInput'
                            );
                        }
                    };
                }

                // Configurar el botón para limpiar servicios
                const clearBtn = document.querySelector('#roomEditClearServicesBtn');
                if (clearBtn) {
                    clearBtn.onclick = () => {
                        window.editServices = [];
                        renderAmenitiesBadges(
                            window.editServices,
                            '#roomEditServicesContainer',
                            '#roomEditServiceCount',
                            '#roomEditAmenitiesInput'
                        );
                    };
                }
            }
        };

        // Agregar el listener para cuando el modal se muestre
        modalElement.addEventListener('shown.bs.modal', handleModalShown);
        
        // Mostrar el modal
        modal.show();

        // Manejar la actualización al enviar el formulario
        form.onsubmit = async function (event) {
            event.preventDefault();

            // Crear un objeto con los datos actualizados del formulario
            const formData = new FormData(form);
            const updatedData = {};
            formData.forEach((value, key) => {
                // Para el formulario de habitaciones, usar el array global de servicios
                if (key === 'amenidades' && formId === "editRoomForm") {
                    updatedData[key] = window.editServices.join(', ');
                } else {
                    updatedData[key] = value;
                }
            });

            // Formatear las fechas al formato esperado por el servidor (para bookings)
            if (formId === "editBookingForm") {
                if (updatedData.check_in) {
                    updatedData.check_in = moment.utc(updatedData.check_in).format("YYYY-MM-DDTHH:mm:ss");
                }
                if (updatedData.check_out) {
                    updatedData.check_out = moment.utc(updatedData.check_out).format("YYYY-MM-DDTHH:mm:ss");
                }
            }

            try {
                // Enviar la solicitud PUT para actualizar el registro
                const putResponse = await fetch(`${jsonUrl}/${id}`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updatedData),
                });

                if (!putResponse.ok) {
                    throw new Error(`Error al actualizar: ${putResponse.statusText}`);
                }

                // Mostrar notificación de éxito
                window.mostrarToast("update");
                
                // Ocultar el modal
                modal.hide();

                // Actualizar la fila correspondiente en la tabla
                const table = button.closest("table");
                if (table) {
                    const rowIndex = button.closest("tr").rowIndex - 1;
                    
                    // Formatear los datos para la visualización en la tabla
                    const displayData = {...updatedData};
                    if (formId === "editBookingForm") {
                        if (displayData.check_in) {
                            displayData.check_in = moment(displayData.check_in).format("DD/MM/YYYY HH:mm");
                        }
                        if (displayData.check_out) {
                            displayData.check_out = moment(displayData.check_out).format("DD/MM/YYYY HH:mm");
                        }
                    }

                    // Actualizar la fila en la tabla
                    $(`#${table.id}`).bootstrapTable("updateRow", {
                        index: rowIndex,
                        row: displayData,
                    });
                }
            } catch (error) {
                console.error("Error al actualizar el registro:", error);
                alert("No se pudo actualizar el registro. Revisa la consola.");
            }
        };
    } catch (error) {
        console.error("Error cargando datos del registro:", error);
        alert("Error al cargar la información del registro.");
    }
}


// ================ FUNCIÓN fillFormWithData (CORREGIDA) ================
function fillFormWithData(record, form) {
  // Llenar campos normales
  Object.keys(record).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input && key !== 'amenidades') input.value = record[key] || '';
  });

  // Lógica específica para formulario de habitaciones
  if (form.id === "editRoomForm") {
      const amenitiesString = record.amenidades || "";
      const amenitiesArray = amenitiesString.split(',').map(item => item.trim()).filter(item => item !== "");
      renderAmenitiesBadges(
          amenitiesArray,
          '#servicesContainer',
          '#serviceCount',
          '#amenitiesInput'
      );
  }
}


function renderAmenitiesBadges(amenitiesArray, containerId, countId, inputId) {
  const container = document.querySelector(containerId);
  const countElement = document.querySelector(countId);
  const hiddenInput = document.querySelector(inputId);

  if (!container) {
      console.error(`Contenedor no encontrado: ${containerId}`);
      return;
  }

  // Limpiar contenedor
  container.innerHTML = '';

  // Crear badges con event listeners adecuados
  amenitiesArray.forEach((amenity, index) => {
      const badge = document.createElement('span');
      badge.className = 'badge bg-primary me-1 mb-1';
      badge.style.cssText = 'display: inline-block; margin-bottom: 0.3rem;';
      
      // Texto de la amenidad
      badge.appendChild(document.createTextNode(amenity + ' '));
      
      // Botón de eliminar
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'btn-close btn-close-white ms-1 remove-service';
      closeButton.setAttribute('aria-label', 'Remove');
      
      // Usar closure para capturar el índice correcto
      closeButton.addEventListener('click', ((currentIndex) => {
          return function() {
              // Eliminar el elemento del array global correspondiente
              if (containerId === '#roomEditServicesContainer') {
                  window.editServices.splice(currentIndex, 1);
                  renderAmenitiesBadges(window.editServices, containerId, countId, inputId);
              } else {
                  window.services.splice(currentIndex, 1);
                  renderAmenitiesBadges(window.services, containerId, countId, inputId);
              }
          };
      })(index));
      
      badge.appendChild(closeButton);
      container.appendChild(badge);
  });

  // Actualizar contador
  if (countElement) {
      countElement.textContent = amenitiesArray.length;
  }

  // Actualizar campo oculto
  if (hiddenInput) {
      hiddenInput.value = amenitiesArray.join(', ');
  }
}

async function prepareBookingModalForEdit(booking, form) {
  const token = localStorage.getItem("access_token");
  if (!token) {
    console.error("No se encontró el token de autenticación.");
    return;
  }

  try {
    // Cargar datos de clientes y habitaciones en paralelo
    const [clientesResponse, habitacionesResponse] = await Promise.all([
      fetch("/api/clients", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/rooms", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (!clientesResponse.ok || !habitacionesResponse.ok) {
      throw new Error("Error al cargar datos de clientes o habitaciones");
    }

    const clientes = await clientesResponse.json();
    const habitaciones = await habitacionesResponse.json();

    // Guardar habitaciones en localStorage para uso posterior
    localStorage.setItem("habitaciones", JSON.stringify(habitaciones));

    // Preparar selects antes de inicializar Choices.js
    const clienteSelect = form.querySelector("#nombreBooking");
    const habitacionSelect = form.querySelector("#num_habitacion");

    if (!clienteSelect || !habitacionSelect) {
      console.error("No se encontraron los selectores #nombreBooking o #num_habitacion.");
      return;
    }

    // Limpiar selects
    clienteSelect.innerHTML = "";
    habitacionSelect.innerHTML = "";

    // Llenar select de clientes
    clientes.forEach((cliente) => {
      const option = document.createElement("option");
      option.value = cliente.id;
      option.textContent = cliente.nombre;
      clienteSelect.appendChild(option);
    });

    // Llenar select de habitaciones
    if (habitaciones && habitaciones.length > 0) {
      // Ordenar habitaciones por número
      habitaciones.sort((a, b) => a.num_habitacion - b.num_habitacion);

      habitaciones.forEach((hab) => {
        const option = document.createElement("option");
        option.value = hab.id;
        option.textContent = `Habitación ${hab.num_habitacion} (${hab.tipo})`;
        
        // MODIFICACIÓN CLAVE: Solo deshabilitar si está ocupada Y NO es la actual
        if (hab.disponibilidad !== "Disponible" && hab.id != booking.habitacion_id) {
          option.disabled = true;
          option.textContent += " - Ocupada";
        }
        
        // Habilitar explícitamente las disponibles que no son la actual
        if (hab.disponibilidad === "Disponible" && hab.id != booking.habitacion_id) {
          option.disabled = false;
        }

        // Marcar la habitación actual
        if (hab.id == booking.habitacion_id) {
          option.selected = true;
          option.style.fontWeight = "bold";
          option.textContent += " (Actual)";
          option.setAttribute("data-current", "true");
          
          // Forzar disponibilidad si estaba marcada como ocupada
          option.disabled = false;
        }

        habitacionSelect.appendChild(option);
      });
    } else {
      console.warn("No se encontraron habitaciones.");
    }

    // Inicializar Choices.js con configuración actualizada
    initializeChoicesForBookingForm(clienteSelect, habitacionSelect, booking);

    // Formatear y establecer fechas
    const checkIn = moment.utc(booking.check_in);
    const checkOut = moment.utc(booking.check_out);

    // Actualizar campos ocultos
    const checkInField = form.querySelector("#check_in");
    if (checkInField) {
      checkInField.value = checkIn.format("YYYY-MM-DDTHH:mm:ss[Z]");
    }

    const checkOutField = form.querySelector("#check_out");
    if (checkOutField) {
      checkOutField.value = checkOut.format("YYYY-MM-DDTHH:mm:ss[Z]");
    }

    // Configurar DateRangePicker
    const dateRangeInput2 = form.querySelector("#datetimerange-input2");
    if (dateRangeInput2) {
      // Destruir instancia anterior si existe
      if (dateRangeInput2.dateRangePicker) {
        dateRangeInput2.dateRangePicker.destroy();
        delete dateRangeInput2.dateRangePicker;
      }

      // Configurar nuevo DateRangePicker
      dateRangeInput2.dateRangePicker = new DateRangePicker(dateRangeInput2, {
        timePicker: true,
        alwaysShowCalendars: true,
        autoApply: true,
        startDate: checkIn,
        endDate: checkOut,
        locale: { format: "YYYY-MM-DD HH:mm" },
        showDropdowns: true,
      }, function(start, end) {
        dateRangeInput2.value = start.format("YYYY-MM-DD HH:mm") + " - " + end.format("YYYY-MM-DD HH:mm");
        form.querySelector("#check_in").value = start.utc().format("YYYY-MM-DDTHH:mm:ss[Z]");
        form.querySelector("#check_out").value = end.utc().format("YYYY-MM-DDTHH:mm:ss[Z]");
        calcularTotal(form);
      });

      dateRangeInput2.setAttribute("readonly", "readonly");
    }

    // Buscar la habitación seleccionada para mostrar sus detalles
    const habitacionSeleccionada = habitaciones.find(
      (h) => h.id == booking.habitacion_id
    );
    
    if (habitacionSeleccionada) {
      const tipoHabitacionField = form.querySelector("#tipo_habitacion");
      if (tipoHabitacionField) {
        tipoHabitacionField.value = habitacionSeleccionada.tipo;
      }

      const numHuespedesField = form.querySelector("#num_huespedes");
      if (numHuespedesField) {
        numHuespedesField.max = habitacionSeleccionada.capacidad;
        numHuespedesField.value = booking.num_huespedes || habitacionSeleccionada.capacidad;
      }

      const precioNocheField = form.querySelector("#precio_noche");
      if (precioNocheField) {
        precioNocheField.value = habitacionSeleccionada.precio_noche;
      }
    }

    // Establecer otros campos
    const totalPagarField = form.querySelector("#total_pagar");
    if (totalPagarField) {
      totalPagarField.value = booking.valor_reservacion || "0.00";
    }

    const metodoPagoField = form.querySelector("#metodo_pago");
    if (metodoPagoField) {
      metodoPagoField.value = booking.metodo_pago || "Tarjeta";
    }

    const estadoReservaField = form.querySelector("#estado_reserva");
    if (estadoReservaField) {
      estadoReservaField.value = booking.estado || "pendiente";
    }

    const notasField = form.querySelector("#notas");
    if (notasField) {
      notasField.value = booking.notas || "";
    }

    // Calcular total inicial
    calcularTotal(form);

  } catch (error) {
    console.error("Error al preparar el formulario de reserva:", error);
    mostrarToast("error", "Error al cargar datos para edición");
  }
}

// ================ FUNCIÓN PRINCIPAL (prepareBookingModalForEdit) ================
async function prepareBookingModalForEdit(booking, form) {
  const token = localStorage.getItem("access_token");
  if (!token) return console.error("Token no encontrado");

  try {
      // Cargar datos en paralelo
      const [clientes, habitaciones] = await Promise.all([
          fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
          fetch("/api/rooms", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
      ]);

      // Elementos del formulario
      const clienteSelect = form.querySelector("#nombreBooking");
      const habitacionSelect = form.querySelector("#num_habitacion");
      
      // Limpiar selects
      clienteSelect.innerHTML = habitacionSelect.innerHTML = "";

      // Llenar clientes
      clientes.forEach(cliente => {
          clienteSelect.add(new Option(cliente.nombre, cliente.id));
      });

      // Llenar habitaciones (lógica mejorada)
      habitaciones.forEach(hab => {
          const option = new Option(
              `Habitación ${hab.num_habitacion} (${hab.tipo})`, 
              hab.id
          );
          
          const isCurrent = hab.id === booking.habitacion_id;
          option.disabled = !isCurrent && hab.disponibilidad !== "Disponible";
          
          // Marcado visual
          if (option.disabled) option.text += " - Ocupada";
          if (isCurrent) {
              option.text += " (Actual)";
              option.dataset.current = "true";
          }
          
          habitacionSelect.add(option);
      });

      // Inicializar componentes
      initializeChoicesCompatibles(clienteSelect, habitacionSelect, booking, form);
      initializeDatePickerCompat(form, booking);
      updateRoomDetailsCompat(form, habitaciones, booking);

  } catch (error) {
      console.error("Error:", error);
      mostrarToast("error", "Error al cargar datos");
  }
}

function initializeChoicesForBookingForm(clienteSelect, habitacionSelect, booking) {
  // Destruir instancias anteriores
  [clienteSelect, habitacionSelect].forEach(select => {
    if (select.choices) {
      select.choices.destroy();
      select.choices = null;
    }
  });

  // Configuración para v11.x
  const baseConfig = {
    removeItemButton: true,
    searchEnabled: true,
    shouldSort: false,
    allowHTML: true,
    classNames: {
      itemSelectable: 'choices__item--selectable',
      itemDisabled: 'choices__item--disabled'
    }
  };

  // Selector de habitaciones
  const roomChoices = new Choices(habitacionSelect, {
    ...baseConfig,
    callbackOnChange: (choice) => {
      if (choice) {
        const selectedValue = choice.value;
        const selectedOption = habitacionSelect.querySelector(`option[value="${selectedValue}"]`);
        
        if (selectedOption && !selectedOption.disabled) {
          const habitaciones = JSON.parse(localStorage.getItem("habitaciones")) || [];
          const hab = habitaciones.find(h => h.id == selectedValue);
          const form = habitacionSelect.closest("form");

          if (hab) {
            form.querySelector("#tipo_habitacion").value = hab.tipo;
            form.querySelector("#precio_noche").value = hab.precio_noche;
            form.querySelector("#num_huespedes").max = hab.capacidad;
            calcularTotal(form);
          }
        }
      }
    }
  });

  // Plantillas personalizadas
  roomChoices.passedElement.element.addEventListener('choice', (event) => {
    // Actualizar visualmente después de selección
    setTimeout(() => calcularTotal(habitacionSelect.closest("form")), 100);
  });

  // Configurar opciones iniciales
  roomChoices.setChoices(
    Array.from(habitacionSelect.options).map(option => ({
      value: option.value,
      label: option.text,
      disabled: option.disabled,
      selected: option.selected,
      customProperties: {
        'data-current': option.dataset.current || false
      }
    })),
    'value',
    'label',
    false
  );
}

function initializeChoicesCompatibles(clienteSelect, habitacionSelect, booking, form) {
  // Destruir instancias anteriores
  [clienteSelect, habitacionSelect].forEach(select => {
    if (select.choices) {
      select.choices.destroy();
      select.choices = null;
    }
  });

  const baseConfig = {
    removeItemButton: true,
    searchEnabled: true,
    shouldSort: false,
    allowHTML: true,
    classNames: {
      itemSelectable: 'choices__item--selectable',
      itemDisabled: 'choices__item--disabled'
    }
  };

  // Selector de clientes
  new Choices(clienteSelect, {
    ...baseConfig,
    shouldSort: true
  }).setChoiceByValue(booking.cliente_id?.toString());

  // Selector de habitaciones
  const roomChoices = new Choices(habitacionSelect, {
    ...baseConfig,
    callbackOnChange: (choice) => {
      if (choice.value) {
        handleRoomChangeCompat(choice.value, form);
      }
    }
  });

  // Configurar opciones
  roomChoices.setChoices(
    Array.from(habitacionSelect.options).map(option => ({
      value: option.value,
      label: option.text,
      disabled: option.disabled,
      selected: option.selected
    })),
    'value',
    'label',
    false
  );
}


// ================ FUNCIONES AUXILIARES ================
function initializeDatePickerCompat(form, booking) {
  const input = form.querySelector("#datetimerange-input2");
  
  // Destruir instancia anterior
  if (input.dateRangePicker && input.dateRangePicker.destroy) {
      input.dateRangePicker.destroy();
  }

  // Nueva instancia
  input.dateRangePicker = new DateRangePicker(input, {
      timePicker: true,
      autoApply: true,
      startDate: moment.utc(booking.check_in),
      endDate: moment.utc(booking.check_out),
      locale: { format: "YYYY-MM-DD HH:mm" }
  }, (start, end) => {
      input.value = `${start.format("YYYY-MM-DD HH:mm")} - ${end.format("YYYY-MM-DD HH:mm")}`;
      form.querySelector("#check_in").value = start.utc().format();
      form.querySelector("#check_out").value = end.utc().format();
      calcularTotal(form);
  });
}

function updateRoomDetailsCompat(form, habitaciones, booking) {
  const hab = habitaciones.find(h => h.id == booking.habitacion_id);
  if (!hab) return;

  form.querySelector("#tipo_habitacion").value = hab.tipo;
  form.querySelector("#precio_noche").value = hab.precio_noche;
  const numHuespedes = form.querySelector("#num_huespedes");
  numHuespedes.max = hab.capacidad;
  numHuespedes.value = Math.min(booking.num_huespedes || 1, hab.capacidad);
}

function handleRoomChangeCompat(roomId, form) {
  const habitaciones = JSON.parse(localStorage.getItem("habitaciones")) || [];
  const hab = habitaciones.find(h => h.id == roomId);
  if (hab) {
      form.querySelector("#tipo_habitacion").value = hab.tipo;
      form.querySelector("#precio_noche").value = hab.precio_noche;
      calcularTotal(form);
  }
}

function createChoiceTemplateCompat(classNames, data, booking) {
  const div = document.createElement("div");
  div.className = `${classNames.item} ${data.disabled ? classNames.itemDisabled : ""}`;
  
  const isCurrent = data.value === booking.habitacion_id?.toString();
  let badge = "";
  if (data.disabled) badge = `<span class="badge bg-danger">Ocupada</span>`;
  if (isCurrent) badge = `<span class="badge bg-success">Actual</span>`;

  div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
          <span>${data.label}</span>
          ${badge}
      </div>
  `;
  return div;
}

function initializeChoicesForBookingForm(clienteSelect, habitacionSelect, booking) {
  // Destruir instancias anteriores correctamente
  [clienteSelect, habitacionSelect].forEach(select => {
    if (select.choices) {
      select.choices.destroy();
      delete select.choices;
    }
  });

  // Configuración para v11.x
  const baseConfig = {
    removeItemButton: true,
    searchEnabled: true,
    shouldSort: false,
    classNames: {
      itemSelectable: 'choices__item--selectable',
      itemDisabled: 'choices__item--disabled'
    },
    // Nuevos parámetros en v11
    allowHTML: true,
    searchPlaceholderValue: "Buscar...",
    noResultsText: "No hay resultados",
    itemSelectText: "Presiona para seleccionar"
  };

  // Inicializar selector de habitaciones
  const roomChoices = new Choices(habitacionSelect, {
    ...baseConfig,
    // Configuración específica
    onChange: (choice) => {
      if (choice) {
        const selectedValue = choice.value;
        const selectedOption = habitacionSelect.querySelector(`option[value="${selectedValue}"]`);
        
        if (selectedOption && !selectedOption.disabled) {
          const habitaciones = JSON.parse(localStorage.getItem("habitaciones")) || [];
          const hab = habitaciones.find(h => h.id == selectedValue);
          const form = habitacionSelect.closest("form");

          if (hab) {
            form.querySelector("#tipo_habitacion").value = hab.tipo;
            form.querySelector("#precio_noche").value = hab.precio_noche;
            form.querySelector("#num_huespedes").max = hab.capacidad;
            calcularTotal(form);
          }
        }
      }
    }
  });

  // Renderizado personalizado (v11)
  roomChoices.setTemplates({
    choice: ({ classNames }, data) => {
      const isDisabled = data.disabled;
      const isCurrent = data.value === booking.habitacion_id?.toString();
      
      return `
        <div class="${classNames.item} ${isDisabled ? 'choices__item--disabled' : ''}" 
             data-value="${data.value}"
             data-choice-selectable>
          <div class="d-flex justify-content-between align-items-center">
            <span>${data.label}</span>
            ${isDisabled ? '<span class="badge bg-danger ms-2">Ocupada</span>' : ''}
            ${isCurrent ? '<span class="badge bg-success ms-2">Actual</span>' : ''}
          </div>
        </div>
      `;
    }
  });

  // Actualizar opciones desde el DOM
  roomChoices.setChoices(
    Array.from(habitacionSelect.options).map(option => ({
      value: option.value,
      label: option.text,
      disabled: option.disabled,
      selected: option.selected
    })),
    'value',
    'label',
    false
  );
}

// Función para calcular el total a pagar
function calcularTotal(form) {
  const precioNocheInput = form.querySelector("#precio_noche");
  const totalPagarInput = form.querySelector("#total_pagar");
  const checkInValue = form.querySelector("#check_in")?.value;
  const checkOutValue = form.querySelector("#check_out")?.value;

  if (!checkInValue || !checkOutValue) {
    totalPagarInput.value = "$0.00";
    return;
  }

  const checkIn = moment(checkInValue);
  const checkOut = moment(checkOutValue);

  if (checkIn.isValid() && checkOut.isValid()) {
    let horas = checkOut.diff(checkIn, "hours", true);
    let dias = Math.ceil(horas / 24);
    let precioPorNoche = parseFloat(precioNocheInput.value) || 0;
    totalPagarInput.value =
      dias > 0 ? `${(dias * precioPorNoche).toFixed(2)}` : "0.00";
  }
}

function applyTableHeaderTheme(head) {
  const body = document.body;

  let tableHead = document.getElementById(head);
  if (!tableHead) {
    console.warn(`El elemento <thead> con ID "${head}" no está disponible. Observando cambios en el DOM...`);


    return;
  }

  console.log(`El elemento <thead> con ID "${head}" ya está disponible.`);
  tableHead.classList.remove("custom-header-light", "custom-header-dark");

  if (body.getAttribute("data-bs-theme") === "dark") {
    tableHead.classList.add("custom-header-dark");
  } else {
    tableHead.classList.add("custom-header-light");
  }
}

function cleanTableContainer(bodyId) {
    // Obtener el elemento <tbody> por su ID
    const tableBody = document.getElementById(bodyId);
    if (!tableBody) {
        console.error(`No se encontró el cuerpo de la tabla con ID: ${bodyId}`);
        return;
    }

    // Verificar que el elemento sea un <tbody>
    if (tableBody.tagName !== "TBODY") {
        console.warn(`El elemento con ID ${bodyId} no es un <tbody>. No se realizará ninguna acción.`);
        return;
    }

    // Limpia el contenido del <tbody>
    tableBody.innerHTML = "";
    console.log(`El contenido del cuerpo de la tabla con ID ${bodyId} ha sido limpiado.`);
}

