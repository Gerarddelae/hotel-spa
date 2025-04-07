// Script para gráficos persistentes en SPA - Versión extendida para Cashier
(function() {
    // Configuración de gráficos por página
    const pageCharts = {
        'dashboard': ['chart-clients', 'chart-revenue', 'chart-occupancy'],
        'cashier': ['chart-revenue-daily', 'chart-revenue-monthly', 'chart-payments']
    };

    // Almacena las instancias de los gráficos
    const chartInstances = {};
    let observerInitialized = false;
    let initializationInProgress = false;
    let chartElements = new WeakMap();

    // Funciones de inicialización para cada tipo de gráfico
    const chartInitializers = {
        // Gráficos del Dashboard
        'chart-clients': function(element) {
            return initializeLightweightChart(element, {
                id: 'chart-clients',
                type: 'line',
                title: 'Clientes por Día',
                data: [
                    { time: '2023-01-01', value: 100 },
                    { time: '2023-01-02', value: 150 },
                    { time: '2023-01-03', value: 120 }
                ],
                color: '#0d6efd'
            });
        },
        'chart-revenue': function(element) {
            return initializeLightweightChart(element, {
                id: 'chart-revenue',
                type: 'area',
                title: 'Ingresos',
                data: [
                    { time: '2023-01-01', value: 500 },
                    { time: '2023-01-02', value: 800 },
                    { time: '2023-01-03', value: 650 }
                ],
                color: '#4e73df'
            });
        },
        'chart-occupancy': function(element) {
            return initializeChartJS(element, {
                id: 'chart-occupancy',
                type: 'doughnut',
                data: {
                    labels: ['Ocupadas', 'Disponibles'],
                    datasets: [{
                        data: [65, 35],
                        backgroundColor: ['#4e73df', '#1cc88a']
                    }]
                }
            });
        },
        // Gráficos del Cashier
        'chart-revenue-daily': function(element) {
            return initializeLightweightChart(element, {
                id: 'chart-revenue-daily',
                type: 'line',  // Cambiado a línea
                title: 'Ingresos Diarios',
                data: generateDailyRevenueData(),
                color: '#28a745',
                priceFormatter: (price) => `$${price.toFixed(2)}`
            });
        },
        'chart-revenue-monthly': function(element) {
            return initializeLightweightChart(element, {
                id: 'chart-revenue-monthly',
                type: 'bar',  // Cambiado a barras
                title: 'Ingresos Mensuales',
                data: generateMonthlyRevenueData(),
                color: '#17a2b8',
                priceFormatter: (price) => `$${price.toFixed(0)}`
            });
        },
        'chart-payments': function(element) {
            return initializeChartJS(element, {
                id: 'chart-payments',
                type: 'pie',
                data: {
                    labels: ['Tarjeta', 'Efectivo', 'Transferencia', 'Otros'],
                    datasets: [{
                        data: [45, 30, 15, 10],
                        backgroundColor: ['#007bff', '#28a745', '#ffc107', '#6c757d']
                    }]
                }
            });
        },
        
        // Interruptor de modo oscuro (compartido)
        'darkModeSwitch': function(element) {
            console.log("Configurando interruptor de modo oscuro");
            try {
                element.removeEventListener('change', darkModeHandler);
                element.addEventListener('change', darkModeHandler);
                return true;
            } catch (error) {
                console.error("Error configurando modo oscuro:", error);
                return false;
            }
        }
    };

    function initializeLightweightChart(element, config) {
        if (initializationInProgress || !element.isConnected) return false;
        initializationInProgress = true;
        
        console.log(`Inicializando gráfico ${config.id}`);
        try {
            if (typeof LightweightCharts === 'undefined') {
                throw new Error("LightweightCharts no está disponible");
            }
    
            if (chartElements.has(element)) {
                console.log(`El gráfico ${config.id} ya está inicializado`);
                initializationInProgress = false;
                return true;
            }
    
            // Limpiar el contenedor
            element.innerHTML = '';
            
            // Crear nuevo gráfico con autoSize habilitado
            const chart = LightweightCharts.createChart(element, {
                layout: { 
                    background: { color: 'transparent' }, 
                    textColor: getComputedStyle(document.body).color 
                },
                autoSize: true,  // Asegurar que el gráfico se autoajuste
                height: 300,
                width: element.clientWidth  // Tomar el ancho del contenedor
            });
            
            // Configurar la serie según el tipo
            let series;
            switch(config.type) {
                case 'line':
                    series = chart.addLineSeries({ 
                        color: config.color, 
                        lineWidth: 2,
                        crosshairMarkerVisible: true,
                        priceFormat: {
                            type: 'custom',
                            formatter: config.priceFormatter || ((price) => price.toFixed(2))
                        }
                    });
                    break;
                case 'bar':
                    series = chart.addHistogramSeries({
                        color: config.color,
                        priceFormat: {
                            type: 'custom',
                            formatter: config.priceFormatter || ((price) => price.toFixed(2))
                        },
                        base: 0  // Asegura que las barras partan desde cero
                    });
                    break;
                default:
                    series = chart.addLineSeries({ color: config.color });
            }
            
            series.setData(config.data);
    
            // Registrar la instancia
            chartInstances[config.id] = {
                chart: chart,
                series: series,
                container: element
            };
            
            // Añadir observador de redimensionamiento
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
    
    // Función para añadir observador de redimensionamiento
    function addResizeObserver(element, chart) {
        if (typeof ResizeObserver === 'undefined') {
            console.warn("ResizeObserver no está disponible, usando fallback");
            window.addEventListener('resize', () => {
                chart.applyOptions({ width: element.clientWidth });
            });
            return;
        }
    
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                chart.applyOptions({ width, height });
            }
        });
    
        observer.observe(element);
    }

    // Función auxiliar para inicializar gráficos Chart.js
    function initializeChartJS(element, config) {
        if (initializationInProgress || !element.isConnected) return false;
        initializationInProgress = true;
        
        console.log(`Inicializando gráfico ${config.id}`);
        try {
            if (typeof Chart === 'undefined') {
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
            element.innerHTML = '';
            const ctx = element.getContext('2d');
            
            const chart = new Chart(ctx, {
                type: config.type,
                data: config.data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: getComputedStyle(document.body).color
                            }
                        }
                    }
                }
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

    // Actualiza los generadores de datos:
    function generateDailyRevenueData() {
        const data = [];
        const now = new Date();
        for (let i = 30; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            data.push({
                time: date.toISOString().split('T')[0],
                value: Math.floor(Math.random() * 1000) + 500
            });
        }
        return data;
    }

    function generateMonthlyRevenueData() {
        const data = [];
        const now = new Date();
        for (let i = 12; i >= 0; i--) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            data.push({
                time: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`,
                value: Math.floor(Math.random() * 30000) + 15000
            });
        }
        return data;
    }

    // Función para manejar el cambio de modo oscuro
    function darkModeHandler() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        
        // Actualizar todos los gráficos
        updateChartsTheme();
    }

    // Actualizar temas de todos los gráficos
    function updateChartsTheme() {
        const textColor = getComputedStyle(document.body).color;
        
        // Actualizar LightweightCharts
        Object.keys(chartInstances).forEach(chartId => {
            const instance = chartInstances[chartId];
            
            if (instance?.chart?.applyOptions) {
                instance.chart.applyOptions({
                    layout: {
                        textColor: textColor
                    }
                });
            }
            
            if (instance?.options?.plugins?.legend?.labels) {
                instance.options.plugins.legend.labels.color = textColor;
                instance.update();
            }
        });
    }

    // Observador de mutaciones optimizado
    function setupSPAObserver() {
        if (observerInitialized) return;
        observerInitialized = true;

        const observer = new MutationObserver((mutations) => {
            if (initializationInProgress) return;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Determinar qué página estamos viendo
                            const currentPage = window.location.hash.replace('#', '') || 'dashboard';
                            const chartsToCheck = pageCharts[currentPage] || [];
                            
                            // Verificar todos los gráficos de la página actual
                            chartsToCheck.forEach(chartId => {
                                const element = document.getElementById(chartId);
                                if (element?.isConnected && !chartElements.has(element)) {
                                    console.log(`Inicializando gráfico ${chartId} para página ${currentPage}`);
                                    initializeChart(chartId);
                                }
                            });
                            
                            // Siempre verificar el dark mode switch
                            const darkModeElement = document.getElementById('darkModeSwitch');
                            if (darkModeElement?.isConnected) {
                                chartInitializers['darkModeSwitch'](darkModeElement);
                            }
                        }
                    });
                }
            });
        });

        const contentContainer = document.getElementById('content');
        if (contentContainer) {
            observer.observe(contentContainer, {
                childList: true,
                subtree: true
            });
        }
    }

    // Función para inicializar un gráfico específico
    function initializeChart(chartId) {
        if (!chartInitializers[chartId]) {
            console.warn(`Inicializador no definido para: ${chartId}`);
            return false;
        }

        const element = document.getElementById(chartId);
        if (!element?.isConnected) {
            console.warn(`Elemento ${chartId} no encontrado o no está en el DOM`);
            return false;
        }

        return chartInitializers[chartId](element);
    }

    // Inicialización controlada
    function initialize() {
        console.log("Iniciando sistema de gráficos persistentes");
        
        // Configurar observador
        setupSPAObserver();

        // Inicialización diferida
        setTimeout(() => {
            const currentPage = window.location.hash.replace('#', '') || 'dashboard';
            console.log(`Inicializando gráficos para página: ${currentPage}`);
            
            const chartsToInitialize = pageCharts[currentPage] || [];
            chartsToInitialize.forEach(chartId => {
                if (document.getElementById(chartId)) {
                    initializeChart(chartId);
                }
            });
            
            // Inicializar dark mode switch si existe
            const darkModeElement = document.getElementById('darkModeSwitch');
            if (darkModeElement) {
                chartInitializers['darkModeSwitch'](darkModeElement);
            }
        }, 300);
    }

    // Iniciar solo si estamos en una página con gráficos
    const currentPage = window.location.hash.replace('#', '') || 'dashboard';
    if (pageCharts[currentPage]) {
        initialize();
    }

    // API pública
    window.chartFunctions = {
        initialize: initializeChart,
        refresh: function() {
            if (!initializationInProgress) {
                const currentPage = window.location.hash.replace('#', '') || 'dashboard';
                const chartsToRefresh = pageCharts[currentPage] || [];
                
                chartsToRefresh.forEach(chartId => {
                    if (chartInstances[chartId]?.container?.isConnected) {
                        initializeChart(chartId);
                    }
                });
            }
        },
        updateData: function(chartId, newData) {
            if (chartInstances[chartId]) {
                const instance = chartInstances[chartId];
                
                if (instance.series?.setData) {
                    // LightweightCharts
                    instance.series.setData(newData);
                    return true;
                } else if (instance.data) {
                    // Chart.js
                    instance.data.datasets[0].data = newData;
                    instance.update();
                    return true;
                }
            }
            return false;
        }
    };
})();