document.addEventListener("DOMContentLoaded", function () {
    const sidebarContainer = document.getElementById("sidebar-container");
    const contentContainer = document.getElementById("content");
    

    // Cargar la barra lateral
    fetch("sidebar.html")
        .then(response => response.text())
        .then(data => {
            sidebarContainer.innerHTML = data;
            setupNavigation();
            logoutSetup()
            // Obtener la última página visitada o cargar "home" por defecto
            const lastPage = localStorage.getItem("lastPage") || "home";
            loadPage(lastPage, true);
        });

    function setupNavigation() {
        const links = document.querySelectorAll("#sidebar-container .nav-link");

        links.forEach(link => {
            link.addEventListener("click", function (event) {
                event.preventDefault();
                const newPage = this.getAttribute("aria-current").replace("#", "");
                console.log(newPage);
                setActiveLink(newPage);
                loadPage(newPage);
            });
        });

        // Aplicar la clase active a la última página activa al cargar
        const activePage = localStorage.getItem("activeNavLink") || "home";
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
        fetch(`pages/${page}.html`)
            .then(response => response.text())
            .then(data => {
                contentContainer.innerHTML = data;
                localStorage.setItem("lastPage", page);
                if (!isInitialLoad) {
                    history.pushState({ page }, "", `#${page}`);
                } else {
                    history.replaceState({ page }, "", `#${page}`);
                }
            });
    }

    const logoutSetup = () => {
        const outButton = document.getElementById("logout")
        outButton.addEventListener("click", function () {
            localStorage.removeItem("isLoggedIn"); // Eliminar sesión
            window.location.href = "../login.html"; // Redirigir al login
        });
    }

    // Manejar cambios en el historial (botones de atrás y adelante)
    window.addEventListener("popstate", function (event) {
        if (event.state && event.state.page) {
            loadPage(event.state.page, true);
            setActiveLink(event.state.page);
        }
    });
});
