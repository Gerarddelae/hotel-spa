document.addEventListener("DOMContentLoaded", () => {
  const tabObserver = new MutationObserver((mutationsList, observer) => {
    const tabs = document.querySelectorAll(".nav-link.search");
    tabs.forEach((button) => {     
      if (!button.hasEventListener) {
        if (button.classList.contains("active")) { // Si el tab ya está activo
          const { path, head, body } = button.dataset;
          if (path && head && body) {
            //applyTableHeaderTheme(head); // Aplicar tema al encabezado
            loadTableData(path, head, body);
          }
        }
        button.addEventListener("click", (event) => {
          const { path, head, body } = event.target.dataset;
          console.log(path);
          console.log(head);
          if (path && head && body) {
            // Destruir tabla existente antes de cargar
            if ($(`#${body}`).data('bootstrap.table')) {
              $(`#${body}`).bootstrapTable('destroy');
            }
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
                if (typeof filteredItem.valor_reservacion === 'number') {
                  filteredItem.valor_reservacion = '$' + filteredItem.valor_reservacion
                      .toLocaleString('es-ES', { 
                          useGrouping: true, 
                          minimumFractionDigits: 0 
                      });
                  }
                console.log(filteredItem);
                return filteredItem;
            });
        }

                // Filtrar y formatear datos para la ruta de archivo
                if (path === "/api/archives") {
                  data = data.map((item) => {
                      const { booking_id, cliente_id, habitacion_id, tipo_habitacion, notas, ...filteredItem } = item;
      
                      // Formatear fechas
                      if (filteredItem.check_in) {
                          filteredItem.check_in = formatDate(filteredItem.check_in);
                      }
                      if (filteredItem.check_out) {
                          filteredItem.check_out = formatDate(filteredItem.check_out);
                      }
                      if (filteredItem.fecha_archivo) {
                          filteredItem.fecha_archivo = formatDate(filteredItem.fecha_archivo);
                      }
                      if (typeof filteredItem.valor_reservacion === 'number') {
                        filteredItem.valor_reservacion = '$' + filteredItem.valor_reservacion
                            .toLocaleString('es-ES', { 
                                useGrouping: true, 
                                minimumFractionDigits: 0 
                            });
                        }
      
                      return filteredItem;
                  });
              }

              // Filtrar y formatear datos para la ruta de archivo
              if (path === "/api/incomes") {
                data = data.map((item) => {
                    const { source_id, cliente_id, ...filteredItem } = item;
    
                    if (filteredItem.fecha_pago) {
                        filteredItem.fecha_pago = formatDate(filteredItem.fecha_pago);
                    }

                    if (typeof filteredItem.monto === 'number') {
                      filteredItem.monto = '$' + filteredItem.monto
                          .toLocaleString('es-ES', { 
                              useGrouping: true, 
                              minimumFractionDigits: 0 
                          });
                      }
    
                    return filteredItem;
                });
            }

        console.log("Generando encabezados para el ID:", head);
        //cleanTableContainer(body); // Limpiar el contenido del cuerpo de la tabla
        initializeTable(data, body, path); // Inicializar la tabla
        //generateTableHeaders(Object.keys(data[0]), head); // Generar encabezados
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
      // Convertir a hora local explícitamente
      return moment.utc(isoString).format("DD/MM/YYYY HH:mm");
  } catch (error) {
      console.error("Error formateando fecha:", error);
      return "Fecha inválida";
  }
}

function generateTableHeaders(headers, head) {
  const tableHead = document.getElementById(head);
  console.log(tableHead);
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
  
  console.log(jsonBody);
  // Agregar columna de acciones
  if (jsonBody !== "archivesTable" && jsonBody !== "incomesTable") {
    columns.push({
      field: "actions",
      title: "Acciones",
      formatter: (value, row, index) =>
        actionFormatter(value, row, index, jsonUrl),
    });
  }

  // Inicializar la tabla con todas las opciones
  $("#" + jsonBody).bootstrapTable({
    data: data,
    columns: columns,
    search: true,
    pagination: true,
    responsive: true,
    // Configuración de exportación
    showExport: true,
    exportTypes: ['json', 'xml', 'csv', 'txt', 'sql', 'excel', 'pdf'],
    exportOptions: {
        fileName: jsonBody,
        ignoreColumn: ['actions'], // Columnas a ignorar en la exportación
        onCellHtmlData: function(cell, rowIndex, colIndex, htmlData) {
            // Puedes manipular los datos antes de exportar
            return htmlData;
        }
    },
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
                console.log(updatedData);
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
                            displayData.check_in = moment.utc(displayData.check_in).format("DD/MM/YYYY HH:mm");
                        }
                        if (displayData.check_out) {
                            displayData.check_out = moment.utc(displayData.check_out).format("DD/MM/YYYY HH:mm");
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


// ================ FUNCIÓN PRINCIPAL (prepareBookingModalForEdit) ================
async function prepareBookingModalForEdit(booking, form) {
  const token = localStorage.getItem("access_token");
  if (!token) {
    console.error("No se encontró el token de autenticación.");
    return;
  }

  // Variables para instancias
  let choicesInstances = {};
  let observers = [];
  let datePickerInstance = null;

  try {
    // 1. Elementos del formulario
    const clienteSelect = form.querySelector("#nombreBooking");
    const habitacionSelect = form.querySelector("#num_habitacion");
    const dateRangeInput = document.getElementById("datetimerange-input2");
    const tipoHabitacionInput = form.querySelector("#tipo_habitacion");
    const precioNocheInput = form.querySelector("#precio_noche");
    const numHuespedesInput = form.querySelector("#num_huespedes");

    // 2. Función para destruir DateRangePicker existente de manera efectiva
    const destroyDatePicker = () => {
      try {
        // Comprobamos si existe una instancia en el DOM actual
        const pickerElement = document.querySelector('.daterangepicker');
        if (pickerElement) {
          pickerElement.remove();
        }
        
        // Destruimos la instancia JavaScript si existe
        if (datePickerInstance) {
          if (typeof datePickerInstance.destroy === 'function') {
            datePickerInstance.destroy();
          }
          datePickerInstance = null;
          console.log('DateRangePicker anterior destruido correctamente');
        }
        
        // Limpiamos listeners previos
        if (dateRangeInput) {
          const newInput = dateRangeInput.cloneNode(true);
          dateRangeInput.parentNode.replaceChild(newInput, dateRangeInput);
          return newInput; // Retornamos el nuevo input para usarlo
        }
      } catch (error) {
        console.error("Error al destruir DateRangePicker:", error);
      }
      return dateRangeInput;
    };

    // 3. Función para actualizar detalles de habitación
    const updateRoomDetails = (roomId) => {
      const habitaciones = JSON.parse(localStorage.getItem("habitaciones")) || [];
      const hab = habitaciones.find(h => h.id == roomId);
      
      if (hab) {
        tipoHabitacionInput.value = hab.tipo;
        precioNocheInput.value = hab.precio_noche;
        numHuespedesInput.max = hab.capacidad;
        console.log(numHuespedesInput.value);
        
        numHuespedesInput.value = numHuespedesInput.max;
        
        if (typeof calcularTotalModal === 'function') {
          calcularTotalModal(form);
        }
      }
    };

    // 4. Configuración de Choices.js
    const initChoices = () => {
      // Destruir instancias anteriores si existen
      if (choicesInstances.nombreBooking) choicesInstances.nombreBooking.destroy();
      if (choicesInstances.num_habitacion) choicesInstances.num_habitacion.destroy();

      // Selector de clientes
      choicesInstances.nombreBooking = new Choices(clienteSelect, {
        removeItemButton: true,
        searchEnabled: true,
        shouldSort: true
      });
      choicesInstances.nombreBooking.setChoiceByValue(booking.cliente_id?.toString());

      // Selector de habitaciones
      choicesInstances.num_habitacion = new Choices(habitacionSelect, {
        removeItemButton: true,
        searchEnabled: true,
        shouldSort: false
      });

      // Event listener para cambios en habitación
      habitacionSelect.addEventListener('change', (e) => {
        updateRoomDetails(e.detail.value);
      });

      choicesInstances.num_habitacion.setChoiceByValue(booking.habitacion_id?.toString());
    };

    // 5. Cargar datos iniciales
    const [clientes, habitaciones] = await Promise.all([
      fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch("/api/rooms", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
    ]);

    localStorage.setItem("habitaciones", JSON.stringify(habitaciones));

    // 6. Llenar selects
    clienteSelect.innerHTML = '';
    clientes.forEach(cliente => {
      const option = new Option(cliente.nombre, cliente.id);
      clienteSelect.add(option);
    });

    habitacionSelect.innerHTML = '';
    habitaciones.forEach(hab => {
      const option = new Option(
        `Habitación ${hab.num_habitacion} (${hab.tipo})`, 
        hab.id
      );
      option.disabled = !(hab.id === booking.habitacion_id) && hab.disponibilidad !== "Disponible";
      if (hab.id === booking.habitacion_id) {
        option.selected = true;
        option.text += " (Actual)";
      }
      habitacionSelect.add(option);
    });

    // 7. Inicializar Choices
    initChoices();

    // 8. Configurar DateRangePicker (CORREGIDO)
    // Primero destruimos cualquier instancia anterior y obtenemos un input limpio
    const cleanDateInput = destroyDatePicker();
    console.log(booking.check_out);
    const checkIn = moment(booking.check_in, "ddd, DD MMM YYYY HH:mm:ss GMT");
    const checkOut = moment(booking.check_out, "ddd, DD MMM YYYY HH:mm:ss GMT");
    console.log(checkIn, checkOut);

    // Inicializamos nueva instancia
    datePickerInstance = new DateRangePicker(cleanDateInput, {
      timePicker: true,
      alwaysShowCalendars: true,
      autoApply: true,
      startDate: checkIn,
      endDate: checkOut,
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
      opens: "center"
    }, function(start, end) {
      cleanDateInput.value = `${start.format("YYYY-MM-DD HH:mm")} - ${end.format("YYYY-MM-DD HH:mm")}`;
      form.querySelector("#check_in").value = start.format("YYYY-MM-DDTHH:mm:ss[Z]");
      form.querySelector("#check_out").value = end.format("YYYY-MM-DDTHH:mm:ss[Z]");
      console.log(end.format("YYYY-MM-DDTHH:mm:ss[Z]"));
      if (typeof calcularTotalModal === 'function') {
        calcularTotalModal(form);
      }
    });

    cleanDateInput.value = `${checkIn.local().format("YYYY-MM-DD HH:mm")} - ${checkOut.local().format("YYYY-MM-DD HH:mm")}`;
    cleanDateInput.setAttribute("readonly", "readonly");
    
    // Aseguramos que los campos ocultos tengan los valores correctos
    form.querySelector("#check_in").value = checkIn.format("YYYY-MM-DDTHH:mm:ss[Z]");
    form.querySelector("#check_out").value = checkOut.format("YYYY-MM-DDTHH:mm:ss[Z]");

    // 9. Configurar otros campos
    const habSeleccionada = habitaciones.find(h => h.id == booking.habitacion_id);
    if (habSeleccionada) {
      tipoHabitacionInput.value = habSeleccionada.tipo;
      precioNocheInput.value = habSeleccionada.precio_noche;
      numHuespedesInput.max = habSeleccionada.capacidad;
      numHuespedesInput.value = booking.num_huespedes || 1;
    }

    form.querySelector("#metodo_pago").value = booking.metodo_pago || "Tarjeta";
    form.querySelector("#estado_reserva").value = booking.estado || "pendiente";
    form.querySelector("#notas").value = booking.notas || "";

    // 10. Configurar MutationObservers
    const setupObservers = () => {
      const observerConfig = {
        attributes: true,
        attributeFilter: ['value'],
        subtree: true
      };

      const precioObserver = new MutationObserver(() => {
        if (typeof calcularTotalModal === 'function') {
          calcularTotalModal(form);
        }
      });
      precioObserver.observe(precioNocheInput, observerConfig);

      const huespedesObserver = new MutationObserver(() => {
        if (typeof calcularTotalModal === 'function') {
          calcularTotalModal(form);
        }
      });
      huespedesObserver.observe(numHuespedesInput, observerConfig);

      return [precioObserver, huespedesObserver];
    };

    observers = setupObservers();

    // 11. Manejar eventos del modal
    const modalElement = form.closest('.modal');
    if (modalElement) {
      // Aseguramos limpieza al cerrar modal
      modalElement.addEventListener('hidden.bs.modal', () => {
        // Limpiamos observadores
        observers.forEach(obs => obs.disconnect());
        observers = [];
        
        // Limpiamos datepicker
        destroyDatePicker();
        datePickerInstance = null;
        
        // Limpiamos choices
        Object.values(choicesInstances).forEach(instance => {
          if (instance && typeof instance.destroy === 'function') {
            instance.destroy();
          }
        });
        choicesInstances = {};
        
        console.log('Limpieza completa al cerrar modal');
      });
      
      // Solo calculamos el total cuando se muestra el modal
      modalElement.addEventListener('shown.bs.modal', () => {
        updateRoomDetails(habitacionSelect.value);
      });
    }

    // 12. Calcular total inicial
    if (typeof calcularTotalModal === 'function') {
      calcularTotalModal(form);
    }

  } catch (error) {
    console.error("Error al preparar el formulario:", error);
    if (typeof mostrarToast === 'function') {
      mostrarToast("error", "Error al cargar datos para edición");
    }
  }
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
    allowHTML: true,
    searchPlaceholderValue: "Buscar...",
    noResultsText: "No hay resultados",
    itemSelectText: "Presiona para seleccionar"
  };

  // Inicializar selector de clientes
  const clientChoices = new Choices(clienteSelect, {
    ...baseConfig,
    shouldSort: true
  });
  
  clientChoices.setChoiceByValue(booking.cliente_id?.toString());

  // Inicializar selector de habitaciones con eventos correctos para v11
  const roomChoices = new Choices(habitacionSelect, {
    ...baseConfig
  });
  
  // En v11, debemos usar el evento change en el elemento subyacente
  habitacionSelect.addEventListener('choice', function(event) {
    const selectedValue = event.detail.choice.value;
    if (selectedValue) {
      const habitaciones = JSON.parse(localStorage.getItem("habitaciones")) || [];
      const hab = habitaciones.find(h => h.id == selectedValue);
      const form = habitacionSelect.closest("form");

      if (hab) {
        form.querySelector("#tipo_habitacion").value = hab.tipo;
        form.querySelector("#precio_noche").value = hab.precio_noche;
        const numHuespedesInput = form.querySelector("#num_huespedes");
        numHuespedesInput.max = hab.capacidad;
        
        if (parseInt(numHuespedesInput.value) > hab.capacidad) {
          numHuespedesInput.value = hab.capacidad;
        }
        
        calcularTotalModal(form);
      }
    }
  });

  // Renderizado personalizado para v11
  roomChoices.config.templates = {
    ...roomChoices.config.templates,
    choice: function(classNames, data) {
      const isDisabled = data.disabled;
      const isCurrent = data.value === booking.habitacion_id?.toString();
      
      return `
        <div class="${classNames.item} ${isDisabled ? classNames.itemDisabled : classNames.itemSelectable}" 
             data-choice ${isDisabled ? 'data-choice-disabled' : 'data-choice-selectable'}
             data-id="${data.id}" data-value="${data.value}">
          <div class="d-flex justify-content-between align-items-center">
            <span>${data.label}</span>
            ${isDisabled ? '<span class="badge bg-danger ms-2">Ocupada</span>' : ''}
            ${isCurrent ? '<span class="badge bg-success ms-2">Actual</span>' : ''}
          </div>
        </div>
      `;
    }
  };

  // Actualizar opciones desde el DOM
  roomChoices.setChoices(
    Array.from(habitacionSelect.options).map(option => ({
      value: option.value,
      label: option.textContent,
      disabled: option.disabled,
      selected: option.selected
    })),
    'value',
    'label',
    false
  );
  
  // Establecer el valor seleccionado si existe
  if (booking.habitacion_id) {
    roomChoices.setChoiceByValue(booking.habitacion_id.toString());
  }
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
      calcularTotalModal(form);
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
      calcularTotalModal(form);
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
            calcularTotalModal(form);
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

  function calcularTotalModal(formElement = document.getElementById("editBookingForm")) {
    console.log(formElement);
    const precioNocheInput = formElement.querySelector("#precio_noche");
    const totalPagarInput = formElement.querySelector("#total_pagar");
    const checkInValue = formElement.querySelector("#check_in")?.value;
    const checkOutValue = formElement.querySelector("#check_out")?.value;

    if (!checkInValue || !checkOutValue) {
        totalPagarInput.value = "0.00";
        return;
    }

    const checkIn = moment.utc(checkInValue);
    const checkOut = moment.utc(checkOutValue);

    if (checkIn.isValid() && checkOut.isValid()) {
        const horas = checkOut.diff(checkIn, 'hours', true);
        const dias = Math.ceil(horas / 24);
        const precioPorNoche = parseFloat(precioNocheInput.value) || 0;
        totalPagarInput.value = (dias * precioPorNoche).toFixed(2);
    } else {
        totalPagarInput.value = "0.00";
    }
  }

  function applyTableHeaderTheme(head) {
    const body = document.body;
    let tableHead = document.getElementById(head);
  
    if (!tableHead) {
      console.warn(`Observando cambios para aplicar tema en "${head}"...`);
      const observer = new MutationObserver(() => {
        tableHead = document.getElementById(head);
        if (tableHead) {
          observer.disconnect();
          applyTheme(tableHead, body);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return;
    }
  
    applyTheme(tableHead, body);
  }
  
  function applyTheme(tableHead, body) {
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

