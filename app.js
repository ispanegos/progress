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
        <div style="text-align:right">
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

    ${modalsHtml(w)}
  `;

  wireEvents();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Weight chart (SVG, iniziale → obiettivo, gridlines every 5kg) ──

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

  // Gridlines + labels every 5kg
  const gridStart = Math.ceil(yMin / 5) * 5;
  let grid = '';
  for (let v = gridStart; v <= yMax; v += 5) {
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

  const dots = allPoints.map((p, i) => p.goal
    ? `<circle cx="${px(i).toFixed(1)}" cy="${py(p.value).toFixed(1)}" r="4" fill="var(--black2)" stroke="var(--lime)" stroke-width="2"></circle>`
    : `<circle cx="${px(i).toFixed(1)}" cy="${py(p.value).toFixed(1)}" r="3.5" fill="var(--lime)" stroke="var(--black2)" stroke-width="1.5"></circle>`
  ).join('');

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
