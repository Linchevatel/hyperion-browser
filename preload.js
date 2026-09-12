const { contextBridge, ipcRenderer } = require('electron');

const api = {
  // Profiles
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  createProfile: (data) => ipcRenderer.invoke('create-profile', data),
  updateProfile: (id, data) => ipcRenderer.invoke('update-profile', id, data),
  deleteProfile: (id) => ipcRenderer.invoke('delete-profile', id),
  cloneProfile: (id) => ipcRenderer.invoke('clone-profile', id),
  openProfileFolder: (id) => ipcRenderer.invoke('open-profile-folder', id),
  startProfile: (id, customUrls) => ipcRenderer.invoke('start-profile', id, customUrls),
  stopProfile: (id) => ipcRenderer.invoke('stop-profile', id),

  // Bulk Operations
  bulkStartProfiles: (ids) => ipcRenderer.invoke('bulk-start-profiles', ids),
  bulkStopProfiles: (ids) => ipcRenderer.invoke('bulk-stop-profiles', ids),
  bulkDeleteProfiles: (ids) => ipcRenderer.invoke('bulk-delete-profiles', ids),
  bulkCreateProfiles: (config) => ipcRenderer.invoke('bulk-create-profiles', config),

  // Profile Package Export / Import (.hyperion archive)
  exportProfilePackage: (id) => ipcRenderer.invoke('export-profile-package', id),
  importProfilePackage: () => ipcRenderer.invoke('import-profile-package'),

  // Cookie Robot Warm-up
  warmupProfile: (profileId, urls) => ipcRenderer.invoke('warmup-profile', profileId, urls),
  onWarmupProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('warmup-progress', handler);
    return () => ipcRenderer.removeListener('warmup-progress', handler);
  },

  // Workspaces & Folders
  getFolders: () => ipcRenderer.invoke('get-folders'),
  saveFolders: (folders) => ipcRenderer.invoke('save-folders', folders),

  // Cookies
  importCookies: (profileId, cookies) => ipcRenderer.invoke('import-cookies', profileId, cookies),
  exportCookies: (profileId) => ipcRenderer.invoke('export-cookies', profileId),

  // Proxies
  getProxies: () => ipcRenderer.invoke('get-proxies'),
  saveProxy: (proxy) => ipcRenderer.invoke('save-proxy', proxy),
  deleteProxy: (id) => ipcRenderer.invoke('delete-proxy', id),
  importProxies: (text) => ipcRenderer.invoke('import-proxies', text),
  testProxy: (proxy) => ipcRenderer.invoke('test-proxy', proxy),
  rotateProxyIp: (proxyId) => ipcRenderer.invoke('rotate-proxy-ip', proxyId),
  inspectIp: (proxy) => ipcRenderer.invoke('inspect-ip', proxy),

  // Extensions
  getExtensions: () => ipcRenderer.invoke('get-extensions'),
  installExtension: (extId) => ipcRenderer.invoke('install-extension', extId),
  deleteExtension: (extId) => ipcRenderer.invoke('delete-extension', extId),
  pickExtensionFolder: () => ipcRenderer.invoke('pick-extension-folder'),

  // Templates & Fingerprints
  getFpDictionaries: () => ipcRenderer.invoke('get-fp-dictionaries'),
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  saveTemplate: (template) => ipcRenderer.invoke('save-template', template),
  deleteTemplate: (id) => ipcRenderer.invoke('delete-template', id),
  getPreviewFingerprint: (os, overrides) => ipcRenderer.invoke('get-preview-fingerprint', os, overrides),

  // Settings & System
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectChromeBinary: () => ipcRenderer.invoke('select-chrome-binary'),
  rescanChromeBinary: () => ipcRenderer.invoke('rescan-chrome-binary'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  exportBackup: () => ipcRenderer.invoke('export-backup'),
  importBackup: () => ipcRenderer.invoke('import-backup'),
  getSystemStatus: () => ipcRenderer.invoke('get-system-status'),

  // Updates
  checkForUpdates: (customRepo) => ipcRenderer.invoke('check-for-updates', customRepo),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  downloadUpdate: (url) => ipcRenderer.invoke('download-app-update', url),
  installUpdate: () => ipcRenderer.invoke('install-app-update'),
  onUpdateProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },

  // Events
  onProfileStopped: (cb) => {
    ipcRenderer.on('profile-stopped', (event, id) => cb(id));
  }
};

contextBridge.exposeInMainWorld('hyperion', api);
