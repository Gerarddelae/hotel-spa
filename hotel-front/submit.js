document.addEventListener("DOMContentLoaded", function() {
    async function attachFormListener() {
        const form = document.getElementById('usuarioForm');
        const adminContent = document.getElementById('adminContent')
        const userContent = document.getElementById('userContent')

        if (!form || !adminContent || !userContent) {
            return; // Evita errores si los elementos aún no están en el DOM
        }

        const role = localStorage.getItem("role")

        // comprueba si el usuario es administrador con el servidor
        if (role === 'admin') {
            adminContent.style.display = 'block'
            userContent.style.display = 'none'
        } 
        if (form) {
            if (!form.dataset.listenerAdded) {
                form.dataset.listenerAdded = true;

                form.addEventListener('submit', async function(event) {
                    event.preventDefault();
                    console.log("Se evitó la recarga de la página");
                    const nombre = document.getElementById('nombreUser').value;
                    const email = document.getElementById('emailUser').value;
                    const password = document.getElementById('passwordForm').value;
                    const confirmPassword = document.getElementById('confirmPasswordForm').value;

                    console.log("Datos ingresados:", { nombre, email, password, confirmPassword });

                    if (password !== confirmPassword) {
                        alert('Las contraseñas no coinciden');
                        return;
                    }

                    // Obtener el token del localStorage
                    const token = localStorage.getItem('jwtToken');
                    if (!token) {
                        alert('No se encontró un token de autenticación. Por favor, inicia sesión.');
                        return;
                    }

                    // Datos a enviar al servidor
                    const data = { nombre, email, password };
                    console.log(data);

                    try {
                        const response = await fetch('http://localhost:5000/api/users', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}` // Token agregado en la cabecera
                            },
                            body: JSON.stringify(data)
                        });

                        const result = await response.json();
                        console.log("Respuesta del servidor:", result);

                        if (response.ok) {
                            form.reset();
                               // Mostrar el toast
                               mostrarToast("Usuario registrado con éxito.");
                        } else {
                            alert('Error en el registro: ' + result.message);
                        }
                    } catch (error) {
                        console.error("Error en la petición:", error);
                        alert('Hubo un problema al registrar');
                    }
                });
            } 
        } 
    }

    const registroFormObserver = new MutationObserver((mutationsList) => {
        attachFormListener();
    });

    // Función para mostrar el Toast con un mensaje dinámico
    function mostrarToast(mensaje) {
        const toastEl = document.getElementById("registroToast");
        const toastBody = toastEl.querySelector(".toast-body");
        toastBody.textContent = mensaje; // Cambia el mensaje del toast

        const toast = new bootstrap.Toast(toastEl, { delay: 5000 }); // Desaparece en 5s
        toast.show();
}


    registroFormObserver.observe(document.body, { childList: true, subtree: true });
    attachFormListener(); // Llamada inicial
});

