document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault(); // Evita que la página se recargue

        // Simulación de credenciales válidas
        const validUser = "admin@hotel.com";
        const validPass = "123456";

        // Obtener valores del formulario
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const errorMessage = document.getElementById("error-message");

        if (email === validUser && password === validPass) {
            localStorage.setItem("isLoggedIn", "true"); // Guardar sesión
            window.location.href = "hotel/index.html"; // Redirigir a la página del hotel
        } else {
            errorMessage.classList.remove("d-none");
        }
    });

});
