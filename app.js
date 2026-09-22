// ============================================================
// PROGRESS — App
// ============================================================
import {
  getSession, onAuthChange, signIn, signUp, signOut,
  fetchSettings, saveSettings,
  fetchWeightLogs, addWeightLog, deleteWeightLog,
  fetchAllActivityEntries, addActivityEntry, updateActivityEntry, deleteActivityEntry,
  fetchStepLogs, upsertStepLog,
  fetchMealsForDate, fetchAllMealsWithItems, addMeal, deleteMeal,
  fetchSnackPresets, addSnackPreset,
  today, addDays, formatDateIT, fmtNum, el, openModal, closeModal, setupModalClose,
} from './core.js';
import { INGREDIENTS } from './ingredients.js';
import {
  CARBOIDRATI, PROTEINE, LEGUMI, VERDURE_OPZIONALI, TOPPINGS, SNACK_PRESETS_DEFAULT,
  buildBreakfast, buildMainMeal, buildPresetItems, totalsOf,
} from './meals.js';

const root = el('app-root');

let state = {
  settings: null,
  weightLogs: [],
  allActivityEntries: [],
  allActivityKcal: 0,
  todayActivityKcal: 0,
  editingActivityId: null,
  activityDraft: null,
  stepLogs: [],
  mealsToday: { colazione: null, pranzo: null, cena: null, spuntino_mattina: null, spuntino_pomeriggio: null },
  allMeals: [],
  snackPresets: [],
  mealBuilder: null,
  breakfastTopping: null,
  snackSlot: null,
  snackSelectedPresetId: null,
  snackCustomName: '',
  snackCustomIngredientId: INGREDIENTS[0].id,
  snackCustomGrams: 100,
};

// ── Boot ─────────────────────────────────────────────────────

onAuthChange((session) => {
  if (session) renderApp();
  else renderAuth();
});

getSession().then((session) => {
  if (session) renderApp();
  else renderAuth();
});

// ── Auth screen ──────────────────────────────────────────────

function renderAuth() {
  root.innerHTML = `
    <div class="auth-screen">
      <div class="auth-logo">
        <div class="brand">PROGRESS<span class="text-lime">.</span></div>
        <div class="tag">Il tuo percorso, in un unico posto.</div>
      </div>

      <div class="auth-tabs">
        <button class="auth-tab active" id="tab-signin">Accedi</button>
        <button class="auth-tab" id="tab-signup">Registrati</button>
      </div>

      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" class="form-input" id="auth-email" placeholder="tu@email.com" autocomplete="email">
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" class="form-input" id="auth-password" placeholder="••••••••" autocomplete="current-password">
      </div>
      <div class="form-error" id="auth-error"></div>
      <button class="btn btn-lime btn-block" id="auth-submit">Accedi</button>
    </div>
  `;

  let mode = 'signin';
  const tabSignin = el('tab-signin');
  const tabSignup = el('tab-signup');
  const submitBtn = el('auth-submit');
  const errBox = el('auth-error');

  function setMode(m) {
    mode = m;
    tabSignin.classList.toggle('active', m === 'signin');
    tabSignup.classList.toggle('active', m === 'signup');
    submitBtn.textContent = m === 'signin' ? 'Accedi' : 'Crea account';
    errBox.textContent = '';
  }

  tabSignin.onclick = () => setMode('signin');
  tabSignup.onclick = () => setMode('signup');

  submitBtn.onclick = async () => {
    const email = el('auth-email').value.trim();
    const password = el('auth-password').value;
    errBox.textContent = '';
    if (!email || !password) {
      errBox.textContent = 'Inserisci email e password.';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = '...';
    const { error } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);
    submitBtn.disabled = false;
    submitBtn.textContent = mode === 'signin' ? 'Accedi' : 'Crea account';
    if (error) {
      errBox.textContent = error.message;
    } else if (mode === 'signup') {
      errBox.style.color = 'var(--lime)';
      errBox.textContent = 'Account creato. Controlla la mail se richiesta conferma, poi accedi.';
    }
  };
}

// ── Main app ─────────────────────────────────────────────────

async function renderApp() {
  root.innerHTML = `<div class="loading-spin">Caricamento...</div>`;
  await loadAllData();
  paintApp();
}

async function loadAllData() {
  const todayStr = today();
  const [settings, weightLogs, allActivityEntries, stepLogs, mealsTodayList, allMeals, snackPresets] = await Promise.all([
    fetchSettings(),
    fetchWeightLogs(),
    fetchAllActivityEntries(),
    fetchStepLogs(),
    fetchMealsForDate(todayStr),
    fetchAllMealsWithItems(),
    fetchSnackPresets(),
  ]);
  state.settings = settings;
  state.weightLogs = weightLogs;
  state.allActivityEntries = allActivityEntries;
  state.stepLogs = stepLogs;
  state.allMeals = allMeals;
  state.snackPresets = snackPresets;

  const mealsIndex = { colazione: null, pranzo: null, cena: null, spuntino_mattina: null, spuntino_pomeriggio: null };
  for (const m of mealsTodayList) mealsIndex[m.type] = m;
  state.mealsToday = mealsIndex;

  state.todayActivityKcal = allActivityEntries
    .filter(e => e.date === todayStr)
    .reduce((s, e) => s + (e.kcal || 0), 0);
  state.allActivityKcal = allActivityEntries.reduce((s, e) => s + (e.kcal || 0), 0);
}

async function refresh() {
  await loadAllData();
  paintApp();
}

function paintApp() {
  const w = state.weightLogs;
  const lastWeight = w.length ? w[w.length - 1].value : null;
  const firstWeight = w.length ? w[0].value : null;
  const weightGoal = state.settings?.weight_goal ?? null;

  const kcalToGoal = firstWeight && weightGoal ? Math.max(0, (firstWeight - weightGoal) * 7700) : null;
  const progressPct = kcalToGoal ? Math.min(100, Math.round((state.allActivityKcal / kcalToGoal) * 100)) : 0;

  const daySummary = computeDaySummary();
  const kcalTarget = state.settings?.kcal_target ?? 2000;
  const kcalPct = Math.min(100, Math.round((daySummary.kcal / kcalTarget) * 100));

  const todaySteps = state.stepLogs.find(l => l.date === today())?.steps ?? null;
  const stepsTarget = state.settings?.steps_target ?? 9000;
  const stepsPct = todaySteps ? Math.min(100, Math.round((todaySteps / stepsTarget) * 100)) : 0;
  const avg7 = avgSteps(stepsInWindow(state.stepLogs, 7));
  const avg30 = avgSteps(stepsInWindow(state.stepLogs, 30));
  const avgAllSteps = avgSteps(state.stepLogs);
  const todayActivities = state.allActivityEntries.filter(e => e.date === today());

  root.innerHTML = `
    <!-- ═══ PESO ═══ -->
    <div class="card-dark mb-12">
      <div class="card-title mb-12">⚖️ Peso</div>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:18px">
        <div>
          <div style="font-size:20px;font-weight:800;color:var(--white)">${firstWeight ? fmtNum(firstWeight, 1) : '—'}<span class="text-sm text-gray"> kg</span></div>
          <div class="text-sm text-gray">Iniziale</div>
        </div>
        <div style="text-align:center;cursor:pointer" id="weight-current-block">
          <div class="big-number text-lime">${lastWeight ? fmtNum(lastWeight, 1) : '—'}<span class="text-sm text-gray"> kg</span></div>
          <div class="text-sm text-gray">Attuale</div>
        </div>
        <div style="text-align:right;cursor:pointer" id="weight-goal-block">
          <div style="font-size:20px;font-weight:800;color:var(--white)">${weightGoal ? fmtNum(weightGoal, 1) : '—'}<span class="text-sm text-gray"> kg</span></div>
          <div class="text-sm text-gray">Obiettivo</div>
        </div>
      </div>

      ${renderWeightChart(w, weightGoal)}

      ${kcalToGoal ? `
        <div class="mt-16">
          <div class="flex-between text-sm text-gray">
            <span>Progresso verso obiettivo</span><span>${progressPct}%</span>
          </div>
          <div class="progress-wrap"><div class="progress-bar" style="width:${progressPct}%"></div></div>
        </div>
      ` : ''}
    </div>

    <!-- ═══ ALIMENTAZIONE ═══ -->
    <div class="card-dark mb-12">
      <div class="card-title mb-12">🍽️ Alimentazione</div>

      <div class="flex-between" style="align-items:flex-end;margin-bottom:8px">
        <div>
          <div class="text-sm text-gray">Oggi</div>
          <div class="medium-number text-lime">${fmtNum(daySummary.kcal)}<span class="text-sm text-gray"> / ${fmtNum(kcalTarget)} kcal</span></div>
        </div>
      </div>
      <div class="progress-wrap mb-12"><div class="progress-bar" style="width:${kcalPct}%"></div></div>

      <div class="grid-3 mb-16">
        <div><div class="text-sm text-gray">Proteine</div><div class="text-sm fw-bold text-white">${fmtNum(daySummary.protein)} g</div></div>
        <div><div class="text-sm text-gray">Carboidrati</div><div class="text-sm fw-bold text-white">${fmtNum(daySummary.carbs)} g</div></div>
        <div><div class="text-sm text-gray">Grassi</div><div class="text-sm fw-bold text-white">${fmtNum(daySummary.fat)} g</div></div>
      </div>

      ${mealRowHtml('colazione', '🥣 Colazione', state.mealsToday.colazione)}
      ${mealRowHtml('pranzo', '🍚 Pranzo', state.mealsToday.pranzo)}
      ${mealRowHtml('cena', '🌙 Cena', state.mealsToday.cena)}
      ${mealRowHtml('spuntino_mattina', '🍎 Spuntino mattina', state.mealsToday.spuntino_mattina)}
      ${mealRowHtml('spuntino_pomeriggio', '🍎 Spuntino pomeriggio', state.mealsToday.spuntino_pomeriggio)}

      <div class="mt-8">
        <div class="section-toggle" id="food-stats-toggle">
          <span>📊 Statistiche alimentari</span>
          <span class="chevron">▾</span>
        </div>
        <div class="section-body" id="food-stats-body">
          ${foodStatsHtml(state.allMeals)}
        </div>
      </div>
    </div>

    <!-- ═══ ATTIVITÀ ═══ -->
    <div class="card-dark mb-12">
      <div class="card-title mb-12">🏃 Attività</div>

      <!-- Passi giornalieri -->
      <div style="cursor:pointer" id="steps-today-block">
        <div class="text-sm text-gray">Passi oggi</div>
        <div class="big-number text-lime">${todaySteps !== null ? fmtNum(todaySteps) : '—'}<span class="text-sm text-gray"> / ${fmtNum(stepsTarget)}</span></div>
      </div>
      <div class="progress-wrap mb-12"><div class="progress-bar" style="width:${stepsPct}%"></div></div>

      <div class="grid-3 mb-12">
        <div><div class="text-sm text-gray">Media 7gg</div><div class="text-sm fw-bold text-white">${avg7 ? fmtNum(avg7) : '—'}</div></div>
        <div><div class="text-sm text-gray">Media 30gg</div><div class="text-sm fw-bold text-white">${avg30 ? fmtNum(avg30) : '—'}</div></div>
        <div><div class="text-sm text-gray">Media totale</div><div class="text-sm fw-bold text-white">${avgAllSteps ? fmtNum(avgAllSteps) : '—'}</div></div>
      </div>

      ${renderStepsChart(state.stepLogs, stepsTarget)}

      <!-- Attività fisica -->
      <div class="flex-between mt-16 mb-12" style="border-top:1px solid var(--black3);padding-top:14px">
        <div class="card-title" style="margin-bottom:0">Attività fisica</div>
        <button class="btn btn-lime btn-sm" id="add-activity-btn">+ Aggiungi</button>
      </div>

      <!-- Riepilogo giornaliero -->
      <div class="meal-summary mb-12">
        <div class="text-sm text-gray mb-8">Riepilogo di oggi</div>
        <div class="text-sm text-white">Passi: ${todaySteps !== null ? fmtNum(todaySteps) : '—'} / ${fmtNum(stepsTarget)}</div>
        ${todayActivities.length ? `
          <div class="text-sm text-white mt-4">Attività: ${todayActivities.map(a => `${escapeHtml(a.name)} — ${fmtNum(a.duration_minutes || 0)} min`).join(', ')}</div>
          <div class="text-sm text-lime mt-4">Calorie attività: ${fmtNum(state.todayActivityKcal)} kcal</div>
        ` : `
          <div class="text-sm text-gray mt-4">Nessuna attività registrata</div>
        `}
      </div>

      <div class="section-toggle" id="activity-history-toggle">
        <span>📅 Storico attività (${state.allActivityEntries.length})</span>
        <span class="chevron">▾</span>
      </div>
      <div class="section-body" id="activity-history-body">
        ${activityHistoryHtml(state.allActivityEntries)}
      </div>

      <!-- Statistiche -->
      <div class="mt-8">
        <div class="section-toggle" id="activity-stats-toggle">
          <span>📊 Statistiche attività</span>
          <span class="chevron">▾</span>
        </div>
        <div class="section-body" id="activity-stats-body">
          ${activityStatsHtml()}
        </div>
      </div>
    </div>

    <button class="btn btn-ghost btn-block" id="logout-btn">Esci</button>

    ${modalsHtml(w)}
  `;

  wireEvents();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Weight chart (SVG, iniziale → obiettivo, gridlines every 10kg) ──

function renderWeightChart(logs, weightGoal) {
  const hasGoal = weightGoal !== null && weightGoal !== undefined && !isNaN(weightGoal);

  if (logs.length === 0) {
    return `<div class="weight-chart-empty">Nessun dato. Registra il tuo peso per iniziare.</div>`;
  }
  if (logs.length === 1 && !hasGoal) {
    return `<div class="weight-chart-empty">Registra un altro peso per vedere l'andamento.</div>`;
  }

  const allPoints = hasGoal ? [...logs, { value: weightGoal, goal: true }] : logs;
  const n = allPoints.length;

  const values = allPoints.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const yMin = min - range * 0.12;
  const yMax = max + range * 0.12;

  const W = 300, H = 120;
  const topPad = 12, bottomPad = 12;
  const px = (i) => (i / (n - 1)) * W;
  const py = (v) => topPad + (H - topPad - bottomPad) * (1 - (v - yMin) / (yMax - yMin));

  // Gridlines + labels every 10kg (le "decine")
  const gridStart = Math.ceil(yMin / 10) * 10;
  let grid = '';
  for (let v = gridStart; v <= yMax; v += 10) {
    const y = py(v);
    const labelY = Math.max(9, y - 4);
    grid += `
      <line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="var(--black3)" stroke-width="1"></line>
      <text x="4" y="${labelY.toFixed(1)}" font-size="9" fill="var(--gray2)">${v}</text>
    `;
  }

  const realCount = logs.length;
  const linePts = logs.map((l, i) => `${px(i).toFixed(1)},${py(l.value).toFixed(1)}`).join(' ');
  const areaPts = `${px(0).toFixed(1)},${(H - bottomPad).toFixed(1)} ${allPoints.map((p, i) => `${px(i).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ')} ${px(n - 1).toFixed(1)},${(H - bottomPad).toFixed(1)}`;

  const goalSegment = hasGoal
    ? `<line x1="${px(realCount - 1).toFixed(1)}" y1="${py(logs[realCount - 1].value).toFixed(1)}" x2="${px(n - 1).toFixed(1)}" y2="${py(weightGoal).toFixed(1)}" stroke="var(--lime)" stroke-width="2" stroke-dasharray="4,4"></line>`
    : '';

  // Con pochi log si etichetta ogni puntino; quando sono tanti, solo quelli
  // vicini a una decina (come le etichette sull'asse) per non affollare il grafico.
  const manyLogs = realCount > 10;
  const isNearDecade = (v) => Math.abs(v - Math.round(v / 10) * 10) < 0.5;

  const dots = allPoints.map((p, i) => {
    const cx = px(i).toFixed(1);
    const cy = py(p.value).toFixed(1);
    if (p.goal) {
      return `<circle cx="${cx}" cy="${cy}" r="4" fill="var(--black2)" stroke="var(--lime)" stroke-width="2"></circle>`;
    }
    const showLabel = !manyLogs || isNearDecade(p.value);
    const label = showLabel
      ? `<text x="${cx}" y="${(py(p.value) - 9).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--lime)" font-weight="700">${fmtNum(p.value, 1)}</text>`
      : '';
    return `${label}<circle cx="${cx}" cy="${cy}" r="3.5" fill="var(--lime)" stroke="var(--black2)" stroke-width="1.5"></circle>`;
  }).join('');

  return `
    <div class="weight-chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" class="weight-chart-svg">
        ${grid}
        <polygon points="${areaPts}" fill="var(--lime)" opacity="0.12"></polygon>
        <polyline points="${linePts}" fill="none" stroke="var(--lime)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>
        ${goalSegment}
        ${dots}
      </svg>
    </div>
  `;
}

// ── Weight history list ──────────────────────────────────────

function weightHistoryRowsHtml(logs) {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  if (sorted.length === 0) return `<div class="empty-state">Nessun log.</div>`;
  return sorted.map(l => `
    <div class="list-item">
      <div class="list-info"><div class="list-name">${formatDateIT(l.date)}</div></div>
      <div class="list-value">${fmtNum(l.value, 1)} kg</div>
      <button class="del-btn" data-del-weight="${l.id}" title="Elimina">🗑️</button>
    </div>
  `).join('');
}

// ── Activity history, grouped by day ─────────────────────────

function groupActivitiesByDay(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date).push(e);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function activityHistoryHtml(entries) {
  const groups = groupActivitiesByDay(entries);
  if (groups.length === 0) return `<div class="empty-state">Nessuna attività registrata.</div>`;
  const todayStr = today();
  return groups.map(([date, dayEntries]) => {
    const dayTotal = dayEntries.reduce((s, e) => s + (e.kcal || 0), 0);
    const isToday = date === todayStr;
    return `
      <div class="day-group ${isToday ? 'open' : ''}" data-day="${date}">
        <div class="day-group-header" data-toggle-day="${date}">
          <span>${formatDateIT(date)}${isToday ? ' · Oggi' : ''}</span>
          <span class="flex gap-8">
            <span class="text-lime fw-bold">${fmtNum(dayTotal)} kcal</span>
            <span class="day-group-chevron">▾</span>
          </span>
        </div>
        <div class="day-group-body">
          ${dayEntries.map(e => `
            <div class="list-item">
              <div class="list-info">
                <div class="list-name">${escapeHtml(e.name)}</div>
                ${e.duration_minutes ? `<div class="list-sub">${fmtNum(e.duration_minutes)} min</div>` : ''}
              </div>
              <div class="list-value">${fmtNum(e.kcal)} kcal</div>
              <button class="del-btn" data-edit-activity="${e.id}" title="Modifica">✏️</button>
              <button class="del-btn" data-del-activity="${e.id}" title="Elimina">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ── Alimentazione: riepilogo giornaliero ──────────────────────

function computeDaySummary() {
  return Object.values(state.mealsToday).filter(Boolean).reduce((t, m) => ({
    kcal: t.kcal + Number(m.kcal),
    protein: t.protein + Number(m.protein),
    carbs: t.carbs + Number(m.carbs),
    fat: t.fat + Number(m.fat),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

const MEAL_LABELS = {
  colazione: 'Colazione', pranzo: 'Pranzo', cena: 'Cena',
  spuntino_mattina: 'Spuntino mattina', spuntino_pomeriggio: 'Spuntino pomeriggio',
};

function mealRowHtml(key, label, meal) {
  const done = !!meal;
  return `
    <div class="meal-row" data-open-meal="${key}">
      <div class="meal-row-info">
        <div class="list-name">${label}</div>
        ${done
          ? `<div class="list-sub text-lime">✓ Fatto · ${fmtNum(meal.kcal)} kcal</div>`
          : `<div class="list-sub">Non registrato</div>`}
      </div>
      ${done
        ? `<button class="del-btn" data-del-meal="${meal.id}" title="Elimina">🗑️</button>`
        : `<span class="text-lime" style="font-size:20px;font-weight:700">›</span>`}
    </div>
  `;
}

// ── Alimentazione: statistiche ─────────────────────────────────

function foodStatsHtml(allMeals) {
  if (allMeals.length === 0) return `<div class="empty-state">Nessun pasto registrato ancora.</div>`;

  const ingredientCounts = new Map();
  const carbCounts = new Map();
  const proteinCounts = new Map();
  let legumiThisWeek = 0;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  for (const meal of allMeals) {
    const items = meal.meal_items || [];
    const roles = new Set(items.map(i => i.role));
    for (const it of items) {
      ingredientCounts.set(it.name, (ingredientCounts.get(it.name) || 0) + 1);
      if (it.role === 'carboidrato') carbCounts.set(it.name, (carbCounts.get(it.name) || 0) + 1);
      if (it.role === 'proteina') proteinCounts.set(it.name, (proteinCounts.get(it.name) || 0) + 1);
    }
    if (roles.has('legumi') && new Date(meal.date) >= weekAgo) legumiThisWeek++;
  }

  const rankList = (map, unit) => [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `<div class="list-item" style="padding:6px 0"><div class="list-info"><div class="list-name">${escapeHtml(name)}</div></div><div class="list-value">${count} ${unit}</div></div>`)
    .join('');

  return `
    <div class="mb-16">
      <div class="text-sm text-gray mb-8">Alimenti più utilizzati</div>
      ${rankList(new Map([...ingredientCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)), 'pasti')}
    </div>
    <div class="mb-16">
      <div class="text-sm text-gray mb-8">Distribuzione carboidrati</div>
      ${carbCounts.size ? rankList(carbCounts, 'pasti') : `<div class="empty-state">Nessun dato.</div>`}
    </div>
    <div class="mb-16">
      <div class="text-sm text-gray mb-8">Distribuzione proteine</div>
      ${proteinCounts.size ? rankList(proteinCounts, 'pasti') : `<div class="empty-state">Nessun dato.</div>`}
    </div>
    <div>
      <div class="text-sm text-gray mb-8">Frequenza legumi</div>
      <div class="text-sm text-white">${legumiThisWeek} pasti questa settimana</div>
    </div>
  `;
}

// ── Colazione: modale ────────────────────────────────────────

function renderBreakfastModal() {
  const items = buildBreakfast(state.breakfastTopping);
  const totals = totalsOf(items);
  const checklistItems = items.filter(i => i.role === 'base' || i.role === 'topping');
  return `
    <div class="modal-handle"></div>
    <div class="modal-title">Colazione</div>
    <div class="mb-16">
      ${checklistItems.map(i => `
        <div class="list-item" style="padding:6px 0">
          <div class="list-info"><div class="list-name">✓ ${escapeHtml(i.name)}</div></div>
          <div class="list-value">${fmtNum(i.grams)} g</div>
        </div>
      `).join('')}
    </div>
    <div class="form-group">
      <label class="form-label">Topping</label>
      <div class="pill-group" id="bf-topping-group">
        ${TOPPINGS.map(t => `<button type="button" class="pill ${state.breakfastTopping === t.id ? 'active' : ''}" data-topping="${t.id}">${escapeHtml(t.name)} · ${t.grams} g</button>`).join('')}
      </div>
    </div>
    <div class="meal-summary">
      <div class="text-lime fw-bold">${fmtNum(totals.kcal)} kcal · P ${fmtNum(totals.protein)}g · C ${fmtNum(totals.carbs)}g · G ${fmtNum(totals.fat)}g</div>
    </div>
    <button class="btn btn-lime btn-block mt-16" id="bf-save-btn">✓ Fatto</button>
  `;
}

function wireBreakfastModal() {
  el('breakfast-sheet').querySelectorAll('[data-topping]').forEach(btn => {
    btn.onclick = () => {
      state.breakfastTopping = state.breakfastTopping === btn.dataset.topping ? null : btn.dataset.topping;
      rerenderBreakfast();
    };
  });
  el('bf-save-btn').onclick = saveBreakfast;
}

function rerenderBreakfast() {
  el('breakfast-sheet').innerHTML = renderBreakfastModal();
  wireBreakfastModal();
}

function openBreakfastModal() {
  state.breakfastTopping = null;
  rerenderBreakfast();
  openModal('modal-breakfast');
}

async function saveBreakfast() {
  const items = buildBreakfast(state.breakfastTopping);
  const totals = totalsOf(items);
  await addMeal(today(), 'colazione', items, totals);
  closeModal('modal-breakfast');
  await refresh();
}

// ── Pranzo / Cena: modale ────────────────────────────────────

// Ordina una lista base secondo un array di id salvato (drag & drop
// dell'utente); gli elementi non ancora ordinati restano in coda, nel loro
// ordine di default.
function orderedByIds(baseList, orderIds) {
  if (!orderIds || !orderIds.length) return baseList;
  const byId = new Map(baseList.map(x => [x.id, x]));
  const ordered = orderIds.map(id => byId.get(id)).filter(Boolean);
  const rest = baseList.filter(x => !orderIds.includes(x.id));
  return [...ordered, ...rest];
}

// Pulsanti "pill" selezionabili E riordinabili trascinandoli (mouse o touch,
// via Pointer Events). Un tocco breve seleziona, un trascinamento riordina.
function makeSortablePills(container, { onTap, onReorder }) {
  let dragEl = null, startX = 0, startY = 0, moved = false;
  const THRESHOLD = 8;

  container.querySelectorAll('.pill[data-sort-id]').forEach(pill => {
    pill.addEventListener('pointerdown', (e) => {
      dragEl = pill;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      try { pill.setPointerCapture(e.pointerId); } catch {}
    });

    pill.addEventListener('pointermove', (e) => {
      if (!dragEl) return;
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) > THRESHOLD) {
        moved = true;
        dragEl.classList.add('dragging');
      }
      if (!moved) return;
      const siblings = [...container.querySelectorAll('.pill[data-sort-id]')].filter(el => el !== dragEl);
      const after = siblings.find(el => {
        const r = el.getBoundingClientRect();
        return e.clientX < r.left + r.width / 2 && e.clientY < r.bottom + 4;
      });
      if (after) container.insertBefore(dragEl, after);
      else container.appendChild(dragEl);
    });

    const finish = () => {
      if (!dragEl) return;
      dragEl.classList.remove('dragging');
      if (moved) {
        onReorder([...container.querySelectorAll('.pill[data-sort-id]')].map(el => el.dataset.sortId));
      } else {
        onTap(dragEl.dataset.sortId);
      }
      dragEl = null;
      moved = false;
    };
    pill.addEventListener('pointerup', finish);
    pill.addEventListener('pointercancel', finish);
  });
}

async function persistCarbOrder(newOrder) {
  state.settings = { ...state.settings, carb_order: newOrder };
  await saveSettings({ carb_order: newOrder });
}

async function persistProteinOrder(newOrder) {
  state.settings = { ...state.settings, protein_order: newOrder };
  await saveSettings({ protein_order: newOrder });
}

function renderMealBuilderModal() {
  const mb = state.mealBuilder;
  const items = buildMainMeal(mb);
  const totals = totalsOf(items);
  const carboidrati = orderedByIds(CARBOIDRATI, state.settings?.carb_order);
  const proteine = orderedByIds(PROTEINE, state.settings?.protein_order);

  return `
    <div class="modal-handle"></div>
    <div class="modal-title">${MEAL_LABELS[mb.type]}</div>

    <div class="form-group">
      <label class="form-label">Carboidrati</label>
      <div class="pill-group" id="mb-carboidrato-group">
        ${carboidrati.map(c => `<button type="button" class="pill ${mb.carboidratoId === c.id ? 'active' : ''}" data-sort-id="${c.id}">${c.name}</button>`).join('')}
      </div>
    </div>

    ${mb.carboidratoId !== 'pane' ? `
      <div class="form-group">
        <div class="flex-between">
          <label class="form-label" style="margin-bottom:0">Aggiungi pane</label>
          <label class="switch"><input type="checkbox" id="mb-pane-toggle" ${mb.hasPane ? 'checked' : ''}><span class="switch-slider"></span></label>
        </div>
        ${mb.hasPane ? `<input type="number" class="form-input mt-8" id="mb-pane-grams" value="${mb.paneGrams}" step="5">` : ''}
      </div>
    ` : ''}

    <div class="form-group">
      <label class="form-label">Proteina</label>
      <div class="pill-group" id="mb-proteina-group">
        ${proteine.map(p => `<button type="button" class="pill ${mb.proteinaId === p.id ? 'active' : ''}" data-sort-id="${p.id}">${p.name}</button>`).join('')}
      </div>
    </div>

    <div class="form-group">
      <div class="flex-between">
        <label class="form-label" style="margin-bottom:0">Aggiungi legumi</label>
        <label class="switch"><input type="checkbox" id="mb-legumi-toggle" ${mb.hasLegumi ? 'checked' : ''}><span class="switch-slider"></span></label>
      </div>
      ${mb.hasLegumi ? `
        <div class="pill-group mt-8" id="mb-legumi-group">
          ${LEGUMI.map(l => `<button type="button" class="pill ${mb.legumeId === l.id ? 'active' : ''}" data-legume="${l.id}">${l.name}</button>`).join('')}
        </div>
      ` : ''}
    </div>

    <div class="form-group">
      <label class="form-label" style="margin-bottom:8px">Verdure — 300 g</label>
      <div class="section-toggle" id="mb-verdure-list-toggle">
        <span>Vedi le verdure che puoi usare</span>
        <span class="chevron">▾</span>
      </div>
      <div class="section-body" id="mb-verdure-list-body">
        <div class="pill-group mt-8">
          ${VERDURE_OPZIONALI.map(v => `<span class="pill pill-static">${escapeHtml(v.name)}</span>`).join('')}
        </div>
      </div>
    </div>

    <div class="meal-summary">
      <div class="text-sm text-gray mb-8">Riepilogo automatico</div>
      ${items.map(i => `
        <div class="list-item" style="padding:6px 0">
          <div class="list-info"><div class="list-name">${escapeHtml(i.name)}</div></div>
          <div class="list-value">${i.unitLabel ? escapeHtml(i.unitLabel) : fmtNum(i.grams) + ' g'}</div>
        </div>
      `).join('')}
      <div class="mt-8 text-lime fw-bold">${fmtNum(totals.kcal)} kcal · P ${fmtNum(totals.protein)}g · C ${fmtNum(totals.carbs)}g · G ${fmtNum(totals.fat)}g</div>
    </div>

    ${mb.type === 'cena' ? `
      <div class="form-group mt-16">
        <div class="flex-between">
          <label class="form-label" style="margin-bottom:0">Copia per pranzo di domani</label>
          <label class="switch"><input type="checkbox" id="mb-copy-tomorrow" ${mb.copyToTomorrow ? 'checked' : ''}><span class="switch-slider"></span></label>
        </div>
      </div>
    ` : ''}

    <button class="btn btn-lime btn-block mt-16" id="mb-save-btn">Salva pasto</button>
  `;
}

function wireMealBuilderModal() {
  const sheet = el('mealbuilder-sheet');
  const mb = state.mealBuilder;

  makeSortablePills(el('mb-carboidrato-group'), {
    onTap: (id) => {
      mb.carboidratoId = id;
      if (id === 'pane') mb.hasPane = false;
      rerenderMealBuilder();
    },
    onReorder: (newOrder) => { persistCarbOrder(newOrder); },
  });

  const paneToggle = document.getElementById('mb-pane-toggle');
  if (paneToggle) paneToggle.onchange = (e) => {
    mb.hasPane = e.target.checked;
    if (mb.hasPane && !mb.paneGrams) mb.paneGrams = 50;
    rerenderMealBuilder();
  };
  const paneInput = document.getElementById('mb-pane-grams');
  if (paneInput) paneInput.oninput = (e) => { mb.paneGrams = parseFloat(e.target.value) || 0; rerenderMealBuilder(); };

  makeSortablePills(el('mb-proteina-group'), {
    onTap: (id) => {
      mb.proteinaId = id;
      rerenderMealBuilder();
    },
    onReorder: (newOrder) => { persistProteinOrder(newOrder); },
  });

  el('mb-legumi-toggle').onchange = (e) => { mb.hasLegumi = e.target.checked; rerenderMealBuilder(); };
  const legumiGroup = document.getElementById('mb-legumi-group');
  if (legumiGroup) legumiGroup.querySelectorAll('[data-legume]').forEach(btn => {
    btn.onclick = () => { mb.legumeId = btn.dataset.legume; rerenderMealBuilder(); };
  });

  el('mb-verdure-list-toggle').onclick = () => {
    el('mb-verdure-list-toggle').classList.toggle('open');
    el('mb-verdure-list-body').classList.toggle('open');
  };

  const copyToggle = document.getElementById('mb-copy-tomorrow');
  if (copyToggle) copyToggle.onchange = (e) => { mb.copyToTomorrow = e.target.checked; };

  el('mb-save-btn').onclick = saveMealBuilder;
}

function rerenderMealBuilder() {
  el('mealbuilder-sheet').innerHTML = renderMealBuilderModal();
  wireMealBuilderModal();
}

function openMealBuilder(type) {
  const defaultProtein = orderedByIds(PROTEINE, state.settings?.protein_order)[0];
  const defaultCarb = orderedByIds(CARBOIDRATI, state.settings?.carb_order)[0];
  state.mealBuilder = {
    type,
    carboidratoId: defaultCarb.id,
    hasPane: false,
    paneGrams: 50,
    proteinaId: defaultProtein.id,
    hasLegumi: false,
    legumeId: LEGUMI[0].id,
    copyToTomorrow: true,
  };
  rerenderMealBuilder();
  openModal('modal-mealbuilder');
}

async function saveMealBuilder() {
  const mb = state.mealBuilder;
  const items = buildMainMeal(mb);
  const totals = totalsOf(items);
  await addMeal(today(), mb.type, items, totals);
  if (mb.type === 'cena' && mb.copyToTomorrow) {
    await addMeal(addDays(today(), 1), 'pranzo', items, totals);
  }
  state.mealBuilder = null;
  closeModal('modal-mealbuilder');
  await refresh();
}

// ── Spuntini: modale ─────────────────────────────────────────

function allSnackPresets() {
  return [
    ...SNACK_PRESETS_DEFAULT,
    ...state.snackPresets.map(p => ({ id: p.id, name: p.name, items: p.items, custom: true })),
  ];
}

function renderSnackModal() {
  const presets = allSnackPresets();
  const selected = presets.find(p => p.id === state.snackSelectedPresetId);
  const items = selected ? buildPresetItems(selected.items) : [];
  const totals = totalsOf(items);

  return `
    <div class="modal-handle"></div>
    <div class="modal-title">${MEAL_LABELS[state.snackSlot]}</div>

    <div class="pill-group mb-16" id="snack-preset-group">
      ${presets.map(p => `<button type="button" class="pill ${state.snackSelectedPresetId === p.id ? 'active' : ''}" data-preset="${p.id}">${escapeHtml(p.name)}${p.custom ? ' 👤' : ''}</button>`).join('')}
    </div>

    ${selected ? `
      <div class="meal-summary mb-16">
        ${items.map(i => `
          <div class="list-item" style="padding:6px 0">
            <div class="list-info"><div class="list-name">${escapeHtml(i.name)}</div></div>
            <div class="list-value">${fmtNum(i.grams)} g</div>
          </div>
        `).join('')}
        <div class="mt-8 text-lime fw-bold">${fmtNum(totals.kcal)} kcal · P ${fmtNum(totals.protein)}g · C ${fmtNum(totals.carbs)}g · G ${fmtNum(totals.fat)}g</div>
      </div>
      <button class="btn btn-lime btn-block mb-16" id="snack-save-btn">✓ Fatto</button>
    ` : ''}

    <div class="section-toggle" id="snack-custom-toggle">
      <span>+ Crea nuovo preset</span>
      <span class="chevron">▾</span>
    </div>
    <div class="section-body" id="snack-custom-body">
      <div class="form-group mt-12">
        <label class="form-label">Nome preset</label>
        <input type="text" class="form-input" id="snack-custom-name" placeholder="es. Yogurt e noci" value="${escapeHtml(state.snackCustomName)}">
      </div>
      <div class="form-group">
        <label class="form-label">Alimento</label>
        <select class="form-input" id="snack-custom-ingredient">
          ${INGREDIENTS.map(i => `<option value="${i.id}" ${state.snackCustomIngredientId === i.id ? 'selected' : ''}>${escapeHtml(i.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Grammi</label>
        <input type="number" class="form-input" id="snack-custom-grams" value="${state.snackCustomGrams}">
      </div>
      <button class="btn btn-ghost btn-block" id="snack-custom-save-btn">Salva preset</button>
    </div>
  `;
}

function wireSnackModal() {
  const sheet = el('snack-sheet');
  sheet.querySelectorAll('[data-preset]').forEach(btn => {
    btn.onclick = () => { state.snackSelectedPresetId = btn.dataset.preset; rerenderSnack(); };
  });
  const saveBtn = document.getElementById('snack-save-btn');
  if (saveBtn) saveBtn.onclick = saveSnack;

  el('snack-custom-toggle').onclick = () => {
    el('snack-custom-toggle').classList.toggle('open');
    el('snack-custom-body').classList.toggle('open');
  };
  el('snack-custom-name').oninput = (e) => { state.snackCustomName = e.target.value; };
  el('snack-custom-ingredient').onchange = (e) => { state.snackCustomIngredientId = e.target.value; };
  el('snack-custom-grams').oninput = (e) => { state.snackCustomGrams = parseFloat(e.target.value) || 0; };
  el('snack-custom-save-btn').onclick = saveCustomSnackPreset;
}

function rerenderSnack() {
  el('snack-sheet').innerHTML = renderSnackModal();
  wireSnackModal();
}

function openSnackModal(slotKey) {
  state.snackSlot = slotKey;
  state.snackSelectedPresetId = null;
  rerenderSnack();
  openModal('modal-snack');
}

async function saveSnack() {
  const presets = allSnackPresets();
  const selected = presets.find(p => p.id === state.snackSelectedPresetId);
  if (!selected) return;
  const items = buildPresetItems(selected.items);
  const totals = totalsOf(items);
  await addMeal(today(), state.snackSlot, items, totals);
  closeModal('modal-snack');
  await refresh();
}

async function saveCustomSnackPreset() {
  const name = state.snackCustomName.trim();
  const grams = state.snackCustomGrams;
  if (!name || !grams) return;
  const items = [{ ingredientId: state.snackCustomIngredientId, grams }];
  const totals = totalsOf(buildPresetItems(items));
  await addSnackPreset(name, items, totals);
  state.snackPresets = await fetchSnackPresets();
  state.snackCustomName = '';
  rerenderSnack();
}

// ── Attività: passi giornalieri ───────────────────────────────

function stepsInWindow(logs, days) {
  const cutoff = addDays(today(), -(days - 1));
  return logs.filter(l => l.date >= cutoff);
}

function avgSteps(logs) {
  if (!logs.length) return null;
  return logs.reduce((s, l) => s + l.steps, 0) / logs.length;
}

function renderStepsChart(logs, target) {
  if (logs.length === 0) {
    return `<div class="weight-chart-empty">Nessun dato. Registra i tuoi passi per iniziare.</div>`;
  }
  const values = logs.map(l => l.steps);
  const maxVal = Math.max(...values, target) * 1.1;
  const W = 300, H = 110;
  const topPad = 8, bottomPad = 8;
  const n = logs.length;
  const gap = W / n;
  const barW = Math.min(18, gap * 0.6);
  const py = (v) => topPad + (H - topPad - bottomPad) * (1 - v / maxVal);

  const bars = logs.map((l, i) => {
    const x = i * gap + (gap - barW) / 2;
    const y = py(l.steps);
    const h = H - bottomPad - y;
    const color = l.steps >= target ? 'var(--lime)' : 'var(--black3)';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="2" fill="${color}"></rect>`;
  }).join('');

  const targetY = py(target).toFixed(1);

  return `
    <div class="weight-chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" class="weight-chart-svg">
        <line x1="0" y1="${targetY}" x2="${W}" y2="${targetY}" stroke="var(--gray2)" stroke-width="1" stroke-dasharray="3,4"></line>
        ${bars}
      </svg>
    </div>
  `;
}

// ── Attività: attività fisica ──────────────────────────────────

const ACTIVITY_TYPES = [
  'Camminata', 'Corsa', 'Palestra / pesi', 'Bicicletta', 'Nuoto',
  'Padel', 'Tennis', 'Calcio', 'Escursione / trekking', 'Altro',
];

function activityStatsHtml() {
  const logs = state.stepLogs;
  const target = state.settings?.steps_target ?? 9000;
  const totalSteps = logs.reduce((s, l) => s + l.steps, 0);
  const daysTargetReached = logs.filter(l => l.steps >= target).length;
  const avgAll = logs.length ? totalSteps / logs.length : 0;

  const entries = state.allActivityEntries;
  const totalMinutes = entries.reduce((s, e) => s + (Number(e.duration_minutes) || 0), 0);

  const grouping = new Map();
  for (const e of entries) {
    const key = (e.type && e.type !== 'Altro') ? e.type : e.name;
    if (!grouping.has(key)) grouping.set(key, { count: 0, minutes: 0 });
    const g = grouping.get(key);
    g.count++;
    g.minutes += Number(e.duration_minutes) || 0;
  }
  const ranking = [...grouping.entries()].sort((a, b) => b[1].count - a[1].count);

  if (logs.length === 0 && entries.length === 0) {
    return `<div class="empty-state">Nessun dato ancora.</div>`;
  }

  return `
    <div class="mb-16">
      <div class="list-item" style="padding:6px 0"><div class="list-info"><div class="list-name">Media passi giornaliera</div></div><div class="list-value">${fmtNum(avgAll)}</div></div>
      <div class="list-item" style="padding:6px 0"><div class="list-info"><div class="list-name">Totale passi</div></div><div class="list-value">${fmtNum(totalSteps)}</div></div>
      <div class="list-item" style="padding:6px 0"><div class="list-info"><div class="list-name">Giorni target raggiunto</div></div><div class="list-value">${daysTargetReached}</div></div>
    </div>
    <div class="mb-16">
      <div class="list-item" style="padding:6px 0"><div class="list-info"><div class="list-name">Numero di attività svolte</div></div><div class="list-value">${entries.length}</div></div>
      <div class="list-item" style="padding:6px 0"><div class="list-info"><div class="list-name">Minuti totali di attività</div></div><div class="list-value">${fmtNum(totalMinutes)} min</div></div>
      <div class="list-item" style="padding:6px 0"><div class="list-info"><div class="list-name">Calorie totali attività</div></div><div class="list-value">${fmtNum(state.allActivityKcal)} kcal</div></div>
      <div class="list-item" style="padding:6px 0"><div class="list-info"><div class="list-name">Stima kg persi (7700 kcal/kg)</div></div><div class="list-value">${fmtNum(state.allActivityKcal / 7700, 1)} kg</div></div>
    </div>
    <div>
      <div class="text-sm text-gray mb-8">Attività più praticate</div>
      ${ranking.length ? ranking.map(([name, g], i) => `
        <div class="list-item" style="padding:6px 0">
          <div class="list-info"><div class="list-name">${i + 1}. ${escapeHtml(name)}</div></div>
          <div class="list-value">${g.count} sessioni · ${fmtNum(g.minutes)} min</div>
        </div>
      `).join('') : `<div class="empty-state">Nessuna attività registrata.</div>`}
    </div>
  `;
}

// ── Attività: modale passi ──────────────────────────────────────

function openStepsModal() {
  const existing = state.stepLogs.find(l => l.date === today());
  el('steps-value').value = existing ? existing.steps : '';
  openModal('modal-steps');
}

async function saveSteps() {
  const steps = parseInt(el('steps-value').value, 10);
  if (isNaN(steps) || steps < 0) return;
  await upsertStepLog(today(), steps);
  closeModal('modal-steps');
  await refresh();
}

// ── Attività: modale attività fisica ────────────────────────────

function renderActivityModal() {
  const d = state.activityDraft;
  const isEdit = !!state.editingActivityId;
  return `
    <div class="modal-handle"></div>
    <div class="modal-title">${isEdit ? 'Modifica attività' : 'Aggiungi attività'}</div>
    <div class="form-group">
      <label class="form-label">Tipo</label>
      <div class="pill-group" id="activity-type-group">
        ${ACTIVITY_TYPES.map(t => `<button type="button" class="pill ${d.type === t ? 'active' : ''}" data-activity-type="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}
      </div>
    </div>
    ${d.type === 'Altro' ? `
      <div class="form-group">
        <label class="form-label">Nome attività</label>
        <input type="text" class="form-input" id="activity-name" placeholder="es. Arrampicata" value="${escapeHtml(d.name || '')}">
      </div>
    ` : ''}
    <div class="form-group">
      <label class="form-label">Data</label>
      <input type="date" class="form-input" id="activity-date" value="${d.date}">
    </div>
    <div class="form-group">
      <label class="form-label">Durata (minuti)</label>
      <input type="number" class="form-input" id="activity-duration" placeholder="es. 45" value="${d.duration}">
    </div>
    <div class="form-group">
      <label class="form-label">Calorie consumate</label>
      <input type="number" class="form-input" id="activity-kcal" placeholder="es. 350" value="${d.kcal}">
    </div>
    <button class="btn btn-lime btn-block" id="save-activity-btn">${isEdit ? 'Salva modifiche' : 'Aggiungi'}</button>
  `;
}

function wireActivityModal() {
  const sheet = el('activity-sheet');
  const d = state.activityDraft;

  sheet.querySelectorAll('[data-activity-type]').forEach(btn => {
    btn.onclick = () => { d.type = btn.dataset.activityType; rerenderActivityModal(); };
  });

  const nameInput = document.getElementById('activity-name');
  if (nameInput) nameInput.oninput = (e) => { d.name = e.target.value; };

  el('activity-date').oninput = (e) => { d.date = e.target.value; };
  el('activity-duration').oninput = (e) => { d.duration = e.target.value; };
  el('activity-kcal').oninput = (e) => { d.kcal = e.target.value; };

  el('save-activity-btn').onclick = saveActivity;
}

function rerenderActivityModal() {
  el('activity-sheet').innerHTML = renderActivityModal();
  wireActivityModal();
}

function openActivityModal(entry = null) {
  if (entry) {
    state.editingActivityId = entry.id;
    state.activityDraft = {
      type: entry.type || 'Altro',
      name: (!entry.type || entry.type === 'Altro') ? entry.name : '',
      date: entry.date,
      duration: entry.duration_minutes ?? '',
      kcal: entry.kcal ?? '',
    };
  } else {
    state.editingActivityId = null;
    state.activityDraft = { type: null, name: '', date: today(), duration: '', kcal: '' };
  }
  rerenderActivityModal();
  openModal('modal-activity');
}

async function saveActivity() {
  const d = state.activityDraft;
  if (!d.type) return;
  const name = d.type === 'Altro' ? (d.name || '').trim() : d.type;
  const date = d.date || today();
  const duration = parseFloat(d.duration) || 0;
  const kcal = parseFloat(d.kcal) || 0;
  if (!name || !kcal) return;
  const payload = { date, name, type: d.type, duration_minutes: duration, kcal };
  if (state.editingActivityId) {
    await updateActivityEntry(state.editingActivityId, payload);
  } else {
    await addActivityEntry(payload);
  }
  state.editingActivityId = null;
  state.activityDraft = null;
  closeModal('modal-activity');
  await refresh();
}

// ── Modals ───────────────────────────────────────────────────

function modalsHtml(weightLogs) {
  return `
    <!-- Peso -->
    <div class="modal-overlay" id="modal-weight">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Registra peso di oggi</div>
        <div class="form-group">
          <label class="form-label">Peso (kg)</label>
          <input type="number" step="0.1" class="form-input" id="weight-value" placeholder="es. 95.4">
        </div>
        <button class="btn btn-lime btn-block" id="save-weight-btn">Salva</button>

        <div class="mt-16">
          <div class="text-sm text-gray mb-8">Storico log (${weightLogs.length})</div>
          <div id="weight-history-body" style="max-height:240px;overflow-y:auto">
            ${weightHistoryRowsHtml(weightLogs)}
          </div>
        </div>
      </div>
    </div>

    <!-- Impostazioni -->
    <div class="modal-overlay" id="modal-settings">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Impostazioni</div>
        <div class="form-group">
          <label class="form-label">Peso obiettivo (kg)</label>
          <input type="number" step="0.1" class="form-input" id="set-weight-goal" value="${state.settings?.weight_goal ?? ''}" placeholder="es. 90">
        </div>
        <div class="form-group">
          <label class="form-label">Target calorico giornaliero (kcal)</label>
          <input type="number" step="50" class="form-input" id="set-kcal-target" value="${state.settings?.kcal_target ?? 2000}" placeholder="es. 2000">
        </div>
        <div class="form-group">
          <label class="form-label">Target passi giornalieri</label>
          <input type="number" step="500" class="form-input" id="set-steps-target" value="${state.settings?.steps_target ?? 9000}" placeholder="es. 9000">
        </div>
        <button class="btn btn-lime btn-block" id="save-settings-btn">Salva</button>
      </div>
    </div>

    <!-- Colazione -->
    <div class="modal-overlay" id="modal-breakfast">
      <div class="modal-sheet" id="breakfast-sheet"></div>
    </div>

    <!-- Pranzo / Cena -->
    <div class="modal-overlay" id="modal-mealbuilder">
      <div class="modal-sheet" id="mealbuilder-sheet"></div>
    </div>

    <!-- Spuntini -->
    <div class="modal-overlay" id="modal-snack">
      <div class="modal-sheet" id="snack-sheet"></div>
    </div>

    <!-- Attività -->
    <div class="modal-overlay" id="modal-activity">
      <div class="modal-sheet" id="activity-sheet"></div>
    </div>

    <!-- Passi -->
    <div class="modal-overlay" id="modal-steps">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Passi di oggi</div>
        <div class="form-group">
          <label class="form-label">Passi</label>
          <input type="number" class="form-input" id="steps-value" placeholder="es. 8500">
        </div>
        <button class="btn btn-lime btn-block" id="save-steps-btn">Salva</button>
      </div>
    </div>
  `;
}

// ── Events ───────────────────────────────────────────────────

function wireEvents() {
  el('logout-btn').onclick = async () => { await signOut(); };

  el('weight-goal-block').onclick = () => openModal('modal-settings');
  setupModalClose('modal-weight');
  setupModalClose('modal-settings');
  setupModalClose('modal-activity');
  setupModalClose('modal-breakfast');
  setupModalClose('modal-mealbuilder');
  setupModalClose('modal-snack');

  // Weight
  el('weight-current-block').onclick = () => {
    el('weight-value').value = '';
    openModal('modal-weight');
  };

  el('save-weight-btn').onclick = async () => {
    const value = parseFloat(el('weight-value').value);
    if (!value) return;
    await addWeightLog(today(), value);
    closeModal('modal-weight');
    await refresh();
  };

  root.querySelectorAll('[data-del-weight]').forEach(btn => {
    btn.onclick = async () => {
      await deleteWeightLog(btn.dataset.delWeight);
      await refresh();
      openModal('modal-weight');
    };
  });

  // Settings
  el('save-settings-btn').onclick = async () => {
    const patch = {
      weight_goal: parseFloat(el('set-weight-goal').value) || null,
      kcal_target: parseFloat(el('set-kcal-target').value) || 2000,
      steps_target: parseFloat(el('set-steps-target').value) || 9000,
    };
    await saveSettings(patch);
    closeModal('modal-settings');
    await refresh();
  };

  // Alimentazione
  root.querySelectorAll('[data-open-meal]').forEach(rowEl => {
    const key = rowEl.dataset.openMeal;
    if (state.mealsToday[key]) return;
    rowEl.onclick = () => {
      if (key === 'colazione') openBreakfastModal();
      else if (key === 'pranzo' || key === 'cena') openMealBuilder(key);
      else openSnackModal(key);
    };
  });

  root.querySelectorAll('[data-del-meal]').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      await deleteMeal(btn.dataset.delMeal);
      await refresh();
    };
  });

  el('food-stats-toggle').onclick = () => {
    el('food-stats-toggle').classList.toggle('open');
    el('food-stats-body').classList.toggle('open');
  };

  // Passi
  setupModalClose('modal-steps');
  el('steps-today-block').onclick = openStepsModal;
  el('save-steps-btn').onclick = saveSteps;

  // Attività fisica
  el('add-activity-btn').onclick = () => openActivityModal();

  el('activity-history-toggle').onclick = () => {
    el('activity-history-toggle').classList.toggle('open');
    el('activity-history-body').classList.toggle('open');
  };

  el('activity-stats-toggle').onclick = () => {
    el('activity-stats-toggle').classList.toggle('open');
    el('activity-stats-body').classList.toggle('open');
  };

  root.querySelectorAll('[data-toggle-day]').forEach(headerEl => {
    headerEl.onclick = () => headerEl.closest('.day-group').classList.toggle('open');
  });

  root.querySelectorAll('[data-edit-activity]').forEach(btn => {
    btn.onclick = () => {
      const entry = state.allActivityEntries.find(e => e.id === btn.dataset.editActivity);
      if (entry) openActivityModal(entry);
    };
  });

  root.querySelectorAll('[data-del-activity]').forEach(btn => {
    btn.onclick = async () => { await deleteActivityEntry(btn.dataset.delActivity); await refresh(); };
  });
}
