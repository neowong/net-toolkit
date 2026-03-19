// ── Tauri API 封装 ────────────────────────────────────
// withGlobalTauri: true 时，这两个对象由 Tauri 注入
const { invoke } = window.__TAURI__.core;
const { listen  } = window.__TAURI__.event;

// ══════════════════════════════════════════════════════
//  通用工具
// ══════════════════════════════════════════════════════

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  event.currentTarget.classList.add('active');
}

function showAlert(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'alert alert-error show';
}
function clearAlert(id) {
  const el = document.getElementById(id);
  el.className = 'alert alert-error';
  el.textContent = '';
}
function showInfo(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'alert alert-info show';
}

function show(id)  { document.getElementById(id).style.display = ''; }
function hide(id)  { document.getElementById(id).style.display = 'none'; }
function card(id)  { document.getElementById(id); }

// ══════════════════════════════════════════════════════
//  子网计算
// ══════════════════════════════════════════════════════

let prefixNum = 24;

function adjustPrefix(delta) {
  const el = document.getElementById('prefix-input');
  const current = parseInt(el.value);
  if (!isNaN(current)) {
    prefixNum = Math.max(0, Math.min(32, current + delta));
  } else {
    prefixNum = Math.max(0, Math.min(32, prefixNum + delta));
  }
  el.value = prefixNum;
}

async function calculateSubnet() {
  const ip     = document.getElementById('ip-input').value.trim();
  const prefix = document.getElementById('prefix-input').value.trim();

  clearAlert('subnet-error');
  hide('subnet-result-card');

  if (!ip || !prefix) {
    showAlert('subnet-error', '请填写 IP 地址和前缀 / 掩码');
    return;
  }

  try {
    const rows = await invoke('calculate_subnet', { ip, prefix });
    renderSubnetTable(rows);
    show('subnet-result-card');
  } catch (err) {
    showAlert('subnet-error', String(err));
  }
}

function renderSubnetTable(rows) {
  const tbody = document.getElementById('subnet-tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="text-secondary">${r.label}</td>
      <td class="text-mono" style="font-weight:600">${r.value}</td>
    </tr>
  `).join('');
}

// ══════════════════════════════════════════════════════
//  IP 扫描
// ══════════════════════════════════════════════════════

let scanUnlisten = null;
let scanAliveRows = [];

async function startScan() {
  const cidr       = document.getElementById('cidr-input').value.trim();
  const timeout    = parseInt(document.getElementById('timeout-input').value)    || 1000;
  const concurrent = parseInt(document.getElementById('concurrent-input').value) || 50;

  clearAlert('scan-error');

  if (!cidr) {
    showAlert('scan-error', '请输入网络地址，格式如 192.168.1.0/24');
    return;
  }

  // 重置 UI
  scanAliveRows = [];
  document.getElementById('scan-tbody').innerHTML = '';
  document.getElementById('scan-count').textContent = '0 台';
  document.getElementById('scan-progress-bar').style.width = '0%';
  document.getElementById('scan-progress-text').textContent = '0 / 0';

  hide('scan-result-card');
  show('scan-progress-card');
  hide('scan-start-btn');
  show('scan-stop-btn');

  // 监听实时结果事件
  scanUnlisten = await listen('scan-result', (event) => {
    const { ip, alive, latencyMs, done, total } = event.payload;

    // 更新进度
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    document.getElementById('scan-progress-bar').style.width = pct + '%';
    document.getElementById('scan-progress-text').textContent = `${done} / ${total}`;

    if (alive) {
      scanAliveRows.push({ ip, latencyMs });
      renderScanRow(ip, latencyMs);
    }
  });

  try {
    await invoke('start_scan', { cidr, timeout, concurrent });
  } catch (err) {
    showAlert('scan-error', String(err));
  } finally {
    if (scanUnlisten) { scanUnlisten(); scanUnlisten = null; }
    hide('scan-stop-btn');
    show('scan-start-btn');
    document.getElementById('scan-progress-bar').style.width = '100%';

    if (scanAliveRows.length > 0) {
      show('scan-result-card');
    }
  }
}

function renderScanRow(ip, latencyMs) {
  const tbody = document.getElementById('scan-tbody');
  const row = document.createElement('tr');
  const latency = latencyMs != null ? `${latencyMs} ms` : '-';
  row.innerHTML = `
    <td class="text-mono">${ip}</td>
    <td class="text-secondary">${latency}</td>
    <td class="status-alive">● 存活</td>
  `;
  tbody.appendChild(row);
  document.getElementById('scan-count').textContent = `${tbody.rows.length} 台`;
  show('scan-result-card');
}

async function stopScan() {
  try { await invoke('stop_scan'); } catch (_) {}
}

// ══════════════════════════════════════════════════════
//  HTTP 检测
// ══════════════════════════════════════════════════════

async function checkHttp() {
  const raw  = document.getElementById('urls-input').value;
  const urls = raw.split('\n').map(u => u.trim()).filter(Boolean);

  clearAlert('http-error');
  hide('http-result-card');

  if (urls.length === 0) {
    showAlert('http-error', '请输入至少一个 URL');
    return;
  }

  const btn    = document.getElementById('http-start-btn');
  const status = document.getElementById('http-status-text');
  btn.disabled = true;
  status.textContent = `正在检测 ${urls.length} 个 URL…`;

  try {
    const results = await invoke('check_http', { urls });
    renderHttpTable(results);
    show('http-result-card');
    status.textContent = `完成，共 ${results.length} 条`;
  } catch (err) {
    showAlert('http-error', String(err));
    status.textContent = '';
  } finally {
    btn.disabled = false;
  }
}

function renderHttpTable(rows) {
  const tbody = document.getElementById('http-tbody');
  tbody.innerHTML = rows.map(r => {
    const cls = r.category === 1 ? 'status-2xx'
              : r.category === 2 ? 'status-3xx'
              : r.category === 3 ? 'status-4xx'
              : r.category === 4 ? 'status-5xx'
              : 'status-0xx';
    const urlShort = r.url.length > 60 ? r.url.slice(0, 57) + '…' : r.url;
    return `
      <tr>
        <td title="${r.url}">${urlShort}</td>
        <td class="${cls} text-mono">${r.statusCode}</td>
        <td class="text-secondary">${r.latency}</td>
      </tr>
    `;
  }).join('');
  document.getElementById('http-count').textContent = `${rows.length} 条`;
}
