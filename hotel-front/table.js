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

function editRow(button) {
  const id = button.getAttribute("data-id");
  const jsonUrl = button.getAttribute("data-path");
  console.log(`Editar registro con ID ${id} en ${jsonUrl}`);
  // Aquí puedes agregar la lógica para editar el registro seleccionado
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
