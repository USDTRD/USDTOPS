// Database en Firebase
let transactions = [];
let currentUser = null;
let userRole = 'admin'; // 'admin' o 'partner'
let firebaseReady = false;

// Esperar a que Firebase esté listo
window.initializeAppAfterAuth = function() {
    currentUser = window.currentUser;
    console.log('Firebase ready, current user:', currentUser.email);
    initializeApp();
};

// Inicializar la app
async function initializeApp() {
    console.log('Initializing app...');
    
    // Primero setup event listeners
    setupEventListeners();
    
    // Mostrar UI inmediatamente
    updateDashboard();
    renderRecentTransactions();
    renderAllTransactions();
    initCharts();
    
    // Luego cargar datos de Firebase
    try {
        await loadUserProfile();
        await loadTransactions();
    } catch (error) {
        console.error('Error loading Firebase data:', error);
        alert('Error al cargar datos. Por favor recarga la página.');
    }
}

async function loadUserProfile() {
    if (!currentUser) {
        console.log('No current user');
        return;
    }
    
    console.log('Loading user profile...');
    
    try {
        if (!window.firebaseDb) {
            console.error('Firebase not ready');
            return;
        }
        
        const usersRef = window.firebaseDb.collection('users');
        const querySnapshot = await usersRef.where('email', '==', currentUser.email).get();
        
        console.log('User query complete, docs found:', querySnapshot.size);
        console.log('User query complete, docs found:', querySnapshot.size);
        
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            userRole = userData.role || 'admin';
            
            console.log('User role:', userRole);
            
            document.getElementById('user-name').textContent = userData.name || currentUser.email.split('@')[0];
            document.getElementById('user-role').textContent = userRole === 'admin' ? 'Admin' : 'Socio';
            
            // Si es socio, ocultar secciones que no debe ver
            if (userRole === 'partner') {
                hideAdminSections();
            }
        } else {
            console.log('No user document found');
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

function hideAdminSections() {
    // Ocultar opciones de menú que no son para el socio
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const page = item.getAttribute('data-page');
        if (page === 'reports') {
            item.style.display = 'none';
        }
    });
}

async function loadTransactions() {
    console.log('Loading transactions...');
    
    try {
        if (!window.firebaseDb) {
            console.error('Firebase not ready for transactions');
            return;
        }
        
        let query = window.firebaseDb.collection('transactions');
        
        // Si es socio, solo cargar transacciones de tipo 'rusos'
        if (userRole === 'partner') {
            console.log('Partner mode - filtering rusos only');
            query = query.where('type', '==', 'rusos');
        }
        
        console.log('Setting up snapshot listener...');
        
        // Escuchar cambios en tiempo real
        query.onSnapshot((snapshot) => {
            console.log('Snapshot received, docs:', snapshot.size);
            transactions = [];
            snapshot.forEach((doc) => {
                transactions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('Transactions loaded:', transactions.length);
            updateDashboard();
            renderRecentTransactions();
            renderAllTransactions();
            initCharts();
        }, (error) => {
            console.error('Snapshot error:', error);
        });
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function logout() {
    if (confirm('¿Cerrar sesión?')) {
        window.firebaseAuth.signOut().then(() => {
            console.log('Logged out successfully');
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error('Error logging out:', error);
        });
    }
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
    const container = document.getElementById('recent-transactions-list');
    if (!container) return;
    
    const recent = transactions.slice(-5).reverse();
    
    container.innerHTML = recent.map(t => createTransactionItem(t, false)).join('');
    
    // Agregar event listeners para expandir/contraer
    container.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // No expandir si se clickeó un botón o está dentro de transaction-actions
            if (e.target.tagName === 'BUTTON' || 
                e.target.closest('button') || 
                e.target.closest('.transaction-actions')) {
                e.stopPropagation();
                return;
            }
            this.classList.toggle('expanded');
        });
    });
}

function createTransactionItem(t, showActions = true) {
    const liquidationBtn = (t.type === 'betcris' || t.type === 'rusos') && !t.liquidated 
        ? `<button class="btn-liquidate" onclick="liquidateTransaction('${t.id}'); return false;">Liquidar</button>`
        : '';
    
    const liquidationStatus = t.liquidated 
        ? '<span class="status-badge completed">Liquidado</span>'
        : (t.type === 'betcris' || t.type === 'rusos' ? '<span class="status-badge pending">Pendiente</span>' : '-');
    
    return `
        <div class="transaction-item" data-id="${t.id}">
            <div class="transaction-summary">
                <div class="transaction-main">
                    <div class="transaction-header">
                        <span class="type-badge ${t.type}">${getTypeLabel(t.type)}</span>
                        <span class="transaction-date">${formatDateShort(t.date)}</span>
                    </div>
                    <div class="transaction-client">${t.client}</div>
                    <div class="transaction-amounts">
                        <span class="transaction-amount">${formatCurrency(t.usdtAmount)}</span>
                        <span class="transaction-profit">+${formatCurrency(t.profit)}</span>
                    </div>
                </div>
                <div class="transaction-arrow">›</div>
            </div>
            <div class="transaction-details">
                <div class="detail-grid">
                    ${t.dopAmount ? `
                    <div class="detail-item">
                        <span class="detail-label">Monto RD$</span>
                        <span class="detail-value">RD$ ${t.dopAmount.toLocaleString()}</span>
                    </div>` : ''}
                    ${t.rate ? `
                    <div class="detail-item">
                        <span class="detail-label">Tasa</span>
                        <span class="detail-value">${t.rate.toFixed(2)}</span>
                    </div>` : ''}
                    <div class="detail-item">
                        <span class="detail-label">Liquidación</span>
                        <span class="detail-value">${liquidationStatus}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Estado</span>
                        <span class="detail-value"><span class="status-badge ${t.status}">${getStatusLabel(t.status)}</span></span>
                    </div>
                    ${t.notes ? `
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <span class="detail-label">Notas</span>
                        <span class="detail-value">${t.notes}</span>
                    </div>` : ''}
                </div>
                ${showActions ? `
                <div class="transaction-actions">
                    ${liquidationBtn}
                    <button class="btn-secondary" onclick="editTransaction('${t.id}'); return false;">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M11.333 2A1.886 1.886 0 0114 4.667l-9 9-3.667 1 1-3.667 9-9z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Editar
                    </button>
                    <button class="btn-secondary" style="color: var(--danger);" onclick="deleteTransaction('${t.id}'); return false;">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Eliminar
                    </button>
                </div>` : ''}
            </div>
        </div>
    `;
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Hoy ' + date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ayer ' + date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('es', { day: '2-digit', month: 'short' });
    }
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
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sorted.map(t => createTransactionItem(t, true)).join('');
    
    // Agregar event listeners para expandir/contraer
    container.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // No expandir si se clickeó un botón o está dentro de transaction-actions
            if (e.target.tagName === 'BUTTON' || 
                e.target.closest('button') || 
                e.target.closest('.transaction-actions')) {
                e.stopPropagation();
                return;
            }
            this.classList.toggle('expanded');
        });
    });
}

async function liquidateTransaction(id) {
    console.log('liquidateTransaction called with id:', id, 'type:', typeof id);
    
    if (confirm('¿Marcar como liquidado?')) {
        try {
            console.log('Attempting to liquidate transaction:', id);
            const docRef = window.firebaseDb.collection('transactions').doc(id);
            console.log('Document reference created');
            
            await docRef.update({
                liquidated: true,
                liquidationDate: new Date().toISOString()
            });
            
            console.log('Transaction liquidated successfully');
        } catch (error) {
            console.error('Error liquidating transaction:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            alert('Error al liquidar la transacción: ' + error.message);
        }
    }
}

function filterTransactions() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('type-filter')?.value || '';
    
    const filtered = transactions.filter(t => {
        const matchesSearch = t.client.toLowerCase().includes(searchTerm) || 
                            (t.notes && t.notes.toLowerCase().includes(searchTerm));
        const matchesType = !typeFilter || t.type === typeFilter;
        return matchesSearch && matchesType;
    });
    
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sorted.map(t => createTransactionItem(t, true)).join('');
    
    // Agregar event listeners para expandir/contraer
    container.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // No expandir si se clickeó un botón o está dentro de transaction-actions
            if (e.target.tagName === 'BUTTON' || 
                e.target.closest('button') || 
                e.target.closest('.transaction-actions')) {
                e.stopPropagation();
                return;
            }
            this.classList.toggle('expanded');
        });
    });
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

async function addTransaction(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const formData = new FormData(event.target);
    const type = formData.get('type');
    
    if (!type) {
        alert('Por favor selecciona un tipo de transacción');
        return;
    }
    
    let transaction = {
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
    
    // Guardar en Firebase (el snapshot listener actualizará automáticamente la UI)
    await saveTransaction(transaction);
    
    closeModal();
    
    return false;
}

async function saveTransaction(transaction) {
    try {
        const transactionsRef = window.firebaseDb.collection('transactions');
        await transactionsRef.add({
            ...transaction,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Transaction saved successfully');
    } catch (error) {
        console.error('Error saving transaction:', error);
        alert('Error al guardar la transacción');
    }
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

async function deleteTransaction(id) {
    console.log('deleteTransaction called with id:', id, 'type:', typeof id);
    
    if (confirm('¿Estás seguro de eliminar esta transacción?')) {
        try {
            console.log('Attempting to delete transaction:', id);
            await window.firebaseDb.collection('transactions').doc(id).delete();
            console.log('Transaction deleted successfully');
        } catch (error) {
            console.error('Error deleting transaction:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            alert('Error al eliminar la transacción: ' + error.message);
        }
    }
}

function generatePDF() {
    alert('Generación de PDF en desarrollo');
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
