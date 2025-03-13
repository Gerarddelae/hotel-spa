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

                    const token = localStorage.getItem("jwtToken");
                    if (!token) {
                        alert("⚠️ No se encontró un token de autenticación. Por favor, inicia sesión.");
                        return;
                    }

                    let method = form.method ? form.method.toUpperCase() : "POST";
                    let url = form.action;

                    if (method === "POST") {
                        // POST mantiene la URL base, sin ID
                    } else if (method === "PUT" || method === "DELETE") {
                        const userId = form.dataset.userId;
                        if (!userId) {
                            console.error(`⚠️ Error: Para ${method}, se necesita un ID.`);
                            alert(`⚠️ Error: Para ${method}, se necesita un ID.`);
                            return;
                        }
                        url = `${form.action}/${userId}`;
                    }

                    // Si es DELETE, no se envía un cuerpo (body)
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
                            mostrarToast(method === "PUT" ? "Registro actualizado con éxito." : 
                                         method === "DELETE" ? "Registro eliminado con éxito." :
                                         "Registro creado con éxito.");
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

    // async function loadFormData(modal, form) {
    //     const userId = form.dataset.userId;
    //     if (!userId) return;

    //     const token = localStorage.getItem("jwtToken");
    //     if (!token) {
    //         alert("⚠️ No se encontró un token de autenticación. Por favor, inicia sesión.");
    //         return;
    //     }

    //     try {
    //         const response = await fetch(`${form.action}/${userId}`, {
    //             method: "GET",
    //             headers: {
    //                 "Authorization": `Bearer ${token}`
    //             }
    //         });

    //         const userData = await response.json();
    //         console.log("📝 Datos obtenidos para el modal:", userData);

    //         if (response.ok) {
    //             Object.keys(userData).forEach(key => {
    //                 if (form[key]) {
    //                     form[key].value = userData[key];
    //                 }
    //             });
    //         } else {
    //             alert("⚠️ No se pudieron cargar los datos.");
    //         }
    //     } catch (error) {
    //         console.error("🚨 Error al obtener los datos:", error);
    //     }
    // }

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

    function mostrarToast(mensaje) {
        const toastEl = document.getElementById("registroToast");
        if (!toastEl) return;
        const toastBody = toastEl.querySelector(".toast-body");
        toastBody.textContent = mensaje;
        new bootstrap.Toast(toastEl, { delay: 5000 }).show();
    }

    // document.querySelectorAll(".open-modal").forEach(button => {
    //     button.addEventListener("click", function () {
    //         const modalId = button.dataset.target;
    //         const modal = document.querySelector(modalId);
    //         const form = modal.querySelector("form.auto-submit");

    //         if (form) {
    //             form.dataset.userId = button.dataset.userId;
    //             loadFormData(modal, form);
    //         }
    //     });
    // });

    const observer = new MutationObserver(() => {
        manageContentVisibility();
        attachFormListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    manageContentVisibility();
    attachFormListeners();
});
