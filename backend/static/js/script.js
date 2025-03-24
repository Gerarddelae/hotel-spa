document.addEventListener("DOMContentLoaded", async function () {
    const sidebarContainer = document.getElementById("sidebar-container");
    const contentContainer = document.getElementById("content");
    const usuario = localStorage.getItem("usuario");
    const token = localStorage.getItem("access_token");
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

    // Si no hay token, redirige al login
    if (!token) {
        window.location.href = "/";
        return;
    }

    try {
        const roleRequest = await fetch("/api/me", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!roleRequest.ok) {
            throw new Error("No autenticado");
        }

        const apiRole = await roleRequest.json();
        localStorage.setItem("role", apiRole.role);
    } catch (error) {
        console.error("Error en la autenticación:", error);
        localStorage.clear();
        window.location.href = "/";
        return;
    }

    // Verifica si el usuario está autenticado correctamente
    if (!isLoggedIn) {
        window.location.href = "/";
        return;
    }

    const userObserver = new MutationObserver((mutationsList, observer) => {
        const userContainer = document.getElementById("userContainer");
        if (userContainer) {
            observer.disconnect();
            userContainer.textContent = usuario;
        }
    });

    userObserver.observe(document.body, { childList: true, subtree: true });

    // Cargar la barra lateral
    fetch("/static/pages/sidebar.html")
        .then(response => response.text())
        .then(data => {
            sidebarContainer.innerHTML = data;
            setupNavigation();
            logoutSetup();
            const lastPage = localStorage.getItem("lastPage") || "dashboard";
            loadPage(lastPage, true);
        });

    function setupNavigation() {
        const links = document.querySelectorAll("#sidebar-container .nav-link");
        links.forEach(link => {
            link.addEventListener("click", function (event) {
                event.preventDefault();
                const newPage = this.getAttribute("aria-current").replace("#", "");
                setActiveLink(newPage);
                loadPage(newPage);
            });
        });
        const activePage = localStorage.getItem("activeNavLink") || "dashboard";
        setActiveLink(activePage);
    }

    function setActiveLink(page) {
        const links = document.querySelectorAll("#sidebar-container .nav-link");
        links.forEach(link => {
            if (link.getAttribute("aria-current").replace("#", "") === page) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
        localStorage.setItem("activeNavLink", page);
    }

    function loadPage(page, isInitialLoad = false) {
        fetch(`/static/pages/${page}.html`)
            .then(response => response.text())
            .then(data => {
                console.log(`📌 Cargando contenido de /static/pages/${page}.html`);
                
                const contentContainer = document.getElementById("content");
                if (contentContainer) {
                    contentContainer.innerHTML = data;
                    console.log("🎯 Contenido insertado correctamente en #content");

                    if (page === "booking") {
                        console.log("🔄 Cargando clientes y habitaciones...");
                        setTimeout(() => {
                            if (typeof window.cargarClientesYHabitaciones === "function") {
                                window.cargarClientesYHabitaciones();
                                console.log("✅ Clientes y habitaciones cargados.");
                            } else {
                                console.error("❌ La función cargarClientesYHabitaciones no está disponible en window.");
                            }

                            if (typeof window.inicializarFormulario === "function") {
                                window.inicializarFormulario();
                                console.log("✅ Formulario inicializado correctamente.");
                            } else {
                                console.error("❌ La función inicializarFormulario no está disponible en window.");
                            }
                        }, 500);
                    }
                } else {
                    console.error("❌ No se encontró el contenedor #content");
                }

                localStorage.setItem("lastPage", page);

                if (!isInitialLoad) {
                    history.pushState({ page }, "", `#${page}`);
                } else {
                    history.replaceState({ page }, "", `#${page}`);
                }
            })
            .catch(err => console.error(`❌ Error al cargar ${page}.html:`, err));
    }
    
    

    function logoutSetup() {
        const outButton = document.getElementById("logout");
        if (outButton) {
            outButton.addEventListener("click", function () {
                localStorage.clear();
                window.location.href = "/"; // Redirige a login
            });
        }
    }

    window.addEventListener("popstate", function (event) {
        if (event.state && event.state.page) {
            loadPage(event.state.page, true);
            setActiveLink(event.state.page);
        }
    });
});
