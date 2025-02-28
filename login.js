document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    // Cargamos los usuarios del archivo JSON que los almacena
    async function cargarUsuarios() {
        try {
            const response = await fetch("hotel/data/json/users.json"); // Asegúrate de que el archivo JSON está en la ruta correcta
            const data = await response.json();
            return parseJSON(data);
        } catch (error) {
            console.error("Error cargando el archivo JSON:", error);
            return {};
        }
    }

    // Formateamos los datos JSON para su manejo y uso en la lógica
    function parseJSON(json) {
        const usuarios = {};
        json.forEach(usuario => {
            if (usuario.email && usuario.password) {
                usuarios[usuario.email.trim()] = usuario.password.trim();
            }
        });
        return usuarios;
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault(); // Evita que la página se recargue

        const email = document.getElementById("email").value;
        const usuario = email.replace(/@.*/, "");
        const password = document.getElementById("password").value;
        const errorMessage = document.getElementById("error-message");

        // Cargar usuarios desde JSON
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
