# 🌌 Hyperion Browser

**🇷🇺 [Читать на русском](README.ru.md)**

<div align="center">

![Hyperion — Anti-Detect Multibrowser](pictures/banner-hero.jpg)

**Open-source browser profile manager with custom Chromium, proxies, and fingerprint settings**

[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-blue.svg)](https://github.com/Linchevatel/hyperion-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

</div>

[Download releases](https://github.com/Linchevatel/hyperion-browser/releases) · [Quickstart & build instructions](docs/QUICKSTART.md) · [FAQ](docs/FAQ.md) · [Security](SECURITY.md)

## About

Hyperion is an Electron desktop application for managing separate Chromium browser profiles. It offers proxy configuration and fingerprint settings, with source patches for a custom Chromium engine. It can be used for testing and keeping browsing contexts separate; use it only where you have authorization and respect site terms.

### Who is it for?

- **QA and web developers:** repeat tests with separate cookies, extensions, proxy settings, and configurable browser properties.
- **Media buying and marketing:** separate work profiles for advertising projects, client dashboards, and landing-page testing.
- **Multi-account management:** manage multiple permitted accounts with separate cookies, extensions, and proxy settings.
- **Crypto and Web3:** separate profiles for dApps, testnets, and projects using wallet extensions. Wallets connect through browser extensions.
- **Agencies and e-commerce:** keep browsing sessions separate for stores, client projects, and work accounts.
- **Users managing distinct browsing contexts:** keep project-specific sessions organized without mixing browser data.
- **Browser researchers:** inspect the implementation and reproduce tests against the published Chromium patches.

### What makes Hyperion useful?

The profile manager and Chromium patches are available to inspect. Profile organization, proxy configuration, extensions, and fingerprint controls live in one desktop UI, with English and Russian interfaces. Correlated hardware presets provide a starting configuration instead of requiring every field to be entered manually.

## Download and first launch

1. Open [GitHub Releases](https://github.com/Linchevatel/hyperion-browser/releases) and choose an available asset for your OS/architecture: Linux AppImage, `.deb`, `.rpm`, or Windows installer/portable `.exe`. Availability varies by release; macOS packages are not part of the current release workflow.
2. Install or run it as a regular user. For a Linux AppImage, mark the downloaded file executable before opening it. See [quickstart](docs/QUICKSTART.md) for commands and troubleshooting.
3. In Settings, check the browser executable path. Create a disposable profile, configure a proxy if needed, and launch it. Verify the observed IP and settings before using sensitive accounts.

## Features and boundaries

### Custom Chromium and fingerprint settings

**Hyperion overrides browser fingerprint properties according to profile settings: User-Agent, platform, CPU concurrency, memory, screen, and supported Canvas, Audio, and WebGL properties. These overrides are implemented by Hyperion’s modified Chromium engine.**

<div align="center">
<img src="pictures/feature-cpp-engine.jpg" alt="Hyperion custom Chromium engine illustration" width="880" />
<img src="pictures/feature-fingerprint.jpg" alt="Browser fingerprint settings illustration" width="880" />
</div>

- Settings for user agent, platform, CPU concurrency, reported memory, screen dimensions, Canvas/Audio noise, and WebGL vendor/renderer.
- Chromium C++ patches implement selected overrides; a separate WebGL preset patch handles selected parameters, extension filtering, and shader precision. Settings are configured per profile.
- A generated helper extension complements media, voice, and proxy authentication settings.
- On Linux, fontconfig connects bundled fonts to browser profiles.

Windows, macOS, and mobile profile presets provide an initial fingerprint configuration for further customization.

### Proxies and network settings

<div align="center">
<img src="pictures/feature-network.jpg" alt="Proxy configuration illustration" width="880" />
</div>

HTTP, HTTPS, and SOCKS5 proxy configuration, authentication helpers, IP/geolocation checks, and configured Change-IP URL requests are implemented. Authenticated SOCKS5 uses a local HTTP-to-SOCKS bridge. Launch applies WebRTC policies to restrict non-proxied UDP. Connect your own proxy or one from your chosen provider.

### Cookie warm-up

<div align="center">
<img src="pictures/feature-cookie-robot.jpg" alt="Cookie warm-up illustration" width="880" />
</div>

The built-in helper visits selected sites in headless Chromium using the profile directory to collect cookies and site data. It supports preparation of test sessions and automation of repeated visits.

### Profile management

<div align="center">
<img src="pictures/feature-profiles.jpg" alt="Separate browser profile management illustration" width="880" />
</div>

- Separate browser data directories, folders/tags, cloning, templates, and bulk create/start/stop/delete operations.
- Cookie import/export, extension installation from Chrome Web Store or local folders, and fingerprint configuration preview.
- `.hyperion` export contains profile configuration and cookies that the helper can export, **not all history, cache, local storage, or session storage**.
- JSON backup contains manager configuration and metadata, **not a full backup of browser profile directories**.

## Documentation

[Quickstart](docs/QUICKSTART.md) · [FAQ](docs/FAQ.md) · [Security policy](SECURITY.md)

Have a question or found a bug? Use the [issue forms](https://github.com/Linchevatel/hyperion-browser/issues/new/choose).

---

## 🎬 Interface demo

![Hyperion: creating profiles, browsing hardware presets and extensions](assets/demos/hyperion-overview.gif)

## 📸 Screenshots (Interface Preview)

<div align="center">

### Main Profile Dashboard
*Profile table, folders, tags, active session monitoring, and quick actions:*
<br/>
<img src="assets/screenshots/profiles.png" alt="Profile dashboard" width="950" />

<br/><br/>

### Profile Creation & Detailed Configuration
*OS selection, proxy configuration, user-agent settings, and initial cookie import:*
<br/>
<img src="assets/screenshots/new_profile.png" alt="Profile creation" width="950" />

<br/><br/>

### Hardware & GPU Fingerprint Fine-Tuning
*Canvas/Audio, WebGL, CPU, memory, and WebRTC settings (behavior depends on the engine):*
<br/>
<img src="assets/screenshots/fingerprint.png" alt="Hardware fingerprint settings" width="950" />

<br/><br/>

### Built-in Extension Manager & Catalog
*Installing extensions directly from the Chrome Web Store or loading unpacked local extensions:*
<br/>
<img src="assets/screenshots/extensions.png" alt="Extension manager" width="950" />

</div>

---

## ☕ Support the Project

If you would like to support the ongoing development and maintenance of Hyperion:

| Asset | Network | Address |
| :---: | :--- | :--- |
| <img src="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png" width="20" height="20" valign="middle" /> **BTC** | Bitcoin | `bc1q0u4pwuqxg7kt5y4p84lc8zzcawhzr3auzw005z` |
| <img src="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png" width="20" height="20" valign="middle" /> **ETH** | Ethereum | `0xD3002c0967a8D28FDF67c2Df8488006e965B9a6A` |
| <img src="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png" width="20" height="20" valign="middle" /> **USDT** | TRON (TRC-20) | `TYUkmupkzCGzkio77Db7PKEDu4JN8JD1eb` |
| <img src="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/trx.png" width="20" height="20" valign="middle" /> **TRX** | TRON | `TX7yRGo5xT2Mj5NBVhu7bdv58jmStHFuGZ` |

---

## 📄 License

The Hyperion application is licensed under the **MIT License**. Chromium and bundled third-party components retain their respective licenses; MIT does not replace those terms.

Author & Creator: **Linchevatel**.
