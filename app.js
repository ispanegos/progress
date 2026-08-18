// ============================================================
// PROGRESS — App
// ============================================================
import {
  getSession, onAuthChange, signIn, signUp, signOut,
  fetchSettings, saveSettings,
  fetchWeightLogs, addWeightLog, deleteWeightLog,
  fetchAllActivityEntries, addActivityEntry, updateActivityEntry, deleteActivityEntry,
  today, formatDateIT, fmtNum, el, openModal, closeModal, setupModalClose,
} from './core.js';

const root = el('app-root');

let state = {
  settings: null,
  weightLogs: [],
  allActivityEntries: [],
  allActivityKcal: 0,
  todayActivityKcal: 0,
  editingActivityId: null,
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
  const [settings, weightLogs, allActivityEntries] = await Promise.all([
    fetchSettings(),
    fetchWeightLogs(),
    fetchAllActivityEntries(),
  ]);
  state.settings = settings;
  state.weightLogs = weightLogs;
  state.allActivityEntries = allActivityEntries;

  const todayStr = today();
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

  const estimatedKgLost = state.allActivityKcal / 7700;

  root.innerHTML = `
    <div class="top-header">
      <div class="brand">PROGRESS<span class="brand-dot">.</span></div>
      <div class="flex gap-8">
        <button class="icon-btn" id="settings-btn" title="Impostazioni">⚙️</button>
        <button class="logout-btn" id="logout-btn">Esci</button>
      </div>
    </div>

    <!-- ═══ PESO ═══ -->
    <div class="card-dark mb-12">
      <div class="flex-between mb-12">
        <div class="card-title" style="margin-bottom:0">⚖️ Peso</div>
        <button class="btn btn-lime btn-sm" id="add-weight-btn">+ Aggiungi</button>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:18px">
        <div>
          <div class="text-sm text-gray">Iniziale</div>
          <div style="font-size:20px;font-weight:800;color:var(--white)">${firstWeight ? fmtNum(firstWeight, 1) : '—'}<span class="text-sm text-gray"> kg</span></div>
        </div>
        <div style="text-align:center">
          <div class="text-sm text-gray">Attuale</div>
          <div class="big-number text-lime">${lastWeight ? fmtNum(lastWeight, 1) : '—'}<span class="text-sm text-gray"> kg</span></div>
        </div>
        <div style="text-align:right">
          <div class="text-sm text-gray">Obiettivo</div>
          <div style="font-size:20px;font-weight:800;color:var(--white)">${weightGoal ? fmtNum(weightGoal, 1) : '—'}<span class="text-sm text-gray"> kg</span></div>
        </div>
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

      <div class="mt-8">
        <div class="section-toggle" id="weight-history-toggle">
          <span>📅 Storico log (${w.length})</span>
          <span class="chevron">▾</span>
        </div>
        <div class="section-body" id="weight-history-body">
          ${weightHistoryRowsHtml(w)}
        </div>
      </div>
    </div>

    <!-- ═══ ATTIVITÀ ═══ -->
    <div class="card-dark mb-12">
      <div class="flex-between mb-12">
        <div class="card-title" style="margin-bottom:0">🏃 Attività</div>
        <button class="btn btn-lime btn-sm" id="add-activity-btn">+ Aggiungi</button>
      </div>

      <div class="grid-2 mb-12">
        <div>
          <div class="text-sm text-gray">Oggi</div>
          <div class="medium-number text-white">${fmtNum(state.todayActivityKcal)}<span class="text-sm text-gray"> kcal</span></div>
        </div>
        <div>
          <div class="text-sm text-gray">Totale di sempre</div>
          <div class="medium-number text-lime">${fmtNum(state.allActivityKcal)}<span class="text-sm text-gray"> kcal</span></div>
        </div>
      </div>

      <div class="mb-12" style="border-top:1px solid var(--black3);padding-top:14px">
        <div class="text-sm text-gray">Stima kg persi (7700 kcal/kg)</div>
        <div class="big-number text-lime">${fmtNum(estimatedKgLost, 1)}<span class="text-sm text-gray"> kg</span></div>
      </div>

      <div class="section-toggle open" id="activity-history-toggle">
        <span>📅 Storico attività (${state.allActivityEntries.length})</span>
        <span class="chevron">▾</span>
      </div>
      <div class="section-body open" id="activity-history-body">
        ${activityHistoryHtml(state.allActivityEntries)}
      </div>
    </div>

    ${modalsHtml()}
  `;

  wireEvents();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Weight chart (SVG, all points labeled) ──────────────────

function renderWeightChart(logs) {
  if (logs.length === 0) {
    return `<div style="height:70px;display:flex;align-items:center;justify-content:center;color:var(--gray2);font-size:13px">Nessun dato. Inizia a loggare il peso.</div>`;
  }
  if (logs.length === 1) {
    return `<div style="height:70px;display:flex;align-items:center;justify-content:center;color:var(--gray2);font-size:13px">Aggiungi altri log per vedere il grafico.</div>`;
  }
  const values = logs.map(l => l.value);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const stepX = 46;
  const leftPad = 24;
  const W = Math.max(280, leftPad * 2 + (logs.length - 1) * stepX);
  const H = 100;
  const topPad = 22, bottomPad = 10;
  const px = (i) => leftPad + i * stepX;
  const py = (v) => topPad + (H - topPad - bottomPad) * (1 - (v - min) / (max - min || 1));
  const points = logs.map((l, i) => `${px(i)},${py(l.value)}`).join(' ');
  const area = `${px(0)},${H - bottomPad} ${points} ${px(logs.length - 1)},${H - bottomPad}`;
  const dots = logs.map((l, i) => `
    <text x="${px(i)}" y="${py(l.value) - 9}" text-anchor="middle" font-size="10" fill="var(--lime)" font-weight="700">${fmtNum(l.value, 1)}</text>
    <circle cx="${px(i)}" cy="${py(l.value)}" r="3.5" fill="var(--lime)" stroke="var(--black2)" stroke-width="1.5"></circle>
  `).join('');
  return `
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
      <svg viewBox="0 0 ${W} ${H}" style="width:${W}px;height:${H}px;display:block" preserveAspectRatio="none">
        <polygon points="${area}" fill="var(--lime)" opacity="0.12"></polygon>
        <polyline points="${points}" fill="none" stroke="var(--lime)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>
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
              <div class="list-info"><div class="list-name">${escapeHtml(e.name)}</div></div>
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

// ── Modals ───────────────────────────────────────────────────

function modalsHtml() {
  return `
    <!-- Peso -->
    <div class="modal-overlay" id="modal-weight">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Aggiungi peso</div>
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

    <!-- Impostazioni -->
    <div class="modal-overlay" id="modal-settings">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Impostazioni</div>
        <div class="form-group">
          <label class="form-label">Peso obiettivo (kg)</label>
          <input type="number" step="0.1" class="form-input" id="set-weight-goal" value="${state.settings?.weight_goal ?? ''}" placeholder="es. 90">
        </div>
        <button class="btn btn-lime btn-block" id="save-settings-btn">Salva</button>
      </div>
    </div>

    <!-- Attività -->
    <div class="modal-overlay" id="modal-activity">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title" id="activity-modal-title">Aggiungi attività</div>
        <div class="form-group">
          <label class="form-label">Nome attività</label>
          <input type="text" class="form-input" id="activity-name" placeholder="es. Corsa 5km">
        </div>
        <div class="form-group">
          <label class="form-label">Data</label>
          <input type="date" class="form-input" id="activity-date" value="${today()}">
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

// ── Events ───────────────────────────────────────────────────

function wireEvents() {
  el('logout-btn').onclick = async () => { await signOut(); };

  el('settings-btn').onclick = () => openModal('modal-settings');
  setupModalClose('modal-weight');
  setupModalClose('modal-settings');
  setupModalClose('modal-activity');

  // Weight
  el('add-weight-btn').onclick = () => {
    el('weight-value').value = '';
    el('weight-date').value = today();
    openModal('modal-weight');
  };

  el('save-weight-btn').onclick = async () => {
    const value = parseFloat(el('weight-value').value);
    const date = el('weight-date').value || today();
    if (!value) return;
    await addWeightLog(date, value);
    closeModal('modal-weight');
    await refresh();
  };

  el('weight-history-toggle').onclick = () => {
    el('weight-history-toggle').classList.toggle('open');
    el('weight-history-body').classList.toggle('open');
  };

  root.querySelectorAll('[data-del-weight]').forEach(btn => {
    btn.onclick = async () => { await deleteWeightLog(btn.dataset.delWeight); await refresh(); };
  });

  // Settings
  el('save-settings-btn').onclick = async () => {
    const patch = {
      weight_goal: parseFloat(el('set-weight-goal').value) || null,
    };
    await saveSettings(patch);
    closeModal('modal-settings');
    await refresh();
  };

  // Activity
  el('add-activity-btn').onclick = () => {
    state.editingActivityId = null;
    el('activity-modal-title').textContent = 'Aggiungi attività';
    el('save-activity-btn').textContent = 'Aggiungi';
    el('activity-name').value = '';
    el('activity-date').value = today();
    el('activity-kcal').value = '';
    openModal('modal-activity');
  };

  el('save-activity-btn').onclick = async () => {
    const name = el('activity-name').value.trim();
    const date = el('activity-date').value || today();
    const kcal = parseFloat(el('activity-kcal').value);
    if (!name || !kcal) return;
    if (state.editingActivityId) {
      await updateActivityEntry(state.editingActivityId, { name, date, kcal });
    } else {
      await addActivityEntry({ date, name, kcal });
    }
    state.editingActivityId = null;
    closeModal('modal-activity');
    await refresh();
  };

  el('activity-history-toggle').onclick = () => {
    el('activity-history-toggle').classList.toggle('open');
    el('activity-history-body').classList.toggle('open');
  };

  root.querySelectorAll('[data-toggle-day]').forEach(headerEl => {
    headerEl.onclick = () => headerEl.closest('.day-group').classList.toggle('open');
  });

  root.querySelectorAll('[data-edit-activity]').forEach(btn => {
    btn.onclick = () => {
      const entry = state.allActivityEntries.find(e => e.id === btn.dataset.editActivity);
      if (!entry) return;
      state.editingActivityId = entry.id;
      el('activity-modal-title').textContent = 'Modifica attività';
      el('save-activity-btn').textContent = 'Salva modifiche';
      el('activity-name').value = entry.name;
      el('activity-date').value = entry.date;
      el('activity-kcal').value = entry.kcal;
      openModal('modal-activity');
    };
  });

  root.querySelectorAll('[data-del-activity]').forEach(btn => {
    btn.onclick = async () => { await deleteActivityEntry(btn.dataset.delActivity); await refresh(); };
  });
}
