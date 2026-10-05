# Security policy

[Русский](SECURITY.ru.md) · [README](README.md) · [FAQ](docs/FAQ.md)

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/Linchevatel/hyperion-browser/security/advisories/new) if enabled. If unavailable, ask the maintainer for a private contact.

Include app, engine and OS versions, reproduction steps using test data, and potential impact. Share exploitation details privately. Ordinary UI bugs and feature requests belong in GitHub Issues.

## Data storage

Hyperion stores settings and profile data locally in `~/.config/hyperion-browser/`; on Windows, `%USERPROFILE%\.config\hyperion-browser`.

Proxy credentials are saved in JSON and helper files. `.hyperion` exports and JSON backups use an unencrypted format. Local file access and encryption are managed through the OS.

The browser launches with `--password-store=basic`. Actual browser secret storage depends on the platform and engine.

## Updates and extensions

Fingerprint settings use Chromium with Hyperion patches. Consider compatibility when manually replacing the engine. Keep the app and selected engine updated, and review extension sources and permissions.

## Data in bug reports

Remove cookies, tokens, proxy passwords, private URLs and personal paths from logs and screenshots before sharing. Use a disposable profile for reproduction. Keep full profiles and backups local.
