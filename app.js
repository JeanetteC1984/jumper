// ── Jumper App — app.js ──────────────────────────────────────────────────────
// Manages Goals, Reflections, Tasks and Inspiration board.
// All data persisted in localStorage.

(function () {
  'use strict';

  // ── Storage helpers ──────────────────────────────────────────────────────
  const KEYS = { goals: 'jumper_goals', entries: 'jumper_entries', tasks: 'jumper_tasks' };

  function load(key)        { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
  function save(key, data)  { localStorage.setItem(key, JSON.stringify(data)); }

  // ── State ────────────────────────────────────────────────────────────────
  let goals   = load(KEYS.goals);
  let entries = load(KEYS.entries);
  let tasks   = load(KEYS.tasks);
  let selectedMood = '✨';

  // ── Utility ──────────────────────────────────────────────────────────────
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function toast(msg) {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ── Stats bar ────────────────────────────────────────────────────────────
  function updateStats() {
    const completedGoals = goals.filter(g => g.completed).length;
    const completedTasks = tasks.filter(t => t.done).length;
    document.getElementById('statGoals').textContent    = goals.length;
    document.getElementById('statDone').textContent     = completedGoals;
    document.getElementById('statEntries').textContent  = entries.length;
    document.getElementById('statTasks').textContent    = completedTasks + '/' + tasks.length;
  }

  // ── Tab navigation ───────────────────────────────────────────────────────
  function initTabs() {
    const btns     = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.section');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b     => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('section-' + btn.dataset.tab).classList.add('active');
      });
    });
  }

  // ── Goals ────────────────────────────────────────────────────────────────
  function renderGoals() {
    const grid = document.getElementById('goalsGrid');
    if (!goals.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <span class="empty-icon">🎯</span>
          <p class="empty-msg">&gt; NO ACTIVE GOALS DETECTED — INITIALIZE ONE ABOVE</p>
        </div>`;
      return;
    }
    grid.innerHTML = goals.map(g => goalCardHTML(g)).join('');
    grid.querySelectorAll('.goal-complete-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleGoalComplete(btn.dataset.id));
    });
    grid.querySelectorAll('.goal-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteGoal(btn.dataset.id));
    });
    grid.querySelectorAll('.goal-progress-input').forEach(input => {
      input.addEventListener('input', e => updateGoalProgress(e.target.dataset.id, e.target.value));
    });
    updateStats();
  }

  function goalCardHTML(g) {
    const categories = { personal: 'badge-pink', health: 'badge-cyan', career: 'badge-purple', creative: 'badge-pink', other: 'badge-purple' };
    const catClass   = categories[g.category] || 'badge-purple';
    return `
      <div class="goal-card ${g.completed ? 'completed' : ''}" id="goal-${g.id}">
        <div class="goal-header">
          <span class="goal-title-text">${sanitize(g.title)}</span>
          <button class="btn btn-danger btn-sm goal-delete-btn" data-id="${g.id}" title="Delete">✕</button>
        </div>
        <div class="goal-meta">
          <span class="badge ${catClass}">${g.category}</span>
          ${g.deadline ? `<span class="badge badge-cyan">⏱ ${formatDate(g.deadline)}</span>` : ''}
          ${g.completed ? '<span class="badge badge-green">✓ COMPLETE</span>' : ''}
        </div>
        ${g.description ? `<p style="font-size:0.88rem;color:var(--text-muted);margin:8px 0;">${sanitize(g.description)}</p>` : ''}
        <div class="progress-wrap">
          <div class="progress-label">
            <span>PROGRESS</span>
            <span id="pct-${g.id}">${g.progress}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" id="bar-${g.id}" style="width:${g.progress}%"></div>
          </div>
          <input type="range" min="0" max="100" value="${g.progress}"
            class="goal-progress-input" data-id="${g.id}"
            style="width:100%;margin-top:8px;accent-color:var(--pink);cursor:pointer;">
        </div>
        <div class="goal-actions">
          <button class="btn btn-sm ${g.completed ? 'btn-outline' : 'btn-primary'} goal-complete-btn" data-id="${g.id}">
            ${g.completed ? '↩ REOPEN' : '✓ COMPLETE'}
          </button>
        </div>
      </div>`;
  }

  function addGoal() {
    const titleEl    = document.getElementById('goalTitle');
    const catEl      = document.getElementById('goalCategory');
    const deadlineEl = document.getElementById('goalDeadline');
    const descEl     = document.getElementById('goalDesc');

    const title = titleEl.value.trim();
    if (!title) { toast('⚠ Goal title required.'); titleEl.focus(); return; }

    goals.unshift({
      id: uid(), title, category: catEl.value,
      deadline: deadlineEl.value, description: descEl.value.trim(),
      progress: 0, completed: false, created: new Date().toISOString()
    });
    save(KEYS.goals, goals);

    titleEl.value = '';
    descEl.value  = '';
    deadlineEl.value = '';

    renderGoals();
    toast('✨ Goal initiated!');
  }

  function toggleGoalComplete(id) {
    const g = goals.find(g => g.id === id);
    if (!g) return;
    g.completed = !g.completed;
    if (g.completed) g.progress = 100;
    save(KEYS.goals, goals);
    renderGoals();
    toast(g.completed ? '🎉 Goal completed! Yass!' : '↩ Goal reopened.');
  }

  function updateGoalProgress(id, value) {
    const g = goals.find(g => g.id === id);
    if (!g) return;
    g.progress = parseInt(value, 10);
    const bar = document.getElementById('bar-' + id);
    const pct = document.getElementById('pct-' + id);
    if (bar) bar.style.width = g.progress + '%';
    if (pct) pct.textContent  = g.progress + '%';
    save(KEYS.goals, goals);
    updateStats();
  }

  function deleteGoal(id) {
    goals = goals.filter(g => g.id !== id);
    save(KEYS.goals, goals);
    renderGoals();
    toast('🗑 Goal deleted.');
  }

  // ── Journal / Reflections ─────────────────────────────────────────────────
  function renderEntries() {
    const list = document.getElementById('entryList');
    if (!entries.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📓</span>
          <p class="empty-msg">&gt; NO ENTRIES LOGGED — BEGIN YOUR TRANSMISSION</p>
        </div>`;
      updateStats();
      return;
    }
    list.innerHTML = entries.map(e => entryCardHTML(e)).join('');
    list.querySelectorAll('.entry-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteEntry(btn.dataset.id));
    });
    updateStats();
  }

  function entryCardHTML(e) {
    return `
      <div class="entry-card">
        <div class="entry-header">
          <span class="entry-date">${formatDate(e.date)} · ${e.time}</span>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="entry-mood">${e.mood}</span>
            <button class="btn btn-danger btn-sm entry-delete-btn" data-id="${e.id}" title="Delete">✕</button>
          </div>
        </div>
        <p class="entry-body">${sanitize(e.body)}</p>
      </div>`;
  }

  function addEntry() {
    const bodyEl = document.getElementById('entryBody');
    const body   = bodyEl.value.trim();
    if (!body) { toast('⚠ Entry body required.'); bodyEl.focus(); return; }

    const now = new Date();
    entries.unshift({
      id: uid(), body, mood: selectedMood,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    });
    save(KEYS.entries, entries);
    bodyEl.value = '';
    renderEntries();
    toast('💜 Entry logged!');
  }

  function deleteEntry(id) {
    entries = entries.filter(e => e.id !== id);
    save(KEYS.entries, entries);
    renderEntries();
    toast('🗑 Entry deleted.');
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  function renderTasks() {
    const list = document.getElementById('taskList');
    if (!tasks.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">✅</span>
          <p class="empty-msg">&gt; TASK QUEUE EMPTY — ADD YOUR FIRST MISSION</p>
        </div>`;
      updateStats();
      return;
    }
    // Sort: undone first, then by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sorted = [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });

    list.innerHTML = sorted.map(t => taskItemHTML(t)).join('');
    list.querySelectorAll('.task-check').forEach(cb => {
      cb.addEventListener('change', () => toggleTask(cb.dataset.id));
    });
    list.querySelectorAll('.task-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteTask(btn.dataset.id));
    });
    updateStats();
  }

  function taskItemHTML(t) {
    return `
      <div class="task-item ${t.done ? 'done' : ''}">
        <input type="checkbox" class="task-check" data-id="${t.id}" ${t.done ? 'checked' : ''}>
        <span class="task-text">${sanitize(t.text)}</span>
        <span class="task-priority priority-${t.priority}">${t.priority.toUpperCase()}</span>
        <button class="btn btn-danger btn-sm task-delete-btn" data-id="${t.id}" title="Delete">✕</button>
      </div>`;
  }

  function addTask() {
    const textEl     = document.getElementById('taskText');
    const priorityEl = document.getElementById('taskPriority');
    const text       = textEl.value.trim();
    if (!text) { toast('⚠ Task text required.'); textEl.focus(); return; }

    tasks.unshift({ id: uid(), text, priority: priorityEl.value, done: false });
    save(KEYS.tasks, tasks);
    textEl.value = '';
    renderTasks();
    toast('⚡ Task queued!');
  }

  function toggleTask(id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    t.done = !t.done;
    save(KEYS.tasks, tasks);
    renderTasks();
    if (t.done) toast('✓ Task crushed! 💅');
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save(KEYS.tasks, tasks);
    renderTasks();
    toast('🗑 Task removed.');
  }

  // ── Mood selector ─────────────────────────────────────────────────────────
  function initMoodSelector() {
    const btns = document.querySelectorAll('.mood-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedMood = btn.dataset.mood;
      });
    });
    // Select first mood button by default
    if (btns.length) { btns[0].classList.add('selected'); selectedMood = btns[0].dataset.mood; }
  }

  // ── Inspiration board ─────────────────────────────────────────────────────
  const INSPIRATIONS = [
    { emoji: '🌸', text: 'She believed she could, so she did.' },
    { emoji: '⚡', text: 'Glitch the matrix. Rewrite your reality.' },
    { emoji: '💜', text: 'Your softness is not weakness — it\'s code.' },
    { emoji: '🔮', text: 'Debug the doubts. Deploy your dreams.' },
    { emoji: '🦋', text: 'Metamorphosis is just a system reboot.' },
    { emoji: '🌟', text: 'Be your own lead character.' },
    { emoji: '🎀', text: 'Pink doesn\'t mean powerless.' },
    { emoji: '🛸', text: 'Aim beyond the stratosphere.' },
    { emoji: '💎', text: 'Rare files don\'t need validation.' },
    { emoji: '🌺', text: 'Grow through every patch.' },
    { emoji: '🔥', text: 'Set your goals on fire — then run through them.' },
    { emoji: '🤖', text: 'Upgrade yourself daily.' },
  ];

  function renderInspiration() {
    const grid = document.getElementById('inspoGrid');
    grid.innerHTML = INSPIRATIONS.map(i => `
      <div class="inspo-card" title="Click for a new spark!">
        <span class="inspo-emoji">${i.emoji}</span>
        <p class="inspo-text">${i.text}</p>
      </div>
    `).join('');
    grid.querySelectorAll('.inspo-card').forEach(card => {
      card.addEventListener('click', () => {
        card.style.transform = 'scale(0.95)';
        setTimeout(() => { card.style.transform = ''; }, 150);
        const q = INSPIRATIONS[Math.floor(Math.random() * INSPIRATIONS.length)];
        card.querySelector('.inspo-emoji').textContent = q.emoji;
        card.querySelector('.inspo-text').textContent  = q.text;
      });
    });
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  function initParticles() {
    const container = document.getElementById('particles');
    const colors    = ['var(--pink)', 'var(--purple)', 'var(--cyan)'];
    const count     = 18;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size  = Math.random() * 4 + 2;
      const delay = Math.random() * 15;
      const dur   = Math.random() * 12 + 10;
      const left  = Math.random() * 100;
      const color = colors[Math.floor(Math.random() * colors.length)];

      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${left}%;
        background:${color};
        box-shadow: 0 0 ${size * 2}px ${color};
        animation-delay:${delay}s;
        animation-duration:${dur}s;
      `;
      container.appendChild(p);
    }
  }

  // ── Clear all data (dev helper) ───────────────────────────────────────────
  window.clearJumperData = function () {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    goals = []; entries = []; tasks = [];
    renderGoals(); renderEntries(); renderTasks(); updateStats();
    toast('🧹 All data cleared.');
  };

  // ── Boot ─────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initMoodSelector();
    initParticles();
    renderGoals();
    renderEntries();
    renderTasks();
    renderInspiration();
    updateStats();

    // Wire up add buttons
    document.getElementById('addGoalBtn').addEventListener('click', addGoal);
    document.getElementById('addEntryBtn').addEventListener('click', addEntry);
    document.getElementById('addTaskBtn').addEventListener('click', addTask);

    // Allow Enter key in single-line inputs
    document.getElementById('goalTitle').addEventListener('keydown', e => { if (e.key === 'Enter') addGoal(); });
    document.getElementById('taskText').addEventListener('keydown',  e => { if (e.key === 'Enter') addTask(); });
  });

})();
