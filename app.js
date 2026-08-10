// ============================================================
// PROGRESS — App
// ============================================================
import {
  getSession, onAuthChange, signIn, signUp, signOut,
  fetchSettings, saveSettings,
  fetchWeightLogs, addWeightLog,
  fetchActivityEntries, fetchAllActivityKcal, addActivityEntry, deleteActivityEntry,
  today, fmtNum, el, openModal, closeModal, setupModalClose,
} from './core.js';

const root = el('app-root');

let state = {
  settings: null,
  weightLogs: [],
  activityEntries: [],
  allActivityKcal: 0,
  todayActivityKcal: 0,
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
  const [settings, weightLogs, activityEntries, allActivityKcal] = await Promise.all([
    fetchSettings(),
    fetchWeightLogs(),
    fetchActivityEntries(todayStr),
    fetchAllActivityKcal(),
  ]);
  state.settings = settings;
  state.weightLogs = weightLogs;
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
        <button class="btn btn-lime btn-sm" id="add-weight-btn">+ Log</button>
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

// ── Events ───────────────────────────────────────────────────

function wireEvents() {
  el('logout-btn').onclick = async () => { await signOut(); };

  el('add-weight-btn').onclick = () => openModal('modal-weight');
  el('settings-btn').onclick = () => openModal('modal-settings');
  setupModalClose('modal-weight');
  setupModalClose('modal-settings');
  setupModalClose('modal-activity');

  el('save-weight-btn').onclick = async () => {
    const value = parseFloat(el('weight-value').value);
    const date = el('weight-date').value || today();
    if (!value) return;
    await addWeightLog(date, value);
    closeModal('modal-weight');
    await refresh();
  };

  el('save-settings-btn').onclick = async () => {
    const patch = {
      weight_goal: parseFloat(el('set-weight-goal').value) || null,
    };
    await saveSettings(patch);
    closeModal('modal-settings');
    await refresh();
  };

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
