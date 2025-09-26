const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for form settings from main process
  onFormSettings: (callback) => ipcRenderer.on('form-settings', callback),

  // Send form submission to main process
  submitForm: (formData) => ipcRenderer.invoke('form-submit', formData),

  // Listen for form submission results
  onFormResult: (callback) => ipcRenderer.on('form-result', callback),

  // Open setup page
  openSetup: () => ipcRenderer.invoke('open-setup'),

  // Show message box
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),

  // Show save dialog
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  // Show open dialog
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Send raw message to main process
  onRawMessage: (callback) => ipcRenderer.on('raw-message', callback),

  // Get platform info
  platform: process.platform,

  // Get versions
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },

  // Window controls for borderless window
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Setup window Stream Deck bridge
  setupSendToStreamDeck: (message) => ipcRenderer.invoke('setup-send-to-streamdeck', message),
  onSetupContextData: (callback) => ipcRenderer.on('setup-context-data', (event, data) => callback(data)),
  onSetupSettingsUpdate: (callback) => ipcRenderer.on('setup-settings-update', (event, data) => callback(data)),

  // Settings management
  getSettings: (contextId) => ipcRenderer.invoke('get-settings', contextId),

  // OAuth2 flows
  oauthStartAuthCode: (params) => ipcRenderer.invoke('oauth-start-auth-code', params),
  oauthClientCredentialsToken: (params) => ipcRenderer.invoke('oauth-client-credentials-token', params),
  oauthStartCallbackServer: (params) => ipcRenderer.invoke('oauth-start-callback-server', params),
  oauthStopCallbackServer: () => ipcRenderer.invoke('oauth-stop-callback-server'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  onOAuthToken: (callback) => ipcRenderer.on('oauth-token', (event, data) => callback(data)),

  // Raw message listener (for debugging Stream Deck messages)
  onRawMessage: (callback) => ipcRenderer.on('raw-message', (event, message) => callback(event, message)),

  // Electron logging system
  onElectronLog: (callback) => ipcRenderer.on('electron-log', (event, logData) => callback(logData))
})