document.addEventListener("DOMContentLoaded", function() {
    async function attachFormListeners() {
        document.querySelectorAll("form.auto-submit").forEach(form => {
            if (!form.dataset.listenerAdded) {
                form.dataset.listenerAdded = true;
                form.addEventListener("submit", async function(event) {
                    event.preventDefault();
                    
                    const formData = new FormData(form);
                    const data = {};
                    formData.forEach((value, key) => {
                        data[key] = value;
                    });
                    console.log("Datos ingresados:", data);
                    
                    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
                        alert("Las contraseñas no coinciden");
                        return;
                    }

                    const token = localStorage.getItem("jwtToken");
                    if (!token) {
                        alert("No se encontró un token de autenticación. Por favor, inicia sesión.");
                        return;
                    }

                    try {
                        const response = await fetch(form.action, {
                            method: form.method || "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify(data)
                        });

                        const result = await response.json();
                        console.log("Respuesta del servidor:", result);

                        if (response.ok) {
                            form.reset();
                            mostrarToast("Operación realizada con éxito.");
                        } else {
                            alert("Error: " + result.message);
                        }
                    } catch (error) {
                        console.error("Error en la petición:", error);
                        alert("Hubo un problema con la solicitud.");
                    }
                });
            }
        });
    }

    function manageContentVisibility() {
        const adminContent = document.querySelector("#adminContent");
        const userContent = document.querySelector("#userContent");
        const userForm = document.querySelector("#usuarioForm");
        const role = localStorage.getItem("role");

        console.log("Rol detectado:", role);

        if (adminContent) {
            adminContent.style.display = role === "admin" ? "block" : "none";
        }
        if (userContent) {
            userContent.style.display = role !== "admin" ? "block" : "none";
        }

        if (userForm) {
            userForm.style.display = role === "admin" ? "block" : "none";
        }
    }

    function mostrarToast(mensaje) {
        const toastEl = document.getElementById("registroToast");
        if (!toastEl) return;
        const toastBody = toastEl.querySelector(".toast-body");
        toastBody.textContent = mensaje;
        new bootstrap.Toast(toastEl, { delay: 5000 }).show();
    }

    const observer = new MutationObserver(() => {
        manageContentVisibility();
        attachFormListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    manageContentVisibility();
    attachFormListeners();

    // Verificar en consola el rol
    console.log("Rol en localStorage:", localStorage.getItem("role"));
});
