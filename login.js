document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    
    // cargamos los usuarios del archivo que los almacena
    async function cargarUsuarios() {
        try {
            const response = await fetch("hotel/data/usuarios.csv"); // Asegúrate de que el archivo CSV está en la ruta correcta
            const data = await response.text();
            return parseCSV(data);
        } catch (error) {
            console.error("Error cargando el archivo CSV:", error);
            return {};
        }
    }

    // los formateamos para su manejo y uso en la logica
    function parseCSV(csv) {
        const usuarios = {};
        const lines = csv.split("\n");
        for (let line of lines) {
            const [email, password] = line.split(",");
            if (email && password) {
                usuarios[email.trim()] = password.trim();
            }
        }
        return usuarios;
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault(); // Evita que la página se recargue

        const email = document.getElementById("email").value;
        const usuario = email.replace(/@.*/, "");
        const password = document.getElementById("password").value;
        const errorMessage = document.getElementById("error-message");

        // Cargar usuarios desde CSV
        const usuarios = await cargarUsuarios();

        if (usuarios[email] && usuarios[email] === password) {
            localStorage.setItem("usuario", usuario);
            localStorage.setItem("isLoggedIn", "true"); // Guardar sesión
            window.location.href = "hotel/index.html"; // Redirigir a la página del hotel
        } else {
            errorMessage.classList.remove("d-none");
        }
    });
});
