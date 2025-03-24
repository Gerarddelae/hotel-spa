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
        "Authorization": `Bearer ${localStorage.getItem("access_token")}`
      }
    });
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    let data = await response.json();

    if (!data.length) throw new Error("El JSON está vacío o mal formateado");

    // Filtrar y formatear datos para la ruta de reservas
    if (path === '/api/bookings') {
      data = data.map(item => {
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
  if (!isoString) return 'N/A';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
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
    formatter: (value, row, index) => actionFormatter(value, row, index, jsonUrl),
  });
  
  $("#" + jsonBody).bootstrapTable({
    data: data,
    columns: columns
  });
}

function actionFormatter(value, row, index, jsonUrl) {
  // Mapeo de rutas de API a IDs de formularios
  const formMapping = {
    "/api/clients": "editClientForm", // Formulario para clientes
    "/api/rooms": "editRoomForm",    // Formulario para habitaciones
    "/api/bookings": "editBookingForm", // Formulario para reservas
    "/api/users": "userEditForm" // Formulario para usuarios
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

  if (!confirm(`¿Estás seguro de que deseas eliminar el registro con ID ${id}?`)) {
    return;
  }

  try {
    const response = await fetch(`${jsonUrl}/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al eliminar: ${response.statusText}`);
    }

    window.mostrarToast("error"); // 🔴 Mostrar notificación de eliminación

    //alert(`Registro con ID ${id} eliminado exitosamente.`);
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
    
    $("#" + tableId).bootstrapTable("remove", { field: "id", values: [parseInt(id)] });
  } catch (error) {
    console.error("Error eliminando el registro:", error);
    alert("No se pudo eliminar el registro. Revisa la consola para más detalles.");
  }
}

async function editRow(button) {
  const id = button.getAttribute("data-id"); // Obtener el ID del registro
  const jsonUrl = button.getAttribute("data-path"); // Obtener la URL de la API
  const formId = button.getAttribute("data-form"); // Obtener el ID del formulario

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
        "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener datos: ${response.statusText}`);
    }

    const record = await response.json();

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

    // Llenar dinámicamente el formulario con los datos obtenidos
    Object.keys(record).forEach((key) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = record[key];
      }
    });

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
      const updatedData = {};
      const inputs = form.querySelectorAll("[name]");
      inputs.forEach((input) => {
        updatedData[input.name] = input.value;
      });

      try {
        // Enviar la solicitud PUT para actualizar el registro
        const putResponse = await fetch(`${jsonUrl}/${id}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        });

        if (!putResponse.ok) {
          throw new Error(`Error al actualizar: ${putResponse.statusText}`);
        }
        window.mostrarToast("update"); // ⚠️ Mostrar toast de actualización
        modal.hide();

        // Actualizar la fila correspondiente en la tabla
        const table = button.closest("table");
        if (table) {
          const rowIndex = button.closest("tr").rowIndex - 1;
          $(`#${table.id}`).bootstrapTable("updateRow", {
            index: rowIndex,
            row: updatedData,
          });
        } else {
          console.warn("No se pudo encontrar la tabla para actualizar.");
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