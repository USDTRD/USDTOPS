// Database simulada en localStorage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// Inicializar la app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Si no hay datos, crear datos de ejemplo
    if (transactions.length === 0) {
        createSampleData();
    }
    
    updateDashboard();
    renderRecentTransactions();
    renderAllTransactions();
    initCharts();
}

function createSampleData() {
    const sampleTransactions = [
        {
            id: Date.now() + 1,
            date: new Date(2024, 10, 15, 10, 30).toISOString(),
            type: 'betcris',
            client: 'Betcris Santo Domingo',
            usdtAmount: 5000,
            dopAmount: 300000,
            rate: 60.00,
            profit: 5000,
            status: 'completed',
            notes: 'Cobro semanal regular'
        },
        {
            id: Date.now() + 2,
            date: new Date(2024, 10, 16, 14, 0).toISOString(),
            type: 'rusos',
            client: 'Dmitri Ivanov',
            usdtAmount: 10000,
            dopAmount: 595000,
            rate: 59.50,
            profit: 15000,
            status: 'completed',
            notes: 'Cliente regular VIP'
        },
        {
            id: Date.now() + 3,
            date: new Date(2024, 10, 17, 9, 15).toISOString(),
            type: 'general',
            client: 'Juan Pérez',
            usdtAmount: 2000,
            dopAmount: 119000,
            rate: 59.50,
            profit: 3000,
            status: 'completed',
            notes: 'Transacción rápida'
        },
        {
            id: Date.now() + 4,
            date: new Date(2024, 10, 17, 16, 45).toISOString(),
            type: 'betcris',
            client: 'Betcris Santiago',
            usdtAmount: 3500,
            dopAmount: 210000,
            rate: 60.00,
            profit: 3500,
            status: 'completed',
            notes: 'Cobro mensual'
        },
        {
            id: Date.now() + 5,
            date: new Date(2024, 10, 18, 11, 0).toISOString(),
            type: 'rusos',
            client: 'Sergei Petrov',
            usdtAmount: 15000,
            dopAmount: 892500,
            rate: 59.50,
            profit: 22500,
            status: 'pending',
            notes: 'Pendiente confirmación'
        }
    ];
    
    transactions = sampleTransactions;
    saveTransactions();
}

function setupEventListeners() {
    // Navegación - compatible con móvil
    document.querySelectorAll('.nav-item').forEach(item => {
        // Click para desktop y touch para móvil
        ['click', 'touchend'].forEach(eventType => {
            item.addEventListener(eventType, function(e) {
                e.preventDefault();
                e.stopPropagation();
                const page = this.getAttribute('data-page');
                if (page) {
                    switchPage(page);
                }
            }, { passive: false });
        });
    });

    // Filtros
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('type-filter');
    const periodSelector = document.querySelector('.period-selector');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterTransactions);
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', filterTransactions);
    }
    
    if (periodSelector) {
        periodSelector.addEventListener('change', updateDashboard);
    }
    
    // Asegurar que los botones de agregar transacción funcionen
    document.querySelectorAll('[onclick*="showAddTransaction"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showAddTransaction();
        });
    });
}

function switchPage(pageName) {
    // Ocultar todas las páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Mostrar la página seleccionada
    document.getElementById(`${pageName}-page`).classList.remove('hidden');
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageName) {
            item.classList.add('active');
        }
    });
}

function updateDashboard() {
    const period = document.querySelector('.period-selector')?.value || 'month';
    const filteredTransactions = filterByPeriod(transactions, period);
    
    // Calcular estadísticas
    const totalBalance = filteredTransactions.reduce((sum, t) => sum + t.usdtAmount, 0);
    const totalProfit = filteredTransactions.reduce((sum, t) => sum + t.profit, 0);
    const transactionCount = filteredTransactions.length;
    const avgMargin = totalBalance > 0 ? (totalProfit / totalBalance * 100) : 0;
    
    // Actualizar cards
    document.getElementById('total-balance').textContent = formatCurrency(totalBalance);
    document.getElementById('month-profit').textContent = formatCurrency(totalProfit);
    document.getElementById('transaction-count').textContent = transactionCount;
    document.getElementById('avg-margin').textContent = avgMargin.toFixed(2) + '%';
    
    // Actualizar reportes
    document.getElementById('report-total-transactions').textContent = transactionCount;
    document.getElementById('report-total-usdt').textContent = formatCurrency(totalBalance);
    document.getElementById('report-total-profit').textContent = formatCurrency(totalProfit);
    document.getElementById('report-avg-margin').textContent = avgMargin.toFixed(2) + '%';
}

function filterByPeriod(data, period) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    let startDate;
    switch(period) {
        case 'today':
            startDate = startOfToday;
            break;
        case 'week':
            startDate = startOfWeek;
            break;
        case 'month':
            startDate = startOfMonth;
            break;
        case 'year':
            startDate = startOfYear;
            break;
        default:
            return data;
    }
    
    return data.filter(t => new Date(t.date) >= startDate);
}

function renderRecentTransactions() {
    const tbody = document.getElementById('recent-transactions-body');
    if (!tbody) return;
    
    const recent = transactions.slice(-5).reverse();
    
    tbody.innerHTML = recent.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td><span class="type-badge ${t.type}">${getTypeLabel(t.type)}</span></td>
            <td>${formatCurrency(t.usdtAmount)}</td>
            <td>${t.rate ? t.rate.toFixed(2) : '-'}</td>
            <td class="profit-positive">${formatCurrency(t.profit)}</td>
            <td>${getLiquidationStatus(t)}</td>
            <td><span class="status-badge ${t.status}">${getStatusLabel(t.status)}</span></td>
        </tr>
    `).join('');
}

function getLiquidationStatus(transaction) {
    if (transaction.type === 'betcris' || transaction.type === 'rusos') {
        if (transaction.liquidated) {
            return '<span class="status-badge completed">Liquidado</span>';
        } else {
            return `<button class="btn-liquidate" onclick="liquidateTransaction(${transaction.id})">Liquidar</button>`;
        }
    }
    return '-';
}

function renderAllTransactions() {
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;
    
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = sorted.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td><span class="type-badge ${t.type}">${getTypeLabel(t.type)}</span></td>
            <td>${t.client}</td>
            <td>${formatCurrency(t.usdtAmount)}</td>
            <td>RD$ ${t.dopAmount ? t.dopAmount.toLocaleString() : '-'}</td>
            <td>${t.rate ? t.rate.toFixed(2) : '-'}</td>
            <td class="profit-positive">${formatCurrency(t.profit)}</td>
            <td>${getLiquidationStatus(t)}</td>
            <td><span class="status-badge ${t.status}">${getStatusLabel(t.status)}</span></td>
            <td>
                <button class="action-btn" onclick="editTransaction(${t.id})" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.333 2A1.886 1.886 0 0114 4.667l-9 9-3.667 1 1-3.667 9-9z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="action-btn danger" onclick="deleteTransaction(${t.id})" title="Eliminar">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function liquidateTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    if (confirm('¿Marcar como liquidado?')) {
        transaction.liquidated = true;
        transaction.liquidationDate = new Date().toISOString();
        saveTransactions();
        
        updateDashboard();
        renderRecentTransactions();
        renderAllTransactions();
    }
}

function filterTransactions() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('type-filter')?.value || '';
    
    const filtered = transactions.filter(t => {
        const matchesSearch = t.client.toLowerCase().includes(searchTerm) || 
                            t.notes.toLowerCase().includes(searchTerm);
        const matchesType = !typeFilter || t.type === typeFilter;
        return matchesSearch && matchesType;
    });
    
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;
    
    const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = sorted.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td><span class="type-badge ${t.type}">${getTypeLabel(t.type)}</span></td>
            <td>${t.client}</td>
            <td>${formatCurrency(t.usdtAmount)}</td>
            <td>RD$ ${t.dopAmount.toLocaleString()}</td>
            <td>${t.rate.toFixed(2)}</td>
            <td class="profit-positive">${formatCurrency(t.profit)}</td>
            <td><span class="status-badge ${t.status}">${getStatusLabel(t.status)}</span></td>
            <td>
                <button class="action-btn" onclick="editTransaction(${t.id})">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.333 2A1.886 1.886 0 0114 4.667l-9 9-3.667 1 1-3.667 9-9z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="action-btn danger" onclick="deleteTransaction(${t.id})">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function initCharts() {
    initProfitChart();
    initTypeChart();
}

function initProfitChart() {
    const ctx = document.getElementById('profitChart');
    if (!ctx) return;
    
    // Obtener datos de los últimos 12 meses
    const monthlyData = getMonthlyData(12);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Ganancias',
                data: monthlyData.profits,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '$' + value.toLocaleString(),
                        color: '#94a3b8'
                    },
                    grid: {
                        color: '#334155'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: '#334155'
                    }
                }
            }
        }
    });
}

function initTypeChart() {
    const ctx = document.getElementById('typeChart');
    if (!ctx) return;
    
    const typeData = getTypeDistribution();
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Betcris', 'Rusos', 'General'],
            datasets: [{
                data: [typeData.betcris, typeData.rusos, typeData.general],
                backgroundColor: [
                    '#6366f1',
                    '#ec4899',
                    '#a855f7'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        padding: 20
                    }
                }
            }
        }
    });
}

function getMonthlyData(months) {
    const labels = [];
    const profits = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('es', { month: 'short' });
        labels.push(monthName.charAt(0).toUpperCase() + monthName.slice(1));
        
        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === date.getMonth() && 
                   tDate.getFullYear() === date.getFullYear();
        });
        
        const monthProfit = monthTransactions.reduce((sum, t) => sum + t.profit, 0);
        profits.push(monthProfit);
    }
    
    return { labels, profits };
}

function getTypeDistribution() {
    return {
        betcris: transactions.filter(t => t.type === 'betcris').reduce((sum, t) => sum + t.profit, 0),
        rusos: transactions.filter(t => t.type === 'rusos').reduce((sum, t) => sum + t.profit, 0),
        general: transactions.filter(t => t.type === 'general').reduce((sum, t) => sum + t.profit, 0)
    };
}

function showAddTransaction() {
    const modal = document.getElementById('add-transaction-modal');
    const form = document.getElementById('transaction-form');
    
    // Resetear el formulario
    form.reset();
    
    // Limpiar todos los resultados calculados
    document.getElementById('betcris_total_usd').textContent = '$0.00';
    document.getElementById('betcris_usdt').textContent = '$0.00';
    document.getElementById('betcris_profit').textContent = '$0.00';
    document.getElementById('betcris_compra_cost').textContent = '$0.00';
    document.getElementById('betcris_compra_profit').textContent = '$0.00';
    
    document.getElementById('rusos_total_profit').textContent = '$0.00';
    document.getElementById('rusos_your_part').textContent = '$0.00';
    document.getElementById('rusos_partner_part').textContent = '$0.00';
    
    document.getElementById('general_usd_value').textContent = '$0.00';
    document.getElementById('general_profit').textContent = '$0.00';
    
    // Ocultar todos los campos específicos
    document.getElementById('betcris-fields').classList.add('hidden');
    document.getElementById('betcris-cobro-fields').classList.add('hidden');
    document.getElementById('betcris-compra-fields').classList.add('hidden');
    document.getElementById('rusos-fields').classList.add('hidden');
    document.getElementById('general-fields').classList.add('hidden');
    
    // Establecer fecha actual
    const now = new Date();
    const dateInput = document.querySelector('input[name="date"]');
    if (dateInput) {
        dateInput.value = now.toISOString().slice(0, 16);
    }
    
    modal.classList.remove('hidden');
}

function updateFormFields() {
    const type = document.getElementById('transaction-type').value;
    
    // Ocultar todos
    document.getElementById('betcris-fields').classList.add('hidden');
    document.getElementById('rusos-fields').classList.add('hidden');
    document.getElementById('general-fields').classList.add('hidden');
    
    // Mostrar el correspondiente
    if (type === 'betcris') {
        document.getElementById('betcris-fields').classList.remove('hidden');
    } else if (type === 'rusos') {
        document.getElementById('rusos-fields').classList.remove('hidden');
    } else if (type === 'general') {
        document.getElementById('general-fields').classList.remove('hidden');
    }
}

function updateBetcrisFields() {
    const operation = document.getElementById('betcris_operation').value;
    
    // Ocultar ambos
    document.getElementById('betcris-cobro-fields').classList.add('hidden');
    document.getElementById('betcris-compra-fields').classList.add('hidden');
    
    // Mostrar el correspondiente
    if (operation === 'cobro') {
        document.getElementById('betcris-cobro-fields').classList.remove('hidden');
    } else if (operation === 'compra') {
        document.getElementById('betcris-compra-fields').classList.remove('hidden');
    }
}

function calculateBetcris() {
    const dopInput = document.querySelector('input[name="betcris_dop"]');
    const usdInput = document.querySelector('input[name="betcris_usd"]');
    const rateInput = document.querySelector('input[name="betcris_rate"]');
    
    if (!dopInput || !usdInput || !rateInput) return;
    
    const dop = parseFloat(dopInput.value) || 0;
    const usd = parseFloat(usdInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    
    if (rate === 0) {
        document.getElementById('betcris_total_usd').textContent = '$0.00';
        document.getElementById('betcris_usdt').textContent = '$0.00';
        document.getElementById('betcris_profit').textContent = '$0.00';
        return;
    }
    
    // Total USD = USD + (RD$ / tasa)
    const totalUSD = usd + (dop / rate);
    
    // USDT a liquidar = Total USD / 1.03
    const usdtToSettle = totalUSD / 1.03;
    
    // Ganancia = Total USD - USDT liquidado
    const profit = totalUSD - usdtToSettle;
    
    document.getElementById('betcris_total_usd').textContent = formatCurrency(totalUSD);
    document.getElementById('betcris_usdt').textContent = formatCurrency(usdtToSettle);
    document.getElementById('betcris_profit').textContent = formatCurrency(profit);
}

function calculateBetcrisCompra() {
    const usdtInput = document.querySelector('input[name="betcris_compra_usdt"]');
    const percentInput = document.querySelector('input[name="betcris_compra_percent"]');
    
    if (!usdtInput || !percentInput) return;
    
    const usdt = parseFloat(usdtInput.value) || 0;
    const percent = parseFloat(percentInput.value) || 0;
    
    if (usdt === 0) {
        document.getElementById('betcris_compra_cost').textContent = '$0.00';
        document.getElementById('betcris_compra_profit').textContent = '$0.00';
        return;
    }
    
    // Costo = USDT × (1 + percent/100)
    const cost = usdt * (1 + percent / 100);
    
    // Ganancia = Costo - USDT
    const profit = cost - usdt;
    
    document.getElementById('betcris_compra_cost').textContent = formatCurrency(cost);
    document.getElementById('betcris_compra_profit').textContent = formatCurrency(profit);
}

function calculateRusos() {
    const usdtInput = document.querySelector('input[name="rusos_usdt"]');
    const marginInput = document.querySelector('input[name="rusos_margin"]');
    
    if (!usdtInput || !marginInput) return;
    
    const usdt = parseFloat(usdtInput.value) || 0;
    const margin = parseFloat(marginInput.value) || 0;
    
    // Ganancia total = USDT × (margen / 100)
    const totalProfit = usdt * (margin / 100);
    
    // Tu parte = 50%
    const yourPart = totalProfit / 2;
    const partnerPart = totalProfit / 2;
    
    document.getElementById('rusos_total_profit').textContent = formatCurrency(totalProfit);
    document.getElementById('rusos_your_part').textContent = formatCurrency(yourPart);
    document.getElementById('rusos_partner_part').textContent = formatCurrency(partnerPart);
}

function calculateGeneral() {
    const operationSelect = document.querySelector('select[name="general_operation"]');
    const usdtInput = document.querySelector('input[name="general_usdt"]');
    const currencySelect = document.querySelector('select[name="general_currency"]');
    const amountInput = document.querySelector('input[name="general_amount"]');
    const rateInput = document.querySelector('input[name="general_rate"]');
    
    if (!operationSelect || !usdtInput || !currencySelect || !amountInput || !rateInput) return;
    
    const operation = operationSelect.value;
    const usdt = parseFloat(usdtInput.value) || 0;
    const currency = currencySelect.value;
    const amount = parseFloat(amountInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    
    if (!operation || usdt === 0 || amount === 0) {
        document.getElementById('general_usd_value').textContent = '$0.00';
        document.getElementById('general_profit').textContent = '$0.00';
        return;
    }
    
    // Convertir todo a USD
    let amountUSD = amount;
    if (currency === 'dop' && rate > 0) {
        amountUSD = amount / rate;
    }
    
    let profit = 0;
    if (operation === 'compra') {
        // Compras USDT pagando menos de lo que valen
        profit = usdt - amountUSD;
    } else if (operation === 'venta') {
        // Vendes USDT recibiendo más de lo que valen
        profit = amountUSD - usdt;
    }
    
    document.getElementById('general_usd_value').textContent = formatCurrency(amountUSD);
    document.getElementById('general_profit').textContent = formatCurrency(profit);
}

function addTransaction(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const formData = new FormData(event.target);
    const type = formData.get('type');
    
    if (!type) {
        alert('Por favor selecciona un tipo de transacción');
        return;
    }
    
    let transaction = {
        id: Date.now(),
        date: new Date(formData.get('date')).toISOString(),
        type: type,
        status: 'completed',
        notes: formData.get('notes') || ''
    };
    
    // Procesar según el tipo
    if (type === 'betcris') {
        const operation = formData.get('betcris_operation');
        
        if (!operation) {
            alert('Por favor selecciona el tipo de operación de Betcris');
            return;
        }
        
        transaction.client = formData.get('betcris_office') || 'Betcris';
        transaction.betcrisOperation = operation;
        transaction.liquidated = false;
        
        if (operation === 'cobro') {
            const dop = parseFloat(formData.get('betcris_dop')) || 0;
            const usd = parseFloat(formData.get('betcris_usd')) || 0;
            const rate = parseFloat(formData.get('betcris_rate')) || 0;
            
            if (rate === 0) {
                alert('Por favor ingresa una tasa válida');
                return;
            }
            
            const totalUSD = usd + (dop / rate);
            const usdtToSettle = totalUSD / 1.03;
            const profit = totalUSD - usdtToSettle;
            
            transaction.usdtAmount = usdtToSettle;
            transaction.dopAmount = dop;
            transaction.usdAmount = usd;
            transaction.rate = rate;
            transaction.profit = profit;
            
        } else if (operation === 'compra') {
            const usdt = parseFloat(formData.get('betcris_compra_usdt')) || 0;
            const percent = parseFloat(formData.get('betcris_compra_percent')) || 0;
            
            if (usdt === 0) {
                alert('Por favor ingresa la cantidad de USDT');
                return;
            }
            
            const cost = usdt * (1 + percent / 100);
            const profit = cost - usdt;
            
            transaction.usdtAmount = usdt;
            transaction.costPercent = percent;
            transaction.totalCost = cost;
            transaction.profit = profit;
            transaction.dopAmount = 0;
            transaction.rate = 0;
        }
        
    } else if (type === 'rusos') {
        const usdt = parseFloat(formData.get('rusos_usdt')) || 0;
        const margin = parseFloat(formData.get('rusos_margin')) || 0;
        
        if (usdt === 0) {
            alert('Por favor ingresa una cantidad de USDT');
            return;
        }
        
        const totalProfit = usdt * (margin / 100);
        const yourPart = totalProfit / 2;
        
        transaction.client = formData.get('rusos_client') || 'Cliente Ruso';
        transaction.usdtAmount = usdt;
        transaction.margin = margin;
        transaction.totalProfit = totalProfit;
        transaction.profit = yourPart;
        transaction.dopAmount = 0;
        transaction.rate = 0;
        
    } else if (type === 'general') {
        const operation = formData.get('general_operation');
        const usdt = parseFloat(formData.get('general_usdt')) || 0;
        const currency = formData.get('general_currency');
        const amount = parseFloat(formData.get('general_amount')) || 0;
        const rate = parseFloat(formData.get('general_rate')) || 0;
        
        if (!operation) {
            alert('Por favor selecciona el tipo de operación');
            return;
        }
        
        if (usdt === 0 || amount === 0) {
            alert('Por favor completa todos los campos');
            return;
        }
        
        let amountUSD = amount;
        if (currency === 'dop' && rate > 0) {
            amountUSD = amount / rate;
        } else if (currency === 'dop' && rate === 0) {
            alert('Por favor ingresa la tasa de cambio');
            return;
        }
        
        let profit = 0;
        if (operation === 'compra') {
            profit = usdt - amountUSD;
        } else if (operation === 'venta') {
            profit = amountUSD - usdt;
        }
        
        transaction.client = formData.get('general_client') || 'Cliente General';
        transaction.operation = operation;
        transaction.usdtAmount = usdt;
        transaction.currency = currency;
        transaction.amount = amount;
        transaction.rate = rate;
        transaction.profit = profit;
        transaction.dopAmount = currency === 'dop' ? amount : 0;
    }
    
    transactions.push(transaction);
    saveTransactions();
    
    closeModal();
    
    updateDashboard();
    renderRecentTransactions();
    renderAllTransactions();
    initCharts();
    
    return false;
}

function closeModal() {
    const modal = document.getElementById('add-transaction-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function editTransaction(id) {
    // Por ahora solo mostramos alerta, pero se puede implementar
    alert('Función de edición en desarrollo');
}

function deleteTransaction(id) {
    if (confirm('¿Estás seguro de eliminar esta transacción?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        
        updateDashboard();
        renderRecentTransactions();
        renderAllTransactions();
        initCharts();
    }
}

function generatePDF() {
    alert('Generación de PDF en desarrollo');
}

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es', { 
        day: '2-digit', 
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getTypeLabel(type) {
    const labels = {
        'betcris': 'Betcris',
        'rusos': 'Rusos',
        'general': 'General'
    };
    return labels[type] || type;
}

function getStatusLabel(status) {
    const labels = {
        'completed': 'Completado',
        'pending': 'Pendiente',
        'cancelled': 'Cancelado'
    };
    return labels[status] || status;
}
