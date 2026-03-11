// Data untuk menyimpan pengeluaran dan perencanaan
let expenses = [];
let planning = [];

// Helper function to format date
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Tab Switching Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Input tabs
    const inputTabBtns = document.querySelectorAll('.input-section .tab-btn');
    const inputTabContents = document.querySelectorAll('.input-section .tab-content');

    inputTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            inputTabBtns.forEach(b => b.classList.remove('active'));
            inputTabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // History tabs
    const historyTabBtns = document.querySelectorAll('.history-tabs .tab-btn');
    const historyTabContents = document.querySelectorAll('.history-section .tab-content');

    historyTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            historyTabBtns.forEach(b => b.classList.remove('active'));
            historyTabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
});

// Fungsi untuk menambah pengeluaran
document.getElementById('expenseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('expenseName').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value;

    if (!name || !amount || !date) return;

    expenses.push({
        id: Date.now(),
        name: name,
        amount: amount,
        date: date
    });

    updateSummary();
    renderExpenseList();
    document.getElementById('expenseForm').reset();
});

// Fungsi untuk menambah perencanaan
document.getElementById('planningForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('planningName').value;
    const amount = parseFloat(document.getElementById('planningAmount').value);
    const date = document.getElementById('planningDate').value;

    if (!name || !amount || !date) return;

    planning.push({
        id: Date.now(),
        name: name,
        amount: amount,
        date: date
    });

    updateSummary();
    renderPlanningList();
    document.getElementById('planningForm').reset();
});

// Fungsi untuk mengupdate ringkasan
function updateSummary() {
    const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalPlanning = planning.reduce((sum, item) => sum + item.amount, 0);
    const remaining = totalPlanning - totalExpense;

    document.getElementById('totalExpense').innerText = `Rp ${totalExpense.toLocaleString()}`;
    document.getElementById('totalPlanning').innerText = `Rp ${totalPlanning.toLocaleString()}`;
    document.getElementById('remainingBalance').innerText = `Rp ${remaining.toLocaleString()}`;
}

// Fungsi untuk menampilkan daftar pengeluaran
function renderExpenseList() {
    const list = document.getElementById('expenseList');
    const emptyState = document.getElementById('expenseEmptyState');
    list.innerHTML = '';

    if (expenses.length === 0) {
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
        expenses.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.name} - Rp ${item.amount.toLocaleString()} - ${formatDate(item.date)}</span>
                <button onclick="deleteExpense(${item.id})">Hapus</button>
            `;
            list.appendChild(li);
        });
    }
}

// Fungsi untuk menampilkan daftar perencanaan
function renderPlanningList() {
    const list = document.getElementById('planningList');
    const emptyState = document.getElementById('planningEmptyState');
    list.innerHTML = '';

    if (planning.length === 0) {
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
        planning.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.name} - Rp ${item.amount.toLocaleString()} - ${formatDate(item.date)}</span>
                <button onclick="deletePlanning(${item.id})">Hapus</button>
            `;
            list.appendChild(li);
        });
    }
}

// Fungsi untuk menghapus pengeluaran
function deleteExpense(id) {
    if (confirm('Yakin ingin menghapus pengeluaran ini?')) {
        expenses = expenses.filter(item => item.id !== id);
        updateSummary();
        renderExpenseList();
    }
}

// Fungsi untuk menghapus perencanaan
function deletePlanning(id) {
    if (confirm('Yakin ingin menghapus perencanaan ini?')) {
        planning = planning.filter(item => item.id !== id);
        updateSummary();
        renderPlanningList();
    }
}

// Simpan data ke localStorage
function saveData() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('planning', JSON.stringify(planning));
}

// Muat data dari localStorage
function loadData() {
    const savedExpenses = localStorage.getItem('expenses');
    const savedPlanning = localStorage.getItem('planning');

    if (savedExpenses) expenses = JSON.parse(savedExpenses);
    if (savedPlanning) planning = JSON.parse(savedPlanning);

    updateSummary();
    renderExpenseList();
    renderPlanningList();
}

function exportData() {
    const data = {
        expenses: expenses,
        planning: planning,
        timestamp: new Date().toISOString()
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pengeluaran.json';
    a.click();
}


// Panggil saat ada perubahan
document.getElementById('expenseForm').addEventListener('submit', function() {
    saveData();
});

document.getElementById('planningForm').addEventListener('submit', function() {
    saveData();
});


// Load data saat halaman dimuat
window.addEventListener('load', function() {
    loadData();
    updateSummary();
    renderExpenseList();
    renderPlanningList();
});
