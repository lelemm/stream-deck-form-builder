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

  // WebSocket bridge for setup window
  sendToStreamDeck: (data) => ipcRenderer.invoke('send-to-streamdeck', data),
  onStreamDeckMessage: (callback) => ipcRenderer.on('streamdeck-message', (event, data) => callback({ data }))
})