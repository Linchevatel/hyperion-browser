# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Hyperion Browser, please report it by:

1. **DO NOT** open a public GitHub issue
2. Email the maintainer at: security@linchevatel.com (or open a private advisory on GitHub)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond within 48 hours and will work with you to understand and resolve the issue.

## Security Best Practices for Users

### 1. Input Validation
- Profile names are limited to 30 characters
- Tags are limited to 10 characters
- All user inputs are sanitized before display

### 2. Proxy Configuration
- Never store proxy credentials in plain text outside the app
- Use authenticated proxies when possible
- Regularly rotate proxy IPs

### 3. Cookie Management
- Imported cookies are stored in SQLite databases. *Note: On Linux, Chromium does not encrypt cookies if gnome-keyring/kwallet is unavailable. We recommend using full-disk encryption (LUKS) or securing your user account.*
- Export cookies only to secure locations
- Never share cookie databases with untrusted parties

### 4. Extension Security
- Only install extensions from trusted sources
- Review extension permissions before installation
- Chrome Web Store extensions are downloaded via official API

### 5. Data Storage
- Profile data stored in: `~/.config/hyperion-browser/`
- Ensure proper file permissions on this directory
- Regular backups recommended (use built-in export feature)

## Known Security Considerations

### Fingerprint Spoofing
- Hardware spoofing is applied at Chromium C++ level
- WebRTC leak protection is enforced by default
- Canvas/Audio noise is deterministic (not truly random)

### Process Isolation
- Each profile runs as separate Chrome instance
- Profiles share fonts directory (isolated via fontconfig)
- Extensions are loaded per-profile

### Network Security
- Proxy credentials stored in profiles.json (unencrypted)
- **Recommendation:** Use external credential manager for sensitive proxies
- SOCKS5 authenticated proxies use local bridge (127.0.0.1)

## Recent Security Fixes

See [CHANGELOG.md](./CHANGELOG.md) for details on:
- XSS vulnerability in toast notifications (Fixed)
- Race condition in confirmation dialogs (Fixed)
- Unhandled promise rejections (Fixed)

## Dependency Security

Regular security audits recommended:
```bash
npm audit
npm audit fix
```

Electron security checklist:
- ✅ Context isolation enabled
- ✅ Node integration disabled in renderer
- ✅ Preload script with contextBridge
- ⚠️ Remote module not used
- ⚠️ Web security cannot be disabled by user

## Future Security Improvements

- [ ] Encrypt proxy credentials in profiles.json
- [ ] Add integrity checks for profile data
- [ ] Implement session token for IPC communication
- [ ] Add CSP headers for renderer processes
- [ ] Sandbox Python scripts execution
