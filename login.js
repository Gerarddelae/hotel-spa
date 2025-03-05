document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorMessage = document.getElementById("error-message");

    errorMessage.classList.add("d-none");

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }), // ✅ Enviamos 'email', no 'username'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", email.split("@")[0]);
      localStorage.setItem("isLoggedIn", "true");
      window.location.href = "hotel-front/index.html"; // ✅ Redirigir tras login
    } catch (error) {
      console.error("Error en la autenticación:", error);
      errorMessage.textContent = error.message;
      errorMessage.classList.remove("d-none");
    }
  });

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
