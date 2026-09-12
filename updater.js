const { execFile, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const os = require('os');
const HOME = os.homedir();
const CHROME_BIN = path.join(HOME, 'hyperion-browser', 'chrome');
const CONFIG_DIR = path.join(HOME, '.config', 'hyperion-browser');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

function fetchJson(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const protocol = parsed.protocol === 'https:' ? https : http;
      const req = protocol.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: { 'User-Agent': 'Hyperion-Updater/1.0.0' }
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
    return pkg.version || '1.0.0';
  } catch (e) {
    return '1.0.0';
  }
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

  let updateAvailable = false;
  let latestVersion = currentVersion;
  let releaseNotes = '';
  let downloadUrl = null;

  // 1. Check configured GitHub repository if present
  if (repo && repo.includes('/')) {
    const ghData = await fetchJson(`https://api.github.com/repos/${repo}/releases/latest`);
    if (ghData && ghData.tag_name) {
      const tagClean = ghData.tag_name.replace(/^v/, '');
      latestVersion = tagClean;
      if (tagClean > currentVersion) {
        updateAvailable = true;
        releaseNotes = ghData.body || 'Новая версия Hyperion готова к установке.';
        if (ghData.assets && ghData.assets.length > 0) {
          downloadUrl = ghData.assets[0].browser_download_url;
        }
      }
    }
  }

  // 2. Also check upstream for official browser engine updates in background
  try {
    const upstreamReleases = await fetchJson('https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Linux');
    if (Array.isArray(upstreamReleases) && upstreamReleases.length > 0) {
      const upstreamVer = upstreamReleases[0].version;
      // If no github release was found, we still know whether new build is ready
      if (!updateAvailable && upstreamVer) {
        // Can track upstream silently without technical spam in UI
      }
    }
  } catch (e) {}

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
