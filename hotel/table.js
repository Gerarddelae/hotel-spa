// observar todos los tab pane y agregar un eventlistener click

const tabObserver = new MutationObserver((mutationsList, observer) => {
    const tabs = document.querySelectorAll("[role='tab']")

    if (tabs.length > 1) {
        console.log(tabs);
        //observer.disconnect()
        tabs.forEach((button) => button.addEventListener("click", (event)=> {
            console.log(event.target.getAttribute("id"));
        }))
    }

})
tabObserver.observe(document.body, { childList: true, subtree: true });


async function loadCSV(path) {
    
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error("No se pudo cargar el archivo CSV");

        const text = await response.text();
        datos = text.trim().split("\n").map(row => row.split(","));

        createTable();
    } catch (error) {
        console.error("Error al cargar el CSV:", error);
    }
}

// Crear la tabla en HTML
function createTable() {
    // se crea un observer para poder encontrar los elementos hijos
    const observer = new MutationObserver((mutationsList, observer) => {
        let datos = [];
        const tableHead = document.getElementById("tableHead");
        const tableBody = document.getElementById("tableBody");

        if (tableHead && tableBody) {
           // observer.disconnect();
            tableHead.innerHTML = "";
            tableBody.innerHTML = "";

            if (datos.length === 0) return;
        
            // Crear encabezado
            const headerRow = document.createElement("tr");
            datos[0].forEach(cell => {
                const th = document.createElement("th");
                th.textContent = cell.trim();
                th.classList.add("text-center", "p-3");
                headerRow.appendChild(th);
            });
            tableHead.appendChild(headerRow);
        
            // Crear el cuerpo de la tabla
            datos.slice(1).forEach((row, index) => {
                const tr = document.createElement("tr");
                row.forEach((cell, colIndex) => {
                    const td = document.createElement("td");
                    td.textContent = cell.trim();
                    td.classList.add("text-center", "p-2");
        
                    if (colIndex === 0) {
                        td.classList.add("clickable");
                        td.addEventListener("click", () => mostrarInfo(index + 1));
                    }
        
                    tr.appendChild(td);
                });
                tableBody.appendChild(tr);
            });

        }
    })
    
    observer.observe(document.body, { childList: true, subtree: true });
}


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

    document.getElementById("btnEditar").style.display = enable ? "none" : "inline-block";
    document.getElementById("btnGuardar").style.display = enable ? "inline-block" : "none";
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
        document.getElementById("editPais").value
    ];

    createTable();
    bootstrap.Modal.getInstance(document.getElementById("infoModal")).hide();
}

// Agregar datos nuevos
function agregarFila() {
    datos.push([
        document.getElementById("nombre").value,
        document.getElementById("edad").value,
        document.getElementById("pais").value
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


// Descargar CSV
function descargarCSV() {
    let csvContent = datos.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "datos_actualizados.csv";
    a.click();
}

// Cargar CSV al iniciar
loadCSV();
