# Frequently asked questions

[Русский](FAQ.ru.md) · [README](../README.md) · [Quickstart](QUICKSTART.md)

## What is Hyperion for?

Managing separate browser profiles, proxies and fingerprint settings. Use cases include QA, marketing, permitted account management and Web3 projects.

## Which browser engine is used?

Fingerprint overrides are implemented by Chromium with Hyperion patches. The profile manager and engine are separate components. Settings show the selected browser path; a saved path takes precedence over automatic discovery.

The Linux release workflow builds the patched engine. The engine downloader searches for a `chromium-core-*` release and has an unpatched ungoogled-chromium fallback source. Ordinary Chromium supports standard profile features but not custom `--fingerprint-*` switches. For third-party packages, ask the maintainer about the included engine.

## What does the profile OS selection change?

Windows, macOS and mobile selections provide initial fingerprint properties. The browser continues running on the host OS; this configures properties rather than launching a different operating system.

## How do I connect a proxy?

Enter the protocol, address, port and credentials in the proxy section, then assign it to a profile. HTTP, HTTPS and SOCKS5 are supported. Authenticated SOCKS5 uses a local bridge. The connection check shows proxy availability and external IP; DNS and WebRTC can be tested separately for your configuration.

## Where are profiles stored?

Settings are in `~/.config/hyperion-browser/`, or `%USERPROFILE%\.config\hyperion-browser` on Windows. Browser data is in `profiles_data/profile_<id>`. See the [security policy](../SECURITY.md) for local data formats and access information.

## What is included in exports and backups?

A `.hyperion` export contains profile configuration and exported cookies. A JSON backup contains manager settings and metadata. These formats do not include history, cache, local storage or session storage.

To copy all local data, stop the app and browser profiles, then copy the configuration directory including `profiles_data`. Transfers between operating systems and engine versions may require additional configuration.

## How does cookie warm-up work?

A Python helper visits selected sites in headless Chromium using the profile directory and collects browsing data. Run it after stopping the profile. Warm-up has a separate launch path: fingerprint and proxy authentication arguments differ from normal browser launch.

## How do I report a bug?

Open the [issue form](https://github.com/Linchevatel/hyperion-browser/issues/new/choose) and include OS, app and engine versions, installation source, steps and results. Attach short sanitized logs. Data-sharing guidance and the private vulnerability channel are in the [security policy](../SECURITY.md).
