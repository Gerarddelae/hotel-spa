document.addEventListener("DOMContentLoaded", function () {
    async function attachFormListeners() {
        document.querySelectorAll("form.auto-submit").forEach(form => {
            if (!form.dataset.listenerAdded) {
                form.dataset.listenerAdded = true;

                form.addEventListener("submit", async function (event) {
                    event.preventDefault();

                    const formData = new FormData(form);
                    const data = {};
                    formData.forEach((value, key) => {
                        data[key] = value;
                    });

                    console.log("📩 Datos enviados:", data);

                    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
                        alert("❌ Las contraseñas no coinciden");
                        return;
                    }

                    const token = localStorage.getItem("access_token");
                    if (!token) {
                        alert("⚠️ No se encontró un token de autenticación. Por favor, inicia sesión.");
                        return;
                    }

                    let method = form.method ? form.method.toUpperCase() : "POST";
                    let url = form.action;

                    if (method === "POST") {
                        // Mantiene la URL base
                    } else if (method === "PUT" || method === "DELETE") {
                        const userId = form.dataset.userId;
                        if (!userId) {
                            console.error(`⚠️ Error: Para ${method}, se necesita un ID.`);
                            alert(`⚠️ Error: Para ${method}, se necesita un ID.`);
                            return;
                        }
                        url = `${form.action}/${userId}`;
                    }

                    const options = {
                        method,
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    };

                    if (method !== "DELETE") {
                        options.headers["Content-Type"] = "application/json";
                        options.body = JSON.stringify(data);
                    }

                    try {
                        const response = await fetch(url, options);
                        const result = await response.json();
                        console.log("✅ Respuesta del servidor:", result);

                        if (response.ok) {
                            form.reset();
                            mostrarToast(method === "PUT" ? "update" : 
                                         method === "DELETE" ? "error" : "success");
                        } else {
                            alert("❌ Error: " + (result.message || "Ocurrió un problema en la solicitud."));
                        }
                    } catch (error) {
                        console.error("🚨 Error en la petición:", error);
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

        console.log("🔍 Rol detectado:", role);

        if (adminContent) adminContent.style.display = role === "admin" ? "block" : "none";
        if (userContent) userContent.style.display = role !== "admin" ? "block" : "none";
        if (userForm) userForm.style.display = role === "admin" ? "block" : "none";
    }

    // hacer la funcion mostrar toast global
    window.mostrarToast = function (type) {
        let toastId = "";
    
        switch (type) {
            case "success":
                toastId = "registroToast"; // ✅ Registro exitoso
                break;
            case "error":
                toastId = "deleteToast"; // ❌ Eliminación
                break;
            case "update":
                toastId = "updateToast"; // ⚠️ Actualización de usuario
                break;
            default:
                console.error("Tipo de toast no válido:", type);
                return;
        }
    
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
            const toastInstance = new bootstrap.Toast(toastElement, { delay: 3000 }); // 3s de duración
            toastInstance.show();
        } else {
            console.error("⚠️ No se encontró el elemento toast:", toastId);
        }
    };
    
    const observer = new MutationObserver(() => {
        manageContentVisibility();
        attachFormListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    manageContentVisibility();
    attachFormListeners();
});
