# Quickstart and build instructions

[Русский](QUICKSTART.ru.md) · [README](../README.md) · [FAQ](FAQ.md)

## Release packages (recommended starting point)

Download an available asset for your OS and architecture from [GitHub Releases](https://github.com/Linchevatel/hyperion-browser/releases). See [FAQ](FAQ.md#which-browser-engine-is-used) for engine details.

- **Linux AppImage:** replace the example filename below with the downloaded asset. Your distribution may require FUSE support; follow its AppImage guidance rather than disabling the sandbox.
  ```bash
  chmod +x ./Hyperion-Browser-VERSION.AppImage
  ./Hyperion-Browser-VERSION.AppImage
  ```
- **Debian/Ubuntu:** `sudo apt install ./DOWNLOADED_FILE.deb`
- **RPM distributions:** use your package manager, for example `sudo dnf install ./DOWNLOADED_FILE.rpm` on Fedora.
- **Windows:** run the downloaded installer, or the portable executable. Python 3 must be available as `python`, `py`, or `python3` for cookie helpers and warm-up.

Use a regular user account to run the app/browser. The current release workflow packages Linux and Windows; it does not establish compatibility with every distribution or provide macOS releases.

## First profile

1. Open Settings and inspect the browser executable path. Select a trusted custom Chromium executable if needed; a saved existing path takes precedence over automatic discovery.
2. Create a disposable profile. Choose a profile OS and review its fingerprint configuration. This is a settings preset, not an OS emulator.
3. If using a proxy, enter its protocol, host, port, and optional credentials, enable it, and use the connection check. Proxies must be obtained separately.
4. Launch the profile. Check the observed external IP, WebRTC/DNS behavior, and browser properties in your own test environment. A successful proxy check is not a comprehensive leak test.
5. Stop the profile before cookie import/export or copying its data. Do not run warm-up against a profile already open in the browser.

## Run from source

Use Git and a current Node.js/npm environment; the release workflow uses **Node.js 22**. Electron requires a graphical desktop and platform libraries. Python 3 is needed for cookie operations and warm-up; these helpers use the Python standard library.

```bash
git clone https://github.com/Linchevatel/hyperion-browser.git
cd hyperion-browser
npm ci
npm start
```

On Linux, `./hyperion-app` is an alternative launcher after dependencies are installed. It is a shell wrapper, not a bundled installer.

The desktop client and Chromium engine are separate. If no suitable engine is available, you can download one:

```bash
npm run download:engine
# Explicit Windows x64 target (for Windows packaging):
node scripts/download_engine.js --platform=win64
```

**Read the downloader output.** It searches for a patched `chromium-core-*` release asset, then falls back to unpatched ungoogled-chromium. It downloads/extracts executable files into `bundle/chrome`; run it only if you trust those sources. For engine compilation, use the build section below. A system Chrome/Chromium fallback can launch profiles but does not implement custom fingerprint switches.

## Package the desktop client

```bash
npm run dist:linux  # AppImage, deb, rpm
npm run dist:win    # NSIS installer and portable exe
```

Outputs go to `dist/`; names/version numbers depend on the build. These commands **package the existing `bundle/chrome` directory; they do not compile or download Chromium**. Supply a complete engine bundle for the target OS first. RPM packaging needs RPM tooling; cross-building Windows may require additional electron-builder tooling. See [package.json](../package.json) and the [release workflow](../.github/workflows/build-and-release.yml) for current configuration.

## Build custom Chromium (advanced)

Use Chromium’s [Linux build instructions](https://chromium.googlesource.com/chromium/src/+/main/docs/linux/build_instructions.md) for prerequisites, depot_tools, source checkout, and dependencies. This is a substantial separate build, not part of `npm ci`.

1. Sync Chromium to the target revision in [`CHROMIUM_VERSION`](../CHROMIUM_VERSION), removing a packaging suffix after `-` if present, then run hooks. Do not apply patches to arbitrary current upstream source.
2. In a clean Chromium `src` checkout, check and apply the patches **in order**, replacing `/absolute/path/hyperion-browser` below:
   ```bash
   git apply --check /absolute/path/hyperion-browser/patches/hyperion_core_fingerprint.patch
   git apply /absolute/path/hyperion-browser/patches/hyperion_core_fingerprint.patch
   git apply --check /absolute/path/hyperion-browser/patches/hyperion_webgl_presets.patch
   git apply /absolute/path/hyperion-browser/patches/hyperion_webgl_presets.patch
   ```
3. Consult the release workflow’s GN configuration, generate `out/Release`, and build with `autoninja -C out/Release chrome`. Flags and patch compatibility can change with Chromium; stop and investigate if a check fails.
4. Bundle the executable **and its runtime resources**, including locales, `.pak` files, ICU/V8 data and required shared libraries, as shown in the workflow. Copying just `chrome` is insufficient. Use `bundle/chrome` for desktop packaging or select the executable in Settings for a local run.

The Linux workflow performs patch checks and a custom build. Windows uses the engine downloader.

## Troubleshooting and reporting

- **Missing browser:** check Settings, executable permissions and required browser libraries. Selecting ordinary Chrome fixes discovery, not custom fingerprint support.
- **Launch failure/AppImage issue:** run from a terminal for a minimal error excerpt; consult your distribution’s Electron/AppImage requirements. Do not use root or disable the sandbox as a blanket workaround.
- **Proxy failure:** confirm protocol, enabled state and credentials privately. Normal launch and warm-up do not share the same authentication path.
- **Report a bug:** provide OS/architecture, app version, actual engine version/path (redacted), installation source, reproduction steps, expected/actual behavior and sanitized error excerpts via the [issue forms](https://github.com/Linchevatel/hyperion-browser/issues/new/choose). Never attach tokens, cookies, proxy credentials or full profiles.
