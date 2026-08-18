// ============ Savings Jar — Financial Helper ============
const SUPABASE_URL = "https://svutthflxepdyirsgyho.supabase.co";
const SUPABASE_KEY = "sb_publishable_IJ1IAfZxU_lGVB8m2ZB_MA_oCj7tejz";

let supabaseClient = null;

function initSupabase() {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error("Supabase CDN failed to load.");
  }
}

// Grab DOM Elements
const goalNameEl   = document.getElementById('goalName');
const incomeEl     = document.getElementById('income');
const targetEl     = document.getElementById('targetAmount');
const periodValEl  = document.getElementById('periodValue');
const periodUnitEl = document.getElementById('periodUnit');

const calcBtn  = document.getElementById('calcBtn');
const saveBtn  = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const formMsg  = document.getElementById('formMsg');

const resultBox      = document.getElementById('resultBox');
const resultHeadline = document.getElementById('resultHeadline');
const resultNumbers  = document.getElementById('resultNumbers');
const resultAdvice   = document.getElementById('resultAdvice');

const jarFill        = document.getElementById('jarFill');
const jarPercentLabel= document.getElementById('jarPercentLabel');

const historyList  = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');

let lastResult = null;

function formatMoney(num) {
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function toDaysAndMonths(value, unit) {
  let days;
  if (unit === 'days') days = value;
  else if (unit === 'weeks') days = value * 7;
  else days = value * 30;
  const months = days / 30;
  return { days, months };
}

function calculate() {
  if (!formMsg) return;
  formMsg.textContent = '';

  const income = parseFloat(incomeEl.value);
  const target = parseFloat(targetEl.value);
  const periodValue = parseFloat(periodValEl.value);
  const periodUnit = periodUnitEl.value;

  if (!income || income <= 0) {
    formMsg.textContent = 'Please enter a valid monthly income.';
    return;
  }
  if (!target || target <= 0) {
    formMsg.textContent = 'Please enter a valid savings goal amount.';
    return;
  }
  if (!periodValue || periodValue <= 0) {
    formMsg.textContent = 'Please enter a valid time period.';
    return;
  }

  const { days, months } = toDaysAndMonths(periodValue, periodUnit);

  const perDay   = target / days;
  const perMonth = target / months;
  const percentOfIncome = (perMonth / income) * 100;

  let level, levelLabel, advice;

  if (perMonth > income) {
    level = 'danger';
    levelLabel = 'Not achievable right now';
    advice = 'The monthly amount needed exceeds your entire income. Try extending the timeline or lowering the goal.';
  } else if (percentOfIncome < 10) {
    level = 'easy';
    levelLabel = 'Easy, very comfortable';
    advice = 'This is under 10% of your income — an easy pace. You could even raise the goal for more of a challenge.';
  } else if (percentOfIncome < 25) {
    level = 'medium';
    levelLabel = 'Moderate, doable with planning';
    advice = 'You will need to set aside roughly 10–25% of your income. Track daily spending so you don’t fall behind.';
  } else if (percentOfIncome <= 50) {
    level = 'hard';
    levelLabel = 'Challenging, needs strong discipline';
    advice = 'This uses 25–50% of your income. Consider cutting non-essential spending or extending the timeline.';
  } else {
    level = 'hard';
    levelLabel = 'Very difficult, high risk of missing it';
    advice = 'This uses more than half your income. Consider a longer timeline or an additional source of income.';
  }

  lastResult = {
    name: goalNameEl.value.trim() || 'Untitled goal',
    income, target, periodValue, periodUnit,
    perDay, perMonth, percentOfIncome, level, levelLabel, advice
  };

  renderResult(lastResult);
  updateJar(percentOfIncome, level);
}

function renderResult(r) {
  if (!resultBox) return;
  resultBox.className = 'result-box result-' + (r.level || 'empty');

  if (resultHeadline) resultHeadline.textContent = `${r.levelLabel || 'Result'}`;

  if (resultNumbers) {
    resultNumbers.innerHTML = `
      <div class="stat">
        <p class="stat-label">Save per day</p>
        <p class="stat-value">${isFinite(r.perDay) ? formatMoney(r.perDay) : '—'}</p>
      </div>
      <div class="stat">
        <p class="stat-label">Save per month</p>
        <p class="stat-value">${isFinite(r.perMonth) ? formatMoney(r.perMonth) : '—'}</p>
      </div>
    `;
  }

  const pct = Number.isFinite(r.percentOfIncome) ? r.percentOfIncome.toFixed(1) : '—';
  const adviceText = r.advice ? r.advice : 'No advice available for these inputs.';
  if (resultAdvice) resultAdvice.textContent = `That's about ${pct}% of your monthly income — ${adviceText}`;
}

function updateJar(percent, level) {
  if (!jarFill || !jarPercentLabel) return;
  const clamped = Math.max(0, Math.min(percent, 100));
  const jarTop = 12, jarBottom = 140;
  const maxHeight = jarBottom - jarTop;
  const fillHeight = (clamped / 100) * maxHeight;

  jarFill.setAttribute('y', jarBottom - fillHeight);
  jarFill.setAttribute('height', fillHeight);

  const colorMap = {
    easy: 'var(--easy)',
    medium: 'var(--medium)',
    hard: 'var(--hard)',
    danger: 'var(--danger)'
  };
  jarFill.style.fill = colorMap[level] || 'var(--easy)';

  jarPercentLabel.textContent = clamped.toFixed(0) + '% of income';
}

// Supabase DB operations
async function loadGoals() {
  if (!supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient
      .from('Goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching goals:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
}

async function saveGoal() {
  if (!lastResult) {
    if (formMsg) formMsg.textContent = 'Please click Calculate before saving a goal.';
    return;
  }

  if (!supabaseClient) {
    if (formMsg) formMsg.textContent = 'Database connection error.';
    return;
  }

  const { error } = await supabaseClient
    .from('Goals')
    .insert([ lastResult ]);

  if (error) {
    console.error('Error saving:', error.message);
    if (formMsg) {
      formMsg.style.color = 'var(--danger)';
      formMsg.textContent = 'Error saving data: ' + error.message;
    }
    return;
  }

  if (formMsg) {
    formMsg.style.color = 'var(--easy)';
    formMsg.textContent = 'Goal saved successfully!';
  }

  await renderHistory();

  setTimeout(() => {
    if (formMsg) {
      formMsg.textContent = '';
      formMsg.style.color = 'var(--danger)';
    }
  }, 2500);
}

async function renderHistory() {
  if (!historyList || !historyEmpty) return;
  const goals = await loadGoals();
  historyList.innerHTML = '';

  if (goals.length === 0) {
    historyEmpty.style.display = 'block';
    return;
  }
  historyEmpty.style.display = 'none';

  const dotColor = {
    easy: 'var(--easy)',
    medium: 'var(--medium)',
    hard: 'var(--hard)',
    danger: 'var(--danger)'
  };

  historyList.innerHTML = goals.map(g => `
    <li class="history-item">
      <div class="history-main">
        <span class="tag" style="background:${dotColor[g.level] || 'var(--easy)'}"></span>
        <span class="history-name">${escapeHtml(g.name || 'Untitled Goal')}</span>
        <span class="history-detail">${formatMoney(g.perMonth || 0)}/mo · ${g.levelLabel || ''}</span>
      </div>
      <button class="history-del" data-id="${g.id}">Delete</button>
    </li>
  `).join('');

  historyList.querySelectorAll('.history-del').forEach(btn => {
    btn.addEventListener('click', () => deleteGoal(btn.dataset.id));
  });
}

async function deleteGoal(id) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient
    .from('Goals')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting:', error.message);
    return;
  }

  await renderHistory();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function clearForm() {
  if (goalNameEl) goalNameEl.value = '';
  if (incomeEl) incomeEl.value = '';
  if (targetEl) targetEl.value = '';
  if (periodValEl) periodValEl.value = '';
  if (periodUnitEl) periodUnitEl.value = 'months';
  if (formMsg) formMsg.textContent = '';

  lastResult = null;
  if (resultBox) resultBox.className = 'result-box result-empty';
  if (resultHeadline) resultHeadline.textContent = 'Fill in the form and click Calculate to see your savings plan.';
  if (resultNumbers) resultNumbers.innerHTML = '';
  if (resultAdvice) resultAdvice.textContent = '';
  updateJar(0, 'easy');
}

// Bind Events
if (calcBtn) calcBtn.addEventListener('click', calculate);
if (saveBtn) saveBtn.addEventListener('click', saveGoal);
if (clearBtn) clearBtn.addEventListener('click', clearForm);

document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  updateJar(0, 'easy');
  renderHistory();
});
