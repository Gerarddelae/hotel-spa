document.addEventListener("DOMContentLoaded", () => {
  const tabObserver = new MutationObserver((mutationsList, observer) => {
    const tabs = document.querySelectorAll(".nav-link.search");
    tabs.forEach((button) => {
      if (!button.hasEventListener) {
        button.addEventListener("click", (event) => {
          const { path, head, body } = event.target.dataset;
          if (path && head && body) {
            loadTableData(path, head, body);
          } else {
            console.error("Faltan atributos en el botón:", event.target);
          }
        });
        button.hasEventListener = true; // Marcar el botón para evitar agregar múltiples listeners
      }
    });
  });

  tabObserver.observe(document.body, { childList: true, subtree: true });
});

async function loadTableData(path, head, body) {
  try {
    const jsonUrl = path;
    const jsonHead = head;
    const jsonBody = body;
    console.log("Cargando JSON desde:", jsonUrl);
    const response = await fetch(jsonUrl, {
      method: "GET",
      headers: {
          "Authorization": `Bearer ${localStorage.getItem("jwtToken")}`
      }
    });
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    console.log("Datos JSON recibidos:", data.slice(0, 2));

    if (!data.length) throw new Error("El JSON está vacío o mal formateado");

    generateTableHeaders(Object.keys(data[0]), jsonHead);
    initializeTable(data, jsonBody, jsonUrl);
    applyTableHeaderTheme(head);
  } catch (error) {
    console.error("Error:", error);
    alert("Error al cargar los datos. Revisa la consola.");
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
  
  tr.innerHTML += '<th data-field="actions">Acciones</th>'; // Agregar columna de acciones
  
  console.log("Encabezados generados:", headers);
  applyTableHeaderTheme(head);
}

function initializeTable(data, jsonBody, jsonUrl) {
  console.log("#" + jsonBody);
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
    columns: columns,
    onRefresh: function (params) {
      const activeButton = document.querySelector(".nav-link.search.active");
      const path = activeButton.dataset.path;
      const head = activeButton.dataset.head;
      const body = activeButton.dataset.body;
      if (path && head && body) {
        loadTableData(path, head, body); // Recargar los datos cuando se presione el botón de actualizar
      }
    }
  });
  
  console.log("Tabla inicializada con éxito");
}

function actionFormatter(value, row, index, jsonUrl) {
  return `
    <button class="btn btn-warning btn-sm" data-index="${index}" data-id="${row.id}" data-path="${jsonUrl}" onclick="editRow(this)">Editar</button>
    <button class="btn btn-danger btn-sm" data-index="${index}" data-id="${row.id}" data-path="${jsonUrl}" onclick="deleteRow(this)">Eliminar</button>
  `;
}

async function editRow(button) {
  const id = button.getAttribute("data-id");
  const jsonUrl = "http://localhost:5000/api/users"; // Ruta de la API

  try {
    // Obtener los datos actuales del usuario
    const response = await fetch(jsonUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("jwtToken")}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener datos: ${response.statusText}`);
    }

    const data = await response.json();
    const user = data.find((item) => item.id == id);

    if (!user) {
      alert("No se encontró el usuario.");
      return;
    }

    // Llenar el formulario del modal con los datos actuales
    document.getElementById("userEditId").value = user.id;
    document.getElementById("userEditNombre").value = user.nombre;
    document.getElementById("userEditEmail").value = user.email;
    document.getElementById("userEditPassword").value = ""; // Dejar vacío para nueva contraseña
    document.getElementById("userEditConfirmPassword").value = "";

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById("userEditModal"));
    modal.show();

    // Manejar la actualización cuando se envíe el formulario
    document.getElementById("userEditForm").onsubmit = async function (event) {
      event.preventDefault();

      const nombre = document.getElementById("userEditNombre").value;
      const email = document.getElementById("userEditEmail").value;
      const password = document.getElementById("userEditPassword").value;
      const confirmPassword = document.getElementById("userEditConfirmPassword").value;

      if (password && password !== confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return;
      }

      const updateData = {
        id: parseInt(id),
        nombre: nombre, // Ahora incluye el nombre
        email: email,
        role: "user"
      };

      if (password) {
        updateData.password = password; // Solo enviar si cambia
      }

      try {
        const putResponse = await fetch(jsonUrl, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("jwtToken")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updateData)
        });

        if (!putResponse.ok) {
          throw new Error(`Error al actualizar: ${putResponse.statusText}`);
        }

        alert("Usuario actualizado con éxito.");
        modal.hide();

        // **🔹 ACTUALIZAR DIRECTAMENTE LA TABLA CON BOOTSTRAP TABLE**
        $('#usersTable').bootstrapTable('updateRow', {
          index: button.closest("tr").rowIndex - 1, // Obtener el índice de la fila
          row: updateData
        });

      } catch (error) {
        console.error("Error al actualizar el usuario:", error);
        alert("No se pudo actualizar el usuario. Revisa la consola.");
      }
    };

  } catch (error) {
    console.error("Error cargando datos del usuario:", error);
    alert("Error al cargar la información del usuario.");
  }
}


function mostrarToastEliminado() {
  const toastEl = document.getElementById("deleteToast");
  if (!toastEl) return;
  const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
  toast.show();
}



async function deleteRow(button) {
  const id = button.getAttribute("data-id");
  const jsonUrl = button.getAttribute("data-path");

  if (!id || !jsonUrl) {
    console.error("Faltan datos para eliminar el registro.");
    return;
  }

  const token = localStorage.getItem("jwtToken");
  if (!token) {
    alert("No estás autenticado. Inicia sesión.");
    return;
  }

  if (!confirm(`¿Estás seguro de que deseas eliminar el registro con ID ${id}?`)) {
    return;
  }

  try {
    const response = await fetch(jsonUrl, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id }) // Enviar el ID en el cuerpo de la petición
    });

    if (!response.ok) {
      throw new Error(`Error al eliminar: ${response.statusText}`);
    }

    alert(`Registro con ID ${id} eliminado exitosamente.`);
    console.log(`Registro con ID ${id} eliminado en ${jsonUrl}`);
    // Intentar encontrar la tabla correcta
    const table = button.closest("table");
    if (!table) {
      console.error("No se encontró la tabla para actualizar.");
      return;
    }
    
    // Obtener el ID de la tabla BootstrapTable
    const tableId = table.getAttribute("id");
    if (!tableId) {
      console.error("No se encontró el ID de la tabla.");
      return;
    }
    
    // Asegurar que el campo de eliminación coincide con el que usa bootstrapTable
    $("#" + tableId).bootstrapTable("remove", { field: "id", values: [parseInt(id)] });
    mostrarToastEliminado();

  } catch (error) {
    console.error("Error eliminando el registro:", error);
    alert("No se pudo eliminar el registro. Revisa la consola para más detalles.");
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

const observer = new MutationObserver(() => {
  applyTableHeaderTheme();
});

observer.observe(document.body, {
  attributes: true,
  attributeFilter: ["data-bs-theme"],
});
