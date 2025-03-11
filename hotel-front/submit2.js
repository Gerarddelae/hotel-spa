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

                    const method = form.dataset.method ? form.dataset.method.toUpperCase() : form.method.toUpperCase();
                    if (method === "GET") {
                        console.error("¡Error! Un formulario GET no puede enviar un cuerpo JSON.");
                        return;
                    }

                    try {
                        const response = await fetch(form.action, {
                            method: method,
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: method !== "GET" ? JSON.stringify(data) : undefined
                        });

                        const contentType = response.headers.get("content-type");
                        if (!response.ok) {
                            throw new Error(`HTTP Error! Status: ${response.status}`);
                        }

                        if (contentType && contentType.includes("application/json")) {
                            const result = await response.json();
                            console.log("Respuesta del servidor:", result);
                        } else {
                            const textResult = await response.text();
                            console.warn("El servidor devolvió un HTML en lugar de JSON:", textResult);
                            alert("Error en el servidor. Revisa la consola.");
                        }

                        if (response.ok) {
                            form.reset();
                            mostrarToast("Operación realizada con éxito.");
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

    console.log("Rol en localStorage:", localStorage.getItem("role"));
});
