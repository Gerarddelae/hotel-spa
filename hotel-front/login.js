document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // Evita el recargo de la página

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("error-message");

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // 🔹 Guardar token en localStorage
        localStorage.setItem("jwtToken", data.token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("usuario", data.name);
        localStorage.setItem("isLoggedIn", "true");

        console.log("🔹 Token recibido:", data.token);

        // 🔹 Redirigir al index
        window.location.href = "index.html";
      } else {
        errorMessage.textContent = data.error || "Error en la autenticación";
        errorMessage.classList.remove("d-none");
      }
    } catch (error) {
      console.error("Error en la autenticación:", error);
      errorMessage.textContent = "Error de conexión con el servidor";
      errorMessage.classList.remove("d-none");
    }
  });

  // 🔹 Mostrar/Ocultar contraseña
  document.getElementById("togglePassword").addEventListener("click", function () {
    const passwordField = document.getElementById("password");
    const type = passwordField.getAttribute("type") === "password" ? "text" : "password";
    passwordField.setAttribute("type", type);

    this.innerHTML =
      type === "password"
        ? '<i class="bi bi-eye-fill"></i>'
        : '<i class="bi bi-eye-slash-fill"></i>';
  });
});
