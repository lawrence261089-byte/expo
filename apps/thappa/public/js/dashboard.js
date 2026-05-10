/**
 * Thappa Admin Dashboard – Frontend JavaScript
 */

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  currentPage: 'dashboard',
  people: [],
  transactions: [],
  scores: [],
  stats: null,
};

// ─── API ──────────────────────────────────────────────────────────────────────
const API_KEY = localStorage.getItem('thappa_api_key') || '';

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.querySelector(`[data-page="${page}"]`);

  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  state.currentPage = page;

  const titles = {
    dashboard: ['Dashboard', 'Overview of Thappa platform activity'],
    people: ['People', 'Manage the trust directory'],
    transactions: ['Transactions', 'All reported interactions'],
    scores: ['Scores', 'Running score calculations'],
    simulator: ['Bot Simulator', 'Test WhatsApp commands'],
  };

  const [title, subtitle] = titles[page] || ['Thappa', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = subtitle;

  loadPageData(page);
}

// ─── Data Loading ─────────────────────────────────────────────────────────────
async function loadPageData(page) {
  switch (page) {
    case 'dashboard': await loadDashboard(); break;
    case 'people': await loadPeople(); break;
    case 'transactions': await loadTransactions(); break;
    case 'scores': await loadScores(); break;
  }
}

async function loadDashboard() {
  try {
    const data = await apiFetch('/stats');
    state.stats = data;
    renderStats(data);
    if (data.recentTransactions) {
      renderRecentActivity(data.recentTransactions);
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
    renderMockStats();
  }
}

function renderStats(data) {
  setText('stat-people', data.totalPeople.toLocaleString());
  setText('stat-txns', data.totalTransactions.toLocaleString());
  setText('stat-avg-score', data.averageScore);
  setText('stat-payment-rate', `${data.paymentRate}%`);

  const total = data.totalPeople || 1;
  const dist = data.distribution;

  ['excellent', 'good', 'moderate', 'risky'].forEach(key => {
    const count = dist[key] || 0;
    const pct = Math.round((count / total) * 100);
    setText(`dist-${key}`, count);
    const bar = document.getElementById(`bar-${key}`);
    if (bar) bar.style.width = `${pct}%`;
  });
}

function renderMockStats() {
  // Show placeholder data when API is not connected
  setText('stat-people', '—');
  setText('stat-txns', '—');
  setText('stat-avg-score', '—');
  setText('stat-payment-rate', '—');
}

function renderRecentActivity(txns) {
  const el = document.getElementById('recentActivityList');
  if (!el) return;

  if (!txns || txns.length === 0) {
    el.innerHTML = '<div class="activity-empty">No recent activity</div>';
    return;
  }

  el.innerHTML = txns.map(t => {
    const statusEmoji = t.status === 'PAID' ? '✅' : t.status === 'NOT_PAID' ? '❌' : '⚠️';
    const statusCls = t.status === 'PAID' ? 'txn-paid' : t.status === 'NOT_PAID' ? 'txn-notpaid' : 'txn-partial';
    const date = t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
    return `
      <div class="activity-item">
        <div class="activity-icon ${statusCls}">${statusEmoji}</div>
        <div class="activity-body">
          <div class="activity-title"><code>${t.personId}</code> — ₹${(t.amount || 0).toLocaleString('en-IN')}</div>
          <div class="activity-meta">${t.status} · ${date}</div>
        </div>
      </div>`;
  }).join('');
}

async function loadPeople() {
  const tbody = document.getElementById('peopleTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading...</td></tr>';

  try {
    const data = await apiFetch('/people');
    state.people = data.people;
    renderPeopleTable(data.people);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-cell">⚠️ Could not load data. Check API connection.</td></tr>`;
  }
}

function renderPeopleTable(people) {
  const tbody = document.getElementById('peopleTableBody');
  if (!people.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No people found. Add the first person!</td></tr>';
    return;
  }

  tbody.innerHTML = people.map(p => {
    const band = getScoreBand(p.score);
    const statusClass = p.status === 'Active' ? 'status-active' : p.status === 'Blocked' ? 'status-blocked' : 'status-review';
    return `
      <tr>
        <td><code>${p.id || '—'}</code></td>
        <td><strong>${p.name || '—'}</strong></td>
        <td>****${p.phoneLast4 || '—'}</td>
        <td>${p.location || '—'}</td>
        <td>${p.userType || '—'}</td>
        <td><span class="score-badge ${band.cls}">${band.emoji} ${p.score}</span></td>
        <td><span class="status-badge ${statusClass}">${p.status || 'Active'}</span></td>
        <td>
          <button class="btn btn-primary" style="padding:4px 10px;font-size:11px" onclick="viewPerson('${p.id}')">View</button>
        </td>
      </tr>`;
  }).join('');
}

async function loadTransactions() {
  const tbody = document.getElementById('txnTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading...</td></tr>';

  try {
    const data = await apiFetch('/transactions');
    state.transactions = data.transactions;
    renderTransactionsTable(data.transactions);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">⚠️ Could not load data.</td></tr>`;
  }
}

function renderTransactionsTable(txns) {
  const tbody = document.getElementById('txnTableBody');
  const filter = document.getElementById('txnFilter')?.value || '';
  const filtered = filter ? txns.filter(t => t.status === filter) : txns;

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No transactions found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const statusClass = t.status === 'PAID' ? 'txn-paid' : t.status === 'NOT_PAID' ? 'txn-notpaid' : 'txn-partial';
    const statusEmoji = t.status === 'PAID' ? '✅' : t.status === 'NOT_PAID' ? '❌' : '⚠️';
    const ratingEmoji = t.rating === 'GOOD' ? '👍' : t.rating === 'BAD' ? '👎' : '👌';
    const date = t.date ? new Date(t.date).toLocaleDateString('en-IN') : '—';
    return `
      <tr>
        <td><code>${t.id || '—'}</code></td>
        <td><code>${t.personId || '—'}</code></td>
        <td>₹${(t.amount || 0).toLocaleString('en-IN')}</td>
        <td class="${statusClass}">${statusEmoji} ${t.status || '—'}</td>
        <td>${ratingEmoji} ${t.rating || '—'}</td>
        <td>${date}</td>
      </tr>`;
  }).join('');
}

async function loadScores() {
  const tbody = document.getElementById('scoresTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">Loading...</td></tr>';

  try {
    const data = await apiFetch('/scores');
    state.scores = data.scores;
    renderScoresTable(data.scores);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="loading-cell">⚠️ Could not load data.</td></tr>`;
  }
}

function renderScoresTable(scores) {
  const tbody = document.getElementById('scoresTableBody');
  if (!scores.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No score records yet.</td></tr>';
    return;
  }

  tbody.innerHTML = scores.map(s => {
    const band = getScoreBand(s.compositeScore);
    const date = s.lastUpdated ? new Date(s.lastUpdated).toLocaleDateString('en-IN') : '—';
    return `
      <tr>
        <td><code>${s.personId}</code></td>
        <td>${s.totalTxn}</td>
        <td class="txn-paid">${s.paid}</td>
        <td class="txn-notpaid">${s.defaults}</td>
        <td class="txn-partial">${s.partial}</td>
        <td style="color:var(--accent-green)">${s.goodRatings}</td>
        <td style="color:var(--accent-red)">${s.badRatings}</td>
        <td><span class="score-badge ${band.cls}">${band.emoji} ${s.compositeScore}</span></td>
        <td>${date}</td>
      </tr>`;
  }).join('');
}

// ─── Quick Check ──────────────────────────────────────────────────────────────
async function runQuickCheck() {
  const name = document.getElementById('qcName').value.trim();
  const phone = document.getElementById('qcPhone').value.trim();
  const resultEl = document.getElementById('qcResult');

  if (!name || !phone) {
    showResult(resultEl, '❌ Please enter both name and last 4 digits.', 'error');
    return;
  }

  showResult(resultEl, '🔍 Checking...', 'loading');

  try {
    const res = await fetch('/api/people', {
      headers: { 'x-api-key': API_KEY }
    });
    const data = await res.json();
    const nameLower = name.toLowerCase();
    const person = data.people?.find(p =>
      p.name?.toLowerCase().includes(nameLower) && p.phoneLast4 === phone
    );

    if (!person) {
      showResult(resultEl, `❓ No record found for ${name.toUpperCase()} | ****${phone}\n\nThis person is not in the Thappa database yet.`, 'info');
      return;
    }

    const band = getScoreBand(person.score);
    const result = `${band.emoji} ${person.name} | ****${person.phoneLast4}
Score: ${person.score}/1000 — ${band.label}
Location: ${person.location || 'Not set'}
Type: ${person.userType || 'Worker'}
Status: ${person.status || 'Active'}
Recommendation: ${band.recommendation}`;

    showResult(resultEl, result, band.cls);
  } catch (err) {
    showResult(resultEl, '⚠️ API not connected. Start the server to use live data.', 'error');
  }
}

function showResult(el, text, type) {
  el.textContent = text;
  el.className = `qc-result ${type}`;
  el.style.borderColor = type === 'excellent' ? 'var(--score-excellent)'
    : type === 'good' ? 'var(--score-good)'
    : type === 'moderate' ? 'var(--score-moderate)'
    : type === 'risky' ? 'var(--score-risky)'
    : 'var(--border)';
}

// ─── Person Detail Modal ──────────────────────────────────────────────────────
async function viewPerson(id) {
  const modal = document.getElementById('personDetailModal');
  const content = document.getElementById('personDetailContent');
  if (!modal || !content) return;

  content.innerHTML = '<div class="loading-cell" style="padding:40px;text-align:center">Loading...</div>';
  modal.classList.remove('hidden');

  try {
    const data = await apiFetch(`/people/${id}`);
    const { person, scoreData, band, transactions } = data;

    const statusClass = person.status === 'Active' ? 'status-active' : person.status === 'Blocked' ? 'status-blocked' : 'status-review';
    const scoreBand = getScoreBand(person.score);

    const txnRows = (transactions || []).slice(0, 10).map(t => {
      const statusEmoji = t.status === 'PAID' ? '✅' : t.status === 'NOT_PAID' ? '❌' : '⚠️';
      const ratingEmoji = t.rating === 'GOOD' ? '👍' : t.rating === 'BAD' ? '👎' : '👌';
      const date = t.date ? new Date(t.date).toLocaleDateString('en-IN') : '—';
      const statusCls = t.status === 'PAID' ? 'txn-paid' : t.status === 'NOT_PAID' ? 'txn-notpaid' : 'txn-partial';
      return `<tr>
        <td>₹${(t.amount || 0).toLocaleString('en-IN')}</td>
        <td class="${statusCls}">${statusEmoji} ${t.status}</td>
        <td>${ratingEmoji} ${t.rating || '—'}</td>
        <td>${t.notes || '—'}</td>
        <td>${date}</td>
      </tr>`;
    }).join('');

    const paymentRate = scoreData && scoreData.totalTxn > 0
      ? Math.round((scoreData.paid / scoreData.totalTxn) * 100)
      : 0;

    content.innerHTML = `
      <div class="person-detail-header">
        <div class="person-detail-avatar">${(person.name || '?')[0]}</div>
        <div class="person-detail-info">
          <h2>${person.name}</h2>
          <div class="person-detail-meta">
            <span>📱 ****${person.phoneLast4}</span>
            <span>📍 ${person.location || 'Not set'}</span>
            <span>🏷️ ${person.userType || 'Worker'}</span>
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
            <span class="score-badge ${scoreBand.cls}">${scoreBand.emoji} ${person.score}/1000</span>
            <span class="status-badge ${statusClass}">${person.status}</span>
          </div>
        </div>
      </div>

      ${scoreData ? `
      <div class="person-detail-stats">
        <div class="pd-stat">
          <div class="pd-stat-value">${scoreData.totalTxn}</div>
          <div class="pd-stat-label">Total Txn</div>
        </div>
        <div class="pd-stat">
          <div class="pd-stat-value txn-paid">${scoreData.paid}</div>
          <div class="pd-stat-label">Paid</div>
        </div>
        <div class="pd-stat">
          <div class="pd-stat-value txn-notpaid">${scoreData.defaults}</div>
          <div class="pd-stat-label">Defaults</div>
        </div>
        <div class="pd-stat">
          <div class="pd-stat-value txn-partial">${scoreData.partial}</div>
          <div class="pd-stat-label">Partial</div>
        </div>
        <div class="pd-stat">
          <div class="pd-stat-value" style="color:var(--accent-green)">${paymentRate}%</div>
          <div class="pd-stat-label">Pay Rate</div>
        </div>
        <div class="pd-stat">
          <div class="pd-stat-value" style="color:var(--accent-green)">${scoreData.goodRatings}</div>
          <div class="pd-stat-label">👍 Good</div>
        </div>
        <div class="pd-stat">
          <div class="pd-stat-value" style="color:var(--accent-red)">${scoreData.badRatings}</div>
          <div class="pd-stat-label">👎 Bad</div>
        </div>
      </div>` : ''}

      <div class="person-detail-recommendation">
        <strong>${scoreBand.emoji} ${scoreBand.label}</strong> — ${band?.recommendation || scoreBand.recommendation}
        <span style="color:var(--text-muted);margin-left:8px">Risk: ${band?.risk || scoreBand.risk}</span>
      </div>

      ${transactions && transactions.length > 0 ? `
      <h4 style="margin:16px 0 10px;font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Transaction History</h4>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Amount</th><th>Status</th><th>Rating</th><th>Notes</th><th>Date</th></tr>
          </thead>
          <tbody>${txnRows}</tbody>
        </table>
      </div>` : '<div style="color:var(--text-muted);margin-top:16px;text-align:center">No transactions recorded yet.</div>'}
    `;
  } catch (err) {
    content.innerHTML = `<div class="loading-cell" style="padding:40px;text-align:center">⚠️ Could not load person details.</div>`;
  }
}

// ─── Bot Simulator ────────────────────────────────────────────────────────────
async function sendSimMessage(text) {
  if (!text.trim()) return;

  const chatEl = document.getElementById('chatMessages');
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Add user message
  chatEl.innerHTML += `
    <div class="message user-message">
      <div class="message-bubble">${escapeHtml(text)}</div>
      <div class="message-time">${now}</div>
    </div>`;

  chatEl.scrollTop = chatEl.scrollHeight;

  // Show typing indicator
  const typingId = `typing_${Date.now()}`;
  chatEl.innerHTML += `
    <div class="message bot-message" id="${typingId}">
      <div class="message-bubble typing-indicator"><span></span><span></span><span></span></div>
    </div>`;
  chatEl.scrollTop = chatEl.scrollHeight;

  // Call real server-side simulate endpoint
  let reply;
  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ message: text, phone: 'simulator_demo' }),
    });
    const data = await res.json();
    reply = data.reply || '⚠️ No response.';
  } catch (err) {
    reply = `⚠️ Could not reach server. Make sure the server is running.\n\nError: ${err.message}`;
  }

  // Remove typing indicator and show reply
  const typingEl = document.getElementById(typingId);
  if (typingEl) typingEl.remove();

  const replyNow = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  chatEl.innerHTML += `
    <div class="message bot-message">
      <div class="message-bubble">${escapeHtml(reply)}</div>
      <div class="message-time">${replyNow}</div>
    </div>`;
  chatEl.scrollTop = chatEl.scrollHeight;
}

// ─── Add Person Modal ─────────────────────────────────────────────────────────
async function savePerson() {
  const name = document.getElementById('newName').value.trim();
  const phoneLast4 = document.getElementById('newPhone').value.trim();
  const location = document.getElementById('newLocation').value.trim();
  const userType = document.getElementById('newUserType').value;

  if (!name || !phoneLast4) {
    alert('Name and phone last 4 digits are required.');
    return;
  }

  try {
    await apiFetch('/people', {
      method: 'POST',
      body: JSON.stringify({ name, phoneLast4, location, userType }),
    });
    document.getElementById('addPersonModal').classList.add('hidden');
    await loadPeople();
  } catch (err) {
    alert('Failed to add person. Check API connection.');
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

function getScoreBand(score) {
  if (score >= 800) return { cls: 'excellent', emoji: '🌟', label: 'EXCELLENT', recommendation: 'TRUST', risk: 'VERY LOW' };
  if (score >= 600) return { cls: 'good',      emoji: '✅', label: 'GOOD',      recommendation: 'TRUST', risk: 'LOW' };
  if (score >= 300) return { cls: 'moderate',  emoji: '⚡', label: 'MODERATE',  recommendation: 'CAUTION', risk: 'MODERATE' };
  return               { cls: 'risky',     emoji: '⚠️', label: 'RISKY',     recommendation: 'NO CREDIT', risk: 'HIGH' };
}

function updateClock() {
  const el = document.getElementById('headerTime');
  if (el) {
    el.textContent = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Refresh button
  document.getElementById('refreshBtn')?.addEventListener('click', () => {
    loadPageData(state.currentPage);
  });

  // Quick check
  document.getElementById('qcBtn')?.addEventListener('click', runQuickCheck);
  document.getElementById('qcPhone')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') runQuickCheck();
  });

  // People search
  document.getElementById('peopleSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.people.filter(p =>
      p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q)
    );
    renderPeopleTable(filtered);
  });

  // Transaction filter
  document.getElementById('txnFilter')?.addEventListener('change', () => {
    renderTransactionsTable(state.transactions);
  });

  // Add person modal
  document.getElementById('addPersonBtn')?.addEventListener('click', () => {
    document.getElementById('addPersonModal').classList.remove('hidden');
  });
  document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('addPersonModal').classList.add('hidden');
  });
  document.getElementById('savePersonBtn')?.addEventListener('click', savePerson);

  // Person detail modal close
  document.getElementById('closePersonDetailModal')?.addEventListener('click', () => {
    document.getElementById('personDetailModal').classList.add('hidden');
  });
  document.getElementById('personDetailModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
    }
  });

  // Simulator
  document.getElementById('simSend')?.addEventListener('click', () => {
    const input = document.getElementById('simInput');
    const text = input.value.trim();
    if (text) {
      sendSimMessage(text);
      input.value = '';
    }
  });

  document.getElementById('simInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const input = e.target;
      const text = input.value.trim();
      if (text) {
        sendSimMessage(text);
        input.value = '';
      }
    }
  });

  // Command chips
  document.querySelectorAll('.cmd-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd;
      sendSimMessage(cmd);
    });
  });

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Initial load
  loadDashboard();
});
