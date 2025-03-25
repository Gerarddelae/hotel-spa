document.addEventListener("DOMContentLoaded", () => {
  const tabObserver = new MutationObserver((mutationsList, observer) => {
    const tabs = document.querySelectorAll(".nav-link.search");
    tabs.forEach((button) => {
      if (!button.hasEventListener) {
        button.addEventListener("click", (event) => {
          const { path, head, body } = event.target.dataset;
          console.log(path);
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


});



async function loadTableData(path, head, body) {
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
        // Eliminar campos específicos
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

    generateTableHeaders(Object.keys(data[0]), head);
    initializeTable(data, body, path);
    applyTableHeaderTheme(head);
  } catch (error) {
    console.error("Error:", error);
    alert("Error al cargar los datos. Revisa la consola.");
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
  let tr = tableHead.querySelector("tr");
  if (!tr) {
    tr = document.createElement("tr");
    tableHead.appendChild(tr);
  }

  tr.innerHTML = headers
    .map((header) => `<th data-field="${header}">${header}</th>`)
    .join("");

  tr.innerHTML += '<th data-field="actions">Acciones</th>';
  applyTableHeaderTheme(head);
}

function initializeTable(data, jsonBody, jsonUrl) {
  $("#" + jsonBody).bootstrapTable("destroy");

  const columns = Object.keys(data[0]).map((key) => ({
    field: key,
    title: key,
    sortable: true,
  }));

  columns.push({
    field: "actions",
    title: "Acciones",
    formatter: (value, row, index) =>
      actionFormatter(value, row, index, jsonUrl),
  });

  $("#" + jsonBody).bootstrapTable({
    data: data,
    columns: columns,
  });
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
  const id = button.getAttribute("data-id");
  const jsonUrl = button.getAttribute("data-path");

  if (!id || !jsonUrl) {
    console.error("Faltan datos para eliminar el registro.");
    return;
  }

  const token = localStorage.getItem("access_token");
  if (!token) {
    alert("No estás autenticado. Inicia sesión.");
    return;
  }

  if (
    !confirm(`¿Estás seguro de que deseas eliminar el registro con ID ${id}?`)
  ) {
    return;
  }

  try {
    const response = await fetch(`${jsonUrl}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error al eliminar: ${response.statusText}`);
    }

    window.mostrarToast("error"); // 🔴 Mostrar notificación de eliminación

    console.log(`Registro con ID ${id} eliminado en ${jsonUrl}`);

    const table = button.closest("table");
    if (!table) {
      console.error("No se encontró la tabla para actualizar.");
      return;
    }

    const tableId = table.getAttribute("id");
    if (!tableId) {
      console.error("No se encontró el ID de la tabla.");
      return;
    }

    $("#" + tableId).bootstrapTable("remove", {
      field: "id",
      values: [parseInt(id)],
    });
  } catch (error) {
    console.error("Error eliminando el registro:", error);
    alert(
      "No se pudo eliminar el registro. Revisa la consola para más detalles."
    );
  }
}

async function editRow(button) {
  const id = button.getAttribute("data-id"); // Obtener el ID del registro
  const jsonUrl = button.getAttribute("data-path"); // Obtener la URL de la API
  const formId = button.getAttribute("data-form"); // Obtener el ID del formulario

  console.log(
    `Editando registro con ID: ${id}, URL: ${jsonUrl}, Formulario: ${formId}`
  );

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

    // Si es un formulario de reservación, necesitamos manejo especial
    if (formId === "editBookingForm") {
      prepareBookingModalForEdit(record, form);
    } else {
      // Para otros formularios, llenar normalmente
      fillFormWithData(record, form);
    }

    // Obtener el modal asociado al formulario
    const modalElement = form.closest(".modal");
    if (!modalElement) {
      console.error("No se encontró el modal asociado al formulario.");
      return;
    }

    // Mostrar el modal usando Bootstrap
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Manejar la actualización al enviar el formulario
    form.onsubmit = async function (event) {
      event.preventDefault();

      // Crear un objeto con los datos actualizados del formulario
      const formData = new FormData(form);
      const updatedData = {};
      formData.forEach((value, key) => {
        updatedData[key] = value;
      });

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

        window.mostrarToast("update");
        modal.hide();

        // Actualizar la tabla
        refreshTable(button, jsonUrl);
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

// Función para refrescar la tabla después de actualizar
function refreshTable(button, jsonUrl) {
  const table = button.closest("table");
  if (table) {
    const tableId = table.id;

    // Encontrar los elementos head y body relacionados con la tabla
    const tabContainer = table.closest(".tab-pane");
    if (tabContainer) {
      const headId = tabContainer.querySelector("thead").id;
      const bodyId = tabContainer.querySelector("tbody").id;

      // Recargar la tabla
      loadTableData(jsonUrl, headId, bodyId);
    } else {
      console.warn(
        "No se pudo encontrar el contenedor de la tabla para refrescarla."
      );
    }
  }
}

// Función para llenar un formulario normal con datos
function fillFormWithData(record, form) {
  Object.keys(record).forEach((key) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) {
      if (input.tagName === "SELECT") {
        // Para selectores normales
        let optionExists = [...input.options].some(
          (opt) => opt.value == record[key]
        );
        if (!optionExists) {
          let newOption = new Option(record[key], record[key], true, true);
          input.appendChild(newOption);
        }
        input.value = record[key];
      } else {
        input.value = record[key];
      }
    }
  });
}

// Función específica para preparar el modal de reservaciones para editar
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

        // Llenar select de habitaciones (solo incluir disponibles)
        if (habitaciones && habitaciones.length > 0) {
            const habitacionesDisponibles = habitaciones.filter(
          (hab) => hab.disponibilidad === "Disponible"
            ); // Filtrar solo habitaciones disponibles

            habitacionesDisponibles.forEach((hab) => {
          const option = document.createElement("option");
          option.value = hab.id;
          option.textContent = `Habitación ${hab.num_habitacion}`;
          habitacionSelect.appendChild(option);
            });
        } else {
            console.warn("No se encontraron habitaciones disponibles.");
        }

        // Inicializar o reinicializar Choices.js
        initializeChoicesForBookingForm(clienteSelect, habitacionSelect, booking);

        // Formatear y establecer fechas
        const checkIn = moment(booking.check_in);
        const checkOut = moment(booking.check_out);

        const checkInField = form.querySelector("#check_in");
        if (checkInField) {
            checkInField.value = checkIn.format("YYYY-MM-DDTHH:mm:ss");
        } else {
            console.error("No se encontró el campo #check_in en el formulario.");
        }

        const checkOutField = form.querySelector("#check_out");
        if (checkOutField) {
            checkOutField.value = checkOut.format("YYYY-MM-DDTHH:mm:ss");
        } else {
            console.error("No se encontró el campo #check_out en el formulario.");
        }

        const dateRangeInput2 = form.querySelector("#datetimerange-input2");
        if (dateRangeInput2) {
            // Prevenir entrada de teclado
            dateRangeInput2.addEventListener('keydown', function(e) {
          e.preventDefault();
          return false;
            });

            // Establecer como solo lectura
            dateRangeInput2.setAttribute('readonly', 'readonly');

            // Inicializar el DateRangePicker
            new DateRangePicker('datetimerange-input2', { 
          timePicker: true, 
          alwaysShowCalendars: true,
          startDate: checkIn,
          endDate: checkOut,
          locale: { format: "YYYY-MM-DD HH:mm" },
          showDropdowns: true
            }, function (start, end) {
          // Actualizar el input visible con el formato correcto
          dateRangeInput2.value = start.format('YYYY-MM-DD HH:mm') + ' - ' + end.format('YYYY-MM-DD HH:mm');
          
          // Actualizar los campos ocultos con el formato esperado por el servidor
          form.querySelector("#check_in").value = start.format('YYYY-MM-DDTHH:mm:ss');
          form.querySelector("#check_out").value = end.format('YYYY-MM-DDTHH:mm:ss');
          
          calcularTotal(form);
            });
        } else {
            console.error("No se encontró el campo #datetimerange-input2 en el formulario del modal.");
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
                numHuespedesField.value =
                    booking.num_huespedes || habitacionSeleccionada.capacidad;
            }

            const precioNocheField = form.querySelector("#precio_noche");
            if (precioNocheField) {
                precioNocheField.value = habitacionSeleccionada.precio_noche;
            }
        }

        // Establecer otros campos
        const totalPagarField = form.querySelector("#total_pagar");
        if (totalPagarField) {
            totalPagarField.value = booking.valor_reservacion;
        }

        const metodoPagoField = form.querySelector("#metodo_pago");
        if (metodoPagoField) {
            metodoPagoField.value = booking.metodo_pago;
        }

        const estadoReservaField = form.querySelector("#estado_reserva");
        if (estadoReservaField) {
            estadoReservaField.value = booking.estado;
        }

        const notasField = form.querySelector("#notas");
        if (notasField) {
            notasField.value = booking.notas || "";
        }

        // Calcular total
        calcularTotal(form);
    } catch (error) {
        console.error("Error al preparar el formulario de reserva:", error);
    }
}

// Función para inicializar Choices.js en el formulario de reserva
function initializeChoicesForBookingForm(
  clienteSelect,
  habitacionSelect,
  booking
) {
  // Destruir instancias previas si existen
  if (clienteSelect.choicesInstance) {
    clienteSelect.choicesInstance.destroy();
  }

  if (habitacionSelect.choicesInstance) {
    habitacionSelect.choicesInstance.destroy();
  }

  // Inicializar Choices para el selector de clientes
  clienteSelect.choicesInstance = new Choices(clienteSelect, {
    removeItemButton: true,
    searchEnabled: true,
    itemSelectText: "",
    shouldSort: false,
    addItems: false,
    placeholderValue: "Seleccionar...",
    placeholder: true,
  });

  // Inicializar Choices para el selector de habitaciones
  habitacionSelect.choicesInstance = new Choices(habitacionSelect, {
    removeItemButton: true,
    searchEnabled: true,
    itemSelectText: "",
    shouldSort: false,
    addItems: false,
    placeholderValue: "Seleccionar...",
    placeholder: true,
  });

  // Establecer los valores seleccionados
  if (booking) {
    clienteSelect.choicesInstance.setChoiceByValue(
      booking.cliente_id.toString()
    );
    habitacionSelect.choicesInstance.setChoiceByValue(
      booking.habitacion_id.toString()
    );
  }

  // Configurar eventos de cambio
  clienteSelect.addEventListener("change", function () {
    const selectedValue = this.value;
    console.log("Cliente seleccionado:", selectedValue);
  });

  habitacionSelect.addEventListener("change", function () {
    const selectedValue = this.value;
    console.log("Habitación seleccionada:", selectedValue);

    // Actualizar información de la habitación
    const habitaciones = JSON.parse(localStorage.getItem("habitaciones")) || [];
    const habitacionSeleccionada = habitaciones.find(
      (h) => h.id == selectedValue
    );

    if (habitacionSeleccionada) {
      const form = this.closest("form");
      form.querySelector("#tipo_habitacion").value =
        habitacionSeleccionada.tipo;
      form.querySelector("#num_huespedes").max =
        habitacionSeleccionada.capacidad;
      form.querySelector("#num_huespedes").value =
        habitacionSeleccionada.capacidad;
      form.querySelector("#precio_noche").value =
        habitacionSeleccionada.precio_noche;
      calcularTotal(form);
    }
  });
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
  const tableHead = document.getElementById(head);

  if (!tableHead) return;

  tableHead.classList.remove("custom-header-light", "custom-header-dark");

  if (body.getAttribute("data-bs-theme") === "dark") {
    tableHead.classList.add("custom-header-dark");
  } else {
    tableHead.classList.add("custom-header-light");
  }
}

