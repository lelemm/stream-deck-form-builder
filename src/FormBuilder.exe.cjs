const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu } = require('electron')
const path = require('path')
const WebSocket = require('ws')

let mainWindow = null
let streamDeckSocket = null
let pluginUUID = null
let globalSettings = {}
let tray = null
let isShuttingDown = false

// Safe console logging that handles broken pipes
function safeLog(...args) {
  if (isShuttingDown) return
  
  try {
    console.log(...args)
  } catch (error) {
    if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
      // Stream Deck has closed the connection, suppress further logging
      isShuttingDown = true
    }
    // Silently ignore pipe errors, don't throw
  }
}

class StreamDeckConnector {
  constructor() {
    this.connected = false
    this.port = null
    this.uuid = null
    this.register = null
    this.info = null
    this.settings = {} // Map by context: { "context1": { device: "device1", settings: {...} } }
    this.globalSettings = {} // Store global plugin settings for setup
    
    // Parse command line arguments for .exe plugin registration
    this.parseCommandLineArgs()
  }
  
  parseCommandLineArgs() {
    const args = process.argv
    console.log('Command line arguments:', args)
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-port' && i + 1 < args.length) {
        this.port = args[i + 1]
        console.log('Found port:', this.port)
      } else if (args[i] === '-pluginUUID' && i + 1 < args.length) {
        this.uuid = args[i + 1]
        console.log('Found pluginUUID:', this.uuid)
      } else if (args[i] === '-registerEvent' && i + 1 < args.length) {
        this.register = args[i + 1]
        console.log('Found registerEvent:', this.register)
      } else if (args[i] === '-info' && i + 1 < args.length) {
        try {
          this.info = JSON.parse(args[i + 1])
          console.log('Found info:', this.info)
        } catch (e) {
          console.error('Failed to parse info parameter:', e)
          this.info = {}
        }
      }
    }
    
    // If we have connection parameters, auto-connect
    if (this.port && this.uuid && this.register) {
      console.log('Auto-connecting with parsed parameters...')
      // Delay connection slightly to allow app initialization
      setTimeout(() => {
        this.connect(this.port, this.uuid, this.register, this.info)
      }, 1000)
    }
  }

  connect(port, uuid, registerEvent, info) {
    this.port = port
    this.uuid = uuid
    this.register = registerEvent
    this.info = info

    try {
      this.streamDeckSocket = new WebSocket(`ws://127.0.0.1:${port}`)
      
      // Set a connection timeout - if not connected within 10 seconds, exit
      const connectionTimeout = setTimeout(() => {
        if (!this.connected) {
          // Connection timeout - Stream Deck not responding, exit immediately
          process.exit(1)
        }
      }, 10000)

      this.streamDeckSocket.on('open', () => {
        console.log('Connected to Stream Deck')
        this.connected = true
        clearTimeout(connectionTimeout) // Clear timeout since we're connected
        this.registerPluginOrPI(this.register, this.uuid)
        this.requestGlobalSettings(this.uuid)
        
        // Update tray menu to show connected status
        this.updateTrayMenu()
        
        // Update tray tooltip
        if (tray) {
          tray.setToolTip(`Stream Deck Form Builder - Connected (Port: ${this.port})`)
        }
      })

      this.streamDeckSocket.on('message', (data) => {
        this.onMessage(data)
      })

      this.streamDeckSocket.on('close', () => {
        // Stream Deck closed the connection - exit immediately without any logging or cleanup
        // to avoid EPIPE errors from broken stdout/stderr pipes
        process.exit(0)
      })

      this.streamDeckSocket.on('error', (error) => {
        // WebSocket error - Stream Deck connection lost, exit immediately
        process.exit(1)
      })

    } catch (error) {
      console.error('Failed to connect to Stream Deck:', error)
      
      // Exit if we can't connect to Stream Deck
      setTimeout(() => {
        console.log('Failed to connect to Stream Deck, exiting application...')
        this.shutdown()
      }, 3000)
    }
  }

  onMessage(msg) {
    // Forward message to setup window if it's open and using setup.html
    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentURL = mainWindow.webContents.getURL()
      if (currentURL && currentURL.includes('setup.html')) {
        mainWindow.webContents.send('streamdeck-message', msg)
      }
    }
    
    try {
      const json = JSON.parse(msg)

      // Extract payload information
      const event = json.event
      const action = json.action
      const context = json.context
      const payload = json.payload

      console.log('Received event:', event, 'for action:', action, 'context:', context)

      // Key up event - button pressed
      if (event === 'keyUp') {
        if (context in this.settings) {
          const contextData = this.settings[context]
          console.log('Button pressed with settings:', contextData.settings)

          // Show form modal with the settings
          this.showFormModal(contextData.settings)
        }
      } else if (event === 'willAppear') {
        // Action appeared on Stream Deck
        this.settings[context] = {
          device: json.device,
          settings: payload.settings,
          coordinates: payload.coordinates
        }
        console.log('Action appeared:', context, 'device:', json.device, 'with settings:', payload.settings)
      } else if (event === 'willDisappear') {
        // Action disappeared from Stream Deck
        if (context in this.settings) {
          delete this.settings[context]
        }
      } else if (event === 'didReceiveGlobalSettings') {
        this.globalSettings = payload.settings
        console.log('Global settings received:', this.globalSettings)
      } else if (event === 'didReceiveSettings') {
        // Store settings with device and context mapping
        this.settings[context] = {
          device: json.device,
          settings: payload.settings,
          coordinates: payload.coordinates,
          action: json.action
        }
        console.log('Settings updated for context:', context, 'device:', json.device, 'settings:', payload.settings)
      } else if (event === 'sendToPlugin') {
        console.log('Message from Property Inspector:', payload)
        
        // Handle specific actions from Property Inspector
        if (payload && payload.action === 'openFullSetup') {
          console.log('Opening full setup in Electron window for context:', context)
          // Pass the context so we know which settings to edit
          this.showSetupWindow(context)
        }
      }
    } catch (error) {
      console.error('Error parsing Stream Deck message:', error)
    }
  }

  showFormModal(settings) {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.log('Main window not available, creating new one')
      this.createMainWindow()
    }

    // Send settings to the renderer process
    mainWindow.webContents.send('form-settings', settings)
    
    // Aggressive window focusing for Windows
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    
    // Force window to front with multiple methods
    mainWindow.show()
    mainWindow.focus()
    mainWindow.moveTop()
    
    // Temporarily set always on top to ensure it comes forward
    mainWindow.setAlwaysOnTop(true)
    
    // Remove always on top after a short delay
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false)
      }
    }, 1000)

    // Log the action
    this.logMessage('Form button pressed with settings: ' + JSON.stringify(settings))
  }

  showSetupWindow(contextToEdit) {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.log('Main window not available, creating new one')
      this.createMainWindow()
    }
    
    // Load setup page instead of form
    mainWindow.loadFile(path.join(__dirname, 'setup.html'))
    
    // Get the context data for the setup
    const contextData = contextToEdit && this.settings[contextToEdit] ? this.settings[contextToEdit] : null
    
    // Inject WebSocket connection info so setup can communicate with Stream Deck
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const connectionScript = `
          window.streamDeckConnectionInfo = {
            websocket: {
              readyState: ${this.streamDeckSocket ? this.streamDeckSocket.readyState : 3},
              send: (data) => {
                // Send via Electron to main process, which forwards to WebSocket
                window.electronAPI && window.electronAPI.sendToStreamDeck && window.electronAPI.sendToStreamDeck(data);
              },
              addEventListener: (event, handler) => {
                // Listen to WebSocket messages via Electron IPC
                if (event === 'message') {
                  window.electronAPI && window.electronAPI.onStreamDeckMessage && window.electronAPI.onStreamDeckMessage(handler);
                }
              },
              removeEventListener: () => {} // Placeholder
            },
            context: '${contextToEdit || this.uuid || ''}',
            device: '${contextData ? contextData.device : ''}',
            contextData: ${JSON.stringify(contextData)}
          };
        `
        mainWindow.webContents.executeJavaScript(connectionScript)
      }
    }, 1000)
    
    // Aggressive window focusing for Windows
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    
    // Force window to front with multiple methods
    mainWindow.show()
    mainWindow.focus()
    mainWindow.moveTop()
    
    // Temporarily set always on top to ensure it comes forward
    mainWindow.setAlwaysOnTop(true)
    
    // Remove always on top after a short delay
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false)
      }
    }, 1000)

    // Log the action
    this.logMessage('Setup window opened')
  }

  createMainWindow() {
    mainWindow = new BrowserWindow({
      width: 900,
      height: 650,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false, // Always start hidden since we have system tray
      frame: false, // Remove window frame for borderless look
      transparent: true, // Allow transparent background for rounded corners
      center: true, // Center the window on screen
      resizable: true,
      minimizable: true,
      maximizable: false, // Disable maximize as requested
      alwaysOnTop: false,
      icon: path.join(__dirname, 'assets', 'formIcon.png'),
      skipTaskbar: false, // Show in taskbar when visible
      title: 'Stream Deck Form Builder',
      titleBarStyle: 'hidden',
      vibrancy: 'under-window', // macOS vibrancy effect
      visualEffectState: 'active'
    })
    
    // Hide to system tray instead of closing
    mainWindow.on('close', (event) => {
      if (!app.isQuiting) {
        event.preventDefault()
        mainWindow.hide()
        console.log('Window hidden to system tray')
      }
    })

    // Load the form interface
    const formPath = path.join(__dirname, 'form.html')
    mainWindow.loadFile(formPath)

    mainWindow.once('ready-to-show', () => {
      safeLog('Form window ready to show')
    })

    mainWindow.on('closed', () => {
      safeLog('Main window closed')
      mainWindow = null
    })

    // Handle form submission
    ipcMain.handle('form-submit', async (event, formData) => {
      console.log('Form submitted:', formData)

      try {
        const result = await this.submitForm(formData)
        return { success: true, data: result }
      } catch (error) {
        console.error('Form submission error:', error)
        return { success: false, error: error.message }
      }
    })

    // Handle WebSocket bridge for setup window
    ipcMain.handle('send-to-streamdeck', async (event, data) => {
      try {
        if (this.streamDeckSocket && this.streamDeckSocket.readyState === WebSocket.OPEN) {
          this.streamDeckSocket.send(data)
          return { success: true }
        } else {
          return { success: false, error: 'WebSocket not connected' }
        }
      } catch (error) {
        console.error('Error sending to Stream Deck:', error)
        return { success: false, error: error.message }
      }
    })

    // Handle opening setup
    ipcMain.on('open-setup', () => {
      shell.openExternal('file://' + path.join(__dirname, 'setup.html'))
    })

    // Handle window controls for borderless window
    ipcMain.on('window-minimize', () => {
      if (mainWindow) {
        mainWindow.minimize()
      }
    })

    ipcMain.on('window-close', () => {
      if (mainWindow) {
        mainWindow.hide()
      }
    })

    ipcMain.on('window-drag-start', () => {
      // Enable window dragging - handled by CSS -webkit-app-region: drag
    })
  }

  async submitForm(formData) {
    const { url, method, fields, outputType } = formData

    // Separate query params and body params
    const queryParams = {}
    const bodyParams = {}

    fields.forEach(field => {
      if (field.sendAs === 'query') {
        queryParams[field.name] = formData.values[field.name]
      } else {
        bodyParams[field.name] = formData.values[field.name]
      }
    })

    // Build URL with query parameters
    const finalUrl = new URL(url)
    Object.keys(queryParams).forEach(key => {
      finalUrl.searchParams.append(key, queryParams[key])
    })

    console.log('Submitting form to:', finalUrl.toString())
    console.log('Method:', method)
    console.log('Body:', bodyParams)

    // Make HTTP request
    const response = await fetch(finalUrl.toString(), {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(bodyParams) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Form submission result:', result)

    return result
  }

  registerPluginOrPI(event) {
    if (this.streamDeckSocket && this.streamDeckSocket.readyState === WebSocket.OPEN) {
      const json = {
        event: event,
        uuid: this.uuid
      }
      this.streamDeckSocket.send(JSON.stringify(json))
    }
  }

  requestGlobalSettings() {
    if (this.streamDeckSocket && this.streamDeckSocket.readyState === WebSocket.OPEN) {
      const json = {
        event: 'getGlobalSettings',
        context: this.uuid
      }
      this.streamDeckSocket.send(JSON.stringify(json))
    }
  }

  updateSettings(action, actionUUID, settings) {
    if (this.streamDeckSocket && this.streamDeckSocket.readyState === WebSocket.OPEN) {
      const json = {
        action: action,
        event: 'setSettings',
        context: actionUUID,
        payload: settings
      }
      this.streamDeckSocket.send(JSON.stringify(json))
    }
  }

  logMessage(msg) {
    const time = new Date()
    const timeString = `${time.toLocaleDateString()} ${time.toLocaleTimeString()}`
    console.log(timeString, msg)

    // Log to Stream Deck
    if (this.streamDeckSocket && this.streamDeckSocket.readyState === WebSocket.OPEN) {
      const json = {
        event: 'logMessage',
        payload: {
          message: msg
        }
      }
      this.streamDeckSocket.send(JSON.stringify(json))
    }
  }

  // Create system tray
  createTray() {
    // Use the same icon as the app
    const trayIconPath = path.join(__dirname, 'assets', 'formIcon.png')
    
    try {
      tray = new Tray(trayIconPath)
      
      // Set initial tooltip
      tray.setToolTip('Stream Deck Form Builder - Starting...')
      
      // Use updateTrayMenu to create the context menu with proper connection status
      this.updateTrayMenu()
      
      // Handle double-click to show main window
      tray.on('double-click', () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          this.createMainWindow()
        }
        mainWindow.show()
        mainWindow.focus()
      })
      
      console.log('System tray created successfully')
      
    } catch (error) {
      console.error('Failed to create system tray:', error)
    }
  }

  // Update tray menu (useful for updating connection status)
  updateTrayMenu() {
    if (tray) {
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show Form Window',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) {
              this.createMainWindow()
            }
            mainWindow.show()
            mainWindow.focus()
          }
        },
        {
          label: 'Open Dev Tools',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) {
              this.createMainWindow()
            }
            mainWindow.webContents.openDevTools({ mode: 'detach' })
            mainWindow.show()
            mainWindow.focus()
          }
        },
        { type: 'separator' },
        {
          label: this.connected 
            ? `✓ Connected (Port: ${this.port || 'Unknown'})` 
            : '✗ Disconnected from Stream Deck',
          enabled: false
        },
        {
          label: this.uuid ? `UUID: ${this.uuid.substring(0, 20)}...` : 'No Plugin UUID',
          enabled: false
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            this.shutdown()
          }
        }
      ])
      
      tray.setContextMenu(contextMenu)
    }
  }

  // Graceful shutdown method
  shutdown() {
    console.log('Shutting down Form Builder...')
    
    // Set quitting flag to allow window to actually close
    app.isQuiting = true
    
    // Destroy system tray
    if (tray) {
      tray.destroy()
      tray = null
    }
    
    // Close WebSocket connection
    if (this.streamDeckSocket) {
      this.streamDeckSocket.close()
    }
    
    // Close main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
    
    // Quit the app
    if (app) {
      app.quit()
    }
  }
}

// Global Stream Deck connector instance
const streamDeck = new StreamDeckConnector()

// Make it available globally for the Stream Deck connection
global.connectElgatoStreamDeckSocket = (port, uuid, register, info) => {
  console.log('Stream Deck connecting with:', { port, uuid, register, info })
  streamDeck.connect(port, uuid, register, info)
}

// Electron app event handlers
app.whenReady().then(() => {
  console.log('Form Builder Electron app started')

  // Create system tray first
  streamDeck.createTray()

  // Create main window (initially hidden)
  streamDeck.createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      streamDeck.createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed - keep running in system tray
  // The app will only quit when explicitly closed from the tray menu or when Stream Deck disconnects
  console.log('All windows closed, but keeping app running in system tray')
})

app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Handle app being launched with arguments (from Stream Deck)
app.on('open-url', (event, url) => {
  event.preventDefault()
  console.log('App opened with URL:', url)
})

// Export for potential use in other files
module.exports = { StreamDeckConnector: StreamDeckConnector }