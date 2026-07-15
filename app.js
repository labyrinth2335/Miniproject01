// ============ Savings Jar — Financial Helper ============
// Grab all the elements we need
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

const STORAGE_KEY = 'financialHelperGoals';

// Holds the most recent calculation, used when "Save Goal" is clicked
let lastResult = null;

// ---------- Number formatting helper ----------
function formatMoney(num) {
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// ---------- Convert any period into days and months ----------
function toDaysAndMonths(value, unit) {
  let days;
  if (unit === 'days') days = value;
  else if (unit === 'weeks') days = value * 7;
  else days = value * 30; // months
  const months = days / 30;
  return { days, months };
}

// ---------- Main calculation ----------
function calculate() {
  formMsg.textContent = '';

  const income = parseFloat(incomeEl.value);
  const target = parseFloat(targetEl.value);
  const periodValue = parseFloat(periodValEl.value);
  const periodUnit = periodUnitEl.value;

  // Validate inputs
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

  // Classify difficulty level with if / else
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
    advice = 'You will need to set aside roughly 10–25% of your income. Track daily spending so you don\u2019t fall behind.';
  } else if (percentOfIncome <= 50) {
    level = 'hard';
    levelLabel = 'Challenging, needs strong discipline';
    advice = 'This uses 25–50% of your income. Consider cutting non-essential spending or extending the timeline.';
  } else {
    level = 'hard';
    levelLabel = 'Very difficult, high risk of missing it';
    advice = 'This uses more than half your income. Consider a longer timeline or an additional source of income.';
  }

  // Store the latest result for the Save button
  lastResult = {
    name: goalNameEl.value.trim() || 'Untitled goal',
    income, target, periodValue, periodUnit,
    perDay, perMonth, percentOfIncome, level, levelLabel, advice
  };

  renderResult(lastResult);
  updateJar(percentOfIncome, level);
}

// ---------- Render the result box ----------
function renderResult(r) {
  resultBox.className = 'result-box result-' + r.level;

  resultHeadline.textContent = `${r.levelLabel}`;

  resultNumbers.innerHTML = `
    <div class="stat">
      <p class="stat-label">Save per day</p>
      <p class="stat-value">${formatMoney(r.perDay)}</p>
    </div>
    <div class="stat">
      <p class="stat-label">Save per month</p>
      <p class="stat-value">${formatMoney(r.perMonth)}</p>
    </div>
  `;

  resultAdvice.textContent =
    `That's about ${r.percentOfIncome.toFixed(1)}% of your monthly income — ${r.advice || ''}`;
}

// ---------- Update the savings jar graphic ----------
function updateJar(percent, level) {
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

// ---------- Save the current goal to localStorage ----------
function saveGoal() {
  if (!lastResult) {
    formMsg.textContent = 'Please click Calculate before saving a goal.';
    return;
  }
  const goals = loadGoals();
  goals.unshift({ ...lastResult, id: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  formMsg.style.color = 'var(--easy)';
  formMsg.textContent = 'Goal saved successfully.';
  renderHistory();

  setTimeout(() => {
    formMsg.textContent = '';
    formMsg.style.color = 'var(--danger)';
  }, 2500);
}

// ---------- Load goals from localStorage ----------
function loadGoals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// ---------- Render the saved-goals history list ----------
function renderHistory() {
  const goals = loadGoals();
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

  goals.forEach(g => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div class="history-main">
        <span class="tag" style="background:${dotColor[g.level] || 'var(--easy)'}"></span>
        <span class="history-name">${escapeHtml(g.name)}</span>
        <span class="history-detail">${formatMoney(g.perMonth)}/mo · ${g.levelLabel}</span>
      </div>
      <button class="history-del" data-id="${g.id}">Delete</button>
    `;
    historyList.appendChild(li);
  });

  // Bind delete buttons after rendering (simple event delegation)
  historyList.querySelectorAll('.history-del').forEach(btn => {
    btn.addEventListener('click', () => deleteGoal(Number(btn.dataset.id)));
  });
}

function deleteGoal(id) {
  const goals = loadGoals().filter(g => g.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  renderHistory();
}

// ---------- Prevent HTML injection from the goal name ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Reset the form ----------
function clearForm() {
  goalNameEl.value = '';
  incomeEl.value = '';
  targetEl.value = '';
  periodValEl.value = '';
  periodUnitEl.value = 'months';
  formMsg.textContent = '';

  lastResult = null;
  resultBox.className = 'result-box result-empty';
  resultHeadline.textContent = 'Fill in the form and click Calculate to see your savings plan.';
  resultNumbers.innerHTML = '';
  resultAdvice.textContent = '';
  updateJar(0, 'easy');
}

// ---------- Event bindings ----------
calcBtn.addEventListener('click', calculate);
saveBtn.addEventListener('click', saveGoal);
clearBtn.addEventListener('click', clearForm);

// ---------- Initial render on page load ----------
updateJar(0, 'easy');
renderHistory();
