const state = {
  selectedId: null,
};

const els = {
  role: document.getElementById('role'),
  agentId: document.getElementById('agentId'),
  createForm: document.getElementById('createForm'),
  studentName: document.getElementById('studentName'),
  course: document.getElementById('course'),
  university: document.getElementById('university'),
  refreshApps: document.getElementById('refreshApps'),
  appList: document.getElementById('appList'),
  selectedApp: document.getElementById('selectedApp'),
  transitions: document.getElementById('transitions'),
  actions: document.getElementById('actions'),
  docName: document.getElementById('docName'),
  uploadDoc: document.getElementById('uploadDoc'),
  noteText: document.getElementById('noteText'),
  addNote: document.getElementById('addNote'),
  triggerAi: document.getElementById('triggerAi'),
  aiPanel: document.getElementById('aiPanel'),
  apiResult: document.getElementById('apiResult'),
};

function headers() {
  const role = els.role.value;
  const out = { 'Content-Type': 'application/json', 'X-Role': role };
  if (role === 'agent' && els.agentId.value.trim()) out['X-Agent-Id'] = els.agentId.value.trim();
  return out;
}

function showResult(payload) {
  els.apiResult.textContent = JSON.stringify(payload, null, 2);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, data };
  return data;
}

function actionPayload(action) {
  if (action === 'add_note') return { body: els.noteText.value || 'Manual note from demo UI' };
  if (action === 'add_attachment') return { name: els.docName.value || 'passport' };
  if (action === 'defer') return { deferredIntake: '2027-01' };
  if (action === 'change_course') return { course: 'Updated Course' };
  return {};
}

async function loadApplications() {
  try {
    const data = await api('/applications');
    els.appList.innerHTML = '';
    for (const app of data.data || []) {
      const li = document.createElement('li');
      li.textContent = `${app.studentName} | ${app.currentStage} | ${app.status}`;
      const btn = document.createElement('button');
      btn.textContent = 'Select';
      btn.onclick = () => selectApplication(app._id);
      li.appendChild(btn);
      els.appList.appendChild(li);
    }
    showResult(data);
  } catch (error) {
    showResult(error);
  }
}

async function selectApplication(id) {
  state.selectedId = id;
  await Promise.all([loadApplicationDetail(), loadTransitions(), loadActions(), loadAi()]);
}

async function loadApplicationDetail() {
  if (!state.selectedId) return;
  try {
    const data = await api(`/applications/${state.selectedId}`);
    els.selectedApp.textContent = JSON.stringify(data.data, null, 2);
  } catch (error) {
    els.selectedApp.textContent = JSON.stringify(error, null, 2);
  }
}

async function loadTransitions() {
  if (!state.selectedId) return;
  try {
    const data = await api(`/applications/${state.selectedId}/available-transitions`);
    els.transitions.innerHTML = '';
    for (const t of data.transitions || []) {
      const btn = document.createElement('button');
      btn.textContent = `to ${t.label}`;
      btn.disabled = Boolean(t.blockedReason);
      btn.title = t.blockedReason || '';
      btn.onclick = async () => {
        try {
          const out = await api(`/applications/${state.selectedId}/transitions`, {
            method: 'POST',
            body: JSON.stringify({ to: t.to }),
          });
          showResult(out);
          await selectApplication(state.selectedId);
        } catch (error) {
          showResult(error);
        }
      };
      els.transitions.appendChild(btn);
    }
  } catch (error) {
    els.transitions.textContent = JSON.stringify(error, null, 2);
  }
}

async function loadActions() {
  if (!state.selectedId) return;
  try {
    const data = await api(`/applications/${state.selectedId}/available-actions`);
    els.actions.innerHTML = '';
    for (const a of data.actions || []) {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      btn.disabled = Boolean(a.blockedReason);
      btn.title = a.blockedReason || '';
      btn.onclick = async () => {
        try {
          const out = await api(`/applications/${state.selectedId}/actions`, {
            method: 'POST',
            body: JSON.stringify({ action: a.action, payload: actionPayload(a.action) }),
          });
          showResult(out);
          await selectApplication(state.selectedId);
        } catch (error) {
          showResult(error);
        }
      };
      els.actions.appendChild(btn);
    }
  } catch (error) {
    els.actions.textContent = JSON.stringify(error, null, 2);
  }
}

async function loadAi() {
  if (!state.selectedId) return;
  try {
    const data = await api(`/applications/${state.selectedId}/ai-assessment`);
    els.aiPanel.textContent = JSON.stringify(data.data, null, 2);
  } catch (error) {
    els.aiPanel.textContent = JSON.stringify(error, null, 2);
  }
}

els.createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const out = await api('/applications', {
      method: 'POST',
      body: JSON.stringify({
        studentName: els.studentName.value,
        course: els.course.value,
        university: els.university.value,
      }),
    });
    showResult(out);
    await loadApplications();
  } catch (error) {
    showResult(error);
  }
});

els.refreshApps.onclick = loadApplications;

els.uploadDoc.onclick = async () => {
  if (!state.selectedId) return;
  try {
    const out = await api(`/applications/${state.selectedId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ name: els.docName.value || 'passport' }),
    });
    showResult(out);
    await selectApplication(state.selectedId);
  } catch (error) {
    showResult(error);
  }
};

els.addNote.onclick = async () => {
  if (!state.selectedId) return;
  try {
    const out = await api(`/applications/${state.selectedId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: els.noteText.value || 'Manual note from demo UI' }),
    });
    showResult(out);
    await selectApplication(state.selectedId);
  } catch (error) {
    showResult(error);
  }
};

els.triggerAi.onclick = async () => {
  if (!state.selectedId) return;
  try {
    const out = await api(`/applications/${state.selectedId}/ai-assessment`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    showResult(out);
    await loadAi();
  } catch (error) {
    showResult(error);
  }
};

els.role.addEventListener('change', () => {
  if (els.role.value !== 'agent') {
    els.agentId.value = '';
  }
});

loadApplications();
