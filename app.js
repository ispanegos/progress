// ============================================================
// PROGRESS — App
// ============================================================
import {
  supabase, getSession, onAuthChange, signIn, signUp, signOut,
  fetchSettings, saveSettings,
  fetchWeightLogs, addWeightLog, deleteWeightLog,
  fetchFoodEntries, addFoodEntry, deleteFoodEntry,
  fetchActivityEntries, fetchAllActivityKcal, addActivityEntry, deleteActivityEntry,
  today, formatDateIT, fmtNum, el, openModal, closeModal, setupModalClose,
} from './core.js';
import { ING_CATEGORIES, INGREDIENTS } from './ingredients.js';

const root = el('app-root');

let state = {
  settings: null,
  weightLogs: [],
  foodEntries: [],
  activityEntries: [],
  allActivityKcal: 0,
  todayActivityKcal: 0,
  selectedIngredient: null,
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
  const [settings, weightLogs, foodEntries, activityEntries, allActivityKcal] = await Promise.all([
    fetchSettings(),
    fetchWeightLogs(),
    fetchFoodEntries(todayStr),
    fetchActivityEntries(todayStr),
    fetchAllActivityKcal(),
  ]);
  state.settings = settings;
  state.weightLogs = weightLogs;
  state.foodEntries = foodEntries;
  state.activityEntries = activityEntries;
  state.allActivityKcal = allActivityKcal;
  state.todayActivityKcal = activityEntries.reduce((s, r) => s + (r.kcal || 0), 0);
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

  const kcalToGoal = firstWeight && weightGoal ? Math.max(0, (firstWeight - weightGoal) * 7800) : null;
  const progressPct = kcalToGoal ? Math.min(100, Math.round((state.allActivityKcal / kcalToGoal) * 100)) : 0;

  const foodTotals = state.foodEntries.reduce((acc, e) => {
    acc.kcal += e.kcal || 0;
    acc.protein += e.protein || 0;
    acc.carbs += e.carbs || 0;
    acc.fat += e.fat || 0;
    acc.fiber += e.fiber || 0;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  root.innerHTML = `
    <div class="top-header">
      <div class="brand">PROGRESS<span class="brand-dot">.</span></div>
      <button class="logout-btn" id="logout-btn">Esci</button>
    </div>

    <!-- ═══ CALORIE BRUCIATE ═══ -->
    <div class="card-dark mb-12">
      <div class="card-title">🔥 Calorie bruciate</div>
      <div class="grid-2 mt-8" style="margin-bottom:0">
        <div>
          <div class="text-sm text-gray">Oggi</div>
          <div class="medium-number text-white">${fmtNum(state.todayActivityKcal)}<span class="text-sm text-gray"> kcal</span></div>
        </div>
        <div>
          <div class="text-sm text-gray">Totali di sempre</div>
          <div class="medium-number text-lime">${fmtNum(state.allActivityKcal)}<span class="text-sm text-gray"> kcal</span></div>
        </div>
      </div>
    </div>

    <!-- ═══ PESO ═══ -->
    <div class="card-dark mb-12">
      <div class="flex-between mb-12">
        <div class="card-title" style="margin-bottom:0">⚖️ Peso</div>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm" id="edit-goal-btn">🎯 Obiettivo</button>
          <button class="btn btn-lime btn-sm" id="add-weight-btn">+ Log</button>
        </div>
      </div>
      <div style="display:flex;gap:16px;align-items:flex-end;margin-bottom:16px">
        <div>
          <div class="text-sm text-gray">Attuale</div>
          <div class="big-number text-white">${lastWeight ? fmtNum(lastWeight, 1) : '—'}<span class="text-sm text-gray"> kg</span></div>
        </div>
        ${weightGoal ? `
        <div style="margin-left:auto;text-align:right">
          <div class="text-sm text-gray">Obiettivo</div>
          <div style="font-size:22px;font-weight:800;color:var(--lime)">${fmtNum(weightGoal, 1)} kg</div>
          ${lastWeight ? `<div class="text-sm" style="color:${lastWeight <= weightGoal ? 'var(--lime)' : 'var(--red)'}">${fmtNum(Math.abs(lastWeight - weightGoal), 1)} kg ${lastWeight > weightGoal ? 'ancora' : 'raggiunto 🎉'}</div>` : ''}
        </div>` : ''}
      </div>
      ${renderWeightChart(w)}
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
      <div class="flex-between mb-12">
        <div class="card-title" style="margin-bottom:0">🍽️ Alimentazione oggi</div>
        <button class="btn btn-lime btn-sm" id="add-food-btn">+ Aggiungi</button>
      </div>
      <div class="grid-4 mb-12">
        <div>
          <div class="text-sm text-gray">Kcal</div>
          <div style="font-size:18px;font-weight:800;color:var(--white)">${fmtNum(foodTotals.kcal)}</div>
        </div>
        <div>
          <div class="text-sm text-gray">Prot.</div>
          <div style="font-size:18px;font-weight:800;color:var(--white)">${fmtNum(foodTotals.protein)}g</div>
        </div>
        <div>
          <div class="text-sm text-gray">Carb.</div>
          <div style="font-size:18px;font-weight:800;color:var(--white)">${fmtNum(foodTotals.carbs)}g</div>
        </div>
        <div>
          <div class="text-sm text-gray">Grassi</div>
          <div style="font-size:18px;font-weight:800;color:var(--white)">${fmtNum(foodTotals.fat)}g</div>
        </div>
      </div>
      <div id="food-list">
        ${state.foodEntries.length === 0
          ? `<div class="empty-state">Nessun alimento loggato oggi.</div>`
          : state.foodEntries.map(e => `
            <div class="list-item">
              <div class="list-info">
                <div class="list-name">${escapeHtml(e.name)}</div>
                <div class="list-sub">${e.grams ? fmtNum(e.grams) + ' g · ' : ''}${fmtNum(e.protein)}P ${fmtNum(e.carbs)}C ${fmtNum(e.fat)}G</div>
              </div>
              <div class="list-value">${fmtNum(e.kcal)} kcal</div>
              <button class="del-btn" data-del-food="${e.id}">🗑️</button>
            </div>
          `).join('')}
      </div>
    </div>

    <!-- ═══ ATTIVITÀ ═══ -->
    <div class="card-dark mb-12">
      <div class="flex-between mb-12">
        <div class="card-title" style="margin-bottom:0">🏃 Attività oggi</div>
        <button class="btn btn-lime btn-sm" id="add-activity-btn">+ Aggiungi</button>
      </div>
      <div id="activity-list">
        ${state.activityEntries.length === 0
          ? `<div class="empty-state">Nessuna attività loggata oggi.</div>`
          : state.activityEntries.map(e => `
            <div class="list-item">
              <div class="list-info">
                <div class="list-name">${escapeHtml(e.name)}</div>
              </div>
              <div class="list-value">${fmtNum(e.kcal)} kcal</div>
              <button class="del-btn" data-del-activity="${e.id}">🗑️</button>
            </div>
          `).join('')}
      </div>
    </div>

    ${modalsHtml()}
  `;

  wireEvents();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Weight chart (SVG) ──────────────────────────────────────

function renderWeightChart(logs) {
  if (logs.length < 2) {
    return `<div style="height:70px;display:flex;align-items:center;justify-content:center;color:var(--gray2);font-size:13px">
      ${logs.length === 0 ? 'Nessun dato. Inizia a loggare il peso.' : 'Aggiungi altri log per vedere il grafico.'}
    </div>`;
  }
  const recent = logs.slice(-14);
  const values = recent.map(l => l.value);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const W = 280, H = 70;
  const px = (i) => (i / (recent.length - 1)) * W;
  const py = (v) => H - ((v - min) / (max - min || 1)) * H;
  const points = recent.map((l, i) => `${px(i)},${py(l.value)}`).join(' ');
  const area = `${px(0)},${H} ${points} ${px(recent.length - 1)},${H}`;
  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:70px;display:block" preserveAspectRatio="none">
      <polygon points="${area}" fill="var(--lime)" opacity="0.12"></polygon>
      <polyline points="${points}" fill="none" stroke="var(--lime)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
    </svg>
  `;
}

// ── Modals ───────────────────────────────────────────────────

function modalsHtml() {
  return `
    <!-- Peso -->
    <div class="modal-overlay" id="modal-weight">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Log peso</div>
        <div class="form-group">
          <label class="form-label">Peso (kg)</label>
          <input type="number" step="0.1" class="form-input" id="weight-value" placeholder="es. 95.4">
        </div>
        <div class="form-group">
          <label class="form-label">Data</label>
          <input type="date" class="form-input" id="weight-date" value="${today()}">
        </div>
        <button class="btn btn-lime btn-block" id="save-weight-btn">Salva</button>
      </div>
    </div>

    <!-- Obiettivo -->
    <div class="modal-overlay" id="modal-goal">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Obiettivo peso</div>
        <div class="form-group">
          <label class="form-label">Peso obiettivo (kg)</label>
          <input type="number" step="0.1" class="form-input" id="goal-value" value="${state.settings?.weight_goal ?? ''}" placeholder="es. 90">
        </div>
        <button class="btn btn-lime btn-block" id="save-goal-btn">Salva</button>
      </div>
    </div>

    <!-- Alimentazione -->
    <div class="modal-overlay" id="modal-food">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Aggiungi alimento</div>

        <div class="auth-tabs">
          <button class="auth-tab active" id="food-tab-lib">Dal database</button>
          <button class="auth-tab" id="food-tab-manual">Manuale</button>
        </div>

        <div id="food-lib-panel">
          <div class="search-box">
            <input type="text" class="form-input" id="ing-search" placeholder="Cerca alimento...">
          </div>
          <div id="ing-categories"></div>
          <div class="form-group mt-16" id="ing-grams-group" style="display:none">
            <label class="form-label">Grammi</label>
            <input type="number" class="form-input" id="ing-grams" placeholder="es. 100">
            <div id="ing-preview" class="text-sm text-gray mt-8"></div>
          </div>
        </div>

        <div id="food-manual-panel" style="display:none">
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-input" id="manual-name" placeholder="es. Pizza margherita">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Kcal</label>
              <input type="number" class="form-input" id="manual-kcal" placeholder="0">
            </div>
            <div class="form-group">
              <label class="form-label">Proteine (g)</label>
              <input type="number" class="form-input" id="manual-protein" placeholder="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Carboidrati (g)</label>
              <input type="number" class="form-input" id="manual-carbs" placeholder="0">
            </div>
            <div class="form-group">
              <label class="form-label">Grassi (g)</label>
              <input type="number" class="form-input" id="manual-fat" placeholder="0">
            </div>
          </div>
        </div>

        <button class="btn btn-lime btn-block mt-8" id="save-food-btn">Aggiungi</button>
      </div>
    </div>

    <!-- Attività -->
    <div class="modal-overlay" id="modal-activity">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Aggiungi attività</div>
        <div class="form-group">
          <label class="form-label">Nome attività</label>
          <input type="text" class="form-input" id="activity-name" placeholder="es. Corsa 5km">
        </div>
        <div class="form-group">
          <label class="form-label">Calorie bruciate</label>
          <input type="number" class="form-input" id="activity-kcal" placeholder="es. 350">
        </div>
        <button class="btn btn-lime btn-block" id="save-activity-btn">Aggiungi</button>
      </div>
    </div>
  `;
}

function renderIngredientCategories(filter = '') {
  const f = filter.trim().toLowerCase();
  const box = el('ing-categories');
  if (!box) return;
  const cats = ING_CATEGORIES.map(cat => {
    const items = INGREDIENTS.filter(i => i.categoryId === cat.id && (!f || i.name.toLowerCase().includes(f)));
    if (items.length === 0) return '';
    return `
      <div class="ing-cat ${f ? 'open' : ''}" data-cat="${cat.id}">
        <div class="ing-cat-header" data-toggle-cat="${cat.id}">
          <span>${cat.emoji} ${cat.name}</span>
          <span class="ing-cat-chevron">▾</span>
        </div>
        <div class="ing-cat-body">
          ${items.map(i => `
            <div class="ing-row" data-ing="${i.id}">
              <span class="ing-row-name">${escapeHtml(i.name)}</span>
              <span class="ing-row-kcal">${i.kcalPer100} kcal/100g</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  box.innerHTML = cats || `<div class="empty-state">Nessun alimento trovato.</div>`;

  box.querySelectorAll('[data-toggle-cat]').forEach(headerEl => {
    headerEl.onclick = () => headerEl.closest('.ing-cat').classList.toggle('open');
  });
  box.querySelectorAll('[data-ing]').forEach(rowEl => {
    rowEl.onclick = () => {
      const ing = INGREDIENTS.find(i => i.id === rowEl.dataset.ing);
      state.selectedIngredient = ing;
      el('ing-grams-group').style.display = 'block';
      el('ing-grams').value = '100';
      updateIngPreview();
      el('ing-grams').focus();
    };
  });
}

function updateIngPreview() {
  const ing = state.selectedIngredient;
  const grams = parseFloat(el('ing-grams')?.value) || 0;
  const preview = el('ing-preview');
  if (!ing || !preview) return;
  const k = Math.round(ing.kcalPer100 * grams / 100);
  const p = (ing.proteinPer100 * grams / 100).toFixed(1);
  const c = (ing.carbsPer100 * grams / 100).toFixed(1);
  const f = (ing.fatPer100 * grams / 100).toFixed(1);
  preview.innerHTML = `<strong style="color:var(--lime)">${escapeHtml(ing.name)}</strong> — ${k} kcal · ${p}P ${c}C ${f}G`;
}

// ── Events ───────────────────────────────────────────────────

function wireEvents() {
  el('logout-btn').onclick = async () => { await signOut(); };

  // Weight
  el('add-weight-btn').onclick = () => openModal('modal-weight');
  el('edit-goal-btn').onclick = () => openModal('modal-goal');
  setupModalClose('modal-weight');
  setupModalClose('modal-goal');
  setupModalClose('modal-food');
  setupModalClose('modal-activity');

  el('save-weight-btn').onclick = async () => {
    const value = parseFloat(el('weight-value').value);
    const date = el('weight-date').value || today();
    if (!value) return;
    await addWeightLog(date, value);
    closeModal('modal-weight');
    await refresh();
  };

  el('save-goal-btn').onclick = async () => {
    const value = parseFloat(el('goal-value').value);
    if (!value) return;
    await saveSettings({ weight_goal: value });
    closeModal('modal-goal');
    await refresh();
  };

  // Food
  el('add-food-btn').onclick = () => {
    state.selectedIngredient = null;
    el('ing-grams-group').style.display = 'none';
    el('ing-search').value = '';
    renderIngredientCategories();
    openModal('modal-food');
  };

  el('food-tab-lib').onclick = () => {
    el('food-tab-lib').classList.add('active');
    el('food-tab-manual').classList.remove('active');
    el('food-lib-panel').style.display = 'block';
    el('food-manual-panel').style.display = 'none';
  };
  el('food-tab-manual').onclick = () => {
    el('food-tab-manual').classList.add('active');
    el('food-tab-lib').classList.remove('active');
    el('food-manual-panel').style.display = 'block';
    el('food-lib-panel').style.display = 'none';
  };

  el('ing-search').oninput = (e) => renderIngredientCategories(e.target.value);
  el('ing-grams').oninput = updateIngPreview;

  el('save-food-btn').onclick = async () => {
    const isManual = el('food-manual-panel').style.display !== 'none';
    let entry = null;
    if (isManual) {
      const name = el('manual-name').value.trim();
      const kcal = parseFloat(el('manual-kcal').value) || 0;
      if (!name || !kcal) return;
      entry = {
        date: today(), name,
        grams: null,
        kcal,
        protein: parseFloat(el('manual-protein').value) || 0,
        carbs: parseFloat(el('manual-carbs').value) || 0,
        fat: parseFloat(el('manual-fat').value) || 0,
        fiber: 0,
      };
    } else {
      const ing = state.selectedIngredient;
      const grams = parseFloat(el('ing-grams').value);
      if (!ing || !grams) return;
      entry = {
        date: today(), name: ing.name, grams,
        kcal: Math.round(ing.kcalPer100 * grams / 100),
        protein: +(ing.proteinPer100 * grams / 100).toFixed(1),
        carbs: +(ing.carbsPer100 * grams / 100).toFixed(1),
        fat: +(ing.fatPer100 * grams / 100).toFixed(1),
        fiber: +(ing.fiberPer100 * grams / 100).toFixed(1),
      };
    }
    await addFoodEntry(entry);
    closeModal('modal-food');
    await refresh();
  };

  root.querySelectorAll('[data-del-food]').forEach(btn => {
    btn.onclick = async () => { await deleteFoodEntry(btn.dataset.delFood); await refresh(); };
  });

  // Activity
  el('add-activity-btn').onclick = () => {
    el('activity-name').value = '';
    el('activity-kcal').value = '';
    openModal('modal-activity');
  };

  el('save-activity-btn').onclick = async () => {
    const name = el('activity-name').value.trim();
    const kcal = parseFloat(el('activity-kcal').value);
    if (!name || !kcal) return;
    await addActivityEntry({ date: today(), name, kcal });
    closeModal('modal-activity');
    await refresh();
  };

  root.querySelectorAll('[data-del-activity]').forEach(btn => {
    btn.onclick = async () => { await deleteActivityEntry(btn.dataset.delActivity); await refresh(); };
  });
}
