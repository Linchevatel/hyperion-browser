const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const platformArg = args.find(a => a.startsWith('--platform='));
const targetPlatform = platformArg ? platformArg.split('=')[1] : (process.platform === 'win32' ? 'win64' : 'linux64');

console.log(`[Hyperion Clean Chromium Downloader] Target platform: ${targetPlatform}`);

function fetchJson(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const protocol = parsed.protocol === 'https:' ? https : http;
      const req = protocol.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: { 'User-Agent': 'Hyperion-Builder/1.0' }
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

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const parsed = new URL(url);
    const protocol = parsed.protocol === 'https:' ? https : http;

    const req = protocol.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        return reject(new Error(`Download failed with HTTP ${res.statusCode} for ${url}`));
      }
      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      let lastReportTime = Date.now();

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        file.write(chunk);
        const now = Date.now();
        if (now - lastReportTime > 2000 && totalBytes > 0) {
          const pct = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          const mb = (downloadedBytes / 1024 / 1024).toFixed(1);
          const totalMb = (totalBytes / 1024 / 1024).toFixed(1);
          process.stdout.write(`\rDownloading Clean Chromium: ${mb}/${totalMb} MB (${pct}%)...`);
          lastReportTime = now;
        }
      });

      res.on('end', () => {
        file.end(() => {
          console.log(`\nDownload finished: ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB`);
          resolve();
        });
      });
    });

    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

function findBinaryDir(dir, binName) {
  if (fs.existsSync(path.join(dir, binName))) return dir;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = path.join(dir, e.name);
      if (fs.existsSync(path.join(sub, binName))) {
        return sub;
      }
      const nested = findBinaryDir(sub, binName);
      if (nested) return nested;
    }
  }
  return null;
}

async function getDownloadUrl(platform) {
  const isWin = platform.startsWith('win');
  if (isWin) {
    // Try GitHub API for Windows x64 Ungoogled Chromium
    try {
      const data = await fetchJson('https://api.github.com/repos/ungoogled-software/ungoogled-chromium-windows/releases/latest');
      if (data && data.assets) {
        const asset = data.assets.find(a => a.name && a.name.endsWith('windows_x64.zip'));
        if (asset) return { url: asset.browser_download_url, isTar: false, ext: '.zip' };
      }
    } catch (e) {}
    // Reliable static fallback
    return {
      url: 'https://github.com/ungoogled-software/ungoogled-chromium-windows/releases/download/152.0.7977.82-1.1/ungoogled-chromium_152.0.7977.82-1.1_windows_x64.zip',
      isTar: false,
      ext: '.zip'
    };
  } else {
    // Linux x64
    try {
      const data = await fetchJson('https://api.github.com/repos/ungoogled-software/ungoogled-chromium-portablelinux/releases/latest');
      if (data && data.assets) {
        const asset = data.assets.find(a => a.name && a.name.endsWith('x86_64_linux.tar.xz'));
        if (asset) return { url: asset.browser_download_url, isTar: true, ext: '.tar.xz' };
      }
    } catch (e) {}
    // Reliable static fallback
    return {
      url: 'https://github.com/ungoogled-software/ungoogled-chromium-portablelinux/releases/download/152.0.7977.82-1/ungoogled-chromium-152.0.7977.82-1-x86_64_linux.tar.xz',
      isTar: true,
      ext: '.tar.xz'
    };
  }
}

async function main() {
  const { url, isTar, ext } = await getDownloadUrl(targetPlatform);
  console.log(`Source Clean Chromium: ${url}`);

  const rootDir = path.resolve(__dirname, '..');
  const bundleDir = path.join(rootDir, 'bundle', 'chrome');
  const tempArchive = path.join(rootDir, `chromium-${targetPlatform}${ext}`);
  const tempExtract = path.join(rootDir, `chromium-${targetPlatform}-temp`);

  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true });
  }

  console.log(`Downloading archive to ${tempArchive}...`);
  await downloadFile(url, tempArchive);

  console.log(`Extracting archive...`);
  if (fs.existsSync(tempExtract)) {
    fs.rmSync(tempExtract, { recursive: true, force: true });
  }
  fs.mkdirSync(tempExtract, { recursive: true });

  if (isTar) {
    execSync(`tar -xJf "${tempArchive}" -C "${tempExtract}"`, { stdio: 'inherit' });
  } else {
    if (process.platform === 'win32') {
      try {
        execSync(`tar -xf "${tempArchive}" -C "${tempExtract}"`, { stdio: 'inherit' });
      } catch (e) {
        execSync(`powershell -Command "Expand-Archive -Path '${tempArchive}' -DestinationPath '${tempExtract}' -Force"`, { stdio: 'inherit' });
      }
    } else {
      try {
        execSync(`unzip -q -o "${tempArchive}" -d "${tempExtract}"`, { stdio: 'inherit' });
      } catch (e) {
        execSync(`tar -xf "${tempArchive}" -C "${tempExtract}"`, { stdio: 'inherit' });
      }
    }
  }

  const binName = targetPlatform.startsWith('win') ? 'chrome.exe' : 'chrome';
  const foundDir = findBinaryDir(tempExtract, binName);
  if (!foundDir) {
    throw new Error(`Executable ${binName} not found in extracted archive`);
  }

  console.log(`Found binary folder: ${foundDir}`);
  const files = fs.readdirSync(foundDir);
  for (const f of files) {
    const src = path.join(foundDir, f);
    const dst = path.join(bundleDir, f);
    if (fs.existsSync(dst)) {
      fs.rmSync(dst, { recursive: true, force: true });
    }
    fs.renameSync(src, dst);
  }

  // Cleanup temp files
  if (fs.existsSync(tempArchive)) fs.unlinkSync(tempArchive);
  if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true, force: true });

  // If linux, ensure executable permissions
  const finalBin = path.join(bundleDir, binName);
  if (!targetPlatform.startsWith('win')) {
    try {
      execSync(`chmod -R +x "${bundleDir}"`);
    } catch (e) {
      try { fs.chmodSync(finalBin, 0o755); } catch (_) {}
    }
  }

  console.log(`[Success] Clean Production Chromium ready at: ${finalBin}`);
}

main().catch(err => {
  console.error('[Error]', err.message);
  process.exit(1);
});
