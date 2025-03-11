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
    initializeTable(data, jsonBody);
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

function initializeTable(data, jsonBody) {
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
    formatter: actionFormatter,
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

function actionFormatter(value, row, index) {
  return `
    <button class="btn btn-warning btn-sm" data-index="${index}" onclick="editRow(this)">Editar</button>
    <button class="btn btn-danger btn-sm" data-index="${index}" onclick="deleteRow(this)">Eliminar</button>
  `;
}

function editRow(button) {
  const index = button.getAttribute("data-index");
  const table = button.closest("table").id;
  const rowData = $("#" + table).bootstrapTable("getData")[index];
  console.log(`Editar registro en fila ${index}:\n${JSON.stringify(rowData, null, 2)}`);
  // Aquí puedes agregar la lógica para editar el registro seleccionado
}

function deleteRow(button) {
  const index = button.getAttribute("data-index");
  const table = button.closest("table").id;
  const rowData = $("#" + table).bootstrapTable("getData")[index];
  console.log(`Eliminar registro en fila ${index}:\n${JSON.stringify(rowData, null, 2)}`);
  // Aquí puedes agregar la lógica para eliminar el registro seleccionado
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


// logica de aqui hacia abajo por trabajar


