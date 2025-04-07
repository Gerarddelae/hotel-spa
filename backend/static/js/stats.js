// Script para gráficos persistentes en SPA - Versión corregida
(function () {
  // Configuración de gráficos por página
  const pageCharts = {
    dashboard: ["chart-clients", "chart-revenue", "chart-occupancy"],
    cashier: ["chart-revenue-daily", "chart-revenue-monthly", "chart-payments"],
  };

  // Almacena las instancias de los gráficos
  const chartInstances = {};
  let observerInitialized = false;
  let initializationInProgress = false;
  let chartElements = new WeakMap();

  // Función para obtener datos de la API con JWT
  async function fetchChartData(endpoint) {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("No se encontró el token JWT");
        return null;
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error("Token JWT inválido o expirado");
        }
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error);
      return null;
    }
  }

  // Función para actualizar las estadísticas rápidas del Cashier
  async function updateQuickStats() {
    try {
      const data = await fetchChartData("/api/stats/quick-stats");
      if (!data) {
        console.error("No se recibieron datos para las estadísticas rápidas");
        return;
      }

      // Actualizar solo elementos que existen
      const revenueEl = document.getElementById("current-month-revenue");
      const clientsEl = document.getElementById("current-month-clients");
      const occupancyEl = document.getElementById("current-occupancy-percent");
      const paymentsEl = document.getElementById("today-payments");

      if (revenueEl)
        revenueEl.textContent = `$${data.monthly_revenue.toFixed(2)}`;
      if (clientsEl) clientsEl.textContent = data.monthly_clients;
      if (occupancyEl)
        occupancyEl.textContent = `${data.occupancy_percentage}%`;
      if (paymentsEl) paymentsEl.textContent = data.today_payments;
    } catch (error) {
      console.error("Error al actualizar estadísticas rápidas:", error);
    }
  }

  // Función para inicializar el Cashier con manejo de pestañas
  function initializeCashier() {
    if (!document.getElementById("cashierTab")) return;

    // Actualizar estadísticas al cargar
    updateQuickStats();

    // Escuchar cambios de pestaña en Bootstrap 5
    const tabEls = document.querySelectorAll(
      '#cashierTab button[data-bs-toggle="tab"]'
    );
    tabEls.forEach((tabEl) => {
      tabEl.addEventListener("shown.bs.tab", function (event) {
        if (event.target.getAttribute("aria-controls") === "dashboard-pane") {
          updateQuickStats();
          // Refrescar gráficos visibles
          const chartsToRefresh = pageCharts["cashier"] || [];
          chartsToRefresh.forEach((chartId) => {
            if (document.getElementById(chartId)?.offsetParent !== null) {
              initializeChart(chartId);
            }
          });
        }
      });
    });

    // Actualizar cada 5 minutos
    const statsInterval = setInterval(updateQuickStats, 5 * 60 * 1000);

    // Limpiar intervalo cuando se desactive la página
    return () => clearInterval(statsInterval);
  }

  // Funciones de inicialización para cada tipo de gráfico
  const chartInitializers = {
    // Gráficos del Dashboard
    "chart-clients": async function (element) {
      const data = await fetchChartData("/api/stats/daily-clients");
      if (!data) return false;

      const formattedData = data.map((item) => ({
        time: item.time,
        value: item.clients,
      }));

      return initializeLightweightChart(element, {
        id: "chart-clients",
        type: "line",
        title: "Clientes por Día",
        data: formattedData,
        color: "#0d6efd",
      });
    },
    "chart-revenue": async function (element) {
      const data = await fetchChartData("/api/stats/daily-revenue");
      if (!data) return false;

      const formattedData = data.map((item) => ({
        time: item.time,
        value: item.revenue,
      }));

      return initializeLightweightChart(element, {
        id: "chart-revenue",
        type: "area",
        title: "Ingresos",
        data: formattedData,
        color: "#4e73df",
      });
    },
    "chart-occupancy": async function (element) {
      const data = await fetchChartData("/api/stats/current-occupancy");
      console.log(data);
      if (!data) return false;

      return initializeChartJS(element, {
        id: "chart-occupancy",
        type: "doughnut",
        data: {
          labels: ["Ocupadas", "Disponibles"],
          datasets: [
            {
              data: [
                data.habitaciones_ocupadas,
                data.total_habitaciones - data.habitaciones_ocupadas,
              ],
              backgroundColor: ["#DC3545", "#1cc88a"],
              borderColor:
                getComputedStyle(document.body).getPropertyValue(
                  "--bs-body-bg"
                ) || "#ffffff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: {
                color: getComputedStyle(document.body).color,
              },
            },
          },
        },
      });
    },
    // Gráficos del Cashier
    "chart-revenue-daily": async function (element) {
      const data = await fetchChartData("/api/stats/daily-revenue");
      if (!data) return false;

      const formattedData = data.map((item) => ({
        time: item.time,
        value: item.revenue,
      }));

      return initializeLightweightChart(element, {
        id: "chart-revenue-daily",
        type: "line",
        title: "Ingresos Diarios",
        data: formattedData,
        color: "#28a745",
        priceFormatter: (price) => `$${price.toFixed(2)}`,
      });
    },
    "chart-revenue-monthly": async function (element) {
      const data = await fetchChartData("/api/stats/monthly-revenue");
      if (!data) return false;

      return initializeLightweightChart(element, {
        id: "chart-revenue-monthly",
        type: "bar",
        title: "Ingresos Mensuales",
        data: data,
        color: "#17a2b8",
        priceFormatter: (price) => `$${price.toFixed(0)}`,
      });
    },
    "chart-payments": async function (element) {
      const data = await fetchChartData("/api/stats/current-month-payments");
      if (!data) return false;

      const paymentMethods = data.payment_methods;
      const labels = [];
      const amounts = [];

      // Ordenar métodos de pago por monto descendente
      Object.entries(paymentMethods)
        .sort((a, b) => b[1].amount - a[1].amount)
        .forEach(([method, data]) => {
          labels.push(method.charAt(0).toUpperCase() + method.slice(1));
          amounts.push(data.amount);
        });

      return initializeChartJS(element, {
        id: "chart-payments",
        type: "pie",
        data: {
          labels: labels,
          datasets: [
            {
              data: amounts,
              backgroundColor: [
                "#007bff",
                "#28a745",
                "#ffc107",
                "#6c757d",
                "#17a2b8",
              ],
              borderColor:
                getComputedStyle(document.body).getPropertyValue(
                  "--bs-body-bg"
                ) || "#ffffff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: {
                color: getComputedStyle(document.body).color,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || "";
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                },
              },
            },
          },
        },
      });
    },

    // Interruptor de modo oscuro (compartido)
    darkModeSwitch: function (element) {
      try {
        element.removeEventListener("change", darkModeHandler);
        element.addEventListener("change", darkModeHandler);
        return true;
      } catch (error) {
        console.error("Error configurando modo oscuro:", error);
        return false;
      }
    },
  };

  function initializeLightweightChart(element, config) {
    if (initializationInProgress || !element.isConnected) return false;
    initializationInProgress = true;

    console.log(`Inicializando gráfico ${config.id}`);
    try {
      if (typeof LightweightCharts === "undefined") {
        throw new Error("LightweightCharts no está disponible");
      }

      if (chartElements.has(element)) {
        console.log(`El gráfico ${config.id} ya está inicializado`);
        initializationInProgress = false;
        return true;
      }

      element.innerHTML = "";

      const chart = LightweightCharts.createChart(element, {
        layout: {
          background: { color: "transparent" },
          textColor: getComputedStyle(document.body).color,
        },
        autoSize: true,
        height: 300,
        width: element.clientWidth,
      });

      let series;
      switch (config.type) {
        case "line":
          series = chart.addLineSeries({
            color: config.color,
            lineWidth: 2,
            crosshairMarkerVisible: true,
            priceFormat: {
              type: "custom",
              formatter: config.priceFormatter || ((price) => price.toFixed(2)),
            },
          });
          break;
        case "bar":
          series = chart.addHistogramSeries({
            color: config.color,
            priceFormat: {
              type: "custom",
              formatter: config.priceFormatter || ((price) => price.toFixed(2)),
            },
            base: 0,
          });
          break;
        default:
          series = chart.addLineSeries({ color: config.color });
      }

      series.setData(config.data);

      chartInstances[config.id] = {
        chart: chart,
        series: series,
        container: element,
      };

      addResizeObserver(element, chart);

      chartElements.set(element, true);
      console.log(`Gráfico ${config.id} creado correctamente`);

      return true;
    } catch (error) {
      console.error(`Error al crear gráfico ${config.id}:`, error);
      return false;
    } finally {
      initializationInProgress = false;
    }
  }

  function addResizeObserver(element, chart) {
    if (typeof ResizeObserver === "undefined") {
      console.warn("ResizeObserver no está disponible, usando fallback");
      window.addEventListener("resize", () => {
        chart.applyOptions({ width: element.clientWidth });
      });
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });

    observer.observe(element);
  }

  function initializeChartJS(element, config) {
    if (initializationInProgress || !element.isConnected) return false;
    initializationInProgress = true;

    console.log(`Inicializando gráfico ${config.id}`);
    try {
      if (typeof Chart === "undefined") {
        throw new Error("Chart.js no está disponible");
      }

      // Para Chart.js siempre creamos nueva instancia
      if (chartInstances[config.id]) {
        try {
          chartInstances[config.id].destroy();
        } catch (e) {
          console.warn(`Error al destruir gráfico ${config.id} anterior:`, e);
        }
      }

      // Limpiar el contenedor
      element.innerHTML = "";
      const ctx = element.getContext("2d");

      const chart = new Chart(ctx, {
        type: config.type,
        data: config.data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: {
                color: getComputedStyle(document.body).color,
              },
            },
          },
        },
      });

      chartInstances[config.id] = chart;
      chartElements.set(element, true);
      console.log(`Gráfico ${config.id} creado correctamente`);

      return true;
    } catch (error) {
      console.error(`Error al crear gráfico ${config.id}:`, error);
      return false;
    } finally {
      initializationInProgress = false;
    }
  }

  function darkModeHandler() {
    const currentTheme = document.documentElement.getAttribute("data-bs-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-bs-theme", newTheme);

    updateChartsTheme();
  }

  function updateChartsTheme() {
    const textColor = getComputedStyle(document.body).color;
    const bgColor =
      getComputedStyle(document.body).getPropertyValue("--bs-body-bg") ||
      "#ffffff";

    Object.keys(chartInstances).forEach((chartId) => {
      const instance = chartInstances[chartId];

      // Para Lightweight Charts
      if (instance?.chart?.applyOptions) {
        instance.chart.applyOptions({
          layout: {
            textColor: textColor,
            background: { color: "transparent" },
          },
        });
      }

      // Para Chart.js
      if (instance?.update) {
        // Actualizar colores de texto en leyendas
        if (instance.options?.plugins?.legend?.labels) {
          instance.options.plugins.legend.labels.color = textColor;
        }

        // Actualizar bordes si existen
        if (instance.data?.datasets) {
          instance.data.datasets.forEach((dataset) => {
            if (dataset.borderColor === undefined) {
              dataset.borderColor = bgColor;
            }
          });
        }

        instance.update();
      }
    });
  }

  function setupSPAObserver() {
    if (observerInitialized) return;
    observerInitialized = true;

    const observer = new MutationObserver((mutations) => {
      if (initializationInProgress) return;

      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const currentPage =
                window.location.hash.replace("#", "") || "dashboard";
              const chartsToCheck = pageCharts[currentPage] || [];

              chartsToCheck.forEach((chartId) => {
                const element = document.getElementById(chartId);
                if (element?.isConnected && !chartElements.has(element)) {
                  console.log(
                    `Inicializando gráfico ${chartId} para página ${currentPage}`
                  );
                  initializeChart(chartId);
                }
              });

              // Inicializar cashier si es la página actual
              if (currentPage === "cashier") {
                initializeCashier();
              }

              // Configurar modo oscuro
              const darkModeElement = document.getElementById("darkModeSwitch");
              if (darkModeElement?.isConnected) {
                chartInitializers["darkModeSwitch"](darkModeElement);
              }
            }
          });
        }
      });
    });

    const contentContainer = document.getElementById("content");
    if (contentContainer) {
      observer.observe(contentContainer, {
        childList: true,
        subtree: true,
      });
    }
  }

  async function initializeChart(chartId) {
    if (!chartInitializers[chartId]) {
      console.warn(`Inicializador no definido para: ${chartId}`);
      return false;
    }

    const element = document.getElementById(chartId);
    if (!element?.isConnected) {
      console.warn(`Elemento ${chartId} no encontrado o no está en el DOM`);
      return false;
    }

    try {
      return await chartInitializers[chartId](element);
    } catch (error) {
      console.error(`Error al inicializar gráfico ${chartId}:`, error);
      return false;
    }
  }

  function initialize() {
    console.log("Iniciando sistema de gráficos persistentes");

    setupSPAObserver();

    setTimeout(async () => {
      const currentPage = window.location.hash.replace("#", "") || "dashboard";
      console.log(`Inicializando gráficos para página: ${currentPage}`);

      const chartsToInitialize = pageCharts[currentPage] || [];
      for (const chartId of chartsToInitialize) {
        if (document.getElementById(chartId)) {
          await initializeChart(chartId);
        }
      }

      // Inicializar cashier si es la página actual
      if (currentPage === "cashier") {
        initializeCashier();
      }

      // Configurar modo oscuro
      const darkModeElement = document.getElementById("darkModeSwitch");
      if (darkModeElement) {
        chartInitializers["darkModeSwitch"](darkModeElement);
      }
    }, 300);
  }

  // Event listeners para inicialización
  document.addEventListener("DOMContentLoaded", function () {
    const currentPage = window.location.hash.replace("#", "") || "dashboard";
    if (pageCharts[currentPage]) {
      initialize();
    }

    if (currentPage === "cashier") {
      initializeCashier();
    }
  });

  window.addEventListener("hashchange", function () {
    const currentPage = window.location.hash.replace("#", "") || "dashboard";
    if (pageCharts[currentPage]) {
      initialize();
    }

    if (currentPage === "cashier") {
      initializeCashier();
    }
  });

  // Exponer funciones públicas
  window.chartFunctions = {
    initialize: initializeChart,
    refresh: async function () {
      if (!initializationInProgress) {
        const currentPage =
          window.location.hash.replace("#", "") || "dashboard";
        const chartsToRefresh = pageCharts[currentPage] || [];

        for (const chartId of chartsToRefresh) {
          if (chartInstances[chartId]?.container?.isConnected) {
            await initializeChart(chartId);
          }
        }

        if (currentPage === "cashier") {
          await updateQuickStats();
        }
      }
    },
    updateData: function (chartId, newData) {
      if (chartInstances[chartId]) {
        const instance = chartInstances[chartId];

        if (instance.series?.setData) {
          instance.series.setData(newData);
          return true;
        } else if (instance.data) {
          instance.data.datasets[0].data = newData;
          instance.update();
          return true;
        }
      }
      return false;
    },
    updateQuickStats: updateQuickStats,
  };
})();
