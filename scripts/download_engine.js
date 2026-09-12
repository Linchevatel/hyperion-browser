const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const platformArg = args.find(a => a.startsWith('--platform='));
const targetPlatform = platformArg ? platformArg.split('=')[1] : (process.platform === 'win32' ? 'win64' : 'linux64');
const channelArg = args.find(a => a.startsWith('--channel='));
const targetChannel = channelArg ? channelArg.split('=')[1] : 'Stable';

console.log(`[Hyperion Engine Downloader] Target platform: ${targetPlatform}, channel: ${targetChannel}`);

const VERSIONS_URL = 'https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
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
        if (now - lastReportTime > 1500 && totalBytes > 0) {
          const pct = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          const mb = (downloadedBytes / 1024 / 1024).toFixed(1);
          const totalMb = (totalBytes / 1024 / 1024).toFixed(1);
          process.stdout.write(`\rDownloading Chromium: ${mb}/${totalMb} MB (${pct}%)...`);
          lastReportTime = now;
        }
      });

      res.on('end', () => {
        file.end(() => {
          console.log(`\nDownload completed: ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB`);
          resolve();
        });
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function main() {
  const meta = await fetchJson(VERSIONS_URL);
  const channelData = meta.channels && meta.channels[targetChannel];
  if (!channelData) {
    throw new Error(`Channel ${targetChannel} not found in versions metadata`);
  }

  const downloads = channelData.downloads && channelData.downloads.chrome;
  if (!downloads) {
    throw new Error(`Chrome downloads not found for channel ${targetChannel}`);
  }

  const downloadItem = downloads.find(d => d.platform === targetPlatform);
  if (!downloadItem || !downloadItem.url) {
    throw new Error(`No download URL for platform ${targetPlatform}`);
  }

  console.log(`Found Chromium ${channelData.version} (${targetChannel}) for ${targetPlatform}`);
  console.log(`Source URL: ${downloadItem.url}`);

  const rootDir = path.resolve(__dirname, '..');
  const bundleDir = path.join(rootDir, 'bundle', 'chrome');
  const tempZip = path.join(rootDir, `chromium-${targetPlatform}.zip`);
  const tempExtract = path.join(rootDir, `chromium-${targetPlatform}-temp`);

  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true });
  }

  console.log(`Downloading archive to ${tempZip}...`);
  await downloadFile(downloadItem.url, tempZip);

  console.log(`Extracting archive...`);
  if (fs.existsSync(tempExtract)) {
    fs.rmSync(tempExtract, { recursive: true, force: true });
  }
  fs.mkdirSync(tempExtract, { recursive: true });

  if (process.platform === 'win32') {
    try {
      execSync(`tar -xf "${tempZip}" -C "${tempExtract}"`, { stdio: 'inherit' });
    } catch (e) {
      execSync(`powershell -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtract}' -Force"`, { stdio: 'inherit' });
    }
  } else {
    try {
      execSync(`unzip -q -o "${tempZip}" -d "${tempExtract}"`, { stdio: 'inherit' });
    } catch (e) {
      execSync(`tar -xf "${tempZip}" -C "${tempExtract}"`, { stdio: 'inherit' });
    }
  }

  // Look for inner directory e.g. chrome-win64 or chrome-linux64
  const innerDirName = `chrome-${targetPlatform}`;
  const sourcePath = fs.existsSync(path.join(tempExtract, innerDirName))
    ? path.join(tempExtract, innerDirName)
    : tempExtract;

  // Move files to bundle/chrome
  const files = fs.readdirSync(sourcePath);
  for (const f of files) {
    const src = path.join(sourcePath, f);
    const dst = path.join(bundleDir, f);
    if (fs.existsSync(dst)) {
      fs.rmSync(dst, { recursive: true, force: true });
    }
    fs.renameSync(src, dst);
  }

  // Cleanup temp files
  if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
  if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true, force: true });

  // Verify binary existence
  const binName = targetPlatform.startsWith('win') ? 'chrome.exe' : 'chrome';
  const binPath = path.join(bundleDir, binName);
  if (!fs.existsSync(binPath)) {
    throw new Error(`Expected executable not found at ${binPath}`);
  }

  if (!targetPlatform.startsWith('win')) {
    try {
      execSync('chmod -R +x "' + bundleDir + '"');
    } catch (e) {
      try { fs.chmodSync(binPath, 0o755); } catch (_) {}
    }
  }

  console.log(`[Success] Bundled Chromium ready at: ${binPath}`);
}

main().catch(err => {
  console.error('[Error]', err.message);
  process.exit(1);
});
