document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const togglePassword = document.getElementById("togglePassword");
  const passwordField = document.getElementById("password");

  togglePassword.addEventListener("click", function () {
      const type = passwordField.type === "password" ? "text" : "password";
      passwordField.type = type;
      this.classList.toggle("fa-eye-slash");
  });

  loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const email = document.getElementById("email").value;
      const password = passwordField.value;
      const errorMessage = document.getElementById("error-message");

      try {
          const response = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password })
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Error en la autenticación");
          }

          const data = await response.json();
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("role", data.role);
          localStorage.setItem("usuario", data.name);
          localStorage.setItem("isLoggedIn", "true");

          console.log("✅ Usuario autenticado, redirigiendo...");
          // Modificar esta línea en tu login.js
          window.location.href = `/app?token=${encodeURIComponent(data.access_token)}`;
      } catch (error) {
          console.error("Error en la autenticación:", error);
          errorMessage.textContent = error.message;
          errorMessage.classList.remove("d-none");
      }
  });
});
