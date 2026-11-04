/**
 * Quanto Eu Devo? — Gestor Pessoal de Reembolsos & Acertos
 * Integrado ao Supabase (Banco de Dados em Nuvem 24h sem Computador Ligado)
 */

// Supabase Configuration
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-X4oHu-FprlgZ9Bx7GdeHQ_-jB7JgW3';
let supabaseClient = null;

// Default demo settings & expenses
const DEFAULT_SETTINGS = {
  personName: "Minha Mãe",
  payday: 1,
  supabaseUrl: ""
};

function getRecentDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const DEFAULT_EXPENSES = [
  {
    id: "exp_1",
    title: "Farmácia - Remédios e Vitamina C",
    amount: 48.90,
    date: getRecentDate(4),
    category: "saude",
    payer: "Minha Mãe",
    notes: "Passou na farmácia voltando do trabalho",
    isPaid: false,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: "exp_2",
    title: "Uber - Ida para compromisso",
    amount: 32.50,
    date: getRecentDate(2),
    category: "transporte",
    payer: "Minha Mãe",
    notes: "Cartão dela estava cadastrado",
    isPaid: false,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: "exp_3",
    title: "Almoço / Lanche da tarde",
    amount: 24.00,
    date: getRecentDate(1),
    category: "alimentacao",
    payer: "Minha Mãe",
    notes: "Pix adiantado na hora do almoço",
    isPaid: false,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: "exp_4",
    title: "Itens de higiene no Supermercado",
    amount: 39.80,
    date: getRecentDate(7),
    category: "mercado",
    payer: "Minha Mãe",
    notes: "Shampoo e desodorante inclusos nas compras dela",
    isPaid: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
  }
];

// Categories Configuration
const CATEGORIES = {
  alimentacao: {
    label: "Alimentação",
    icon: "utensils",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/20"
  },
  saude: {
    label: "Saúde / Farmácia",
    icon: "heart-pulse",
    badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/20"
  },
  transporte: {
    label: "Transporte / Uber",
    icon: "car",
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/20"
  },
  mercado: {
    label: "Supermercado",
    icon: "shopping-cart",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
  },
  compras: {
    label: "Compras / Roupas",
    icon: "shopping-bag",
    badgeClass: "bg-purple-500/10 text-purple-300 border-purple-500/20"
  },
  contas: {
    label: "Contas & Boletos",
    icon: "zap",
    badgeClass: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
  },
  outros: {
    label: "Outros",
    icon: "tag",
    badgeClass: "bg-slate-500/10 text-slate-300 border-slate-500/20"
  }
};

// State Variables
let expenses = [];
let settings = { ...DEFAULT_SETTINGS };
let currentFilter = 'pending';
let currentQuickPayer = 'Minha Mãe';
let confirmCallback = null;

// Currency Formatter
const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2
});

function formatCurrency(val) {
  return brlFormatter.format(Number(val) || 0);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

function parseMoneyInput(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).replace(/[R$\s]/g, '');
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// --- Data Loading & Supabase Connection ---
async function loadData() {
  try {
    const savedSettings = localStorage.getItem('quanto_eu_devo_settings');
    if (savedSettings) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    const savedExpenses = localStorage.getItem('quanto_eu_devo_expenses');
    if (savedExpenses) expenses = JSON.parse(savedExpenses);
    else expenses = [...DEFAULT_EXPENSES];
  } catch (e) {
    expenses = [...DEFAULT_EXPENSES];
    settings = { ...DEFAULT_SETTINGS };
  }

  // Check URL query parameters for Supabase URL (e.g. ?supabase=https://xyz.supabase.co)
  const urlParams = new URLSearchParams(window.location.search);
  const paramUrl = urlParams.get('supabase');
  if (paramUrl) {
    settings.supabaseUrl = paramUrl;
    saveSettings();
  }

  // If Supabase URL is set, connect to Supabase
  if (settings.supabaseUrl && window.supabase) {
    initSupabase(settings.supabaseUrl);
  } else {
    updateSyncBadge(false, 'Conecte ao Supabase');
  }
}

async function initSupabase(url) {
  try {
    if (!window.supabase) {
      console.warn('Supabase JS library not loaded yet');
      return;
    }
    supabaseClient = window.supabase.createClient(url, SUPABASE_PUBLISHABLE_KEY);
    updateSyncBadge(true, '⚡ Supabase Nuvem 24h');

    // Fetch initial data from Supabase
    await loadSupabaseExpenses();

    // Setup Realtime Subscription
    supabaseClient
      .channel('public:expenses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload) => {
        loadSupabaseExpenses();
      })
      .subscribe();
  } catch (err) {
    console.error('Erro ao conectar no Supabase:', err);
    updateSyncBadge(false, 'Erro Supabase');
  }
}

async function loadSupabaseExpenses() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return;
    }

    if (data) {
      expenses = data.map(item => ({
        id: item.id,
        title: item.title,
        amount: parseFloat(item.amount) || 0,
        date: item.date,
        category: item.category || 'outros',
        payer: item.payer || 'Minha Mãe',
        notes: item.notes || '',
        isPaid: !!item.is_paid,
        createdAt: item.created_at
      }));
      localStorage.setItem('quanto_eu_devo_expenses', JSON.stringify(expenses));
      calculatePaydayInfo();
      updateMetrics();
      renderExpenses();
    }
  } catch (e) {
    console.error('Erro ao carregar dados do Supabase:', e);
  }
}

function updateSyncBadge(isConnected, text) {
  const badge = document.getElementById('syncStatusBadge');
  const txt = document.getElementById('syncStatusText');
  if (!badge || !txt) return;

  txt.textContent = text;
  if (isConnected) {
    badge.className = 'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  } else {
    badge.className = 'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-pointer';
    badge.onclick = openSettingsModal;
  }
}

function saveExpenses() {
  localStorage.setItem('quanto_eu_devo_expenses', JSON.stringify(expenses));
}

function saveSettings() {
  localStorage.setItem('quanto_eu_devo_settings', JSON.stringify(settings));
}

// --- Payday Countdown ---
function calculatePaydayInfo() {
  const today = new Date();
  const day = today.getDate();
  const targetDay = parseInt(settings.payday) || 1;

  let targetDate = new Date(today.getFullYear(), today.getMonth(), targetDay);
  if (day > targetDay) {
    targetDate = new Date(today.getFullYear(), today.getMonth() + 1, targetDay);
  }

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const person = settings.personName || 'sua mãe';
  const personCapitalized = person.charAt(0).toUpperCase() + person.slice(1);

  const badgeEl = document.getElementById('targetPersonBadge');
  if (badgeEl) badgeEl.textContent = personCapitalized;

  const bannerPersonEl = document.getElementById('bannerPersonName');
  if (bannerPersonEl) bannerPersonEl.textContent = person;

  const paddedDay = String(targetDay).padStart(2, '0');
  const summaryEl = document.getElementById('paydaySummaryText');
  if (summaryEl) {
    summaryEl.innerHTML = `Você recebe <strong class="text-white">dia ${paddedDay}</strong> para acertar as contas com <strong class="text-indigo-300">${person}</strong>.`;
  }

  const countdownBadge = document.getElementById('countdownDaysBadge');
  if (countdownBadge) {
    if (diffDays <= 0) {
      countdownBadge.textContent = `É hoje! (Dia ${paddedDay})`;
      countdownBadge.className = 'text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold';
    } else if (diffDays === 1) {
      countdownBadge.textContent = `É amanhã! (Dia ${paddedDay})`;
      countdownBadge.className = 'text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold';
    } else {
      countdownBadge.textContent = `Faltam ${diffDays} dias para o acerto`;
      countdownBadge.className = 'text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold';
    }
  }
}

// --- Metrics Calculation ---
function updateMetrics() {
  let pendingTotal = 0;
  let pendingCount = 0;
  let paidTotal = 0;
  let paidCount = 0;

  expenses.forEach(item => {
    const val = Number(item.amount) || 0;
    if (item.isPaid) {
      paidTotal += val;
      paidCount++;
    } else {
      pendingTotal += val;
      pendingCount++;
    }
  });

  const allTotal = pendingTotal + paidTotal;
  const allCount = expenses.length;
  const average = allCount > 0 ? (allTotal / allCount) : 0;

  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setTxt('statPendingTotal', formatCurrency(pendingTotal));
  setTxt('statPendingCount', `${pendingCount} ${pendingCount === 1 ? 'item' : 'itens'}`);

  setTxt('statPaidTotal', formatCurrency(paidTotal));
  setTxt('statPaidCount', `${paidCount} ${paidCount === 1 ? 'item' : 'itens'}`);

  setTxt('statAllTotal', formatCurrency(allTotal));
  setTxt('statAllCount', `${allCount} ${allCount === 1 ? 'lançamento' : 'lançamentos'}`);

  setTxt('statAverage', formatCurrency(average));

  setTxt('tabPendingCount', pendingCount);
  setTxt('tabPaidCount', paidCount);
  setTxt('tabAllCount', allCount);
}

// --- Render List ---
function renderExpenses() {
  const container = document.getElementById('expenseList');
  const emptyState = document.getElementById('emptyState');
  if (!container) return;

  const searchInput = document.getElementById('searchInput');
  const searchVal = searchInput ? (searchInput.value || '').toLowerCase().trim() : '';

  const catSelect = document.getElementById('categoryFilter');
  const categoryVal = catSelect ? catSelect.value : 'all';

  const sortSelect = document.getElementById('sortFilter');
  const sortVal = sortSelect ? sortSelect.value : 'date-desc';

  let filtered = expenses.filter(item => {
    if (currentFilter === 'pending' && item.isPaid) return false;
    if (currentFilter === 'paid' && !item.isPaid) return false;
    if (categoryVal !== 'all' && item.category !== categoryVal) return false;

    if (searchVal) {
      const matchTitle = (item.title || '').toLowerCase().includes(searchVal);
      const matchNotes = (item.notes || '').toLowerCase().includes(searchVal);
      const matchPayer = (item.payer || '').toLowerCase().includes(searchVal);
      if (!matchTitle && !matchNotes && !matchPayer) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (sortVal === 'date-desc') return new Date(b.date || 0) - new Date(a.date || 0);
    if (sortVal === 'date-asc') return new Date(a.date || 0) - new Date(b.date || 0);
    if (sortVal === 'amount-desc') return (b.amount || 0) - (a.amount || 0);
    if (sortVal === 'amount-asc') return (a.amount || 0) - (b.amount || 0);
    return 0;
  });

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    refreshIcons();
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  container.innerHTML = filtered.map(item => {
    const cat = CATEGORIES[item.category] || CATEGORIES.outros;
    const isPaid = !!item.isPaid;

    return `
      <div 
        data-id="${item.id}" 
        class="expense-row group relative glass-card rounded-2xl p-4 sm:p-4.5 border ${
          isPaid 
            ? 'border-emerald-500/15 bg-slate-900/40 opacity-75' 
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/80 shadow-md hover:shadow-indigo-500/5'
        } transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        
        <!-- Left: Checkbox + Title & Details -->
        <div class="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
          
          <button 
            type="button"
            onclick="toggleItemPaid('${item.id}', event)"
            title="${isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}"
            class="mt-1 sm:mt-0 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
              isPaid 
                ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/40' 
                : 'border-slate-600 hover:border-indigo-400 bg-slate-950/60 text-transparent hover:text-indigo-400/40'
            }">
            <i data-lucide="check" class="w-4 h-4 stroke-[3]"></i>
          </button>

          <div class="flex-1 min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded-md border font-medium flex items-center gap-1 shrink-0 ${cat.badgeClass}">
                <i data-lucide="${cat.icon}" class="w-3 h-3"></i>
                ${cat.label}
              </span>

              <h4 class="text-sm font-semibold truncate ${
                isPaid ? 'line-through text-slate-400 font-medium' : 'text-slate-100'
              }">
                ${escapeHtml(item.title)}
              </h4>
            </div>

            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span class="flex items-center gap-1 text-slate-400">
                <i data-lucide="calendar" class="w-3 h-3 text-slate-500"></i>
                ${formatDate(item.date)}
              </span>

              ${item.payer ? `
                <span class="flex items-center gap-1 text-indigo-300/80 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/10">
                  <i data-lucide="user" class="w-3 h-3"></i>
                  ${escapeHtml(item.payer)}
                </span>
              ` : ''}

              ${item.notes ? `
                <span class="text-slate-400 italic truncate max-w-xs sm:max-w-md">
                  "${escapeHtml(item.notes)}"
                </span>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Right: Amount & Quick Actions -->
        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-slate-800/60 sm:border-t-0">
          
          <div class="text-right">
            <div class="text-base sm:text-lg font-bold tracking-tight ${
              isPaid ? 'text-emerald-400/80 line-through' : 'text-white'
            }">
              ${formatCurrency(item.amount)}
            </div>
            <div class="text-[10px] uppercase font-semibold tracking-wider ${
              isPaid ? 'text-emerald-400' : 'text-rose-400'
            }">
              ${isPaid ? 'Pago / Quitado' : 'Pendente'}
            </div>
          </div>

          <div class="flex items-center gap-1 text-slate-400">
            <button 
              type="button" 
              onclick="openEditExpenseModal('${item.id}')"
              title="Editar este gasto"
              class="p-2 rounded-lg hover:bg-slate-800 hover:text-indigo-300 transition-colors cursor-pointer">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
            </button>
            <button 
              type="button" 
              onclick="confirmDeleteExpense('${item.id}')"
              title="Excluir este gasto"
              class="p-2 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');

  refreshIcons();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// --- Quick Add To-Do Bar ---
function setQuickPayer(payer) {
  currentQuickPayer = payer;
  const btnMae = document.getElementById('quickPayerToggleMae');
  const btnEu = document.getElementById('quickPayerToggleEu');

  if (payer === 'Minha Mãe') {
    if (btnMae) {
      btnMae.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm transition-all cursor-pointer';
    }
    if (btnEu) {
      btnEu.className = 'px-3 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all cursor-pointer';
    }
  } else {
    if (btnMae) {
      btnMae.className = 'px-3 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all cursor-pointer';
    }
    if (btnEu) {
      btnEu.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm transition-all cursor-pointer';
    }
  }
}

async function handleQuickAdd(event) {
  if (event) event.preventDefault();

  const titleInput = document.getElementById('quickTitle');
  const amountInput = document.getElementById('quickAmount');
  const catInput = document.getElementById('quickCategory');

  const title = titleInput.value.trim();
  const amount = parseMoneyInput(amountInput.value);
  const category = catInput.value || 'alimentacao';

  if (!title) {
    alert('Por favor, informe o que foi pago.');
    titleInput.focus();
    return;
  }

  if (amount <= 0) {
    alert('Por favor, informe um valor em reais maior que zero.');
    amountInput.focus();
    return;
  }

  const newItem = {
    id: 'exp_' + Date.now(),
    title,
    amount,
    date: new Date().toISOString().split('T')[0],
    category,
    payer: currentQuickPayer,
    notes: currentQuickPayer === 'Minha Mãe' ? 'Adicionado por/para a Mãe' : 'Dinheiro solicitado à Mãe',
    isPaid: false,
    createdAt: new Date().toISOString()
  };

  expenses.unshift(newItem);
  saveExpenses();
  updateMetrics();
  renderExpenses();

  titleInput.value = '';
  amountInput.value = '';
  titleInput.focus();

  if (window.confetti) {
    confetti({
      particleCount: 20,
      spread: 40,
      origin: { y: 0.7 }
    });
  }

  // Sync to Supabase
  if (supabaseClient) {
    try {
      await supabaseClient.from('expenses').insert([{
        id: newItem.id,
        title: newItem.title,
        amount: newItem.amount,
        date: newItem.date,
        category: newItem.category,
        payer: newItem.payer,
        notes: newItem.notes,
        is_paid: newItem.isPaid,
        created_at: newItem.createdAt
      }]);
    } catch (e) {
      console.error('Erro ao salvar no Supabase:', e);
    }
  }
}

// --- Filter Tabs ---
function setFilter(filterType) {
  currentFilter = filterType;
  document.querySelectorAll('.filter-tab').forEach(tab => {
    if (tab.dataset.filter === filterType) {
      tab.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
      tab.classList.remove('text-slate-400');
    } else {
      tab.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
      tab.classList.add('text-slate-400');
    }
  });
  renderExpenses();
}

// --- Toggle Paid Status ---
async function toggleItemPaid(id, event) {
  if (event) event.stopPropagation();
  const item = expenses.find(x => x.id === id);
  if (!item) return;

  item.isPaid = !item.isPaid;
  saveExpenses();
  updateMetrics();
  renderExpenses();

  if (item.isPaid && window.confetti) {
    confetti({
      particleCount: 25,
      spread: 50,
      origin: { y: 0.75 },
      colors: ['#10b981', '#6366f1', '#38bdf8']
    });
  }

  if (supabaseClient) {
    try {
      await supabaseClient
        .from('expenses')
        .update({ is_paid: item.isPaid })
        .eq('id', id);
    } catch (e) {
      console.error('Erro ao atualizar status no Supabase:', e);
    }
  }
}

// --- Settle All Pending ---
function settleAllPending() {
  const pendingCount = expenses.filter(x => !x.isPaid).length;
  if (pendingCount === 0) {
    alert('Nenhuma pendência em aberto no momento!');
    return;
  }

  showConfirmModal({
    title: 'Quitar todas as pendências?',
    message: `Você irá marcar ${pendingCount} ${pendingCount === 1 ? 'item' : 'itens'} como pagos/reembolsados para ${settings.personName}.`,
    action: async () => {
      expenses.forEach(item => { item.isPaid = true; });
      saveExpenses();
      updateMetrics();
      renderExpenses();

      if (window.confetti) {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.55 }
        });
      }

      if (supabaseClient) {
        try {
          await supabaseClient
            .from('expenses')
            .update({ is_paid: true })
            .eq('is_paid', false);
        } catch (e) {
          console.error('Erro ao quitar no Supabase:', e);
        }
      }
    }
  });
}

// --- Add / Edit Expense Modal ---
function openAddExpenseModal() {
  document.getElementById('modalTitle').textContent = 'Adicionar Novo Gasto';
  document.getElementById('expenseId').value = '';
  document.getElementById('inputTitle').value = '';
  document.getElementById('inputValue').value = '';
  document.getElementById('inputDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('inputCategory').value = 'alimentacao';
  document.getElementById('inputPayer').value = settings.personName || 'Minha Mãe';
  document.getElementById('inputNotes').value = '';
  document.getElementById('inputIsPaid').checked = false;

  document.getElementById('expenseModal').classList.remove('hidden');
  refreshIcons();
  setTimeout(() => document.getElementById('inputTitle').focus(), 50);
}

function openEditExpenseModal(id) {
  const item = expenses.find(x => x.id === id);
  if (!item) return;

  document.getElementById('modalTitle').textContent = 'Editar Gasto';
  document.getElementById('expenseId').value = item.id;
  document.getElementById('inputTitle').value = item.title;
  document.getElementById('inputValue').value = (item.amount || 0).toFixed(2).replace('.', ',');
  document.getElementById('inputDate').value = item.date;
  document.getElementById('inputCategory').value = item.category || 'outros';
  document.getElementById('inputPayer').value = item.payer || settings.personName;
  document.getElementById('inputNotes').value = item.notes || '';
  document.getElementById('inputIsPaid').checked = !!item.isPaid;

  document.getElementById('expenseModal').classList.remove('hidden');
  refreshIcons();
}

function closeExpenseModal() {
  document.getElementById('expenseModal').classList.add('hidden');
}

function addValueToModal(addVal) {
  const input = document.getElementById('inputValue');
  let current = parseMoneyInput(input.value);
  current += addVal;
  input.value = current.toFixed(2).replace('.', ',');
}

async function handleExpenseFormSubmit(event) {
  if (event) event.preventDefault();

  const id = document.getElementById('expenseId').value;
  const title = document.getElementById('inputTitle').value.trim();
  const amount = parseMoneyInput(document.getElementById('inputValue').value);
  const date = document.getElementById('inputDate').value;
  const category = document.getElementById('inputCategory').value;
  const payer = document.getElementById('inputPayer').value.trim() || settings.personName;
  const notes = document.getElementById('inputNotes').value.trim();
  const isPaid = document.getElementById('inputIsPaid').checked;

  if (!title) {
    alert('Por favor, informe a descrição do gasto.');
    return;
  }

  if (amount <= 0) {
    alert('Por favor, informe um valor em reais maior que zero.');
    return;
  }

  if (id) {
    const index = expenses.findIndex(x => x.id === id);
    if (index !== -1) {
      expenses[index] = {
        ...expenses[index],
        title,
        amount,
        date,
        category,
        payer,
        notes,
        isPaid
      };
      if (supabaseClient) {
        supabaseClient.from('expenses').update({
          title,
          amount,
          date,
          category,
          payer,
          notes,
          is_paid: isPaid
        }).eq('id', id).catch(console.error);
      }
    }
  } else {
    const newItem = {
      id: 'exp_' + Date.now(),
      title,
      amount,
      date,
      category,
      payer,
      notes,
      isPaid,
      createdAt: new Date().toISOString()
    };
    expenses.unshift(newItem);

    if (supabaseClient) {
      supabaseClient.from('expenses').insert([{
        id: newItem.id,
        title: newItem.title,
        amount: newItem.amount,
        date: newItem.date,
        category: newItem.category,
        payer: newItem.payer,
        notes: newItem.notes,
        is_paid: newItem.isPaid,
        created_at: newItem.createdAt
      }]).catch(console.error);
    }
  }

  saveExpenses();
  updateMetrics();
  renderExpenses();
  closeExpenseModal();
}

// --- Delete Item ---
function confirmDeleteExpense(id) {
  const item = expenses.find(x => x.id === id);
  if (!item) return;

  showConfirmModal({
    title: 'Excluir este lançamento?',
    message: `Tem certeza que deseja apagar "${item.title}" no valor de ${formatCurrency(item.amount)}?`,
    action: () => {
      expenses = expenses.filter(x => x.id !== id);
      saveExpenses();
      updateMetrics();
      renderExpenses();

      if (supabaseClient) {
        supabaseClient.from('expenses').delete().eq('id', id).catch(console.error);
      }
    }
  });
}

function showConfirmModal({ title, message, action }) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  confirmCallback = action;
  document.getElementById('confirmModal').classList.remove('hidden');
  refreshIcons();
}

function closeConfirmModal(confirmed) {
  if (confirmed && confirmCallback) {
    confirmCallback();
  }
  document.getElementById('confirmModal').classList.add('hidden');
  confirmCallback = null;
}

// --- Settings Modal ---
function openSettingsModal() {
  document.getElementById('settingsPersonName').value = settings.personName || 'Minha Mãe';
  document.getElementById('settingsPayday').value = settings.payday || 1;
  document.getElementById('settingsSupabaseUrl').value = settings.supabaseUrl || '';
  document.getElementById('settingsModal').classList.remove('hidden');
  refreshIcons();
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function handleSettingsSubmit(event) {
  if (event) event.preventDefault();
  settings.personName = document.getElementById('settingsPersonName').value.trim() || 'Minha Mãe';
  settings.payday = parseInt(document.getElementById('settingsPayday').value) || 1;
  const newUrl = document.getElementById('settingsSupabaseUrl').value.trim();

  const urlChanged = newUrl !== settings.supabaseUrl;
  settings.supabaseUrl = newUrl;
  saveSettings();
  calculatePaydayInfo();
  updateMetrics();
  renderExpenses();
  closeSettingsModal();

  if (urlChanged && newUrl) {
    initSupabase(newUrl);
  }
}

function resetDemoData() {
  if (confirm('Deseja recarregar a lista com os dados de exemplo? Seus itens atuais serão substituídos.')) {
    expenses = [...DEFAULT_EXPENSES];
    settings.personName = DEFAULT_SETTINGS.personName;
    settings.payday = DEFAULT_SETTINGS.payday;
    saveExpenses();
    saveSettings();
    calculatePaydayInfo();
    updateMetrics();
    renderExpenses();
    closeSettingsModal();
  }
}

// --- Connect Phone Modal ---
function openConnectModal() {
  const input = document.getElementById('connectPhoneUrl');
  const qr = document.getElementById('connectQrCode');

  let currentUrl = window.location.href;
  if (window.location.protocol.startsWith('file')) {
    currentUrl = `http://localhost:3000`;
  }

  if (input) input.value = currentUrl;
  if (qr) {
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentUrl)}`;
  }

  document.getElementById('connectModal').classList.remove('hidden');
  refreshIcons();
}

function closeConnectModal() {
  document.getElementById('connectModal').classList.add('hidden');
}

function copyConnectPhoneUrl() {
  const input = document.getElementById('connectPhoneUrl');
  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value).then(() => {
    alert('Link copiado! Envie para sua mãe no WhatsApp.');
  });
}

function sendConnectLinkWhatsApp() {
  const input = document.getElementById('connectPhoneUrl');
  const url = input ? input.value : window.location.href;
  const msg = `Oi mãe! Acesse esse link no seu celular para anotar tudo o que você pagar para mim (sem senha):\n\n${url}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

// --- WhatsApp Extrato ---
function openWhatsAppModal() {
  const pendingItems = expenses.filter(x => !x.isPaid);
  const totalPending = pendingItems.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const person = settings.personName || 'Mãe';
  const payday = String(settings.payday || 1).padStart(2, '0');

  let text = `🧾 *PRESTAÇÃO DE CONTAS / ACERTO*\n`;
  text += `👤 *Para:* ${person}\n`;
  text += `📅 *Previsão do Acerto:* Dia ${payday}\n\n`;

  if (pendingItems.length === 0) {
    text += `Oi ${person}! Passei para avisar que está tudo zerado e pago por aqui! Muito obrigado por sempre me ajudar! ❤️`;
  } else {
    text += `Oi ${person}! Segue a lista detalhada dos gastos que você pagou para mim neste período para o nosso acerto:\n\n`;
    
    pendingItems.forEach((item) => {
      const cat = CATEGORIES[item.category] ? CATEGORIES[item.category].label : 'Geral';
      text += `▫️ *${item.title}*\n`;
      text += `   ↳ Valor: ${formatCurrency(item.amount)} (${cat} • ${formatDate(item.date)})\n`;
      if (item.notes) {
        text += `   ↳ Obs: ${item.notes}\n`;
      }
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *TOTAL A ACERTAR:* ${formatCurrency(totalPending)}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Assim que cair meu dinheiro dia ${payday}, eu já faço a transferência/Pix certinho para você! Te amo e muito obrigado pelo apoio! ❤️`;
  }

  const textarea = document.getElementById('whatsappMessagePreview');
  if (textarea) textarea.value = text;
  document.getElementById('whatsappModal').classList.remove('hidden');
  refreshIcons();
}

function closeWhatsAppModal() {
  document.getElementById('whatsappModal').classList.add('hidden');
}

function copyWhatsAppText() {
  const textarea = document.getElementById('whatsappMessagePreview');
  if (!textarea) return;

  textarea.select();
  textarea.setSelectionRange(0, 99999);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textarea.value).then(showToast);
  } else {
    document.execCommand('copy');
    showToast();
  }

  function showToast() {
    const toast = document.getElementById('copyToast');
    if (toast) {
      toast.style.opacity = '1';
      setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    }
  }
}

function sendWhatsAppDirect() {
  const textarea = document.getElementById('whatsappMessagePreview');
  if (!textarea) return;
  const encoded = encodeURIComponent(textarea.value);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
}

// --- Backup & Restore (JSON) ---
function exportBackupJson() {
  const data = {
    settings,
    expenses,
    exportDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quanto-eu-devo-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackupJson(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.expenses && Array.isArray(parsed.expenses)) {
        expenses = parsed.expenses;
        if (parsed.settings) settings = parsed.settings;
        saveExpenses();
        saveSettings();
        calculatePaydayInfo();
        updateMetrics();
        renderExpenses();
        alert('Backup restaurado com sucesso!');
      } else {
        alert('Arquivo de backup inválido.');
      }
    } catch (err) {
      alert('Erro ao ler o arquivo de backup.');
    }
  };
  reader.readAsText(file);
}

// --- Global Initialization ---
function init() {
  loadData();
  calculatePaydayInfo();
  updateMetrics();
  renderExpenses();
  refreshIcons();

  ['expenseModal', 'settingsModal', 'whatsappModal', 'confirmModal', 'connectModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          el.classList.add('hidden');
        }
      });
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
