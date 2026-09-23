
// =========================================================================
// CONSTANTS
// =========================================================================
const TOAST_DURATION_DEFAULT = 3500;
const TOAST_DURATION_ERROR = 4500;
const TOAST_FADE_OUT_DURATION = 220;
const TAG_MAX_LENGTH = 10;
const PROFILE_NAME_MAX_LENGTH = 30;
const PROFILE_NOTES_MAX_LENGTH = 30;

// =========================================================================
// UTILITY: HTML ESCAPE
// =========================================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =========================================================================
// CUSTOM TOAST NOTIFICATIONS (HYPERION UI)
// =========================================================================
function showToast(message, type = 'info', duration = TOAST_DURATION_DEFAULT) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `hyperion-toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  } else {
    // info
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  iconSpan.innerHTML = iconSvg;

  const messageSpan = document.createElement('span');
  messageSpan.className = 'toast-message';
  messageSpan.textContent = String(message || '');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close';
  closeBtn.title = 'Закрыть';
  closeBtn.textContent = '×';

  toast.appendChild(iconSpan);
  toast.appendChild(messageSpan);
  toast.appendChild(closeBtn);

  let closed = false;
  const closeToast = () => {
    if (closed) return;
    closed = true;
    toast.classList.add('toast-fade-out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, TOAST_FADE_OUT_DURATION);
  };

  closeBtn.addEventListener('click', closeToast);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(closeToast, duration);
  }
  return toast;
}
window.showToast = showToast;

// Custom notification function (DO NOT override native alert)
window.showNotification = (msg) => {
  const text = String(msg || '');
  const isErr = /ошибк|неверн|fault|fail|error|заполните|введите|укажите/i.test(text);
  const isWarn = /внимание|warning/i.test(text);
  const isSuccess = /успешн|сохранен|очищен|импортирован|установлен/i.test(text);
  const type = isErr ? 'error' : isWarn ? 'warning' : isSuccess ? 'success' : 'info';
  showToast(text, type, isErr ? TOAST_DURATION_ERROR : TOAST_DURATION_DEFAULT);
};

// =========================================================================
// CUSTOM CONFIRM MODAL (HYPERION UI)
// =========================================================================
function showConfirmDialog({ title = 'Подтверждение', message, confirmText = 'Подтвердить', cancelText = 'Отмена', isDanger = false }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    if (!modal) {
      console.error('Confirm modal element not found');
      resolve(false);
      return;
    }
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const btnConfirm = document.getElementById('confirm-modal-confirm');
    const btnCancel = document.getElementById('confirm-modal-cancel');
    const btnClose = document.getElementById('confirm-modal-close');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (btnConfirm) {
      btnConfirm.textContent = confirmText;
      btnConfirm.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
    }
    if (btnCancel) btnCancel.textContent = cancelText;

    modal.style.display = 'flex';

    let resolved = false;
    const cleanup = (val) => {
      if (resolved) return;
      resolved = true;
      modal.style.display = 'none';
      if (btnConfirm) btnConfirm.onclick = null;
      if (btnCancel) btnCancel.onclick = null;
      if (btnClose) btnClose.onclick = null;
      window.removeEventListener('keydown', onKey);
      resolve(val);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === 'Enter' && !isDanger) {
        // Only auto-confirm on Enter for non-dangerous operations
        e.preventDefault();
        cleanup(true);
      }
    };

    if (btnConfirm) btnConfirm.onclick = () => cleanup(true);
    if (btnCancel) btnCancel.onclick = () => cleanup(false);
    if (btnClose) btnClose.onclick = () => cleanup(false);
    window.addEventListener('keydown', onKey);
  });
}
window.showConfirmDialog = showConfirmDialog;


// =========================================================================
// CUSTOM PROMPT MODAL (REPLACES WINDOW.PROMPT IN ELECTRON)
// =========================================================================
function openPromptDialog({ title, label, placeholder, defaultValue = '', maxLength, onConfirm }) {
  const modal = document.getElementById('prompt-modal');
  const titleEl = document.getElementById('prompt-modal-title');
  const labelEl = document.getElementById('prompt-modal-label');
  const inputEl = document.getElementById('prompt-modal-input');
  const btnConfirm = document.getElementById('prompt-modal-confirm');
  const btnCancel = document.getElementById('prompt-modal-cancel');
  const btnClose = document.getElementById('prompt-modal-close');

  if (titleEl) titleEl.textContent = title || 'Добавление';
  if (labelEl) labelEl.textContent = label || 'Значение:';
  if (inputEl) {
    inputEl.placeholder = placeholder || '';
    inputEl.value = defaultValue;
    if (maxLength) {
      inputEl.setAttribute('maxlength', maxLength);
    } else {
      inputEl.removeAttribute('maxlength');
    }
  }

  modal.style.display = 'flex';
  setTimeout(() => { if (inputEl) inputEl.focus(); }, 60);

  const cleanup = () => {
    modal.style.display = 'none';
    btnConfirm.onclick = null;
    btnCancel.onclick = null;
    btnClose.onclick = null;
    inputEl.onkeydown = null;
  };

  const handleConfirm = async () => {
    const val = inputEl.value.trim();
    if (!val) return;
    cleanup();
    if (onConfirm) await onConfirm(val);
  };

  btnConfirm.onclick = handleConfirm;
  btnCancel.onclick = cleanup;
  btnClose.onclick = cleanup;
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      cleanup();
    }
  };
}

// =========================================================================
// GLOBAL ERROR HANDLERS
// =========================================================================
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
  showToast('Произошла непредвиденная ошибка. Проверьте консоль для деталей.', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showToast('Ошибка асинхронной операции. Проверьте консоль для деталей.', 'error');
  event.preventDefault();
});

// =========================================================================
// STATE
// =========================================================================
let ACTIVE_EXT_CAT = 'all';
let PROFILES = [];
let PROXIES = [];
let EXTENSIONS = { installed: [], catalog: [] };
let TEMPLATES = [];
let DICTIONARIES = null;
let SETTINGS = {};

let CURRENT_VIEW = 'profiles';
let CURRENT_FOLDER = '';
let FOLDERS = [];
let SELECTED_PROFILE_IDS = new Set();
let PROXY_GEO_CACHE = new Map();
let ACTIVE_FILTER_STATUS = 'all';
let ACTIVE_FILTER_OS = 'all';
let SEARCH_QUERY = '';
let CURRENT_FP = null;
let UPTIME_INTERVAL = null;

// DOM Elements - Main
const tbodyProfiles = document.getElementById('profiles-tbody');
const tbodyProxies = document.getElementById('proxies-tbody');
const emptyState = document.getElementById('empty-state');
const emptyProxiesState = document.getElementById('empty-proxies-state');
const statTotal = document.getElementById('stat-total-profiles');
const statActive = document.getElementById('stat-active-profiles');
const statProxies = document.getElementById('stat-proxies-count');
const sidebarProfileCount = document.getElementById('sidebar-profile-count');
const sidebarProxiesCount = document.getElementById('sidebar-proxies-count');
const sidebarExtCount = document.getElementById('sidebar-ext-count');
const searchInput = document.getElementById('search-input');

// Profile Modal Elements
const profileModal = document.getElementById('profile-modal');
const modalHeading = document.getElementById('modal-heading');
const editProfileId = document.getElementById('edit-profile-id');
const formName = document.getElementById('form-name');
const formTags = document.getElementById('form-tags');
const formNotes = document.getElementById('form-notes');
const formStartUrl = document.getElementById('form-start-url');
const formProxyEnabled = document.getElementById('form-proxy-enabled');
const proxyFields = document.getElementById('proxy-fields-container');
const formSavedProxySelect = document.getElementById('form-saved-proxy-select');
const formProxyProto = document.getElementById('form-proxy-proto');
const formProxyHost = document.getElementById('form-proxy-host');
const formProxyPort = document.getElementById('form-proxy-port');
const formProxyUser = document.getElementById('form-proxy-user');
const formProxyPass = document.getElementById('form-proxy-pass');
const proxyTestResult = document.getElementById('proxy-test-result');

// Profile Manual FP Elements
const selFpGpu = document.getElementById('sel-fp-gpu');
const selFpCores = document.getElementById('sel-fp-cores');
const selFpRam = document.getElementById('sel-fp-ram');
const selFpRes = document.getElementById('sel-fp-res');
const selFpTz = document.getElementById('sel-fp-tz');
const selFpLocale = document.getElementById('sel-fp-locale');
const selFpWebrtc = document.getElementById('sel-fp-webrtc');
const fpUa = document.getElementById('fp-ua');
const fpToggleCanvas = document.getElementById('fp-toggle-canvas');
const fpToggleAudio = document.getElementById('fp-toggle-audio');
const fpToggleDnt = document.getElementById('fp-toggle-dnt');
const extProfileList = document.getElementById('ext-profile-selector-list');

// Other Modals
const addProxyModal = document.getElementById('add-proxy-modal');
const importProxiesModal = document.getElementById('import-proxies-modal');

// =========================================================================
// INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  await checkSystemStatus();
  await loadDictionaries();
  await loadAllData();

  if (window.hyperion && window.hyperion.onProfileStopped) {
    window.hyperion.onProfileStopped((id) => {
      const p = PROFILES.find(x => x.id === id);
      if (p) {
        p.status = 'STOPPED';
        p.startTime = null;
        renderProfiles();
        updateStats();
      }
    });
  }

  UPTIME_INTERVAL = setInterval(updateUptimes, 1000);
});

async function checkSystemStatus() {
  try {
    const status = await window.hyperion.getSystemStatus();
    const dot = document.getElementById('sys-status-dot');
    const label = document.getElementById('sys-engine-name');
    const badge = document.getElementById('settings-chrome-status-badge');
    const pathEl = document.getElementById('settings-engine-path');

    if (status && status.binaryExists) {
      if (dot) {
        dot.className = 'status-dot pulse';
        dot.style.backgroundColor = '';
      }
      if (label) label.textContent = 'Hyperion v' + (status.version || '1.0.4');
      if (badge) {
        badge.className = 'badge badge-success';
        badge.textContent = 'Обнаружен';
        badge.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
        badge.style.color = '#34d399';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      }
    } else {
      if (dot) {
        dot.className = 'status-dot';
        dot.style.backgroundColor = 'var(--accent-rose)';
      }
      if (label) label.textContent = 'Chrome binary missing';
      if (badge) {
        badge.className = 'badge badge-danger';
        badge.textContent = 'Не найден';
        badge.style.backgroundColor = 'rgba(244, 63, 94, 0.15)';
        badge.style.color = '#f43f5e';
        badge.style.borderColor = 'rgba(244, 63, 94, 0.3)';
      }
    }
    if (pathEl) pathEl.textContent = (status && status.binary) ? status.binary : 'Не определен';
  } catch (e) {
    console.error('Status error:', e);
  }
}

async function loadDictionaries() {
  try {
    DICTIONARIES = await window.hyperion.getFpDictionaries();
    populateDropdownDictionaries();
  } catch (e) {
    console.error('Failed to load FP dictionaries:', e);
  }
}

function populateDropdownDictionaries() {
  if (!DICTIONARIES) return;

  // CPU Cores
  selFpCores.innerHTML = DICTIONARIES.CPU_CORES_LIST.map(c =>
    `<option value="${c}">${c} ядер CPU</option>`
  ).join('');

  // RAM
  selFpRam.innerHTML = DICTIONARIES.RAM_LIST.map(r =>
    `<option value="${r}">${r} GB RAM</option>`
  ).join('');

  // Resolutions
  selFpRes.innerHTML = DICTIONARIES.RESOLUTIONS.map(res =>
    `<option value="${res.width}x${res.height}">${res.label}</option>`
  ).join('');

  // Timezones
  selFpTz.innerHTML = DICTIONARIES.TIMEZONES.map(tz =>
    `<option value="${tz.id}">${tz.label}</option>`
  ).join('');

  // Locales
  selFpLocale.innerHTML = DICTIONARIES.LOCALES.map(loc =>
    `<option value="${loc.id}">${loc.label}</option>`
  ).join('');

  // WebRTC
  selFpWebrtc.innerHTML = DICTIONARIES.WEBRTC_MODES.map(m =>
    `<option value="${m.id}">${m.label}</option>`
  ).join('');
}

function populateGpuDropdown(os) {
  if (!DICTIONARIES || !DICTIONARIES.GPU_PROFILES) return;
  const list = DICTIONARIES.GPU_PROFILES[os] || DICTIONARIES.GPU_PROFILES.windows;
  selFpGpu.innerHTML = list.map(gpu =>
    `<option value="${escapeHtml(gpu.renderer)}">${escapeHtml(gpu.name)}</option>`
  ).join('');
}

async function loadAllData() {
  await Promise.all([
    loadFolders(),
    loadProfiles(),
    loadProxies(),
    loadExtensions(),
    loadTemplates(),
    loadSettings()
  ]);
}

async function loadProfiles() {
  try {
    PROFILES = await window.hyperion.getProfiles();
    renderProfiles();
    updateStats();
  } catch (e) {
    console.error('Load profiles error:', e);
  }
}

async function loadProxies() {
  try {
    PROXIES = await window.hyperion.getProxies();
    renderProxies();
    updateStats();
  } catch (e) {
    console.error('Load proxies error:', e);
  }
}

async function loadExtensions() {
  try {
    EXTENSIONS = await window.hyperion.getExtensions();
    renderExtensions();
    updateStats();
  } catch (e) {
    console.error('Load extensions error:', e);
  }
}

async function loadTemplates() {
  try {
    TEMPLATES = await window.hyperion.getTemplates();
    renderTemplates();
  } catch (e) {
    console.error('Load templates error:', e);
  }
}

async function loadSettings() {
  try {
    SETTINGS = await window.hyperion.getSettings();
    const urlEl = document.getElementById('settings-default-url');
    if (urlEl) urlEl.value = SETTINGS.default_url || 'https://google.com';
  } catch (e) {
    console.error('Load settings error:', e);
  }
}

function updateStats() {
  const total = PROFILES.length;
  const active = PROFILES.filter(p => p.status === 'RUNNING').length;
  const proxiesCount = PROXIES.length;
  const extCount = EXTENSIONS.installed.length;

  statTotal.textContent = total;
  statActive.textContent = active;
  statProxies.textContent = proxiesCount;
  sidebarProfileCount.textContent = total;
  sidebarProxiesCount.textContent = proxiesCount;
  sidebarExtCount.textContent = extCount;

  const tagEl = document.getElementById('installed-ext-count-tag');
  if (tagEl) tagEl.textContent = `${extCount} установлено`;
}

function updateUptimes() {
  const uptimeEls = document.querySelectorAll('.profile-uptime[data-start-time]');
  uptimeEls.forEach(el => {
    const startTime = parseInt(el.getAttribute('data-start-time'));
    if (!startTime) return;
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    el.textContent = `В сети: ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });
}

// =========================================================================
// VIEW NAVIGATION
// =========================================================================
function switchMainView(viewName) {
  CURRENT_VIEW = viewName;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });
  document.querySelectorAll('.view-pane').forEach(pane => {
    pane.style.display = pane.id === `view-${viewName}` ? 'flex' : 'none';
  });

  if (viewName === 'profiles') renderProfiles();
  if (viewName === 'proxies') renderProxies();
  if (viewName === 'fingerprints') renderTemplates();
  if (viewName === 'extensions') renderExtensions();
}

// =========================================================================
// VIEW 1: PROFILES RENDERING & ACTIONS
// =========================================================================
function getFilteredProfiles() {
  return PROFILES.filter(p => {
    if (ACTIVE_FILTER_STATUS === 'running' && p.status !== 'RUNNING') return false;
    if (ACTIVE_FILTER_STATUS === 'stopped' && p.status === 'RUNNING') return false;
    if (ACTIVE_FILTER_OS !== 'all' && (p.os || 'windows') !== ACTIVE_FILTER_OS) return false;
    if (CURRENT_FOLDER && CURRENT_FOLDER !== 'Все профили' && (p.folder || '') !== CURRENT_FOLDER) return false;

    if (SEARCH_QUERY) {
      const q = SEARCH_QUERY.toLowerCase();
      const matchName = p.name && p.name.toLowerCase().includes(q);
      const matchTags = p.tags && p.tags.some(t => t.toLowerCase().includes(q));
      const matchProxy = p.proxy && p.proxy.host && p.proxy.host.toLowerCase().includes(q);
      return matchName || matchTags || matchProxy;
    }
    return true;
  });
}

function renderProfiles() {
  const filtered = getFilteredProfiles();

  if (filtered.length === 0) {
    tbodyProfiles.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  tbodyProfiles.innerHTML = filtered.map(p => {
    const isRunning = p.status === 'RUNNING';
    const os = p.os || 'windows';
    const osIcon = getOsSvg(os);
    const fp = p.fingerprint || {};
  const tagsHtml = (p.tags || []).map(t => `<span class="tag-badge">${escapeHtml(t)} <span class="tag-remove-x" onclick="removeTagFromProfile('${escapeHtml(p.id)}', '${escapeHtml(t)}', event)" title="Удалить тег">&times;</span></span>`).join('') + `<button class="btn-add-tag-inline" onclick="promptAddTag('${escapeHtml(p.id)}', event)" title="Добавить тег">+</button>`;

    let proxyHtml = '<span class="proxy-direct">Прямое подключение</span>';
    if (p.proxy && p.proxy.enabled && p.proxy.host) {
      const geo = PROXY_GEO_CACHE.get(p.proxy.host);
      const geoFlag = geo && geo.countryCode ? getCountryFlag(geo.countryCode) + " " + geo.countryCode : "";
      const rotateBtn = p.proxy.change_ip_url ? `<button class="btn-rotate" onclick="triggerProxyRotate('${escapeHtml(p.id)}', '${escapeHtml(p.proxy.id || '')}', event)" title="Сменить IP">🔄 Сменить IP</button>` : '';
      proxyHtml = `
        <div class="proxy-meta">
          <span class="proxy-host">${geoFlag ? geoFlag + " " : ""}${escapeHtml(p.proxy.host)}:${escapeHtml(p.proxy.port || '80')}</span>
          <span class="proxy-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg>
            ${(p.proxy.protocol || 'SOCKS5').toUpperCase()}
          </span>
          ${rotateBtn}
        </div>
      `;
    }

    const gpuShort = fp.webgl?.unmasked_renderer
      ? fp.webgl.unmasked_renderer.replace(/ANGLE \(|Direct3D11.*|\(0x[0-9A-Fa-f]+\)/g, '').trim().slice(0, 60)
      : 'Hardware GPU';

    const extCount = (p.extensions || []).length;
    const extHtml = extCount > 0
      ? `<span class="tag-badge" style="color:#34d399; border-color:rgba(16,185,129,0.3);">🧩 ${extCount} плаг.</span>`
      : `<span style="color:var(--text-dim); font-size:12px;">—</span>`;

    return `
      <tr data-id="${escapeHtml(p.id)}">
        <td>
          <input type="checkbox" class="profile-row-check" value="${escapeHtml(p.id)}" ${SELECTED_PROFILE_IDS.has(p.id) ? 'checked' : ''} onchange="toggleProfileSelect('${escapeHtml(p.id)}', this.checked)">
        </td>
        <td>
          <span class="status-pill ${isRunning ? 'running' : 'stopped'}">
            <span class="status-dot-mini ${isRunning ? 'green' : ''}"></span>
            ${isRunning ? 'В СЕТИ' : 'OFF'}
          </span>
        </td>
        <td>
          <div class="profile-meta">
            <div class="os-badge" title="${os}">
              ${osIcon}
            </div>
            <div class="profile-info">
              <span class="profile-name">${escapeHtml(p.name)}</span>
              ${isRunning
                ? `<span class="profile-uptime" data-start-time="${p.startTime || Date.now()}">В сети: 00:00</span>`
                : (p.notes ? `<span class="profile-notes-sub">${escapeHtml(p.notes.slice(0, 32))}...</span>` : '')
              }
            </div>
          </div>
        </td>
        <td>
          <div class="tag-list">${tagsHtml || '<span style="color:var(--text-dim); font-size:12px;">—</span>'}</div>
        </td>
        <td>
          ${proxyHtml}
        </td>
        <td>
          <div class="fp-cell">
            <span class="fp-gpu-name" title="${escapeHtml(fp.webgl?.unmasked_renderer || 'Hardware GPU')}">${escapeHtml(gpuShort)}</span>
            <div class="fp-hw-badges">
              <span class="fp-pill">${fp.hardware?.concurrency || 8} Cores</span>
              <span class="fp-pill">${fp.hardware?.memory || 16} GB</span>
              <span class="fp-pill">${fp.screen?.width || 1920}x${fp.screen?.height || 1080}</span>
              <span class="fp-pill" style="color: var(--accent-emerald);">Canvas Noise</span>
            </div>
          </div>
        </td>
        <td>
          ${extHtml}
        </td>
        <td>
          <div class="row-actions">
            ${isRunning ? `
              <button class="btn btn-stop" onclick="stopProfile('${escapeHtml(p.id)}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                <span>Стоп</span>
              </button>
            ` : `
              <button class="btn btn-start" onclick="startProfile('${escapeHtml(p.id)}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Старт</span>
              </button>
            `}
            <button class="btn-icon" onclick="editProfile('${escapeHtml(p.id)}')" title="Настроить профиль">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
            <button class="btn-icon" onclick="cloneProfile('${escapeHtml(p.id)}')" title="Клонировать профиль">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button class="btn-icon" onclick="openProfileCookies('${escapeHtml(p.id)}')" title="Управление Cookies" style="font-size:14px;">
              🍪
            </button>
            <button class="btn-icon" onclick="openWarmupRobot('${escapeHtml(p.id)}')" title="Cookie Robot (Прогрев)" style="color:var(--accent-amber);">
              🤖
            </button>
            <button class="btn-icon" onclick="exportProfilePackage('${escapeHtml(p.id)}')" title="Экспорт в архив .hyperion">
              📦
            </button>
            <button class="btn-icon" onclick="openProfileFolder('${escapeHtml(p.id)}')" title="Открыть папку данных">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button class="btn-icon" onclick="deleteProfile('${escapeHtml(p.id)}')" title="Удалить" style="color: var(--accent-rose);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  updateUptimes();
}

window.startProfile = async (id) => {
  try {
    const res = await window.hyperion.startProfile(id);
    const p = PROFILES.find(x => x.id === id);
    if (p) {
      p.status = 'RUNNING';
      p.pid = res.pid;
      p.startTime = Date.now();
    }
    renderProfiles();
    updateStats();
  } catch (e) {
    alert('Ошибка запуска: ' + e.message);
  }
};

window.stopProfile = async (id) => {
  try {
    await window.hyperion.stopProfile(id);
    const p = PROFILES.find(x => x.id === id);
    if (p) {
      p.status = 'STOPPED';
      p.startTime = null;
    }
    renderProfiles();
    updateStats();
  } catch (e) {
    alert('Ошибка остановки: ' + e.message);
  }
};

window.cloneProfile = async (id) => {
  try {
    const cloned = await window.hyperion.cloneProfile(id);
    PROFILES.unshift(cloned);
    renderProfiles();
    updateStats();
  } catch (e) {
    alert('Ошибка клонирования: ' + e.message);
  }
};

window.openProfileFolder = async (id) => {
  try {
    await window.hyperion.openProfileFolder(id);
  } catch (e) {
    alert('Ошибка открытия директории: ' + e.message);
  }
};

window.deleteProfile = async (id) => {
  const p = PROFILES.find(x => x.id === id);
  if (!p) return;
  const ok = await showConfirmDialog({
    title: 'Удаление профиля',
    message: `Удалить профиль "${p.name}" и все его данные? Это действие необратимо.`,
    confirmText: 'Удалить',
    isDanger: true
  });
  if (!ok) return;

  try {
    await window.hyperion.deleteProfile(id);
    PROFILES = PROFILES.filter(x => x.id !== id);
    renderProfiles();
    updateStats();
  } catch (e) {
    alert('Ошибка удаления: ' + e.message);
  }
};

// =========================================================================
// VIEW 2: PROXIES RENDERING & ACTIONS
// =========================================================================
function renderProxies() {
  if (PROXIES.length === 0) {
    tbodyProxies.innerHTML = '';
    emptyProxiesState.style.display = 'flex';
    return;
  }

  emptyProxiesState.style.display = 'none';
  tbodyProxies.innerHTML = PROXIES.map(px => {
    let pingText = '<span style="color:var(--text-dim);">Не проверен</span>';
    if (px.status === 'checking') {
      pingText = '<span style="color:var(--accent-amber);">Проверка...</span>';
    } else if (px.ping !== null && px.ping !== undefined) {
      pingText = `<span style="color:var(--accent-emerald); font-weight:700; font-family:var(--font-mono);">${px.ping} ms</span>`;
    } else if (px.error) {
      pingText = `<span style="color:var(--accent-rose); font-size:11px;">Ошибка</span>`;
    }

    return `
      <tr>
        <td>
          <span class="proxy-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg>
            ${(px.protocol || 'SOCKS5').toUpperCase()}
          </span>
        </td>
        <td>
          <strong style="font-family:var(--font-mono); color:#fff;">${escapeHtml(px.host)}</strong>
        </td>
        <td>
          <span style="font-family:var(--font-mono);">${escapeHtml(px.port)}</span>
        </td>
        <td>
          <span style="color:var(--text-muted);">${px.user ? escapeHtml(px.user) : '—'}</span>
        </td>
        <td>
          ${pingText}
        </td>
        <td>
          <div class="row-actions">
            <button class="btn btn-secondary" style="padding:4px 10px; font-size:11.5px;" onclick="testSingleProxy('${escapeHtml(px.id)}')">
              Проверить
            </button>
            <button class="btn-icon" onclick="deleteProxy('${escapeHtml(px.id)}')" title="Удалить" style="color:var(--accent-rose);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.testSingleProxy = async (id) => {
  const px = PROXIES.find(x => x.id === id);
  if (!px) return;
  px.status = 'checking';
  renderProxies();

  const res = await window.hyperion.testProxy(px);
  if (res.success) {
    px.ping = res.ping;
    px.status = 'online';
    px.error = null;
  } else {
    px.ping = null;
    px.status = 'offline';
    px.error = res.error;
  }
  renderProxies();
};

window.deleteProxy = async (id) => {
  const ok = await showConfirmDialog({
    title: 'Удаление прокси',
    message: 'Удалить этот прокси из списка?',
    confirmText: 'Удалить',
    isDanger: true
  });
  if (!ok) return;
  await window.hyperion.deleteProxy(id);
  PROXIES = PROXIES.filter(x => x.id !== id);
  renderProxies();
  updateStats();
};

// =========================================================================
// VIEW 3: TEMPLATES / FINGERPRINTS LIBRARY
// =========================================================================
function renderTemplates() {
  const grid = document.getElementById('templates-grid');
  grid.innerHTML = TEMPLATES.map(tpl => {
    const isCustom = Boolean(tpl.isCustom || (tpl.id && tpl.id.startsWith('custom_')));
    return `
      <div class="template-card">
        <div class="tpl-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="tpl-name">${escapeHtml(tpl.name)}</span>
            ${isCustom
              ? `<span class="tag-badge" style="color:var(--accent-emerald); border-color:rgba(16,185,129,0.3); font-size:10px;">Пользовательский</span>`
              : `<span class="tag-badge" style="font-size:10px;">Эталонный</span>`
            }
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="os-badge">${getOsSvg(tpl.os)}</div>
            ${isCustom ? `
              <button class="btn-icon" onclick="deleteCustomTemplate('${escapeHtml(tpl.id)}')" title="Удалить шаблон" style="color:var(--accent-rose);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
        <div class="tpl-specs">
          <div class="tpl-spec-item">Видеокарта: <strong>${escapeHtml(tpl.gpu)}</strong></div>
          <div class="tpl-spec-item">CPU / RAM: <strong>${tpl.cores} ядер, ${tpl.ram} GB</strong></div>
          <div class="tpl-spec-item">Разрешение: <strong>${tpl.res}</strong></div>
          ${tpl.tz ? `<div class="tpl-spec-item">Timezone: <strong>${tpl.tz}</strong></div>` : ''}
        </div>
        <button class="btn btn-secondary" style="width:100%; margin-top:8px;" onclick="applyTemplateToNewProfile('${escapeHtml(tpl.id)}')">
          Создать профиль из шаблона
        </button>
      </div>
    `;
  }).join('');

  // Also render hardware dictionary stats
  const dictGrid = document.getElementById('dict-grid'); if (!dictGrid) return;
  if (dictGrid && DICTIONARIES) {
    dictGrid.innerHTML = `
      <div style="display:flex; gap:16px; flex-wrap:wrap;">
        <div class="stat-card" style="flex:1;">
          <div class="stat-icon icon-blue">GPU</div>
          <div>
            <div class="stat-value">${Object.values(DICTIONARIES.GPU_PROFILES || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0)} видеокарт</div>
            <div class="stat-label">NVIDIA RTX 40/30, Apple A17/M3/M2, Qualcomm Adreno 750/740, ARM Immortalis/Mali, AMD, Intel</div>
          </div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-icon icon-cyan">CPU</div>
          <div>
            <div class="stat-value">2 – 64 ядер</div>
            <div class="stat-label">Подмена navigator.hardwareConcurrency</div>
          </div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-icon icon-purple">RAM</div>
          <div>
            <div class="stat-value">4 – 128 GB</div>
            <div class="stat-label">Подмена navigator.deviceMemory</div>
          </div>
        </div>
      </div>
    `;
  }
}

window.deleteCustomTemplate = async (tplId) => {
  const ok = await showConfirmDialog({
    title: 'Удаление шаблона',
    message: 'Удалить этот шаблон отпечатка?',
    confirmText: 'Удалить',
    isDanger: true
  });
  if (!ok) return;
  await window.hyperion.deleteTemplate(tplId);
  await loadTemplates();
};

window.applyTemplateToNewProfile = (tplId) => {
  const tpl = TEMPLATES.find(t => t.id === tplId);
  if (!tpl) return;
  openCreateModal();
  formName.value = `${tpl.name} #1`;

  const radio = document.querySelector(`input[name="form-os"][value="${tpl.os}"]`);
  if (radio) {
    radio.checked = true;
    populateGpuDropdown(tpl.os);
  }

  // Set dropdowns
  selFpCores.value = tpl.cores;
  selFpRam.value = tpl.ram;
  selFpRes.value = tpl.res;
  if (tpl.tz) selFpTz.value = tpl.tz;
  if (tpl.locale) selFpLocale.value = tpl.locale;
  if (tpl.webrtc) selFpWebrtc.value = tpl.webrtc;

  // Find GPU in select
  for (let i = 0; i < selFpGpu.options.length; i++) {
    if (selFpGpu.options[i].text.includes(tpl.gpu) || selFpGpu.options[i].value.includes(tpl.gpu)) {
      selFpGpu.selectedIndex = i;
      break;
    }
  }

  syncFingerprintFromDropdowns();
  switchMainView('profiles');
};

// =========================================================================
// VIEW 4: EXTENSIONS MANAGER
// =========================================================================
function renderExtensions() {
  const installedGrid = document.getElementById('installed-ext-grid');
  const catalogGrid = document.getElementById('catalog-ext-grid');

  if (EXTENSIONS.installed.length === 0) {
    installedGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; background: var(--bg-card); border-radius: var(--radius-md); color: var(--text-muted); text-align: center;">
        Расширения еще не установлены. Установите любое из каталога ниже в 1 клик или загрузите из папки.
      </div>
    `;
  } else {
    installedGrid.innerHTML = EXTENSIONS.installed.map(ext => `
      <div class="ext-card">
        <div class="ext-icon">${ext.icon || '🧩'}</div>
        <div class="ext-info">
          <div class="ext-title-row">
            <span class="ext-name">${escapeHtml(ext.name)}</span>
            <span class="ext-ver">v${escapeHtml(ext.version)}</span>
          </div>
          <p class="ext-desc">${escapeHtml(ext.description)}</p>
          <div class="ext-footer">
            <button class="btn btn-secondary" style="color:var(--accent-rose); font-size:11.5px; padding:4px 10px;" onclick="deleteExtension('${escapeHtml(ext.id)}')">
              Удалить
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  const filteredCatalog = EXTENSIONS.catalog.filter(cat => {
    if (ACTIVE_EXT_CAT === 'all') return true;
    return cat.category === ACTIVE_EXT_CAT;
  });

  catalogGrid.innerHTML = filteredCatalog.map(cat => {
    const isInstalled = EXTENSIONS.installed.some(e => e.id === cat.id);
    return `
      <div class="ext-card">
        <div class="ext-icon">${cat.icon || '🧩'}</div>
        <div class="ext-info">
          <div class="ext-title-row">
            <span class="ext-name">${escapeHtml(cat.name)}</span>
            <span class="ext-ver">${cat.category}</span>
          </div>
          <p class="ext-desc">${escapeHtml(cat.description)}</p>
          <div class="ext-footer">
            ${isInstalled ? `
              <button class="btn btn-secondary" disabled style="font-size:11.5px; padding:4px 10px; color:var(--accent-emerald);">
                ✓ Установлено
              </button>
            ` : `
              <button class="btn btn-primary" id="btn-inst-${escapeHtml(cat.id)}" style="font-size:11.5px; padding:4px 12px;" onclick="installCatalogExtension('${escapeHtml(cat.id)}')">
                Установить
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.installCatalogExtension = async (extId) => {
  const btn = document.getElementById(`btn-inst-${extId}`);
  if (btn) {
    btn.textContent = 'Загрузка...';
    btn.disabled = true;
  }

  try {
    const res = await window.hyperion.installExtension(extId);
    if (res.success) {
      await loadExtensions();
    } else {
      alert('Ошибка установки расширения: ' + res.error);
      if (btn) {
        btn.textContent = 'Установить';
        btn.disabled = false;
      }
    }
  } catch (e) {
    alert('Ошибка: ' + e.message);
    if (btn) {
      btn.textContent = 'Установить';
      btn.disabled = false;
    }
  }
};

window.deleteExtension = async (extId) => {
  const ok = await showConfirmDialog({
    title: 'Удаление расширения',
    message: 'Удалить это расширение из системы?',
    confirmText: 'Удалить',
    isDanger: true
  });
  if (!ok) return;
  await window.hyperion.deleteExtension(extId);
  await loadExtensions();
};

// =========================================================================
// PROFILE MODAL & MANUAL DROPDOWN LOGIC
// =========================================================================
function openCreateModal() {
  editProfileId.value = '';
  modalHeading.textContent = 'Новый профиль';
  formName.value = `Профиль #${PROFILES.length + 1}`;
  formTags.value = '';
  formNotes.value = '';
  formStartUrl.value = SETTINGS.default_url || 'https://google.com';

  document.querySelector('input[name="form-os"][value="windows"]').checked = true;
  populateGpuDropdown('windows');

  formProxyEnabled.checked = false;
  proxyFields.style.display = 'none';
  populateSavedProxiesSelect();

  formProxyHost.value = '';
  formProxyPort.value = '';
  formProxyUser.value = '';
  formProxyPass.value = '';
  proxyTestResult.textContent = '';

  renderProfileExtensionsSelector([]);
  rerollCurrentFingerprint();
  const cTa = document.getElementById('cookies-textarea');
  if (cTa) cTa.value = '';
  const cHint = document.getElementById('cookies-status-hint');
  if (cHint) {
    cHint.textContent = 'Поддерживается стандартный экспорт из расширений Cookie-Editor и EditThisCookie';
    cHint.style.color = 'var(--text-dim)';
  }
  switchTab('general');
  profileModal.style.display = 'flex';
}

window.openProfileCookies = (id) => {
  window.editProfile(id);
  switchTab('cookies');
};

window.editProfile = (id) => {
  const p = PROFILES.find(x => x.id === id);
  if (!p) return;

  editProfileId.value = p.id;
  modalHeading.textContent = 'Редактировать профиль';
  formName.value = p.name || '';
  formTags.value = (p.tags || []).join(', ');
  formNotes.value = p.notes || '';
  formStartUrl.value = p.fingerprint?.start_url || SETTINGS.default_url || 'https://google.com';

  const os = p.os || 'windows';
  const osRadio = document.querySelector(`input[name="form-os"][value="${os}"]`);
  if (osRadio) osRadio.checked = true;
  populateGpuDropdown(os);

  populateSavedProxiesSelect();
  if (p.proxy && p.proxy.enabled) {
    formProxyEnabled.checked = true;
    proxyFields.style.display = 'block';
    formProxyProto.value = p.proxy.protocol || 'socks5';
    formProxyHost.value = p.proxy.host || '';
    formProxyPort.value = p.proxy.port || '';
    formProxyUser.value = p.proxy.user || '';
    formProxyPass.value = p.proxy.pass || '';
  } else {
    formProxyEnabled.checked = false;
    proxyFields.style.display = 'none';
  }

  CURRENT_FP = p.fingerprint;
  applyFingerprintToDropdowns(CURRENT_FP);

  renderProfileExtensionsSelector(p.extensions || []);

  proxyTestResult.textContent = '';
  switchTab('general');
  profileModal.style.display = 'flex';
};

function populateSavedProxiesSelect() {
  formSavedProxySelect.innerHTML = '<option value="">— Ввести вручную —</option>' +
    PROXIES.map(px => `
      <option value="${px.id}">${escapeHtml(px.title || `${px.host}:${px.port}`)} (${px.protocol.toUpperCase()})</option>
    `).join('');
}

function renderProfileExtensionsSelector(selectedIds = []) {
  if (EXTENSIONS.installed.length === 0) {
    extProfileList.innerHTML = `
      <div style="padding:16px; background:var(--bg-card); border-radius:var(--radius-md); color:var(--text-muted); font-size:13px;">
        Нет установленных расширений. Перейдите во вкладку «Расширения» в главном меню для добавления плагинов.
      </div>
    `;
    return;
  }

  extProfileList.innerHTML = EXTENSIONS.installed.map(ext => {
    const isChecked = selectedIds.includes(ext.id);
    return `
      <label class="ext-selector-item">
        <input type="checkbox" class="profile-ext-checkbox" value="${ext.id}" ${isChecked ? 'checked' : ''}>
        <span style="font-size:20px;">${ext.icon || '🧩'}</span>
        <div style="flex:1;">
          <strong style="color:#fff; font-size:13px;">${escapeHtml(ext.name)}</strong>
          <div style="font-size:11px; color:var(--text-dim);">${escapeHtml(ext.description)}</div>
        </div>
      </label>
    `;
  }).join('');
}

function applyFingerprintToDropdowns(fp) {
  if (!fp) return;

  // GPU
  if (fp.webgl?.unmasked_renderer) {
    for (let i = 0; i < selFpGpu.options.length; i++) {
      if (selFpGpu.options[i].value === fp.webgl.unmasked_renderer) {
        selFpGpu.selectedIndex = i;
        break;
      }
    }
  }

  // CPU
  if (fp.hardware?.concurrency) {
    selFpCores.value = fp.hardware.concurrency;
  }

  // RAM
  if (fp.hardware?.memory) {
    selFpRam.value = fp.hardware.memory;
  }

  // Screen
  if (fp.screen?.width && fp.screen?.height) {
    selFpRes.value = `${fp.screen.width}x${fp.screen.height}`;
  }

  // Timezone
  if (fp.timezone) selFpTz.value = fp.timezone;

  // Locale
  if (fp.locale) selFpLocale.value = fp.locale;

  // WebRTC
  if (fp.webrtc_mode) selFpWebrtc.value = fp.webrtc_mode;

  // UA
  fpUa.value = fp.user_agent || '';

  // Toggles
  fpToggleCanvas.checked = fp.canvas_noise !== false;
  fpToggleAudio.checked = fp.audio_noise !== false;
  fpToggleDnt.checked = fp.do_not_track !== '0';
}

function syncFingerprintFromDropdowns() {
  if (!CURRENT_FP) return;

  const [w, h] = selFpRes.value.split('x').map(x => parseInt(x) || 1920);
  const selectedGpuText = selFpGpu.value;

  CURRENT_FP.hardware = {
    concurrency: parseInt(selFpCores.value) || 8,
    memory: parseInt(selFpRam.value) || 16
  };

  CURRENT_FP.screen = {
    ...CURRENT_FP.screen,
    width: w,
    height: h,
    avail_width: w,
    avail_height: h - 40
  };

  CURRENT_FP.webgl = {
    ...CURRENT_FP.webgl,
    unmasked_renderer: selectedGpuText,
    renderer: selectedGpuText
  };

  CURRENT_FP.timezone = selFpTz.value;
  CURRENT_FP.locale = selFpLocale.value;
  CURRENT_FP.webrtc_mode = selFpWebrtc.value;
  CURRENT_FP.user_agent = fpUa.value;
  CURRENT_FP.canvas_noise = fpToggleCanvas.checked;
  CURRENT_FP.audio_noise = fpToggleAudio.checked;
  CURRENT_FP.do_not_track = fpToggleDnt.checked ? '1' : '0';
  CURRENT_FP.start_url = formStartUrl.value;
}

async function rerollCurrentFingerprint() {
  const os = document.querySelector('input[name="form-os"]:checked')?.value || 'windows';
  CURRENT_FP = await window.hyperion.getPreviewFingerprint(os);
  applyFingerprintToDropdowns(CURRENT_FP);
}

function closeModal() {
  profileModal.style.display = 'none';
}

function switchTab(tabName) {
  document.querySelectorAll('.modal-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === `pane-${tabName}`);
  });
}

// =========================================================================
// EVENT LISTENERS INITIALIZATION
// =========================================================================
function initEventListeners() {

  // FEATURE HOOKS
  document.getElementById('btn-add-folder')?.addEventListener('click', window.createNewFolder);
  document.getElementById('btn-open-bulk-create')?.addEventListener('click', window.openBulkCreateModal);
  document.getElementById('btn-close-bulk-create')?.addEventListener('click', window.closeBulkCreateModal);
  document.getElementById('btn-cancel-bulk-create')?.addEventListener('click', window.closeBulkCreateModal);
  document.getElementById('btn-submit-bulk-create')?.addEventListener('click', window.submitBulkCreate);

  document.getElementById('btn-import-hyperion-pkg')?.addEventListener('click', window.importProfilePackage);

  document.getElementById('btn-close-warmup')?.addEventListener('click', window.closeWarmupRobot);
  document.getElementById('btn-cancel-warmup')?.addEventListener('click', window.closeWarmupRobot);
  document.getElementById('btn-start-warmup')?.addEventListener('click', window.startWarmupSession);

  // BULK ACTIONS LISTENERS
  const thCheckAll = document.getElementById('th-check-all-profiles');
  if (thCheckAll) {
    thCheckAll.addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('.profile-row-check').forEach(cb => {
        cb.checked = checked;
        const id = cb.value;
        if (checked) SELECTED_PROFILE_IDS.add(id);
        else SELECTED_PROFILE_IDS.delete(id);
      });
      updateBulkBar();
    });
  }

  const btnBulkStart = document.getElementById('btn-bulk-start');
  if (btnBulkStart) btnBulkStart.addEventListener('click', window.bulkStartSelected);

  const btnBulkStop = document.getElementById('btn-bulk-stop');
  if (btnBulkStop) btnBulkStop.addEventListener('click', window.bulkStopSelected);

  const btnBulkDel = document.getElementById('btn-bulk-delete');
  if (btnBulkDel) btnBulkDel.addEventListener('click', window.bulkDeleteSelected);

  // COOKIE MODAL LISTENERS
  const btnExpCookies = document.getElementById('btn-export-profile-cookies');
  if (btnExpCookies) btnExpCookies.addEventListener('click', window.exportProfileCookies);

  const btnImpCookies = document.getElementById('btn-import-profile-cookies');
  if (btnImpCookies) btnImpCookies.addEventListener('click', window.importProfileCookies);
  // Sidebar Navigation
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchMainView(btn.getAttribute('data-view'));
    });
  });

  // Topbar search & filters
  searchInput.addEventListener('input', (e) => {
    SEARCH_QUERY = e.target.value.trim();
    renderProfiles();
  });

  document.querySelectorAll('[data-filter-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-status]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ACTIVE_FILTER_STATUS = btn.getAttribute('data-filter-status');
      renderProfiles();
    });
  });

  document.querySelectorAll('[data-filter-os]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-os]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ACTIVE_FILTER_OS = btn.getAttribute('data-filter-os');
      renderProfiles();
    });
  });

  document.getElementById('btn-refresh')?.addEventListener('click', loadProfiles);
  document.getElementById('btn-create-profile').addEventListener('click', openCreateModal);

  // Split button dropdown logic
  const ddBtn = document.getElementById('btn-create-profile-dropdown');
  const ddMenu = document.getElementById('menu-create-profile');
  if (ddBtn && ddMenu) {
    ddBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ddMenu.style.display = ddMenu.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', (e) => {
      if (!ddMenu.contains(e.target) && e.target !== ddBtn) {
        ddMenu.style.display = 'none';
      }
    });
  }

  document.getElementById('menu-item-new-profile')?.addEventListener('click', () => {
    if (ddMenu) ddMenu.style.display = 'none';
    openCreateModal();
  });

  document.getElementById('menu-item-import-file')?.addEventListener('click', () => {
    if (ddMenu) ddMenu.style.display = 'none';
    window.importProfilePackage();
  });

  document.getElementById('menu-item-bulk-create')?.addEventListener('click', () => {
    if (ddMenu) ddMenu.style.display = 'none';
    const bulkModal = document.getElementById('bulk-create-modal');
    if (bulkModal) bulkModal.style.display = 'flex';
  });

  // Settings Update Listeners
  document.getElementById('btn-settings-check-update')?.addEventListener('click', () => window.checkSettingsUpdates(true));
  document.getElementById('btn-settings-start-download')?.addEventListener('click', () => window.startInAppUpdate());
  document.getElementById('btn-settings-apply-restart')?.addEventListener('click', () => window.applyInAppUpdate());
  document.getElementById('sidebar-status-btn')?.addEventListener('click', () => {
    switchMainView('settings');
    const dot = document.getElementById('sys-status-dot');
    const isMissing = dot && (dot.style.backgroundColor !== '');
    if (isMissing) {
      const card = document.getElementById('settings-engine-card');
      card?.scrollIntoView({ behavior: 'smooth' });
      card?.style.setProperty('border-color', 'var(--accent-rose)');
      setTimeout(() => card?.style.removeProperty('border-color'), 2500);
    } else {
      document.getElementById('settings-update-card')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
  document.getElementById('btn-global-open-settings-update')?.addEventListener('click', () => {
    switchMainView('settings');
    document.getElementById('settings-update-card')?.scrollIntoView({ behavior: 'smooth' });
    if (CURRENT_UPDATE_INFO && !IS_DOWNLOADING_UPDATE) {
      window.startInAppUpdate();
    }
  });

  // Background auto-check for updates after boot
  setTimeout(() => window.checkSettingsUpdates(false), 3000);
  document.getElementById('btn-empty-create').addEventListener('click', openCreateModal);

  // Profile Modal controls
  document.getElementById('btn-modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);

  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-tab'));
    });
  });

  // OS change re-populates GPU options and re-rolls fingerprint
  document.querySelectorAll('input[name="form-os"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      populateGpuDropdown(e.target.value);
      rerollCurrentFingerprint();
    });
  });

  // Dropdown manual changes update CURRENT_FP
  [selFpGpu, selFpCores, selFpRam, selFpRes, selFpTz, selFpLocale, selFpWebrtc, fpUa, fpToggleCanvas, fpToggleAudio, fpToggleDnt].forEach(el => {
    el.addEventListener('change', syncFingerprintFromDropdowns);
  });

  document.getElementById('btn-reroll-fp').addEventListener('click', rerollCurrentFingerprint);

  // Proxy toggle
  formProxyEnabled.addEventListener('change', () => {
    proxyFields.style.display = formProxyEnabled.checked ? 'block' : 'none';
  });

  // Saved proxy selection
  formSavedProxySelect.addEventListener('change', (e) => {
    const pxId = e.target.value;
    if (!pxId) return;
    const px = PROXIES.find(x => x.id === pxId);
    if (px) {
      formProxyProto.value = px.protocol || 'socks5';
      formProxyHost.value = px.host || '';
      formProxyPort.value = px.port || '';
      formProxyUser.value = px.user || '';
      formProxyPass.value = px.pass || '';
    }
  });

  // Proxy test
  document.getElementById('btn-test-proxy').addEventListener('click', async () => {
    const host = formProxyHost.value.trim();
    const port = formProxyPort.value.trim();
    if (!host || !port) {
      proxyTestResult.className = 'proxy-test-result error';
      proxyTestResult.textContent = 'Укажите хост и порт';
      return;
    }

    proxyTestResult.className = 'proxy-test-result';
    proxyTestResult.textContent = 'Проверка...';

    const res = await window.hyperion.testProxy({ host, port });
    if (res.success) {
      proxyTestResult.className = 'proxy-test-result success';
      proxyTestResult.textContent = `Успешно! Пинг: ${res.ping}ms`;
    } else {
      proxyTestResult.className = 'proxy-test-result error';
      proxyTestResult.textContent = `Ошибка: ${res.error}`;
    }
  });

  
  // Live tag input limiter (max TAG_MAX_LENGTH chars per individual tag)
  formTags.addEventListener('input', () => {
    const raw = formTags.value;
    const parts = raw.split(/([,\s]+)/); // preserve delimiters
    const constrained = parts.map((chunk, idx) => {
      // even indexes are tag text, odd are delimiters
      if (idx % 2 === 0) {
        return chunk.slice(0, TAG_MAX_LENGTH);
      }
      return chunk;
    }).join('');
    if (constrained !== raw) {
      formTags.value = constrained;
    }
  });

  // Save profile
  document.getElementById('btn-modal-save').addEventListener('click', async () => {
    const name = formName.value.trim().slice(0, PROFILE_NAME_MAX_LENGTH);
    if (!name) {
      alert(`Введите название профиля (до ${PROFILE_NAME_MAX_LENGTH} символов)`);
      return;
    }

    const os = document.querySelector('input[name="form-os"]:checked')?.value || 'windows';
    const tags = formTags.value.split(/[,\s]+/)
      .map(t => t.trim().replace(/^#/, '').slice(0, TAG_MAX_LENGTH))
      .filter(Boolean);
    const notes = formNotes.value.trim().slice(0, PROFILE_NOTES_MAX_LENGTH);

    let proxy = null;
    if (formProxyEnabled.checked) {
      proxy = {
        enabled: true,
        protocol: formProxyProto.value,
        host: formProxyHost.value.trim(),
        port: formProxyPort.value.trim(),
        user: formProxyUser.value.trim(),
        pass: formProxyPass.value.trim()
      };
    }

    // Selected extensions
    const selectedExts = Array.from(document.querySelectorAll('.profile-ext-checkbox:checked')).map(cb => cb.value);

    // Sync all manual dropdown edits into fingerprint
    syncFingerprintFromDropdowns();

    const isEdit = Boolean(editProfileId.value);
    const cookiesVal = document.getElementById('cookies-textarea')?.value?.trim();
    try {
      if (isEdit) {
        await window.hyperion.updateProfile(editProfileId.value, {
          name,
          os,
          tags,
          notes,
          proxy,
          extensions: selectedExts,
          fingerprint: CURRENT_FP
        });
        if (cookiesVal) {
          try {
            await window.hyperion.importCookies(editProfileId.value, cookiesVal);
          } catch (ce) {
            console.error('Cookie auto-import error:', ce);
          }
        }
      } else {
        const created = await window.hyperion.createProfile({
          name,
          os,
          tags,
          notes,
          proxy,
          extensions: selectedExts,
          fingerprint: CURRENT_FP
        });
        if (cookiesVal && created && created.id) {
          try {
            await window.hyperion.importCookies(created.id, cookiesVal);
          } catch (ce) {
            console.error('Cookie auto-import error:', ce);
          }
        }
      }
      closeModal();
      await loadFolders();
      await loadProfiles();
    } catch (e) {
      alert('Ошибка сохранения: ' + e.message);
    }
  });

  // PROXY MODAL CONTROLS
  document.getElementById('btn-add-proxy').addEventListener('click', () => {
    addProxyModal.style.display = 'flex';
  });
  document.getElementById('btn-empty-add-proxy').addEventListener('click', () => {
    addProxyModal.style.display = 'flex';
  });
  document.getElementById('btn-close-add-proxy').addEventListener('click', () => {
    addProxyModal.style.display = 'none';
  });
  document.getElementById('btn-cancel-add-proxy').addEventListener('click', () => {
    addProxyModal.style.display = 'none';
  });

  document.getElementById('btn-save-new-proxy').addEventListener('click', async () => {
    const host = document.getElementById('modal-proxy-host').value.trim();
    const port = document.getElementById('modal-proxy-port').value.trim();
    if (!host || !port) {
      alert('Укажите хост и порт');
      return;
    }
    const proto = document.getElementById('modal-proxy-proto').value;
    const user = document.getElementById('modal-proxy-user').value.trim();
    const pass = document.getElementById('modal-proxy-pass').value.trim();
    const rotateUrl = document.getElementById('modal-proxy-rotate-url')?.value.trim() || '';

    await window.hyperion.saveProxy({
      change_ip_url: rotateUrl,
      protocol: proto,
      host,
      port,
      user,
      pass,
      title: `${host}:${port}`
    });

    addProxyModal.style.display = 'none';
    document.getElementById('modal-proxy-host').value = '';
    document.getElementById('modal-proxy-port').value = '';
    await loadProxies();
  });

  // IMPORT PROXY MODAL
  document.getElementById('btn-import-proxies-modal').addEventListener('click', () => {
    importProxiesModal.style.display = 'flex';
  });
  document.getElementById('btn-close-import-proxy').addEventListener('click', () => {
    importProxiesModal.style.display = 'none';
  });
  document.getElementById('btn-cancel-import-proxy').addEventListener('click', () => {
    importProxiesModal.style.display = 'none';
  });
  document.getElementById('btn-submit-import-proxy').addEventListener('click', async () => {
    const raw = document.getElementById('import-proxy-textarea').value.trim();
    if (!raw) return;
    const res = await window.hyperion.importProxies(raw);
    alert(`Успешно импортировано прокси: ${res.count}`);
    importProxiesModal.style.display = 'none';
    document.getElementById('import-proxy-textarea').value = '';
    await loadProxies();
  });

  // CREATE TEMPLATE MODAL CONTROLS
  const createTemplateModal = document.getElementById('create-template-modal');
  const tplInputName = document.getElementById('tpl-input-name');
  const tplSelectGpu = document.getElementById('tpl-select-gpu');
  const tplSelectCores = document.getElementById('tpl-select-cores');
  const tplSelectRam = document.getElementById('tpl-select-ram');
  const tplSelectRes = document.getElementById('tpl-select-res');
  const tplSelectTz = document.getElementById('tpl-select-tz');
  const tplSelectLocale = document.getElementById('tpl-select-locale');
  const tplSelectWebrtc = document.getElementById('tpl-select-webrtc');

  function populateTemplateModalFields(os) {
    if (!DICTIONARIES) return;
    const gpus = DICTIONARIES.GPU_PROFILES[os] || DICTIONARIES.GPU_PROFILES.windows;
    tplSelectGpu.innerHTML = gpus.map(g => `<option value="${escapeHtml(g.name)}">${escapeHtml(g.name)}</option>`).join('');

    tplSelectCores.innerHTML = DICTIONARIES.CPU_CORES_LIST.map(c => `<option value="${c}">${c} ядер</option>`).join('');
    tplSelectRam.innerHTML = DICTIONARIES.RAM_LIST.map(r => `<option value="${r}">${r} GB</option>`).join('');
    tplSelectRes.innerHTML = DICTIONARIES.RESOLUTIONS.map(r => `<option value="${r.width}x${r.height}">${r.label}</option>`).join('');
    tplSelectTz.innerHTML = DICTIONARIES.TIMEZONES.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
    tplSelectLocale.innerHTML = DICTIONARIES.LOCALES.map(l => `<option value="${l.id}">${l.label}</option>`).join('');
    tplSelectWebrtc.innerHTML = DICTIONARIES.WEBRTC_MODES.map(w => `<option value="${w.id}">${w.label}</option>`).join('');
  }

  document.getElementById('btn-open-create-template').addEventListener('click', () => {
    tplInputName.value = `Шаблон #${TEMPLATES.length + 1}`;
    document.querySelector('input[name="tpl-os"][value="windows"]').checked = true;
    populateTemplateModalFields('windows');
    createTemplateModal.style.display = 'flex';
  });

  document.getElementById('btn-close-create-template').addEventListener('click', () => {
    createTemplateModal.style.display = 'none';
  });
  document.getElementById('btn-cancel-create-template').addEventListener('click', () => {
    createTemplateModal.style.display = 'none';
  });

  document.querySelectorAll('input[name="tpl-os"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      populateTemplateModalFields(e.target.value);
    });
  });

  document.getElementById('btn-save-new-template').addEventListener('click', async () => {
    const name = tplInputName.value.trim();
    if (!name) {
      alert('Введите название шаблона');
      return;
    }
    const os = document.querySelector('input[name="tpl-os"]:checked')?.value || 'windows';
    const gpu = tplSelectGpu.value;
    const cores = parseInt(tplSelectCores.value) || 8;
    const ram = parseInt(tplSelectRam.value) || 16;
    const res = tplSelectRes.value;
    const tz = tplSelectTz.value;
    const locale = tplSelectLocale.value;
    const webrtc = tplSelectWebrtc.value;

    await window.hyperion.saveTemplate({
      name,
      os,
      gpu,
      cores,
      ram,
      res,
      tz,
      locale,
      webrtc
    });

    createTemplateModal.style.display = 'none';
    await loadTemplates();
  });

  // EXTENSIONS UNPACKED FOLDER PICKER
  
  // EXTENSION CATEGORY FILTERS & CUSTOM INSTALL
  document.querySelectorAll('[data-ext-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-ext-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ACTIVE_EXT_CAT = btn.getAttribute('data-ext-cat');
      renderExtensions();
    });
  });

  const btnInstallCustom = document.getElementById('btn-install-custom-ext');
  if (btnInstallCustom) {
    btnInstallCustom.addEventListener('click', async () => {
      const input = document.getElementById('input-custom-ext-id');
      const val = input.value.trim();
      if (!val) {
        alert('Введите ID или ссылку на расширение из Chrome Web Store');
        return;
      }
      btnInstallCustom.textContent = 'Загрузка...';
      btnInstallCustom.disabled = true;
      try {
        const res = await window.hyperion.installExtension(val);
        if (res.success) {
          input.value = '';
          await loadExtensions();
        } else {
          alert('Ошибка установки: ' + (res.error || 'Проверьте ID или подключение к интернету'));
        }
      } catch (e) {
        alert('Ошибка: ' + e.message);
      } finally {
        btnInstallCustom.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Установить по ссылке/ID</span>
        `;
        btnInstallCustom.disabled = false;
      }
    });
  }

  document.getElementById('btn-pick-folder-ext').addEventListener('click', async () => {
    try {
      const res = await window.hyperion.pickExtensionFolder();
      if (res && res.success) {
        alert(`Расширение "${res.extension.name}" успешно подключено!`);
        await loadExtensions();
      }
    } catch (e) {
      alert('Ошибка подключения: ' + e.message);
    }
  });

  // SETTINGS CONTROLS
  document.getElementById('btn-browse-chrome')?.addEventListener('click', async () => {
    try {
      const res = await window.hyperion.selectChromeBinary();
      if (res && res.path) {
        await checkSystemStatus();
        showToast(`Браузер подключен: ${res.path}`, 'success');
      }
    } catch (e) {
      showToast(`Ошибка выбора браузера: ${e.message}`, 'error');
    }
  });

  document.getElementById('btn-rescan-chrome')?.addEventListener('click', async () => {
    try {
      const res = await window.hyperion.rescanChromeBinary();
      await checkSystemStatus();
      if (res && res.exists) {
        showToast(`Браузер найден: ${res.path}`, 'success');
      } else {
        showToast('Браузер не найден автоматически в стандартных папках. Пожалуйста, укажите путь вручную.', 'error');
      }
    } catch (e) {
      showToast(`Ошибка автопоиска: ${e.message}`, 'error');
    }
  });

  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const url = document.getElementById('settings-default-url').value.trim();
    await window.hyperion.saveSettings({ default_url: url });
    alert('Настройки сохранены');
  });

  document.getElementById('btn-clear-cache').addEventListener('click', async () => {
    const res = await window.hyperion.clearCache();
    showToast(`Кэш успешно очищен для ${res.clearedProfiles} профилей.`, 'success');
  });

  document.getElementById('btn-export-backup').addEventListener('click', async () => {
    const api = window.hyperion;
    const res = await api.exportBackup();
    if (res.success) {
      alert(`Резервная копия сохранена в файл: ${res.filePath}`);
    }
  });

  document.getElementById('btn-import-backup')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: 'Восстановление резервной копии',
      message: 'Вы действительно хотите импортировать резервную копию? Все профили, прокси и настройки будут объединены и восстановлены.',
      confirmText: 'Импортировать',
      isDanger: false
    });
    if (!ok) return;
    try {
      const api = window.hyperion;
      const res = await api.importBackup();
      if (res && res.success) {
        alert(`Резервная копия успешно восстановлена!\nПрофилей: ${res.profilesCount || 0}, Прокси: ${res.proxiesCount || 0}`);
        await loadAllData();
      } else if (res && res.error && res.error !== 'Отменено') {
        alert('Ошибка восстановления: ' + res.error);
      }
    } catch (e) {
      alert('Ошибка импорта: ' + e.message);
    }
  });
}

function getOsSvg(os) {
  if (os === 'macos') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.1.65-2.76 1.42-.58.67-1.08 1.74-1.02 2.81 1.06.08 2.15-.58 2.77-1.36z"/>
    </svg>`;
  }
  if (os === 'ios') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:#60a5fa;">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.1.65-2.76 1.42-.58.67-1.08 1.74-1.02 2.81 1.06.08 2.15-.58 2.77-1.36z"/>
    </svg>`;
  }
  if (os === 'android') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:#34d399;">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.1 12 8.1s-3.5902.3116-5.1368.8497L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/>
    </svg>`;
  }
  if (os === 'linux') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.2.5 2.3 1.2 3.1-.7.7-1.2 1.7-1.2 2.9 0 1.6.9 3 2.2 3.7C8.5 17.5 7 19.5 7 22h10c0-2.5-1.5-4.5-2.7-5.8 1.3-.7 2.2-2.1 2.2-3.7 0-1.2-.5-2.2-1.2-2.9.7-.8 1.2-1.9 1.2-3.1C16.5 4 14.5 2 12 2z"/>
    </svg>`;
  }
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.849"/>
  </svg>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.toggleProfileSelect = (id, checked) => {
  if (checked) {
    SELECTED_PROFILE_IDS.add(id);
  } else {
    SELECTED_PROFILE_IDS.delete(id);
  }
  updateBulkBar();
};

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  const countEl = document.getElementById('bulk-selected-count');
  const thCheck = document.getElementById('th-check-all-profiles');
  const size = SELECTED_PROFILE_IDS.size;

  if (bar && countEl) {
    bar.style.display = size > 0 ? 'flex' : 'none';
    countEl.textContent = size;
  }
  if (thCheck) {
    thCheck.checked = size > 0 && size === PROFILES.length;
  }
}

window.bulkStartSelected = async () => {
  const ids = Array.from(SELECTED_PROFILE_IDS);
  if (ids.length === 0) return;
  try {
    const res = await window.hyperion.bulkStartProfiles(ids);
    for (const r of res) {
      if (r.success) {
        const p = PROFILES.find(x => x.id === r.id);
        if (p) { p.status = 'RUNNING'; p.pid = r.pid; p.startTime = Date.now(); }
      }
    }
    renderProfiles();
    updateStats();
    updateBulkBar();
  } catch (e) {
    alert('Ошибка массового запуска: ' + e.message);
  }
};

window.bulkStopSelected = async () => {
  const ids = Array.from(SELECTED_PROFILE_IDS);
  if (ids.length === 0) return;
  try {
    await window.hyperion.bulkStopProfiles(ids);
    for (const id of ids) {
      const p = PROFILES.find(x => x.id === id);
      if (p) { p.status = 'STOPPED'; p.startTime = null; }
    }
    renderProfiles();
    updateStats();
    updateBulkBar();
  } catch (e) {
    alert('Ошибка массовой остановки: ' + e.message);
  }
};

window.bulkDeleteSelected = async () => {
  const ids = Array.from(SELECTED_PROFILE_IDS);
  if (ids.length === 0) return;
  const ok = await showConfirmDialog({
    title: 'Массовое удаление',
    message: `Удалить выбранные ${ids.length} профилей и все их данные? Это действие необратимо.`,
    confirmText: 'Удалить',
    isDanger: true
  });
  if (!ok) return;
  try {
    await window.hyperion.bulkDeleteProfiles(ids);
    PROFILES = PROFILES.filter(p => !ids.includes(p.id));
    SELECTED_PROFILE_IDS.clear();
    updateBulkBar();
    renderProfiles();
    updateStats();
  } catch (e) {
    alert('Ошибка удаления: ' + e.message);
  }
};

// ==========================================
// COOKIE IMPORT / EXPORT
// ==========================================
window.exportProfileCookies = async () => {
  const id = editProfileId.value;
  if (!id) {
    alert('Сначала выберите или сохраните профиль');
    return;
  }
  const res = await window.hyperion.exportCookies(id);
  const ta = document.getElementById('cookies-textarea');
  const hint = document.getElementById('cookies-status-hint');
  if (res.success) {
    ta.value = JSON.stringify(res.cookies, null, 2);
    hint.textContent = `Экспортировано cookies: ${res.cookies.length} шт.`;
    hint.style.color = 'var(--accent-emerald)';
  } else {
    hint.textContent = `Ошибка экспорта: ${res.error}`;
    hint.style.color = 'var(--accent-rose)';
  }
};

window.importProfileCookies = async () => {
  const id = editProfileId.value;
  if (!id) {
    alert('Сначала сохраните профиль');
    return;
  }
  const ta = document.getElementById('cookies-textarea');
  const hint = document.getElementById('cookies-status-hint');
  const val = ta.value.trim();
  if (!val) {
    alert('Вставьте JSON список куки');
    return;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(val);
  } catch (e) {
    alert('Неверный формат JSON: ' + e.message);
    return;
  }

  const res = await window.hyperion.importCookies(id, parsed);
  if (res.success) {
    hint.textContent = `Успешно записано в базу данных: ${res.count} cookies!`;
    hint.style.color = 'var(--accent-emerald)';
    alert(`Импортировано куки: ${res.count} шт.`);
  } else {
    hint.textContent = `Ошибка импорта: ${res.error}`;
    hint.style.color = 'var(--accent-rose)';
  }
};

// ==========================================
// PROXY ROTATION & GEO INSPECTION
// ==========================================
window.triggerProxyRotate = async (profileId, proxyId, event) => {
  if (event) event.stopPropagation();
  const p = PROFILES.find(x => x.id === profileId);
  const px = PROXIES.find(x => x.id === proxyId) || (p ? p.proxy : null);
  if (!px || !px.change_ip_url) {
    alert('Для этого прокси не указана ссылка смены IP');
    return;
  }

  const btn = event?.currentTarget;
  if (btn) btn.textContent = '🔄 Смена...';

  const res = await window.hyperion.rotateProxyIp(px.id || proxyId);
  if (res.success) {
    alert('IP успешно сменен! Ответ сервера: ' + res.response);
    // Refresh geo
    inspectHostGeo(px.host);
  } else {
    alert('Ошибка смены IP: ' + res.error);
  }
  if (btn) btn.textContent = '🔄 Сменить IP';
};

async function inspectHostGeo(host) {
  if (!host) return;
  try {
    const res = await window.hyperion.inspectIp({ host });
    if (res.success && res.info && res.info.status === 'success') {
      PROXY_GEO_CACHE.set(host, res.info);
      renderProfiles();
    }
  } catch (e) {}
}

function getCountryFlag(code) {
  if (!code || code.length !== 2) return '🌐';
  const offset = 127397;
  const chars = [...code.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + offset));
  return chars.join('');
}


// ==========================================
// FEATURE 2: FOLDERS & WORKSPACES
// ==========================================
async function loadFolders() {
  try {
    FOLDERS = await window.hyperion.getFolders();
    renderFolders();
  } catch (e) {}
}

function renderFolders() {
  const container = document.getElementById('folder-pills-list');
  if (!container) return;

  // Filter out any accidental 'Все профили'
  FOLDERS = FOLDERS.filter(f => f && f !== 'Все профили');

  container.innerHTML = FOLDERS.map(f => {
    const isActive = f === CURRENT_FOLDER;
    return `
      <button class="folder-pill ${isActive ? 'active' : ''}" onclick="toggleSelectFolder('${escapeHtml(f)}')" title="Фильтр по папке (повторный клик сбрасывает)">
        <span>📁 ${escapeHtml(f)}</span>
        <span class="folder-remove-x" onclick="deleteFolder('${escapeHtml(f)}', event)" title="Удалить папку">&times;</span>
      </button>
    `;
  }).join('');

  // Populate folder select in profile modal and bulk modal
  const modalSel = document.getElementById('form-folder-select');
  const bulkSel = document.getElementById('bulk-select-folder');
  const opts = '<option value="">Без папки</option>' + FOLDERS.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
  if (modalSel) modalSel.innerHTML = opts;
  if (bulkSel) bulkSel.innerHTML = opts;
}

window.toggleSelectFolder = (folderName) => {
  if (CURRENT_FOLDER === folderName) {
    CURRENT_FOLDER = '';
  } else {
    CURRENT_FOLDER = folderName;
  }
  renderFolders();
  renderProfiles();
};
window.selectFolder = window.toggleSelectFolder;

window.createNewFolder = () => {
  openPromptDialog({
    title: 'Новая папка / Группа',
    label: 'Название папки:',
    placeholder: 'Например: Crypto, Facebook, Farming...',
    onConfirm: async (clean) => {
      const cleanName = clean.trim();
      if (!cleanName || cleanName === 'Все профили') return;
      if (!FOLDERS.includes(cleanName)) {
        FOLDERS.push(cleanName);
        await window.hyperion.saveFolders(FOLDERS);
        CURRENT_FOLDER = cleanName;
        renderFolders();
        renderProfiles();
      }
    }
  });
};

window.deleteFolder = async (folderName, event) => {
  if (event) event.stopPropagation();
  FOLDERS = FOLDERS.filter(f => f !== folderName);
  await window.hyperion.saveFolders(FOLDERS);
  if (CURRENT_FOLDER === folderName) {
    CURRENT_FOLDER = '';
  }
  renderFolders();
  renderProfiles();
};

// ==========================================
// FEATURE 5 & 6: BULK CREATE & .HYPERION ARCHIVES
// ==========================================
window.openBulkCreateModal = () => {
  const m = document.getElementById('bulk-create-modal');
  if (m) m.style.display = 'flex';
};

window.closeBulkCreateModal = () => {
  const m = document.getElementById('bulk-create-modal');
  if (m) m.style.display = 'none';
};

window.submitBulkCreate = async () => {
  const baseName = (document.getElementById('bulk-input-basename').value.trim() || 'Профиль').slice(0, 30);
  const count = parseInt(document.getElementById('bulk-input-count').value) || 5;
  const os = document.getElementById('bulk-select-os').value;
  const folder = document.getElementById('bulk-select-folder').value;
  const urlsRaw = document.getElementById('bulk-input-urls').value.trim();
  const startUrls = urlsRaw ? urlsRaw.split(/[,\s]+/).map(u => u.trim()).filter(Boolean) : [];

  const res = await window.hyperion.bulkCreateProfiles({
    baseName,
    count,
    os,
    folder,
    tags: ['Bulk', os.toUpperCase()],
    startUrls
  });

  if (res.success) {
    alert(`Создано профилей: ${res.count}`);
    window.closeBulkCreateModal();
    await loadFolders();
  await loadProfiles();
  }
};

window.exportProfilePackage = async (id) => {
  try {
    const res = await window.hyperion.exportProfilePackage(id);
    if (res.success) {
      alert(`Профиль успешно упакован в архив: ${res.filePath}`);
    }
  } catch (e) {
    alert('Ошибка экспорта: ' + e.message);
  }
};

window.importProfilePackage = async () => {
  try {
    const res = await window.hyperion.importProfilePackage();
    if (res && res.success) {
      alert(`Профиль "${res.profile.name}" успешно импортирован со всеми cookies и отпечатком!`);
      await loadFolders();
  await loadProfiles();
    }
  } catch (e) {
    alert('Ошибка импорта: ' + e.message);
  }
};

// ==========================================
// FEATURE 3: COOKIE ROBOT WARM-UP
// ==========================================
window.openWarmupRobot = (profileId) => {
  const p = PROFILES.find(x => x.id === profileId);
  if (!p) return;
  document.getElementById('warmup-profile-id').value = profileId;
  document.getElementById('warmup-status-box').style.display = 'none';
  document.getElementById('btn-start-warmup').disabled = false;
  document.getElementById('btn-start-warmup').textContent = 'Запустить прогрев';
  document.getElementById('warmup-modal').style.display = 'flex';
};

window.closeWarmupRobot = () => {
  document.getElementById('warmup-modal').style.display = 'none';
};

window.startWarmupSession = async () => {
  const profileId = document.getElementById('warmup-profile-id').value;
  const urlsRaw = document.getElementById('warmup-urls-textarea').value.trim();
  const urls = urlsRaw.split('\n').map(u => u.trim()).filter(Boolean);

  if (urls.length === 0) {
    showToast('Укажите хотя бы один URL для прогрева', 'warning');
    return;
  }

  const statusBox = document.getElementById('warmup-status-box');
  const startBtn = document.getElementById('btn-start-warmup');

  statusBox.style.display = 'block';
  statusBox.textContent = `⏳ Робот начал серфинг (0/${urls.length})...`;
  statusBox.style.color = 'var(--accent-cyan)';
  startBtn.disabled = true;
  startBtn.textContent = 'Прогрев идет...';

  let unsub = null;
  if (window.hyperion.onWarmupProgress) {
    unsub = window.hyperion.onWarmupProgress((data) => {
      if (data && data.url) {
        statusBox.textContent = `⏳ [${data.index}/${data.total}] Серфинг: ${data.url}...`;
      }
    });
  }

  try {
    const res = await window.hyperion.warmupProfile(profileId, urls);
    if (res && res.success) {
      statusBox.textContent = `✓ Прогрев завершен! Посещено сайтов: ${res.visited} из ${urls.length}. История и cookies сохранены.`;
      statusBox.style.color = 'var(--accent-emerald)';
      startBtn.textContent = 'Готово';
      showToast(`Прогрев завершен: посещено сайтов: ${res.visited}`, 'success');
      setTimeout(window.closeWarmupRobot, 2500);
    } else {
      statusBox.textContent = `Ошибка: ${res ? res.error : 'Неизвестная ошибка'}`;
      statusBox.style.color = 'var(--accent-rose)';
      startBtn.disabled = false;
      startBtn.textContent = 'Запустить прогрев';
    }
  } catch (e) {
    statusBox.textContent = `Ошибка: ${e.message}`;
    statusBox.style.color = 'var(--accent-rose)';
    startBtn.disabled = false;
    startBtn.textContent = 'Запустить прогрев';
  } finally {
    if (unsub) unsub();
  }
};

// ==========================================
// FEATURE 1: QUALITY SCORER
// ==========================================
window.promptAddTag = (profileId, event) => {
  if (event) event.stopPropagation();
  openPromptDialog({
    title: 'Добавить тег к профилю',
    label: `Название тега (до ${TAG_MAX_LENGTH} символов):`,
    placeholder: 'Например: Crypto, KYC, Warmup...',
    maxLength: TAG_MAX_LENGTH,
    onConfirm: async (cleanTag) => {
      const p = PROFILES.find(x => x.id === profileId);
      if (!p) return;
      const tagRaw = cleanTag.replace(/^#/, '').trim();
      if (!tagRaw) return;
      const tagClean = tagRaw.slice(0, TAG_MAX_LENGTH);

      if (tagRaw.length > TAG_MAX_LENGTH) {
        showToast(`Тег обрезан до ${TAG_MAX_LENGTH} символов: "${tagClean}"`, 'warning');
      }
      
      const currentTags = Array.isArray(p.tags) ? [...p.tags] : [];
      if (!currentTags.includes(tagClean)) {
        currentTags.push(tagClean);
        try {
          await window.hyperion.updateProfile(profileId, { tags: currentTags });
          p.tags = currentTags;
          renderProfiles();
        } catch (err) {
          alert('Ошибка добавления тега: ' + err.message);
        }
      }
    }
  });
};

window.removeTagFromProfile = async (profileId, tagToRemove, event) => {
  if (event) event.stopPropagation();
  const p = PROFILES.find(x => x.id === profileId);
  if (!p) return;
  const newTags = (p.tags || []).filter(t => t !== tagToRemove);
  try {
    await window.hyperion.updateProfile(profileId, { tags: newTags });
    p.tags = newTags;
    renderProfiles();
  } catch (err) {
    alert('Ошибка удаления тега: ' + err.message);
  }
};



// ==========================================
// FEATURE 7: HYPERION IN-APP AUTO-UPDATE
let CURRENT_UPDATE_INFO = null;
let IS_DOWNLOADING_UPDATE = false;

window.checkSettingsUpdates = async (isManual = false) => {
  const statusText = document.getElementById('settings-update-status-text');
  const notifBox = document.getElementById('settings-update-notification');
  const checkBtn = document.getElementById('btn-settings-check-update');
  const globalAlert = document.getElementById('global-update-alert');
  const globalText = document.getElementById('global-update-text');

  if (checkBtn && isManual) {
    checkBtn.disabled = true;
    const btnSpan = checkBtn.querySelector('span');
    if (btnSpan) btnSpan.textContent = 'Проверка...';
  }

  try {
    const api = window.hyperion;
    const res = await api.checkForUpdates();
    if (res && res.success && res.data) {
      const d = res.data;
      const appVerEl = document.getElementById('settings-app-version');
      if (appVerEl) appVerEl.textContent = 'v' + d.currentVersion;

      if (d.updateAvailable) {
        CURRENT_UPDATE_INFO = d;
        if (statusText) {
          statusText.textContent = 'Доступно обновление Hyperion v' + d.latestVersion + '!';
          statusText.style.color = 'var(--accent-blue, #38bdf8)';
        }
        if (notifBox) {
          notifBox.style.display = 'block';
          const bannerTitle = document.getElementById('settings-update-banner-title');
          const bannerNotes = document.getElementById('settings-update-banner-notes');
          const downloadBtn = document.getElementById('btn-settings-start-download');
          const restartBtn = document.getElementById('btn-settings-apply-restart');
          const progressWrap = document.getElementById('settings-update-progress-wrap');

          if (bannerTitle) bannerTitle.textContent = `Доступно обновление Hyperion v${d.latestVersion}`;
          if (bannerNotes) bannerNotes.textContent = d.releaseNotes || 'Новая версия готова к автоматической установке.';
          if (downloadBtn) downloadBtn.style.display = 'inline-flex';
          if (restartBtn) restartBtn.style.display = 'none';
          if (progressWrap) progressWrap.style.display = 'none';
        }
        if (globalAlert) {
          globalAlert.style.display = 'flex';
          if (globalText) globalText.textContent = 'Доступно обновление Hyperion v' + d.latestVersion;
        }
      } else {
        if (statusText) {
          statusText.textContent = 'У вас установлена последняя актуальная версия Hyperion v' + d.currentVersion + '.';
          statusText.style.color = 'var(--text-muted)';
        }
        if (notifBox) notifBox.style.display = 'none';
        if (globalAlert) globalAlert.style.display = 'none';

        if (isManual) {
          showToast('У вас установлена актуальная версия Hyperion (v' + d.currentVersion + ').', 'info');
        }
      }
    }
  } catch (err) {
    console.error('Check updates error:', err);
    if (statusText && isManual) {
      statusText.textContent = 'Не удалось проверить наличие обновлений.';
    }
  } finally {
    if (checkBtn && isManual) {
      checkBtn.disabled = false;
      const btnSpan = checkBtn.querySelector('span');
      if (btnSpan) btnSpan.textContent = 'Проверить сейчас';
    }
  }
};

window.startInAppUpdate = async () => {
  if (!CURRENT_UPDATE_INFO || !CURRENT_UPDATE_INFO.downloadUrl) {
    showToast('Ссылка на обновление не найдена. Попробуйте еще раз.', 'error');
    return;
  }
  if (IS_DOWNLOADING_UPDATE) return;
  IS_DOWNLOADING_UPDATE = true;

  const downloadBtn = document.getElementById('btn-settings-start-download');
  const restartBtn = document.getElementById('btn-settings-apply-restart');
  const progressWrap = document.getElementById('settings-update-progress-wrap');
  const progressBar = document.getElementById('settings-update-progress-bar');
  const percentText = document.getElementById('settings-update-progress-percent');
  const labelText = document.getElementById('settings-update-progress-label');
  const sizeText = document.getElementById('settings-update-size-info');
  const speedText = document.getElementById('settings-update-speed-info');

  if (downloadBtn) downloadBtn.style.display = 'none';
  if (progressWrap) progressWrap.style.display = 'block';
  if (labelText) labelText.textContent = `Загрузка обновления v${CURRENT_UPDATE_INFO.latestVersion}...`;

  if (window.hyperion && window.hyperion.onUpdateProgress) {
    window.hyperion.onUpdateProgress((data) => {
      const pct = Math.min(100, Math.max(0, data.percent || 0));
      if (progressBar) progressBar.style.width = pct + '%';
      if (percentText) percentText.textContent = Math.floor(pct) + '%';
      if (sizeText && data.totalBytes > 0) {
        const mb = (data.downloadedBytes / 1048576).toFixed(1);
        const totalMb = (data.totalBytes / 1048576).toFixed(1);
        sizeText.textContent = `${mb} МБ из ${totalMb} МБ`;
      }
      if (speedText && data.speedBytes !== undefined) {
        const speedMb = (data.speedBytes / 1048576).toFixed(1);
        speedText.textContent = `${speedMb} МБ/с`;
      }
    });
  }

  try {
    showToast('Загрузка обновления запущена прямо в приложении...', 'info');
    const res = await window.hyperion.downloadUpdate(CURRENT_UPDATE_INFO.downloadUrl);
    if (res && res.success) {
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.background = 'var(--accent-emerald)';
      }
      if (percentText) percentText.textContent = '100%';
      if (labelText) labelText.textContent = '✓ Обновление успешно загружено!';
      if (sizeText) sizeText.textContent = 'Готово к установке';
      if (speedText) speedText.textContent = '';
      if (restartBtn) restartBtn.style.display = 'inline-flex';

      showToast('Обновление загружено! Нажмите «Перезапустить и применить».', 'success', 6000);

      // Auto countdown 5 seconds before applying
      let count = 5;
      const countInterval = setInterval(() => {
        if (!restartBtn) return clearInterval(countInterval);
        const span = restartBtn.querySelector('span');
        if (span) span.textContent = `Перезапуск для обновления (${count})...`;
        count--;
        if (count < 0) {
          clearInterval(countInterval);
          window.applyInAppUpdate();
        }
      }, 1000);

      restartBtn.onclick = () => {
        clearInterval(countInterval);
        window.applyInAppUpdate();
      };
    } else {
      throw new Error(res?.error || 'Не удалось завершить загрузку');
    }
  } catch (e) {
    IS_DOWNLOADING_UPDATE = false;
    if (downloadBtn) downloadBtn.style.display = 'inline-flex';
    if (progressWrap) progressWrap.style.display = 'none';
    showToast(`Ошибка загрузки обновления: ${e.message}`, 'error', 5000);
  }
};

window.applyInAppUpdate = async () => {
  try {
    showToast('Применение обновления и перезапуск...', 'info', 3000);
    await window.hyperion.installUpdate();
  } catch (e) {
    showToast(`Ошибка установки обновления: ${e.message}`, 'error');
  }
};
