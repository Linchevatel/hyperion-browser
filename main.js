const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const net = require('net');
const {
  generateFingerprint,
  GPU_PROFILES,
  RESOLUTIONS,
  CPU_CORES_LIST,
  RAM_LIST,
  TIMEZONES,
  LOCALES,
  WEBRTC_MODES
} = require('./fingerprint');
const updater = require('./updater');

const os = require('os');
const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, '.config', 'hyperion-browser');
const PROFILES_FILE = path.join(CONFIG_DIR, 'profiles.json');
const PROXIES_FILE = path.join(CONFIG_DIR, 'proxies.json');
const EXTENSIONS_FILE = path.join(CONFIG_DIR, 'extensions.json');
const TEMPLATES_FILE = path.join(CONFIG_DIR, 'templates.json');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');
const PROFILES_DATA_DIR = path.join(CONFIG_DIR, 'profiles_data');
const EXTENSIONS_DIR = path.join(CONFIG_DIR, 'extensions');
function getChromeBinary() {
  const settings = readJson(SETTINGS_FILE, {});
  if (settings.chrome_path && fs.existsSync(settings.chrome_path)) {
    return { path: settings.chrome_path, exists: true };
  }

  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const candidates = [];

  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || '';
    const progFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const progFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

    candidates.push(
      // Bundled / Embedded Chromium
      path.join(process.resourcesPath || '', 'chrome', 'chrome.exe'),
      path.join(path.dirname(process.execPath || ''), 'resources', 'chrome', 'chrome.exe'),
      path.join(path.dirname(process.execPath || ''), 'chrome', 'chrome.exe'),
      path.join(__dirname, 'bundle', 'chrome', 'chrome.exe'),
      path.join(__dirname, 'chrome', 'chrome.exe'),
      path.join(HOME, 'hyperion-browser', 'chrome.exe'),
      path.join(localAppData, 'HyperionBrowser', 'chrome.exe'),
      path.join(progFiles, 'Hyperion Browser', 'chrome', 'chrome.exe'),
      // Standard Google Chrome on Windows
      path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(progFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      // Standard Chromium
      path.join(localAppData, 'Chromium', 'Application', 'chrome.exe'),
      path.join(progFiles, 'Chromium', 'Application', 'chrome.exe'),
      // Brave
      path.join(progFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      // Edge
      path.join(progFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    );
  } else if (isMac) {
    candidates.push(
      path.join(HOME, 'hyperion-browser', 'chrome'),
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    );
  } else {
    // Linux
    candidates.push(
      // Bundled / Embedded Chromium
      path.join(process.resourcesPath || '', 'chrome', 'chrome'),
      path.join(path.dirname(process.execPath || ''), 'resources', 'chrome', 'chrome'),
      path.join(path.dirname(process.execPath || ''), 'chrome', 'chrome'),
      path.join(__dirname, 'bundle', 'chrome', 'chrome'),
      path.join(HOME, 'hyperion-browser', 'chrome'),
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    );
  }

  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return { path: c, exists: true };
    }
  }

  const defaultPath = isWin
    ? path.join(HOME, 'hyperion-browser', 'chrome.exe')
    : path.join(HOME, 'hyperion-browser', 'chrome');

  return { path: defaultPath, exists: false };
}

if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
if (!fs.existsSync(PROFILES_DATA_DIR)) fs.mkdirSync(PROFILES_DATA_DIR, { recursive: true });
if (!fs.existsSync(EXTENSIONS_DIR)) fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });

let mainWindow = null;
const RUNNING_PROCESSES = new Map(); // id -> ChildProcess
const START_TIMES = new Map(); // id -> timestamp
const RUNNING_BRIDGES = new Map(); // id -> net.Server

// Helper storage functions with atomic write and backup protection
function readJson(file, def = []) {
  if (!fs.existsSync(file)) {
    const bak = file + '.bak';
    if (fs.existsSync(bak)) {
      try { return JSON.parse(fs.readFileSync(bak, 'utf-8')); } catch (e) {}
    }
    return def;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    const bak = file + '.bak';
    if (fs.existsSync(bak)) {
      try { return JSON.parse(fs.readFileSync(bak, 'utf-8')); } catch (e) {}
    }
    return def;
  }
}

function writeJson(file, data) {
  const tmp = file + '.tmp.' + process.pid + '.' + Date.now();
  const bak = file + '.bak';
  const str = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmp, str, 'utf-8');
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, bak); } catch (e) {}
  }
  fs.renameSync(tmp, file);
}

// Built-in catalog of popular antidetect / web3 extensions
const POPULAR_EXTENSIONS = [
  // --- UTILITY & COOKIES ---
  {
    id: "hlkenndednhfkekhgcdicdfddnkalmdm",
    name: "Cookie-Editor",
    description: "Просмотр, экспорт и импорт cookies сессий (Netscape/JSON)",
    category: "Utility",
    icon: "🍪"
  },
  {
    id: "fngmhnnpilhplaeedifhccceomclgfbg",
    name: "EditThisCookie",
    description: "Классический менеджер файлов cookie для профилей",
    category: "Utility",
    icon: "🍪"
  },
  {
    id: "cppjkneekbjaeellbfkmgnhonkkjfpdn",
    name: "Clear Cache",
    description: "Очистка кэша, истории и хранилища сессии в 1 клик",
    category: "Utility",
    icon: "🧹"
  },
  {
    id: "bnjjngeaknajbdcgpfkgnonigaififfl",
    name: "Fake Filler",
    description: "Генератор реалистичных тестовых данных для автозаполнения форм",
    category: "Utility",
    icon: "📝"
  },
  {
    id: "fihnjjcciajhdojfnbdddfaoknhalnja",
    name: "I don't care about cookies",
    description: "Автоматическое скрытие и согласие с GDPR cookie плашками",
    category: "Utility",
    icon: "🍪"
  },

  // --- CRYPTO & WEB3 ---
  {
    id: "nkbihfbeogaeaoehlefnkodbefgpgknn",
    name: "MetaMask",
    description: "Ведущий криптокошелек Ethereum / EVM сетей",
    category: "Crypto",
    icon: "🦊"
  },
  {
    id: "bfnaelmomeimhlpmgjnjophhpkkoljpa",
    name: "Phantom",
    description: "Криптокошелек для сетей Solana, Bitcoin и Polygon",
    category: "Crypto",
    icon: "👻"
  },
  {
    id: "acmacodkjbdgmoleebolmdjonilkdbch",
    name: "Rabby Wallet",
    description: "Лучший мультиязычный Web3 кошелек для мультиаккаунтинга",
    category: "Crypto",
    icon: "🐰"
  },
  {
    id: "mcohilncbfahbmgdjkbpemcciiolgcge",
    name: "OKX Wallet",
    description: "Универсальный криптокошелек с поддержкой 100+ блокчейнов",
    category: "Crypto",
    icon: "🪙"
  },
  {
    id: "egjidjbpglichdcondbcbdnbeeppgdph",
    name: "Trust Wallet",
    description: "Официальный кошелек Binance для криптоактивов",
    category: "Crypto",
    icon: "🛡️"
  },
  {
    id: "dmkamcknogkgcdfhhbddcghachkejeap",
    name: "Keplr Wallet",
    description: "Главный кошелек экосистемы Cosmos, Osmosis, Celestia",
    category: "Crypto",
    icon: "🪐"
  },
  {
    id: "opcgpfmipidbgpenhmajoajpbobppdil",
    name: "Sui Wallet",
    description: "Официальный Web3 кошелек для сети Sui Network",
    category: "Crypto",
    icon: "💧"
  },
  {
    id: "aflkmfhebedbjioipglmlcipjhmnnmhd",
    name: "Backpack",
    description: "Быстрый кошелек для Solana и Ethereum от создателей Mad Lads",
    category: "Crypto",
    icon: "🎒"
  },

  // --- SECURITY & PRIVACY ---
  {
    id: "cjpalhdlnbpafiamejdnhcphjbkeiagm",
    name: "uBlock Origin",
    description: "Блокировка рекламы, майнеров и трекеров без нагрузки на CPU",
    category: "Security",
    icon: "🛡️"
  },
  {
    id: "bhghoamapcdpbohphigoooaddinpkbai",
    name: "Authenticator (2FA)",
    description: "Генератор 2FA кодов подтверждения прямо в браузере",
    category: "Security",
    icon: "🔑"
  },
  {
    id: "mpbjkejclgiknjggghfdndbbakkmhgnl",
    name: "Buster: Captcha Solver",
    description: "Автоматическое решение reCAPTCHA и hCaptcha через распознавание аудио",
    category: "Security",
    icon: "🤖"
  },
  {
    id: "fjkehfaokpmhgfgajbanhlkedmgnejbp",
    name: "WebRTC Control",
    description: "Блокировка прямых утечек локального и публичного IP через WebRTC",
    category: "Security",
    icon: "🔒"
  },
  {
    id: "bhchdcejhohfmigjafaffggmofdmaanm",
    name: "User-Agent Switcher",
    description: "Инструмент подмены HTTP заголовков User-Agent на лету",
    category: "Security",
    icon: "🔄"
  },

  // --- TRAFFIC & ARBITRAGE ---
  {
    id: "fdgfkebogiimcoedlicjlajpkdmockpc",
    name: "Meta Pixel Helper",
    description: "Проверка работы пикселей конверсий Facebook / Meta Ads",
    category: "Traffic",
    icon: "📊"
  },
  {
    id: "aelgobmabdmlfmiblddbfnepnmmakepn",
    name: "TikTok Pixel Helper",
    description: "Валидация событий и пикселей рекламного кабинета TikTok Ads",
    category: "Traffic",
    icon: "🎵"
  },
  {
    id: "padekgcemlokbadohgkifijomclgjgif",
    name: "Proxy SwitchyOmega",
    description: "Гибкая маршрутизация и смена прокси по доменам и вкладкам",
    category: "Traffic",
    icon: "🌐"
  },
  {
    id: "gcknhkkoolaabfmlnjonogaaifnjlfnp",
    name: "FoxyProxy Standard",
    description: "Классический инструмент управления списками прокси-серверов",
    category: "Traffic",
    icon: "🦊"
  },
  {
    id: "jinjaccalgkegednnccohejagnlnfdag",
    name: "Violentmonkey",
    description: "Менеджер пользовательских скриптов (Userscripts) для авто-кликов",
    category: "Traffic",
    icon: "🐒"
  },
  {
    id: "haiffjeecmjcggfcljggpdpjjedmjgle",
    name: "AliSave Downloader",
    description: "Скачивание фото и видео товаров в высоком качестве для дропшиппинга",
    category: "Utility",
    icon: "📦"
  }
];

function createWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Responsive default dimensions adapting to any screen resolution and Windows DPI scaling (100%, 125%, 150%)
  const winWidth = Math.min(1366, Math.max(960, Math.floor(screenWidth * 0.94)));
  const winHeight = Math.min(840, Math.max(560, Math.floor(screenHeight * 0.92)));

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 920,
    minHeight: 520,
    center: true,
    title: "Hyperion Anti-Detect Multibrowser",
    icon: require('path').join(__dirname, 'assets/icon.png'),
    backgroundColor: "#070709",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// IPC HANDLERS: PROFILES
// ==========================================
ipcMain.handle('get-profiles', async () => {
  const profiles = readJson(PROFILES_FILE, []);
  return profiles.map(p => {
    const proc = RUNNING_PROCESSES.get(p.id);
    const isRunning = proc && !proc.killed && proc.exitCode === null;
    return {
      ...p,
      status: isRunning ? 'RUNNING' : 'STOPPED',
      pid: isRunning ? proc.pid : null,
      startTime: START_TIMES.get(p.id) || null
    };
  });
});

ipcMain.handle('create-profile', async (event, data) => {
  const profiles = readJson(PROFILES_FILE, []);
  const id = require('crypto').randomUUID();
  const fp = data.fingerprint || generateFingerprint(data.os || 'windows', id, '155');

  const newProfile = {
    id,
    name: data.name || `Профиль #${profiles.length + 1}`,
    os: data.os || 'windows',
    browser_version: '155',
    tags: data.tags || ['Main'],
    notes: data.notes || '',
    proxy: data.proxy || null,
    extensions: data.extensions || [],
    fingerprint: fp,
    createdAt: Date.now()
  };

  profiles.unshift(newProfile);
  writeJson(PROFILES_FILE, profiles);
  return newProfile;
});

ipcMain.handle('update-profile', async (event, id, data) => {
  const profiles = readJson(PROFILES_FILE, []);
  const idx = profiles.findIndex(p => p.id === id);
  if (idx !== -1) {
    profiles[idx] = { ...profiles[idx], ...data };
    writeJson(PROFILES_FILE, profiles);
    return profiles[idx];
  }
  throw new Error('Профиль не найден');
});


// =========================================================================
// BULLETPROOF PROFILE TERMINATION & PURGE HELPER
// =========================================================================
async function fullyTerminateAndPurgeProfile(id) {
  if (RUNNING_BRIDGES.has(id)) {
    try { RUNNING_BRIDGES.get(id).close(); } catch (e) {}
    RUNNING_BRIDGES.delete(id);
  }
  // 1. Terminate running process and process tree
  if (RUNNING_PROCESSES.has(id)) {
    const proc = RUNNING_PROCESSES.get(id);
    try {
      if (proc && proc.pid) {
        try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) {
          try { proc.kill('SIGKILL'); } catch (e2) {}
        }
      }
    } catch (e) {}
    RUNNING_PROCESSES.delete(id);
    START_TIMES.delete(id);
  }

  // Ensure no lingering background chrome processes for this profile
  try {
    const { execSync } = require('child_process');
    execSync(`pkill -9 -f "profile_${id}" 2>/dev/null || true`);
  } catch (e) {}

  // Micro delay for OS file locks release
  await new Promise(r => setTimeout(r, 80));

  // 2. Recursively and completely remove profile data directory
  const profileDir = path.join(PROFILES_DATA_DIR, `profile_${id}`);
  if (fs.existsSync(profileDir)) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch (e) {
      try {
        const { execSync } = require('child_process');
        execSync(`rm -rf "${profileDir}" 2>/dev/null || true`);
      } catch (e2) {}
    }
  }
}

ipcMain.handle('delete-profile', async (event, id) => {
  await fullyTerminateAndPurgeProfile(id);
  const profiles = readJson(PROFILES_FILE, []).filter(p => p.id !== id);
  writeJson(PROFILES_FILE, profiles);
  return { success: true };
});

ipcMain.handle('clone-profile', async (event, id) => {
  const profiles = readJson(PROFILES_FILE, []);
  const source = profiles.find(p => p.id === id);
  if (!source) throw new Error('Профиль не найден');

  const newId = require('crypto').randomUUID();
  const cloned = JSON.parse(JSON.stringify(source));
  cloned.id = newId;
  cloned.name = `${source.name} (Копия)`;
  cloned.createdAt = Date.now();
  cloned.fingerprint = generateFingerprint(cloned.os || 'windows', newId, '155', cloned.fingerprint);

  profiles.unshift(cloned);
  writeJson(PROFILES_FILE, profiles);
  return cloned;
});

ipcMain.handle('open-profile-folder', async (event, id) => {
  const chromeInfo = getChromeBinary();
  if (!chromeInfo.exists) {
    const binName = process.platform === 'win32' ? 'chrome.exe' : 'chrome';
    throw new Error(`Исполняемый файл браузера (${binName}) не найден.\nУкажите путь к Chrome в разделе «Настройки» или установите Google Chrome.`);
  }
  const CHROME_BIN = chromeInfo.path;

  const profileDir = path.join(PROFILES_DATA_DIR, `profile_${id}`);
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  // Clean stale Chromium single-process locks
  const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const f of lockFiles) {
    const lockPath = path.join(profileDir, f);
    try {
      if (fs.existsSync(lockPath) || fs.lstatSync(lockPath).isSymbolicLink()) {
        fs.unlinkSync(lockPath);
      }
    } catch (e) {}
  }
  shell.openPath(profileDir);
  return { success: true };
});

// ==========================================
// IPC HANDLERS: LAUNCH & PROCESS
// ==========================================
function queryProxyGeo(proxy) {
  return new Promise((resolve) => {
    if (!proxy || !proxy.host || !proxy.port) return resolve(null);
    let proxyUrl = '';
    const proto = proxy.protocol || 'socks5';
    if (proxy.user && proxy.pass) {
      proxyUrl = `${proto}://${encodeURIComponent(proxy.user)}:${encodeURIComponent(proxy.pass)}@${proxy.host}:${proxy.port}`;
    } else {
      proxyUrl = `${proto}://${proxy.host}:${proxy.port}`;
    }

    const curlArgs = ['-s', '--max-time', '8', '-x', proxyUrl, 'http://ip-api.com/json'];
    execFile('curl', curlArgs, (err, stdout) => {
      if (err) return resolve(null);
      try {
        const data = JSON.parse(stdout);
        if (data && data.status === 'success') {
          resolve(data);
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    });
  });
}

function createSocks5Bridge(remoteHost, remotePort, user, pass) {
  const server = net.createServer((clientSocket) => {
    let remoteSocket = null;

    clientSocket.once('data', (initialData) => {
      const headerStr = initialData.toString('utf-8');
      const firstLine = headerStr.split('\r\n')[0];
      const match = firstLine.match(/^(CONNECT|[A-Z]+)\s+(https?:\/\/)?([^:\/\s]+):?(\d+)?/i);

      if (!match) {
        clientSocket.destroy();
        return;
      }

      const method = match[1].toUpperCase();
      let targetHost = match[3];
      let targetPort = parseInt(match[4] || (method === 'CONNECT' ? '443' : '80'), 10);

      remoteSocket = net.connect(remotePort, remoteHost, () => {
        remoteSocket.write(Buffer.from([0x05, 0x01, 0x02]));
      });

      let state = 'GREET';

      const dataHandler = (chunk) => {
        if (state === 'GREET') {
          if (chunk[0] !== 0x05 || chunk[1] !== 0x02) {
            clientSocket.destroy();
            remoteSocket.destroy();
            return;
          }
          const uBuf = Buffer.from(user);
          const pBuf = Buffer.from(pass);
          const authBuf = Buffer.concat([
            Buffer.from([0x01, uBuf.length]),
            uBuf,
            Buffer.from([pBuf.length]),
            pBuf
          ]);
          state = 'AUTH';
          remoteSocket.write(authBuf);
        } else if (state === 'AUTH') {
          if (chunk[1] !== 0x00) {
            clientSocket.destroy();
            remoteSocket.destroy();
            return;
          }
          const hBuf = Buffer.from(targetHost);
          const reqBuf = Buffer.concat([
            Buffer.from([0x05, 0x01, 0x00, 0x03, hBuf.length]),
            hBuf,
            Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff])
          ]);
          state = 'CONNECT';
          remoteSocket.write(reqBuf);
        } else if (state === 'CONNECT') {
          if (chunk[1] !== 0x00) {
            clientSocket.destroy();
            remoteSocket.destroy();
            return;
          }
          state = 'STREAM';
          remoteSocket.removeListener('data', dataHandler);

          if (method === 'CONNECT') {
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n', () => {
              clientSocket.pipe(remoteSocket);
              remoteSocket.pipe(clientSocket);
            });
          } else {
            remoteSocket.write(initialData);
            clientSocket.pipe(remoteSocket);
            remoteSocket.pipe(clientSocket);
          }
        }
      };

      remoteSocket.on('data', dataHandler);
      remoteSocket.on('error', () => clientSocket.destroy());
      remoteSocket.on('close', () => clientSocket.destroy());
      clientSocket.on('error', () => remoteSocket && remoteSocket.destroy());
      clientSocket.on('close', () => remoteSocket && remoteSocket.destroy());
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
    server.on('error', reject);
  });
}

function ensureProfileHelperExtension(profileDir, user, pass) {
  const extDir = path.join(profileDir, 'profile_helper_ext');
  if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true });

  const manifest = {
    name: 'Hyperion Profile Helper',
    version: '1.0.2',
    manifest_version: 3,
    description: 'Hyperion profile helper for media spoofing and proxy authentication',
    permissions: [
      'storage'
    ],
    host_permissions: [
      '<all_urls>'
    ],
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_start',
        all_frames: true,
        match_about_blank: true,
        world: 'MAIN'
      }
    ]
  };

  let backgroundJs = '// Hyperion Profile Helper\n';
  if (user && pass) {
    manifest.permissions.push('webRequest', 'webRequestAuthProvider');
    manifest.background = {
      service_worker: 'background.js'
    };
    backgroundJs = `chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    return {
      authCredentials: {
        username: ${JSON.stringify(user)},
        password: ${JSON.stringify(pass)}
      }
    };
  },
  { urls: ["<all_urls>"] },
  ['blocking']
);
`;
  }

  // Realistic Media Devices content script directly in page execution context:
  const contentJs = `(function() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    const fakeDevs = [
      {
        deviceId: "default",
        kind: "audioinput",
        label: "Default - Microphone (Realtek High Definition Audio)",
        groupId: "group_audio_in"
      },
      {
        deviceId: "audio_in_1",
        kind: "audioinput",
        label: "Microphone (Realtek High Definition Audio)",
        groupId: "group_audio_in"
      },
      {
        deviceId: "default",
        kind: "audiooutput",
        label: "Default - Speakers (Realtek High Definition Audio)",
        groupId: "group_audio_out"
      },
      {
        deviceId: "audio_out_1",
        kind: "audiooutput",
        label: "Speakers (Realtek High Definition Audio)",
        groupId: "group_audio_out"
      },
      {
        deviceId: "video_in_1",
        kind: "videoinput",
        label: "HD WebCam",
        groupId: "group_video_in"
      }
    ];
    const origEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices = async function() {
      try {
        const real = await origEnumerate();
        if (real && real.length > 0 && !real.some(d => d.label && (d.label.toLowerCase().includes('pulse') || d.label.toLowerCase().includes('alsa')))) {
          return real;
        }
      } catch(e) {}
      return fakeDevs.map(d => ({
        deviceId: d.deviceId,
        kind: d.kind,
        label: d.label,
        groupId: d.groupId,
        toJSON: function() {
          return { deviceId: this.deviceId, kind: this.kind, label: this.label, groupId: this.groupId };
        }
      }));
    };
  } catch(e) {}
})();
`;

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(extDir, 'background.js'), backgroundJs);
  fs.writeFileSync(path.join(extDir, 'content.js'), contentJs);
  return extDir;
}

async function startProfileProcess(id, customUrls = null) {
  const profiles = readJson(PROFILES_FILE, []);
  const p = profiles.find(x => x.id === id);
  if (!p) throw new Error('Профиль не найден');

  const chromeInfo = getChromeBinary();
  if (!chromeInfo.exists) {
    const binName = process.platform === 'win32' ? 'chrome.exe' : 'chrome';
    throw new Error(`Исполняемый файл браузера (${binName}) не найден.\nУкажите путь к Chrome в разделе «Настройки» или установите Google Chrome.`);
  }
  const CHROME_BIN = chromeInfo.path;

  const profileDir = path.join(PROFILES_DATA_DIR, `profile_${id}`);
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const isAlreadyRunning = RUNNING_PROCESSES.has(id) && !RUNNING_PROCESSES.get(id).killed && RUNNING_PROCESSES.get(id).exitCode === null;

  if (isAlreadyRunning && (!customUrls || customUrls.length === 0)) {
    return { status: 'already_running', pid: RUNNING_PROCESSES.get(id).pid };
  }

  if (isAlreadyRunning && customUrls && customUrls.length > 0) {
    const forwardProc = spawn(CHROME_BIN, [`--user-data-dir=${profileDir}`, ...customUrls], {
      detached: true,
      stdio: 'ignore'
    });
    forwardProc.unref();
    return { status: 'urls_opened', pid: RUNNING_PROCESSES.get(id).pid };
  }

  // Stale lock cleanup to prevent browser launch hanging after SIGKILL/crash
  const staleLocks = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const sl of staleLocks) {
    const lockPath = path.join(profileDir, sl);
    try {
      if (fs.existsSync(lockPath) || fs.lstatSync(lockPath).isSymbolicLink()) {
        fs.unlinkSync(lockPath);
      }
    } catch (e) {}
  }

  const fp = p.fingerprint || generateFingerprint(p.os || 'windows', id, '155');

  // Gather installed extensions requested by profile
  const installedExts = readJson(EXTENSIONS_FILE, []);
  const extPaths = [];
  if (p.extensions && Array.isArray(p.extensions)) {
    for (const extId of p.extensions) {
      const ext = installedExts.find(e => e.id === extId);
      if (ext && ext.path && fs.existsSync(ext.path)) {
        extPaths.push(ext.path);
      }
    }
  }

  const isMobile = (p.os === 'android' || p.os === 'ios' || fp.client_hints?.mobile === true);

  const args = [
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--password-store=basic",
    `--window-size=${fp.screen?.width || 1920},${fp.screen?.height || 1080}`,
    `--user-agent=${fp.user_agent || ''}`,
    `--fingerprint-platform=${fp.platform || 'Win32'}`,
    `--fingerprint-concurrency=${fp.hardware?.concurrency || 8}`,
    `--fingerprint-memory=${fp.hardware?.memory || 16}`,
    `--fingerprint-webgl-vendor=${fp.webgl?.unmasked_vendor || ''}`,
    `--fingerprint-webgl-renderer=${fp.webgl?.unmasked_renderer || ''}`,
    `--fingerprint-canvas-seed=${fp.canvas_noise ? (fp.canvas_seed || 0.002) : 0.0}`,
    `--fingerprint-audio-seed=${fp.audio_noise ? (fp.audio_seed || 0.0003) : 0.0}`,
    `--fingerprint-screen-width=${fp.screen?.width || 1920}`,
    `--fingerprint-screen-height=${fp.screen?.height || 1080}`
  ];

  if (isMobile) {
    args.push('--touch-events=enabled');
    args.push('--enable-viewport');
    args.push('--use-mobile-user-agent');
    if (fp.screen?.pixel_ratio) {
      args.push(`--force-device-scale-factor=${fp.screen.pixel_ratio}`);
    }
  }

  // Privacy and Anti-Leak Flags
  args.push('--disable-background-networking');
  args.push('--disable-sync');
  args.push('--disable-component-update');
  args.push('--disable-domain-reliability');
  args.push('--no-pings');
  args.push('--disable-features=DnsOverHttps,AsyncDns');
  args.push('--disable-breakpad');
  args.push('--disable-client-side-phishing-detection');
  args.push('--no-report-upload');

  // Locale
  const locale = fp.locale || 'en-US';
  args.push(`--lang=${locale}`);

  // WebRTC leak prevention (always block non-proxied UDP leaks)
  const webrtcMode = fp.webrtc_mode || 'proxy_only';
  if (webrtcMode === 'disabled') {
    args.push('--disable-webrtc');
  } else {
    args.push('--force-webrtc-ip-handling-policy=disable_non_proxied_udp');
    args.push('--webrtc-ip-handling-policy=disable_non_proxied_udp');
  }

  // Always attach helper extension (media devices spoofing + proxy auth)
  const proxyUser = (p.proxy && p.proxy.enabled) ? p.proxy.user : null;
  const proxyPass = (p.proxy && p.proxy.enabled) ? p.proxy.pass : null;
  const helperExt = ensureProfileHelperExtension(profileDir, proxyUser, proxyPass);
  if (helperExt) extPaths.push(helperExt);

  // Proxy & Authenticated Proxy Support
  if (RUNNING_BRIDGES.has(id)) {
    try { RUNNING_BRIDGES.get(id).close(); } catch (e) {}
    RUNNING_BRIDGES.delete(id);
  }

  if (p.proxy && p.proxy.enabled && p.proxy.host && p.proxy.port) {
    if (p.proxy.protocol === 'socks5' && p.proxy.user && p.proxy.pass) {
      const bridge = await createSocks5Bridge(p.proxy.host, parseInt(p.proxy.port, 10), p.proxy.user, p.proxy.pass);
      RUNNING_BRIDGES.set(id, bridge.server);
      args.push(`--proxy-server=http://127.0.0.1:${bridge.port}`);
      args.push('--proxy-bypass-list=<-loopback>');
    } else {
      const proto = p.proxy.protocol || 'socks5';
      args.push(`--proxy-server=${proto}://${p.proxy.host}:${p.proxy.port}`);
      args.push('--proxy-bypass-list=<-loopback>');
    }
  }

  // Extensions (including profile helper extension)
  if (extPaths.length > 0) {
    args.push(`--load-extension=${extPaths.join(',')}`);
    args.push('--disable-features=ExtensionManifestV2DeprecationWarning');
  }

  // Start URL
  const settings = readJson(SETTINGS_FILE, {});
  const profileUrls = (customUrls && customUrls.length > 0)
    ? customUrls
    : ((p.start_urls && p.start_urls.length > 0) ? p.start_urls : [fp.start_url || settings.default_url || 'https://google.com']);
  for (const u of profileUrls) {
    if (u && u.trim()) args.push(u.trim());
  }

  const spawnEnv = { ...process.env };
  let effectiveTz = (fp.timezone && fp.timezone !== 'auto') ? fp.timezone : null;
  if (!effectiveTz && p.proxy && p.proxy.enabled) {
    if (p.proxy.timezone) {
      effectiveTz = p.proxy.timezone;
    } else {
      const geo = await queryProxyGeo(p.proxy);
      if (geo && geo.timezone) {
        effectiveTz = geo.timezone;
        p.proxy.timezone = geo.timezone;
        p.proxy.country = geo.country;
        p.proxy.city = geo.city;
        writeJson(PROFILES_FILE, profiles);
      }
    }
  }
  if (effectiveTz) {
    spawnEnv.TZ = effectiveTz;
  }

  // Isolated Fonts: Load application-packaged fonts without installing in host system
  const appFontsDir = path.join(__dirname, 'fonts');
  if (fs.existsSync(appFontsDir)) {
    const fontsConfPath = path.join(profileDir, 'fonts.conf');
    const fontsCacheDir = path.join(profileDir, 'fontconfig');
    const fontsXml = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
  <dir>${appFontsDir}</dir>
  <cachedir>${fontsCacheDir}</cachedir>
</fontconfig>`;
    fs.writeFileSync(fontsConfPath, fontsXml, 'utf-8');
    spawnEnv.FONTCONFIG_FILE = fontsConfPath;
  }

  const child = spawn(CHROME_BIN, args, {
    detached: true,
    stdio: 'ignore',
    env: spawnEnv
  });

  child.unref();
  RUNNING_PROCESSES.set(id, child);
  START_TIMES.set(id, Date.now());

  child.on('exit', () => {
    RUNNING_PROCESSES.delete(id);
    START_TIMES.delete(id);
    if (RUNNING_BRIDGES.has(id)) {
      try { RUNNING_BRIDGES.get(id).close(); } catch (e) {}
      RUNNING_BRIDGES.delete(id);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('profile-stopped', id);
    }
  });

  return { status: 'started', pid: child.pid };
}

async function stopProfileProcess(id) {
  if (RUNNING_BRIDGES.has(id)) {
    try { RUNNING_BRIDGES.get(id).close(); } catch (e) {}
    RUNNING_BRIDGES.delete(id);
  }
  if (RUNNING_PROCESSES.has(id)) {
    const proc = RUNNING_PROCESSES.get(id);
    try {
      if (proc && proc.pid) {
        try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) {
          try { proc.kill('SIGKILL'); } catch (e2) {}
        }
      }
    } catch (e) {}
    RUNNING_PROCESSES.delete(id);
    START_TIMES.delete(id);
  }
  try {
    const { execSync } = require('child_process');
    execSync(`pkill -9 -f "profile_${id}" 2>/dev/null || true`);
  } catch (e) {}
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('profile-stopped', id);
  }
  return { status: 'stopped' };
}

ipcMain.handle('start-profile', async (event, id, customUrls) => {
  return await startProfileProcess(id, customUrls);
});

ipcMain.handle('stop-profile', async (event, id) => {
  return await stopProfileProcess(id);
});

// ==========================================
// IPC HANDLERS: PROXIES
// ==========================================
ipcMain.handle('get-proxies', async () => {
  return readJson(PROXIES_FILE, []);
});

ipcMain.handle('save-proxy', async (event, proxyData) => {
  const proxies = readJson(PROXIES_FILE, []);
  if (proxyData.id) {
    const idx = proxies.findIndex(p => p.id === proxyData.id);
    if (idx !== -1) {
      proxies[idx] = { ...proxies[idx], ...proxyData, updatedAt: Date.now() };
      writeJson(PROXIES_FILE, proxies);
      return proxies[idx];
    }
  }
  const newProxy = {
    id: require('crypto').randomUUID(),
    title: proxyData.title || `${proxyData.host}:${proxyData.port}`,
    protocol: proxyData.protocol || 'socks5',
    host: proxyData.host,
    port: proxyData.port,
    user: proxyData.user || '',
    pass: proxyData.pass || '',
    ping: null,
    status: 'unchecked',
    createdAt: Date.now()
  };
  proxies.unshift(newProxy);
  writeJson(PROXIES_FILE, proxies);
  return newProxy;
});

ipcMain.handle('delete-proxy', async (event, id) => {
  const proxies = readJson(PROXIES_FILE, []).filter(p => p.id !== id);
  writeJson(PROXIES_FILE, proxies);
  return { success: true };
});

ipcMain.handle('import-proxies', async (event, rawText) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const proxies = readJson(PROXIES_FILE, []);
  let count = 0;

  for (const line of lines) {
    // Format: host:port:user:pass or protocol://user:pass@host:port or host:port
    let proto = 'socks5', host = '', port = '', user = '', pass = '';
    let clean = line;
    if (clean.includes('://')) {
      const parts = clean.split('://');
      proto = parts[0];
      clean = parts[1];
    }

    if (clean.includes('@')) {
      const [auth, hp] = clean.split('@');
      const [u, p] = auth.split(':');
      const [h, pt] = hp.split(':');
      user = u || '';
      pass = p || '';
      host = h;
      port = pt;
    } else {
      const parts = clean.split(':');
      if (parts.length >= 2) {
        host = parts[0];
        port = parts[1];
        if (parts.length >= 4) {
          user = parts[2];
          pass = parts[3];
        }
      }
    }

    if (host && port) {
      proxies.unshift({
        id: require('crypto').randomUUID(),
        title: `${host}:${port}`,
        protocol: proto,
        host,
        port,
        user,
        pass,
        ping: null,
        status: 'unchecked',
        createdAt: Date.now()
      });
      count++;
    }
  }

  writeJson(PROXIES_FILE, proxies);
  return { count, total: proxies.length };
});

ipcMain.handle('test-proxy', async (event, proxy) => {
  if (!proxy || !proxy.host || !proxy.port) return { success: false, error: 'Укажите хост и порт' };
  const start = Date.now();
  const geo = await queryProxyGeo(proxy);
  const ping = Date.now() - start;
  if (geo) {
    return {
      success: true,
      ping,
      ip: geo.query,
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      timezone: geo.timezone,
      isp: geo.isp
    };
  }
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(4000);
    sock.connect(parseInt(proxy.port), proxy.host, () => {
      sock.destroy();
      resolve({ success: true, ping });
    });
    sock.on('error', (err) => {
      sock.destroy();
      resolve({ success: false, error: err.message });
    });
    sock.on('timeout', () => {
      sock.destroy();
      resolve({ success: false, error: 'Таймаут' });
    });
  });
});

// ==========================================
// IPC HANDLERS: EXTENSIONS
// ==========================================
ipcMain.handle('get-extensions', async () => {
  const installed = readJson(EXTENSIONS_FILE, []);
  return {
    installed,
    catalog: POPULAR_EXTENSIONS
  };
});

ipcMain.handle('install-extension', async (event, rawExtId) => {
  let extId = (rawExtId || '').trim();
  const match = extId.match(/([a-z]{32})/i);
  if (match) {
    extId = match[1].toLowerCase();
  }
  const targetDir = path.join(EXTENSIONS_DIR, extId);
  const scriptPath = path.join(__dirname, 'ext_installer.py');

  return new Promise((resolve, reject) => {
    execFile(scriptPath, [extId, targetDir], (error, stdout, stderr) => {
      if (error) {
        return resolve({ success: false, error: stderr || error.message });
      }
      try {
        const res = JSON.parse(stdout);
        if (res.success) {
          const installed = readJson(EXTENSIONS_FILE, []);
          const popular = POPULAR_EXTENSIONS.find(p => p.id === extId);
          const extRecord = {
            id: extId,
            name: popular?.name || res.name || extId,
            description: popular?.description || 'Пользовательское расширение',
            version: res.version || '1.0',
            path: targetDir,
            icon: popular?.icon || '🧩',
            installedAt: Date.now()
          };
          const existingIdx = installed.findIndex(e => e.id === extId);
          if (existingIdx !== -1) {
            installed[existingIdx] = extRecord;
          } else {
            installed.push(extRecord);
          }
          writeJson(EXTENSIONS_FILE, installed);
          return resolve({ success: true, extension: extRecord });
        }
        resolve(res);
      } catch (e) {
        resolve({ success: false, error: stdout });
      }
    });
  });
});

ipcMain.handle('pick-extension-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите распакованную папку расширения',
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const selectedPath = result.filePaths[0];
  const manifestPath = path.join(selectedPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Выбранная папка не содержит manifest.json');
  }

  let manifest = {};
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    throw new Error('Некорректный manifest.json');
  }

  const id = `custom_${Date.now()}`;
  const installed = readJson(EXTENSIONS_FILE, []);
  const record = {
    id,
    name: manifest.name || path.basename(selectedPath),
    description: manifest.description || 'Распакованное локальное расширение',
    version: manifest.version || '1.0',
    path: selectedPath,
    icon: '📂',
    installedAt: Date.now()
  };

  installed.push(record);
  writeJson(EXTENSIONS_FILE, installed);
  return { success: true, extension: record };
});

ipcMain.handle('delete-extension', async (event, extId) => {
  let installed = readJson(EXTENSIONS_FILE, []);
  installed = installed.filter(e => e.id !== extId);
  writeJson(EXTENSIONS_FILE, installed);

  const targetDir = path.join(EXTENSIONS_DIR, extId);
  if (fs.existsSync(targetDir)) {
    try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch (e) {}
  }
  return { success: true };
});

// ==========================================
// IPC HANDLERS: TEMPLATES & DICTIONARIES
// ==========================================
ipcMain.handle('get-fp-dictionaries', async () => {
  return {
    GPU_PROFILES,
    RESOLUTIONS,
    CPU_CORES_LIST,
    RAM_LIST,
    TIMEZONES,
    LOCALES,
    WEBRTC_MODES
  };
});

const DEFAULT_TEMPLATES = [
  {
    id: "tpl_samsung_s24u",
    name: "Samsung Galaxy S24 Ultra (Snapdragon 8 Gen 3)",
    os: "android",
    gpu: "Qualcomm Adreno (TM) 750 (Galaxy S24 Ultra / Xiaomi 14)",
    cores: 8,
    ram: 12,
    res: "412x915",
    tz: "auto",
    locale: "ru-RU",
    webrtc: "proxy_only",
    isCustom: false
  },
  {
    id: "tpl_iphone_15_promax",
    name: "Apple iPhone 15 Pro Max (iOS 17)",
    os: "ios",
    gpu: "Apple A17 Pro GPU (iPhone 15 Pro / Pro Max)",
    cores: 6,
    ram: 8,
    res: "430x932",
    tz: "auto",
    locale: "ru-RU",
    webrtc: "proxy_only",
    isCustom: false
  },
  {
    id: "tpl_pixel_8_pro",
    name: "Google Pixel 8 Pro (Tensor G3)",
    os: "android",
    gpu: "ARM Mali-G715 Immortalis MC11 (Google Tensor G3 / Pixel 8 Pro)",
    cores: 8,
    ram: 12,
    res: "412x892",
    tz: "auto",
    locale: "en-US",
    webrtc: "proxy_only",
    isCustom: false
  },
  {
    id: "tpl_xiaomi_14",
    name: "Xiaomi 14 Ultra (HyperOS / Adreno 750)",
    os: "android",
    gpu: "Qualcomm Adreno (TM) 750 (Galaxy S24 Ultra / Xiaomi 14)",
    cores: 8,
    ram: 16,
    res: "412x915",
    tz: "auto",
    locale: "ru-RU",
    webrtc: "proxy_only",
    isCustom: false
  },
  {
    id: "tpl_ipad_pro_m2",
    name: "Apple iPad Pro 12.9 M2 (iPadOS 17)",
    os: "ios",
    gpu: "Apple M2 GPU (iPad Pro 12.9 / 11 M2)",
    cores: 8,
    ram: 16,
    res: "1024x1366",
    tz: "auto",
    locale: "en-US",
    webrtc: "proxy_only",
    isCustom: false
  },
  {
    id: "tpl_win11_gamer",
    name: "Windows 11 Gaming Rig (RTX 4090)",
    os: "windows",
    gpu: "NVIDIA GeForce RTX 4090 (24 GB)",
    cores: 16,
    ram: 32,
    res: "2560x1440",
    tz: "Europe/Moscow",
    locale: "ru-RU",
    webrtc: "proxy_only",
    isCustom: false
  },
  {
    id: "tpl_mac_m3",
    name: "MacBook Pro M3 Max",
    os: "macos",
    gpu: "Apple M3 Max (Metal)",
    cores: 16,
    ram: 64,
    res: "3456x2234",
    tz: "Europe/London",
    locale: "en-US",
    webrtc: "proxy_only",
    isCustom: false
  },
  {
    id: "tpl_office_win",
    name: "Office Workstation (Iris Xe)",
    os: "windows",
    gpu: "Intel(R) Iris(R) Xe Graphics (Core i7/i5 Mobile)",
    cores: 8,
    ram: 16,
    res: "1920x1080",
    tz: "America/New_York",
    locale: "en-US",
    webrtc: "proxy_only",
    isCustom: false
  },
  {
    id: "tpl_crypto_mac",
    name: "MacBook Air M2 (DeFi / Crypto)",
    os: "macos",
    gpu: "Apple M2 (Metal)",
    cores: 8,
    ram: 16,
    res: "2560x1600",
    tz: "Asia/Singapore",
    locale: "en-US",
    webrtc: "proxy_only",
    isCustom: false
  },
  {
    id: "tpl_linux_dev",
    name: "Linux Workstation (Radeon 7900 XTX)",
    os: "linux",
    gpu: "AMD Radeon RX 7900 XTX (Mesa / RADV)",
    cores: 24,
    ram: 64,
    res: "3840x2160",
    tz: "Europe/Berlin",
    locale: "de-DE",
    webrtc: "proxy_only",
    isCustom: false
  }
];

ipcMain.handle('get-templates', async () => {
  if (!fs.existsSync(TEMPLATES_FILE)) {
    writeJson(TEMPLATES_FILE, DEFAULT_TEMPLATES);
    return DEFAULT_TEMPLATES;
  }
  const loaded = readJson(TEMPLATES_FILE, []);
  if (loaded.length === 0) {
    writeJson(TEMPLATES_FILE, DEFAULT_TEMPLATES);
    return DEFAULT_TEMPLATES;
  }
  const existingIds = new Set(loaded.map(t => t.id));
  let modified = false;
  for (const defTpl of DEFAULT_TEMPLATES) {
    if (!existingIds.has(defTpl.id)) {
      loaded.push(defTpl);
      modified = true;
    }
  }
  if (modified) writeJson(TEMPLATES_FILE, loaded);
  return loaded;
});

ipcMain.handle('save-template', async (event, template) => {
  const templates = readJson(TEMPLATES_FILE, DEFAULT_TEMPLATES);
  const newTpl = {
    ...template,
    id: template.id || `custom_${Date.now()}`,
    isCustom: true,
    createdAt: Date.now()
  };
  templates.unshift(newTpl);
  writeJson(TEMPLATES_FILE, templates);
  return newTpl;
});

ipcMain.handle('delete-template', async (event, id) => {
  let templates = readJson(TEMPLATES_FILE, DEFAULT_TEMPLATES);
  templates = templates.filter(t => t.id !== id);
  writeJson(TEMPLATES_FILE, templates);
  return { success: true };
});

ipcMain.handle('get-preview-fingerprint', async (event, os, overrides) => {
  return generateFingerprint(os || 'windows', require('crypto').randomUUID(), '155', overrides);
});

// ==========================================

// ==========================================
// IPC HANDLERS: BULK OPERATIONS
// ==========================================
ipcMain.handle('bulk-start-profiles', async (event, ids) => {
  const results = [];
  for (const id of ids) {
    try {
      const res = await startProfileProcess(id);
      results.push({ id, success: true, pid: res.pid });
    } catch (e) {
      results.push({ id, success: false, error: e.message });
    }
  }
  return results;
});

ipcMain.handle('bulk-stop-profiles', async (event, ids) => {
  const results = [];
  for (const id of ids) {
    try {
      await stopProfileProcess(id);
      results.push({ id, stopped: true });
    } catch (e) {
      results.push({ id, stopped: false, error: e.message });
    }
  }
  return results;
});

ipcMain.handle('bulk-delete-profiles', async (event, ids) => {
  for (const id of ids) {
    await fullyTerminateAndPurgeProfile(id);
  }
  let profiles = readJson(PROFILES_FILE, []);
  profiles = profiles.filter(p => !ids.includes(p.id));
  writeJson(PROFILES_FILE, profiles);
  return { success: true, deleted: ids.length };
});

// ==========================================
// IPC HANDLERS: COOKIES
// ==========================================
ipcMain.handle('import-cookies', async (event, profileId, cookiesJson) => {
  const dbPath = path.join(PROFILES_DATA_DIR, 'profile_' + profileId, 'Default', 'Network', 'Cookies');
  const scriptPath = path.join(__dirname, 'cookie_manager.py');

  return new Promise((resolve) => {
    const py = spawn('python3', [scriptPath, 'import', dbPath]);
    let stdout = '', stderr = '';
    py.stdout.on('data', d => stdout += d.toString());
    py.stderr.on('data', d => stderr += d.toString());
    py.on('close', code => {
      try {
        const res = JSON.parse(stdout);
        resolve(res);
      } catch (e) {
        resolve({ success: false, error: stderr || stdout || e.message });
      }
    });
    py.stdin.write(typeof cookiesJson === 'string' ? cookiesJson : JSON.stringify(cookiesJson));
    py.stdin.end();
  });
});

ipcMain.handle('export-cookies', async (event, profileId) => {
  const dbPath = path.join(PROFILES_DATA_DIR, 'profile_' + profileId, 'Default', 'Network', 'Cookies');
  const scriptPath = path.join(__dirname, 'cookie_manager.py');

  return new Promise((resolve) => {
    const py = spawn('python3', [scriptPath, 'export', dbPath]);
    let stdout = '', stderr = '';
    py.stdout.on('data', d => stdout += d.toString());
    py.stderr.on('data', d => stderr += d.toString());
    py.on('close', code => {
      try {
        const res = JSON.parse(stdout);
        resolve(res);
      } catch (e) {
        resolve({ success: false, error: stderr || stdout || e.message });
      }
    });
  });
});

// ==========================================
// IPC HANDLERS: ROTATE PROXY & INSPECT IP
// ==========================================
ipcMain.handle('rotate-proxy-ip', async (event, proxyId) => {
  const proxies = readJson(PROXIES_FILE, []);
  const px = proxies.find(p => p.id === proxyId);
  if (!px || !px.change_ip_url) {
    return { success: false, error: 'Ссылка смены IP не указана' };
  }

  const https = require(px.change_ip_url.startsWith('https') ? 'https' : 'http');
  return new Promise((resolve) => {
    const req = https.get(px.change_ip_url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', d => data += d.toString());
      res.on('end', () => {
        resolve({ success: true, response: data.trim().slice(0, 150) });
      });
    });
    req.on('error', err => resolve({ success: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Таймаут смены IP' });
    });
  });
});

ipcMain.handle('inspect-ip', async (event, proxy) => {
  const geo = await queryProxyGeo(proxy);
  if (geo) {
    return { success: true, info: geo };
  }
  return { success: false, error: 'Не удалось получить геоданные через прокси' };
});


// ==========================================
// IPC HANDLERS: BULK CREATE PROFILES (FEATURE 6)
// ==========================================
ipcMain.handle('bulk-create-profiles', async (event, config) => {
  const count = Math.min(Math.max(parseInt(config.count) || 1, 1), 50);
  const baseName = config.baseName || 'Профиль';
  const os = config.os || 'windows';
  const tags = config.tags || ['Auto'];
  const folder = config.folder || '';
  const startUrls = config.startUrls || [];

  const profiles = readJson(PROFILES_FILE, []);
  const created = [];

  for (let i = 1; i <= count; i++) {
    const id = require('crypto').randomUUID();
    const fp = generateFingerprint(os, id, '155');
    if (startUrls.length > 0) {
      fp.start_url = startUrls[0];
    }
    const newP = {
      id,
      name: `${baseName} #${profiles.length + 1}`,
      os,
      browser_version: '155',
      folder: folder,
      tags: tags,
      notes: `Массово создан (${new Date().toLocaleDateString('ru-RU')})`,
      proxy: null,
      extensions: [],
      start_urls: startUrls,
      fingerprint: fp,
      createdAt: Date.now()
    };
    profiles.unshift(newP);
    created.push(newP);
  }

  writeJson(PROFILES_FILE, profiles);
  return { success: true, count: created.length, profiles: created };
});

// ==========================================
// IPC HANDLERS: EXPORT/IMPORT .HYPERION PACKAGE (FEATURE 5)
// ==========================================
ipcMain.handle('export-profile-package', async (event, profileId) => {
  const profiles = readJson(PROFILES_FILE, []);
  const p = profiles.find(x => x.id === profileId);
  if (!p) throw new Error('Профиль не найден');

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: `Экспорт профиля "${p.name}" в .hyperion`,
    defaultPath: `${p.name.replace(/[^a-zA-Z0-9А-Яа-я_-]/g, '_')}.hyperion`,
    filters: [{ name: 'Hyperion Profile Package', extensions: ['hyperion', 'json'] }]
  });

  if (!filePath) return { canceled: true };

  // Read cookies if exist
  const dbPath = path.join(PROFILES_DATA_DIR, `profile_${profileId}`, 'Default', 'Network', 'Cookies');
  let cookies = [];
  if (fs.existsSync(dbPath)) {
    try {
      const scriptPath = path.join(__dirname, 'cookie_manager.py');
      const { execFileSync } = require('child_process');
      const out = execFileSync('python3', [scriptPath, 'export', dbPath]);
      const res = JSON.parse(out.toString());
      if (res.success) cookies = res.cookies;
    } catch (e) {}
  }

  const pkg = {
    format: "hyperion_profile_v1",
    exportedAt: Date.now(),
    profile: p,
    cookies: cookies
  };

  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2), 'utf-8');
  return { success: true, filePath };
});

ipcMain.handle('import-profile-package', async (event) => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите архив профиля .hyperion',
    filters: [{ name: 'Hyperion Profile Package', extensions: ['hyperion', 'json'] }],
    properties: ['openFile']
  });

  if (!filePaths || filePaths.length === 0) return { canceled: true };

  const raw = fs.readFileSync(filePaths[0], 'utf-8');
  const pkg = JSON.parse(raw);

  if (!pkg.profile) throw new Error('Некорректный формат архива .hyperion');

  const profiles = readJson(PROFILES_FILE, []);
  const newId = require('crypto').randomUUID();
  const newProfile = {
    ...pkg.profile,
    id: newId,
    name: `${pkg.profile.name} (Импорт)`,
    createdAt: Date.now()
  };

  profiles.unshift(newProfile);
  writeJson(PROFILES_FILE, profiles);

  // Restore cookies if present
  if (pkg.cookies && pkg.cookies.length > 0) {
    const dbPath = path.join(PROFILES_DATA_DIR, `profile_${newId}`, 'Default', 'Network', 'Cookies');
    try {
      const scriptPath = path.join(__dirname, 'cookie_manager.py');
      const { spawnSync } = require('child_process');
      spawnSync('python3', [scriptPath, 'import', dbPath], {
        input: JSON.stringify(pkg.cookies)
      });
    } catch (e) {}
  }

  return { success: true, profile: newProfile };
});

// ==========================================
// IPC HANDLERS: COOKIE ROBOT WARM-UP (FEATURE 3)
// ==========================================
ipcMain.handle('warmup-profile', async (event, profileId, customUrls) => {
  const profiles = readJson(PROFILES_FILE, []);
  const p = profiles.find(x => x.id === profileId);
  if (!p) throw new Error('Профиль не найден');

  const chromeInfo = getChromeBinary();
  const CHROME_BIN = chromeInfo.path;
  const profileDir = path.join(PROFILES_DATA_DIR, `profile_${profileId}`);
  const scriptPath = path.join(__dirname, 'warmup_robot.py');

  let proxyArg = 'none';
  if (p.proxy && p.proxy.enabled && p.proxy.host && p.proxy.port) {
    proxyArg = `${p.proxy.protocol || 'socks5'}://${p.proxy.host}:${p.proxy.port}`;
  }

  return new Promise((resolve) => {
    const py = spawn('python3', [scriptPath, CHROME_BIN, profileDir, proxyArg]);
    let stdout = '', stderr = '';
    py.stdout.on('data', d => {
      const text = d.toString();
      stdout += text;
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{"type": "progress"') || trimmed.startsWith('{"type":"progress"')) {
          try {
            const data = JSON.parse(trimmed);
            event.sender.send('warmup-progress', data);
          } catch (e) {}
        }
      }
    });
    py.stderr.on('data', d => stderr += d.toString());
    py.on('close', code => {
      try {
        const lines = stdout.trim().split('\n');
        let res = null;
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]);
            if (parsed.success !== undefined) {
              res = parsed;
              break;
            }
          } catch (e) {}
        }
        if (res) {
          resolve(res);
        } else {
          resolve({ success: false, error: stderr || stdout || 'Unknown error' });
        }
      } catch (e) {
        resolve({ success: false, error: stderr || stdout || e.message });
      }
    });
    if (customUrls && customUrls.length > 0) {
      py.stdin.write(customUrls.join('\n') + '\n');
    }
    py.stdin.end();
  });
});

// ==========================================
// IPC HANDLERS: FOLDERS & WORKSPACES (FEATURE 2)
// ==========================================
const FOLDERS_FILE = path.join(CONFIG_DIR, 'folders.json');

ipcMain.handle('get-folders', async () => {
  return readJson(FOLDERS_FILE, []);
});

ipcMain.handle('save-folders', async (event, folders) => {
  writeJson(FOLDERS_FILE, folders);
  return folders;
});

// IPC HANDLERS: SETTINGS & BACKUP
// ==========================================
ipcMain.handle('get-settings', async () => {
  const chromeInfo = getChromeBinary();
  const def = {
    default_url: 'https://google.com',
    engine_bin: chromeInfo.path,
    webrtc_default: 'proxy_only',
    clear_cache_on_exit: false
  };
  return { ...def, ...readJson(SETTINGS_FILE, {}) };
});

ipcMain.handle('save-settings', async (event, newSettings) => {
  writeJson(SETTINGS_FILE, newSettings);
  return newSettings;
});

ipcMain.handle('clear-cache', async () => {
  let cleared = 0;
  const profiles = readJson(PROFILES_FILE, []);
  const activeIds = new Set(profiles.map(p => `profile_${p.id}`));

  if (fs.existsSync(PROFILES_DATA_DIR)) {
    const dirs = fs.readdirSync(PROFILES_DATA_DIR);
    for (const dir of dirs) {
      const fullDir = path.join(PROFILES_DATA_DIR, dir);

      // Clean orphan folders that no longer exist in profiles.json
      if (!activeIds.has(dir)) {
        try {
          fs.rmSync(fullDir, { recursive: true, force: true, maxRetries: 3 });
          continue;
        } catch (e) {}
      }

      // Clean comprehensive caches in active profile
      const cacheSubdirs = [
        path.join(fullDir, 'Default', 'Cache'),
        path.join(fullDir, 'Default', 'Code Cache'),
        path.join(fullDir, 'Default', 'GPUCache'),
        path.join(fullDir, 'Default', 'DawnGraphiteCache'),
        path.join(fullDir, 'Default', 'DawnWebGPUCache'),
        path.join(fullDir, 'Default', 'Service Worker', 'CacheStorage'),
        path.join(fullDir, 'ShaderCache')
      ];

      let anyCleared = false;
      for (const cDir of cacheSubdirs) {
        if (fs.existsSync(cDir)) {
          try {
            fs.rmSync(cDir, { recursive: true, force: true, maxRetries: 3 });
            anyCleared = true;
          } catch (e) {}
        }
      }
      if (anyCleared) cleared++;
    }
  }
  return { success: true, clearedProfiles: cleared };
});

ipcMain.handle('export-backup', async () => {
  const backup = {
    version: "1.0",
    date: new Date().toISOString(),
    profiles: readJson(PROFILES_FILE, []),
    proxies: readJson(PROXIES_FILE, []),
    templates: readJson(TEMPLATES_FILE, []),
    folders: readJson(FOLDERS_FILE, []),
    extensions: readJson(EXTENSIONS_FILE, []),
    settings: readJson(SETTINGS_FILE, {})
  };

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Экспорт резервной копии Hyperion',
    defaultPath: `hyperion_backup_${Date.now()}.json`,
    filters: [{ name: 'JSON Backup', extensions: ['json'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8');
    return { success: true, filePath };
  }
  return { success: false };
});

ipcMain.handle('import-backup', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите файл резервной копии Hyperion (JSON)',
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { success: false, error: 'Отменено' };
  }

  try {
    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const data = JSON.parse(raw);

    if (!data || (!data.profiles && !data.proxies && !data.templates)) {
      return { success: false, error: 'Некорректный файл резервной копии' };
    }

    if (Array.isArray(data.profiles)) writeJson(PROFILES_FILE, data.profiles);
    if (Array.isArray(data.proxies)) writeJson(PROXIES_FILE, data.proxies);
    if (Array.isArray(data.templates)) writeJson(TEMPLATES_FILE, data.templates);
    if (Array.isArray(data.folders)) writeJson(FOLDERS_FILE, data.folders);
    if (Array.isArray(data.extensions)) writeJson(EXTENSIONS_FILE, data.extensions);
    if (data.settings && typeof data.settings === 'object') writeJson(SETTINGS_FILE, data.settings);

    return {
      success: true,
      profilesCount: (data.profiles || []).length,
      proxiesCount: (data.proxies || []).length
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});


ipcMain.handle('select-chrome-binary', async () => {
  const isWin = process.platform === 'win32';
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите исполняемый файл Chrome / Chromium',
    properties: ['openFile'],
    filters: isWin
      ? [{ name: 'Исполняемые файлы (*.exe)', extensions: ['exe'] }, { name: 'Все файлы', extensions: ['*'] }]
      : [{ name: 'Исполняемые файлы', extensions: ['*'] }]
  });
  if (canceled || !filePaths || filePaths.length === 0) return null;
  const chosenPath = filePaths[0];
  const settings = readJson(SETTINGS_FILE, {});
  settings.chrome_path = chosenPath;
  writeJson(SETTINGS_FILE, settings);
  return { path: chosenPath, exists: fs.existsSync(chosenPath) };
});

ipcMain.handle('rescan-chrome-binary', async () => {
  const settings = readJson(SETTINGS_FILE, {});
  delete settings.chrome_path;
  writeJson(SETTINGS_FILE, settings);
  return getChromeBinary();
});

ipcMain.handle('get-system-status', async () => {
  const chromeInfo = getChromeBinary();
  return {
    engine: "Hyperion v1.0.2",
    binary: chromeInfo.path,
    binaryExists: chromeInfo.exists,
    os: process.platform,
    arch: process.arch,
    profilesCount: readJson(PROFILES_FILE, []).length,
    proxiesCount: readJson(PROXIES_FILE, []).length,
    extensionsCount: readJson(EXTENSIONS_FILE, []).length
  };
});


app.on('before-quit', () => {
  for (const [id, proc] of RUNNING_PROCESSES.entries()) {
    try {
      if (proc && proc.pid) {
        try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) {
          try { proc.kill('SIGKILL'); } catch (e2) {}
        }
      }
    } catch (e) {}
  }
  RUNNING_PROCESSES.clear();
});

// ==========================================
// IPC HANDLERS: UPDATES & UPSTREAM CI/CD
// ==========================================
ipcMain.handle('check-for-updates', async (event, customRepo) => {
  try {
    const res = await updater.checkForUpdates(customRepo);
    return { success: true, data: res };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-system-versions', async () => {
  try {
    const res = await updater.getInstalledVersions();
    return { success: true, data: res };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('save-github-repo', async (event, repo) => {
  try {
    const settings = readJson(SETTINGS_FILE, {});
    settings.github_repo = (repo || '').trim();
    writeJson(SETTINGS_FILE, settings);
    return { success: true, repo: settings.github_repo };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-github-repo', async () => {
  const settings = readJson(SETTINGS_FILE, {});
  return settings.github_repo || '';
});

ipcMain.handle('get-app-version', async () => {
  return updater.getAppVersion();
});
