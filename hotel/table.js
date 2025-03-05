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
    const response = await fetch(jsonUrl);
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
  console.log("Encabezados generados:", headers);

  applyTableHeaderTheme(head);
}

function initializeTable(data, jsonBody) {
  console.log("#" + jsonBody);
  $("#" + jsonBody).bootstrapTable("destroy");
  $("#" + jsonBody).bootstrapTable({
    data: data,
    columns: Object.keys(data[0]).map((key) => ({
      field: key,
      title: key,
      sortable: true,
    })),
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

// Mostrar información en el modal
function mostrarInfo(index) {
  if (index < 1 || index >= datos.length) return;

  const [nombre, edad, pais] = datos[index];

  document.getElementById("editIndex").value = index;
  document.getElementById("editNombre").value = nombre;
  document.getElementById("editEdad").value = edad;
  document.getElementById("editPais").value = pais;

  // Bloquear campos hasta que se haga clic en "Editar"
  toggleEditMode(false);

  const modal = new bootstrap.Modal(document.getElementById("infoModal"));
  modal.show();
}

// Habilitar o deshabilitar edición en el modal
function toggleEditMode(enable) {
  document.getElementById("editNombre").readOnly = !enable;
  document.getElementById("editEdad").readOnly = !enable;
  document.getElementById("editPais").readOnly = !enable;

  document.getElementById("btnEditar").style.display = enable
    ? "none"
    : "inline-block";
  document.getElementById("btnGuardar").style.display = enable
    ? "inline-block"
    : "none";
}

// Habilitar edición cuando se hace clic en "Editar"
function habilitarEdicion() {
  toggleEditMode(true);
}

// Guardar la edición y actualizar la tabla
function guardarEdicion() {
  const index = document.getElementById("editIndex").value;
  datos[index] = [
    document.getElementById("editNombre").value,
    document.getElementById("editEdad").value,
    document.getElementById("editPais").value,
  ];

  createTable();
  bootstrap.Modal.getInstance(document.getElementById("infoModal")).hide();
}

// Agregar datos nuevos
function agregarFila() {
  datos.push([
    document.getElementById("nombre").value,
    document.getElementById("edad").value,
    document.getElementById("pais").value,
  ]);

  createTable();
}

// Eliminar un registro de la tabla y actualizar la vista
function eliminarRegistro() {
  const index = parseInt(document.getElementById("editIndex").value, 10);

  // Verificar si el índice es válido
  if (isNaN(index) || index < 1 || index >= datos.length) {
    alert("Error al eliminar el registro.");
    return;
  }

  // Confirmar antes de eliminar
  if (confirm("¿Estás seguro de que deseas eliminar este registro?")) {
    datos.splice(index, 1); // Eliminar del array

    // Volver a dibujar la tabla con los datos actualizados
    createTable();

    // Cerrar el modal
    bootstrap.Modal.getInstance(document.getElementById("infoModal")).hide();
  }
}
