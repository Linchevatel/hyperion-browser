const { execFile, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const os = require('os');
const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, '.config', 'hyperion-browser');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');
const DEFAULT_REPO = 'Linchevatel/hyperion-browser';

function fetchJson(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const protocol = parsed.protocol === 'https:' ? https : http;
      const req = protocol.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: { 'User-Agent': 'Hyperion-Updater/1.0.1' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    } catch (e) {
      resolve(null);
    }
  });
}

function getAppVersion() {
  try {
    const pkg = require('./package.json');
    return pkg.version || '1.0.1';
  } catch (e) {
    return '1.0.1';
  }
}

function isNewerVersion(latest, current) {
  const parse = v => String(v || '').replace(/^v/, '').split('.').map(x => parseInt(x, 10) || 0);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lPart = l[i] || 0;
    const cPart = c[i] || 0;
    if (lPart > cPart) return true;
    if (lPart < cPart) return false;
  }
  return false;
}

// Background update check
async function checkForUpdates(customRepo = null) {
  const currentVersion = getAppVersion();

  let repo = customRepo;
  if (!repo && fs.existsSync(SETTINGS_FILE)) {
    try {
      const s = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      repo = s.github_repo || '';
    } catch (e) {}
  }
  if (!repo) {
    repo = DEFAULT_REPO;
  }

  let updateAvailable = false;
  let latestVersion = currentVersion;
  let releaseNotes = '';
  let downloadUrl = null;

  // 1. Check configured GitHub repository
  if (repo && repo.includes('/')) {
    const ghData = await fetchJson(`https://api.github.com/repos/${repo}/releases/latest`);
    if (ghData && ghData.tag_name) {
      const tagClean = ghData.tag_name.replace(/^v/, '');
      latestVersion = tagClean;
      if (isNewerVersion(tagClean, currentVersion)) {
        updateAvailable = true;
        releaseNotes = ghData.body || 'Новая версия Hyperion готова к установке.';
        if (ghData.assets && ghData.assets.length > 0) {
          const isWin = process.platform === 'win32';
          if (isWin) {
            const exeAsset = ghData.assets.find(a => a.name && a.name.endsWith('.exe'));
            downloadUrl = exeAsset ? exeAsset.browser_download_url : ghData.assets[0].browser_download_url;
          } else {
            const appImageAsset = ghData.assets.find(a => a.name && a.name.endsWith('.AppImage'));
            downloadUrl = appImageAsset ? appImageAsset.browser_download_url : ghData.assets[0].browser_download_url;
          }
        }
        if (!downloadUrl && ghData.html_url) {
          downloadUrl = ghData.html_url;
        }
      }
    }
  }

  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    releaseNotes,
    downloadUrl,
    lastChecked: new Date().toISOString()
  };
}

module.exports = {
  getAppVersion,
  checkForUpdates
};
