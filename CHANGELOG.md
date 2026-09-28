# Changelog - Security & Stability Fixes

## [UNRELEASED] - Critical Bug Fixes

### 🔴 Security Fixes

- **Fixed XSS vulnerability in toast notifications** (app.js:5-90)
  - Changed from `innerHTML` to DOM methods (`textContent`)
  - Properly escaped all user-provided content
  - Added comprehensive `escapeHtml()` function

- **Fixed race condition in confirm modal** (app.js:94-150)
  - Changed default behavior when modal not found: `resolve(false)` instead of `resolve(true)`
  - Prevents auto-confirmation of destructive operations
  - Added safety check for dangerous operations (no Enter key auto-confirm)

### 🟡 Stability Improvements

- **Removed window.alert() override** (app.js:93)
  - Created separate `showNotification()` function instead
  - Preserves native alert() behavior for third-party code
  - Prevents conflicts with browser extensions

- **Added global error handlers** (app.js:152-165)
  - Added `window.onerror` handler for synchronous errors
  - Added `unhandledrejection` handler for async errors
  - All unhandled errors now show user-friendly toast notifications

- **Fixed scope issue in warmup session** (app.js:2183-2229)
  - Properly declared `unsub` variable in function scope
  - Fixed cleanup in finally block

- **Improved GPU renderer display** (app.js:529-531, 2247-2271)
  - Increased truncation limit from 32 to 60 characters
  - Added full text in tooltip attribute
  - Fixed WebGL renderer display in quality scorer modal

### 📦 Code Quality

- **Added constants for magic numbers** (app.js:3-11)
  ```javascript
  TOAST_DURATION_DEFAULT = 3500
  TOAST_DURATION_ERROR = 4500
  TAG_MAX_LENGTH = 10
  PROFILE_NAME_MAX_LENGTH = 30
  ```

- **Improved tag length validation** (app.js:2308-2333)
  - User now sees warning when tag is truncated
  - Consistent validation across all tag inputs

- **Moved hardcoded URLs to constants** (app.js:2288-2293)
  - Verifier URLs now in `VERIFIER_URLS` constant
  - Easier to update or configure

### ⚠️ Breaking Changes

- `window.alert()` is no longer overridden
- Use `window.showNotification()` for custom toast behavior instead

## Recommendations for Future Updates

1. **Add TypeScript or JSDoc types** for Profile, Fingerprint, Proxy objects
2. **Move configuration to external file** (config.json)
3. **Add unit tests** for critical fingerprint spoofing functions
4. **Implement proper logging** (Electron crash reports, Sentry integration)
5. **Input sanitization** for all user inputs (profile names, proxy hosts, URLs)
