const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu } = require('electron')
const path = require('path')
const WebSocket = require('ws')
const http = require('http')
const crypto = require('crypto')

let formWindow = null
let setupWindow = null  
let debugWindow = null
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
    this.streamDeckSocket = null
    this.settings = {} // Map by context: { "context1": { device: "device1", settings: {...} } }
    this.currentSetupContext = null
    this.oauthCallbackServer = null
    this.oauthCallbackState = null
    
    // Parse command line arguments for .exe plugin registration
    this.parseCommandLineArgs()
  }

  // Send log message to main window instead of console
  sendLogToMainWindow(level, message, ...args) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      args: args.length > 0 ? args : undefined
    }
    
    // Send to debug window if available
    if (debugWindow && !debugWindow.isDestroyed()) {
      debugWindow.webContents.send('electron-log', logData)
    }
    
    // Still log to console for debugging during development
    console.log(`[${level.toUpperCase()}]`, message, ...args)
  }
  
  parseCommandLineArgs() {
    const args = process.argv
    this.sendLogToMainWindow('debug', 'Command line arguments:', args)
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-port' && i + 1 < args.length) {
        this.port = args[i + 1]
        this.sendLogToMainWindow('debug', 'Found port:', this.port)
      } else if (args[i] === '-pluginUUID' && i + 1 < args.length) {
        this.uuid = args[i + 1]
        this.sendLogToMainWindow('debug', 'Found pluginUUID:', this.uuid)
      } else if (args[i] === '-registerEvent' && i + 1 < args.length) {
        this.register = args[i + 1]
        this.sendLogToMainWindow('debug', 'Found registerEvent:', this.register)
      } else if (args[i] === '-info' && i + 1 < args.length) {
        try {
          this.info = JSON.parse(args[i + 1])
          this.sendLogToMainWindow('debug', 'Found info:', this.info)
        } catch (e) {
          console.error('Failed to parse info parameter:', e)
          this.info = {}
        }
      }
    }
    
    // If we have connection parameters, auto-connect
    if (this.port && this.uuid && this.register) {
      this.sendLogToMainWindow('info', '🔄 Auto-connecting with parsed parameters...')
      // Delay connection slightly to allow app initialization
      setTimeout(() => {
        this.connect(this.port, this.uuid, this.register, this.info)
      }, 1000)
    }
  }

  connect(port, uuid, registerEvent, info) {
    this.sendLogToMainWindow('info', 'Connecting to Stream Deck WebSocket...')
    this.sendLogToMainWindow('info', 'Port:', port, 'UUID:', uuid, 'Register Event:', registerEvent)

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
        this.sendLogToMainWindow('info', '✅ Connected to Stream Deck successfully!')
        this.connected = true
        clearTimeout(connectionTimeout) // Clear timeout since we're connected
        
        // Register with Stream Deck
        const registration = {
          event: registerEvent,
          uuid: uuid
        }
        this.sendLogToMainWindow('info', '📝 Registering plugin with Stream Deck:', JSON.stringify(registration, null, 2))
        this.streamDeckSocket.send(JSON.stringify(registration))
        this.sendLogToMainWindow('info', '✅ Plugin registration sent successfully')
        
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
        this.sendLogToMainWindow('error', '❌ Failed to connect to Stream Deck, exiting application...')
        this.shutdown()
      }, 3000)
    }
  }

  onMessage(msg) {
    try {
      this.sendLogToMainWindow('debug', 'RAW MESSAGE RECEIVED:', msg.toString())
      const json = JSON.parse(msg)
      
      // Send raw message to windows for debugging (with null checks)
      if (setupWindow && !setupWindow.isDestroyed()) {
        setupWindow.webContents.send('raw-message', json)
      }
      if (formWindow && !formWindow.isDestroyed()) {
        formWindow.webContents.send('raw-message', json)
      }
      if (debugWindow && !debugWindow.isDestroyed()) {
        debugWindow.webContents.send('raw-message', json)
      }

      // Extract payload information
      const event = json.event
      const action = json.action
      const context = json.context
      const device = json.device
      const payload = json.payload

      this.sendLogToMainWindow('debug', 'PARSED MESSAGE:', JSON.stringify(json, null, 2))
      this.sendLogToMainWindow('info', 'Received event:', event, 'for action:', action, 'context:', context)
      
      // Special logging for sendToPlugin events to help debug
      if (event === 'sendToPlugin') {
        this.sendLogToMainWindow('info', '🚀 sendToPlugin event detected - this should trigger the handler!')
        this.sendLogToMainWindow('debug', 'sendToPlugin details - action:', action, 'context:', context)
        this.sendLogToMainWindow('debug', 'sendToPlugin payload:', JSON.stringify(payload, null, 2))
      }

      // Key up event - button pressed
      if (event === 'keyUp') {
        if (context in this.settings) {
          const contextData = this.settings[context]
          this.sendLogToMainWindow('info', 'Button pressed with settings:', contextData.settings)

          // Show form modal with the settings
          this.showFormModal(contextData.settings)
        }
      } else if (event === 'willAppear') {
        // Action appeared on Stream Deck
        this.settings[context] = {
          device: device,
          settings: payload.settings,
          coordinates: payload.coordinates,
          action: action
        }
        this.sendLogToMainWindow('info', 'Action appeared:', context, 'device:', device, 'with settings:', payload.settings)
      } else if (event === 'willDisappear') {
        // Action disappeared from Stream Deck
        if (context in this.settings) {
          delete this.settings[context]
        }
      } else if (event === 'didReceiveSettings') {
        // Store settings with device and context mapping
        this.settings[context] = {
          device: device,
          settings: payload.settings,
          coordinates: payload.coordinates,
          action: action
        }
        this.sendLogToMainWindow('info', 'Settings updated for context:', context, 'device:', device, 'settings:', payload.settings)
        
        // Forward to setup window if it's open for this context
        if (setupWindow && !setupWindow.isDestroyed() && context === this.currentSetupContext) {
          setupWindow.webContents.send('setup-settings-update', {
            event: 'didReceiveSettings',
            context: context,
            settings: payload.settings
          })
        }
      } else if (event === 'sendToPlugin') {
        this.sendLogToMainWindow('info', '*** SENDTOPLUGIN EVENT DETECTED ***')
        this.sendLogToMainWindow('info', 'Message from Property Inspector:', payload)
        this.sendLogToMainWindow('debug', 'Full JSON:', JSON.stringify(json, null, 2))
        
        // Handle specific actions from Property Inspector
        if (payload && payload.action === 'openFullSetup') {
          this.sendLogToMainWindow('info', '*** OPENING FULL SETUP ***')
          this.sendLogToMainWindow('info', 'Opening full setup for context:', context)
          this.showSetupWindow(context)
        } else {
          this.sendLogToMainWindow('warn', '*** PAYLOAD CHECK FAILED ***')
          this.sendLogToMainWindow('warn', 'payload:', payload)
          this.sendLogToMainWindow('warn', 'payload.action:', payload ? payload.action : 'NO PAYLOAD')
        }
      } else {
        this.sendLogToMainWindow('warn', '*** UNHANDLED EVENT ***', event)
      }
    } catch (error) {
      console.error('Error parsing Stream Deck message:', error)
    }
  }

  getContextData(context) {
    return this.settings[context] || null
  }

  showFormModal(settings) {
    if (!formWindow || formWindow.isDestroyed()) {
      console.log('Form window not available, creating all windows')
      this.createAllWindows()
    }

    // Send settings to the renderer process
    formWindow.webContents.send('form-settings', settings)
    setupWindow.webContents.send('form-settings', settings)
    
    // Aggressive window focusing for Windows
    if (formWindow.isMinimized()) {
      formWindow.restore()
    }
    
    // Force window to front with multiple methods
    formWindow.show()
    formWindow.focus()
    formWindow.moveTop()
    
    // Temporarily set always on top to ensure it comes forward
    formWindow.setAlwaysOnTop(true)
    
    // Remove always on top after a short delay
    setTimeout(() => {
      if (formWindow && !formWindow.isDestroyed()) {
        formWindow.setAlwaysOnTop(false)
      }
    }, 1000)

    // Log the action
    this.logMessage('Form button pressed with settings: ' + JSON.stringify(settings))
  }

  showSetupWindow(contextToEdit) {
    if (!setupWindow || setupWindow.isDestroyed()) {
      console.log('Setup window not available, creating all windows')
      this.createAllWindows()
    }
    
    // Store current context for setup window
    this.currentSetupContext = contextToEdit
    
    // Send context info to setup window
    if (contextToEdit) {
      const contextData = this.getContextData(contextToEdit)
      setupWindow.webContents.send('setup-context-data', {
        context: contextToEdit,
        data: contextData
      })
    }
    
    // Aggressive window focusing for Windows
    if (setupWindow.isMinimized()) {
      setupWindow.restore()
    }
    
    // Force window to front with multiple methods
    setupWindow.show()
    setupWindow.focus()
    setupWindow.moveTop()
    
    // Temporarily set always on top to ensure it comes forward
    setupWindow.setAlwaysOnTop(true)
    
    // Remove always on top after a short delay
    setTimeout(() => {
      if (setupWindow && !setupWindow.isDestroyed()) {
        setupWindow.setAlwaysOnTop(false)
      }
    }, 1000)

    // Log the action
    this.logMessage('Setup window opened')
  }

  showDebugWindow() {
    if (!debugWindow || debugWindow.isDestroyed()) {
      console.log('Debug window not available, creating all windows')
      this.createAllWindows()
    }
    
    // Aggressive window focusing for Windows
    if (debugWindow.isMinimized()) {
      debugWindow.restore()
    }
    
    // Force window to front with multiple methods
    debugWindow.show()
    debugWindow.focus()
    debugWindow.moveTop()
    
    // Temporarily set always on top to ensure it comes forward
    debugWindow.setAlwaysOnTop(true)
    
    // Remove always on top after a short delay
    setTimeout(() => {
      if (debugWindow && !debugWindow.isDestroyed()) {
        debugWindow.setAlwaysOnTop(false)
      }
    }, 1000)

    // Log the action
    this.logMessage('Debug window opened')
  }

  createAllWindows() {
    this.createFormWindow()
    this.createSetupWindow()
    this.createDebugWindow()
  }

  createFormWindow() {
    formWindow = new BrowserWindow({
      width: 900,
      height: 650,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false, // Always start hidden since we have system tray
      frame: true, // Remove window frame for borderless look
      transparent: false, // Allow transparent background for rounded corners
      center: true, // Center the window on screen
      resizable: true,
      minimizable: true,
      maximizable: false, // Disable maximize as requested
      alwaysOnTop: false,
      icon: path.join(__dirname, 'assets', 'formIcon.png'),
      skipTaskbar: false, // Show in taskbar when visible
      title: 'Stream Deck Form Builder - Form',
      titleBarStyle: 'hidden',
      visualEffectState: 'active',
      backgroundMaterial: 'acrylic'
    })
    
    // Hide to system tray instead of closing
    formWindow.on('close', (event) => {
      if (!app.isQuiting) {
        event.preventDefault()
        formWindow.hide()
        console.log('Form window hidden to system tray')
      }
    })

    // Load the form interface
    const formPath = path.join(__dirname, 'form.html')
    formWindow.loadFile(formPath)

    formWindow.once('ready-to-show', () => {
      safeLog('Form window ready to show')
    })

    formWindow.on('closed', () => {
      safeLog('Form window closed')
      formWindow = null
    })
  }

  createSetupWindow() {
    setupWindow = new BrowserWindow({
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false, // Start hidden
      frame: true, // Remove window frame for borderless look
      transparent: false, // Allow transparent background for rounded corners
      center: true, // Center the window on screen
      resizable: true,
      minimizable: true,
      maximizable: true,
      alwaysOnTop: false,
      icon: path.join(__dirname, 'assets', 'formIcon.png'),
      skipTaskbar: false,
      title: 'Stream Deck Form Builder - Setup',
      titleBarStyle: 'hidden',
      visualEffectState: 'active',
      backgroundMaterial: 'acrylic'
    })
    
    // Hide to system tray instead of closing
    setupWindow.on('close', (event) => {
      if (!app.isQuiting) {
        event.preventDefault()
        setupWindow.hide()
        console.log('Setup window hidden to system tray')
      }
    })

    // Load the setup interface (from inside app.asar)
    const setupPath = path.join(__dirname, 'setup.html')
    setupWindow.loadFile(setupPath)

    setupWindow.once('ready-to-show', () => {
      safeLog('Setup window ready to show')
    })

    setupWindow.on('closed', () => {
      safeLog('Setup window closed')
      setupWindow = null
    })
  }

  createDebugWindow() {
    debugWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: false, // Disable for debug window to allow local file access
        preload: path.join(__dirname, 'preload.js')
      },
      show: false, // Start hidden
      frame: true, // Keep frame for debug window
      center: true,
      resizable: true,
      minimizable: true,
      maximizable: true,
      alwaysOnTop: false,
      icon: path.join(__dirname, 'assets', 'formIcon.png'),
      skipTaskbar: false,
      title: 'Stream Deck Form Builder - Debug Logs',
      titleBarStyle: 'default'
    })
    
    // Hide instead of closing
    debugWindow.on('close', (event) => {
      if (!app.isQuiting) {
        event.preventDefault()
        debugWindow.hide()
        console.log('Debug window hidden to system tray')
      }
    })

    // Load the debug logs interface
    const debugPath = path.join(__dirname, 'debug-logs.html')
    debugWindow.loadFile(debugPath)

    debugWindow.once('ready-to-show', () => {
      safeLog('Debug window ready to show')
    })

    debugWindow.on('closed', () => {
      safeLog('Debug window closed')
      debugWindow = null
    })

    // Setup IPC handlers (only once)
    this.setupIPCHandlers()
  }

  setupIPCHandlers() {
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

    // Handle messages from setup window
    ipcMain.handle('setup-send-to-streamdeck', async (event, message) => {
      try {
        if (this.streamDeckSocket && this.streamDeckSocket.readyState === WebSocket.OPEN) {
          this.streamDeckSocket.send(JSON.stringify(message))
          return { success: true }
        }
        return { success: false, error: 'Stream Deck not connected' }
      } catch (error) {
        console.error('Error sending to Stream Deck:', error)
        return { success: false, error: error.message }
      }
    })

    // Handle getting current settings for a context
    ipcMain.handle('get-settings', async (event, contextId) => {
      try {
        const contextData = this.getContextData(contextId || this.currentSetupContext)
        if (contextData && contextData.settings) {
          return { success: true, settings: contextData.settings }
        }
        return { success: true, settings: {} }
      } catch (error) {
        console.error('Error getting settings:', error)
        return { success: false, error: error.message }
      }
    })

    // Handle opening setup (legacy)
    ipcMain.on('open-setup', () => {
      shell.openExternal('file://' + path.join(__dirname, 'setup.html'))
    })

    // Handle window controls for borderless window
    ipcMain.on('window-minimize', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (focusedWindow) {
        focusedWindow.minimize()
      }
    })

    ipcMain.on('window-close', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (focusedWindow) {
        focusedWindow.hide()
      }
    })

    ipcMain.on('window-drag-start', () => {
      // Enable window dragging - handled by CSS -webkit-app-region: drag
    })

    // OAuth2 - Authorization Code (PKCE) flow
    ipcMain.handle('oauth-start-auth-code', async (event, params) => {
      try {
        const {
          authorizationUrl,
          tokenUrl,
          clientId,
          clientSecret,
          scope,
          authPlacement,
          saveRefreshToken
        } = params || {}

        if (!authorizationUrl || !tokenUrl || !clientId) {
          throw new Error('Missing required OAuth parameters')
        }

        // Start a local HTTP server to receive the redirect
        const state = crypto.randomBytes(16).toString('hex')
        const codeVerifier = crypto.randomBytes(32).toString('base64url')
        const codeChallenge = crypto
          .createHash('sha256')
          .update(codeVerifier)
          .digest('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        const server = http.createServer()
        const serverPort = 0 // random

        const tokenResult = await new Promise((resolve, reject) => {
          server.on('request', async (req, res) => {
            try {
              const urlObj = new URL(req.url, `http://localhost`)
              const code = urlObj.searchParams.get('code')
              const returnedState = urlObj.searchParams.get('state')

              if (!code) {
                res.statusCode = 400
                res.end('Missing code')
                return
              }
              if (returnedState !== state) {
                res.statusCode = 400
                res.end('Invalid state')
                return
              }

              // Exchange code for token
              const body = new URLSearchParams()
              body.set('grant_type', 'authorization_code')
              body.set('code', code)
              body.set('redirect_uri', redirectUrl)
              body.set('client_id', clientId)
              let headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
              if (authPlacement === 'header') {
                const basic = Buffer.from(`${clientId}:${clientSecret || ''}`).toString('base64')
                headers['Authorization'] = `Basic ${basic}`
              } else if (clientSecret) {
                body.set('client_secret', clientSecret)
              }
              if (scope) body.set('scope', scope)
              body.set('code_verifier', codeVerifier)

              const tokenResp = await fetch(tokenUrl, {
                method: 'POST',
                headers,
                body: body.toString()
              })
              const tokenJson = await tokenResp.json()

              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end('<html><body>Authentication complete. You can close this window.</body></html>')
              server.close()
              resolve({ token: tokenJson, redirectUrl })
            } catch (err) {
              reject(err)
              try { server.close() } catch {}
            }
          })
          let redirectUrl = ''
          server.listen(serverPort, '127.0.0.1', () => {
            // Open default browser to authorization URL
            redirectUrl = `http://localhost:${server.address().port}/callback`
            const auth = new URL(authorizationUrl)
            auth.searchParams.set('response_type', 'code')
            auth.searchParams.set('client_id', clientId)
            auth.searchParams.set('redirect_uri', redirectUrl)
            if (scope) auth.searchParams.set('scope', scope)
            auth.searchParams.set('state', state)
            auth.searchParams.set('code_challenge', codeChallenge)
            auth.searchParams.set('code_challenge_method', 'S256')
            shell.openExternal(auth.toString())
          })
        })

        return { success: true, token: tokenResult.token, redirectUrl: tokenResult.redirectUrl }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // OAuth2 - Client Credentials flow
    ipcMain.handle('oauth-client-credentials-token', async (event, params) => {
      try {
        const { tokenUrl, clientId, clientSecret, scope, authPlacement } = params || {}
        if (!tokenUrl || !clientId || !clientSecret) {
          throw new Error('Missing client credentials parameters')
        }
        const body = new URLSearchParams()
        body.set('grant_type', 'client_credentials')
        if (scope) body.set('scope', scope)

        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
        if (authPlacement === 'header' || authPlacement === undefined) {
          const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
          headers['Authorization'] = `Basic ${basic}`
        } else {
          body.set('client_id', clientId)
          body.set('client_secret', clientSecret)
        }

        const tokenResp = await fetch(tokenUrl, {
          method: 'POST',
          headers,
          body: body.toString()
        })
        const tokenJson = await tokenResp.json()
        return { success: true, token: tokenJson }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // Split flow: start callback server and return redirect URL
    ipcMain.handle('oauth-start-callback-server', async (event, params) => {
      try {
        if (this.oauthCallbackServer) {
          return { success: true, redirectUrl: `http://localhost:${this.oauthCallbackServer.address().port}/callback`, state: this.oauthCallbackState }
        }
        const { state: providedState } = params || {}
        const state = providedState || crypto.randomBytes(16).toString('hex')
        this.oauthCallbackState = state
        this.oauthCallbackServer = http.createServer()
        const serverPort = 0

        const { redirectUrl } = await new Promise((resolve, reject) => {
          this.oauthCallbackServer.on('request', async (req, res) => {
            try {
              const urlObj = new URL(req.url, 'http://localhost')
              const code = urlObj.searchParams.get('code')
              const returnedState = urlObj.searchParams.get('state')
              if (!code) {
                res.statusCode = 200
                res.end('Callback server ready')
                return
              }
              if (this.oauthCallbackState && returnedState !== this.oauthCallbackState) {
                res.statusCode = 400
                res.end('Invalid state')
                return
              }
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end('<html><body>Authentication complete. You can close this window.</body></html>')
              const info = { code, state: returnedState }
              if (setupWindow && !setupWindow.isDestroyed()) {
                setupWindow.webContents.send('oauth-token', info)
              }
              try { this.oauthCallbackServer.close() } catch {}
              this.oauthCallbackServer = null
              this.oauthCallbackState = null
            } catch (err) {
              try { res.statusCode = 500; res.end('Error') } catch {}
            }
          })
          let redirectUrl = ''
          this.oauthCallbackServer.listen(serverPort, '127.0.0.1', () => {
            redirectUrl = `http://localhost:${this.oauthCallbackServer.address().port}/callback`
            resolve({ redirectUrl })
          })
        })
        return { success: true, redirectUrl, state }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('oauth-stop-callback-server', async () => {
      try {
        if (this.oauthCallbackServer) {
          await new Promise((resolve) => this.oauthCallbackServer.close(() => resolve()))
          this.oauthCallbackServer = null
          this.oauthCallbackState = null
        }
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('open-external-url', async (event, url) => {
      try {
        shell.openExternal(url)
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })
  }

  async submitForm(formData) {
    const { url, method, fields, headers: customHeaders, auth } = formData

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

    // Build headers
    const headers = { 'Content-Type': 'application/json' }
    ;(customHeaders || []).forEach(h => {
      if (h && h.key) headers[h.key] = h.value ?? ''
    })

    // Inject auth headers for OAuth flows if present
    const nowSec = Math.floor(Date.now() / 1000)
    const applyBearer = (accessToken) => {
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    }

    async function refreshIfNeeded(tokenObj, refreshUrl, clientId, clientSecret, scope) {
      if (!tokenObj) return tokenObj
      const exp = tokenObj.expires_at || (tokenObj.expires_in ? (nowSec + tokenObj.expires_in - 30) : null)
      const isExpired = exp && nowSec >= exp
      if (!isExpired) return tokenObj
      if (!tokenObj.refresh_token) return tokenObj
      const form = new URLSearchParams()
      form.set('grant_type', 'refresh_token')
      form.set('refresh_token', tokenObj.refresh_token)
      if (scope) form.set('scope', scope)
      if (clientSecret) {
        form.set('client_id', clientId)
        form.set('client_secret', clientSecret)
      } else {
        form.set('client_id', clientId)
      }
      const resp = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      })
      const json = await resp.json()
      if (json.expires_in) json.expires_at = Math.floor(Date.now() / 1000) + json.expires_in
      return json
    }

    if (auth && auth.type === 'oauth2_auth_code') {
      const o = auth.oauth || {}
      if (o.token) {
        // attempt refresh if expired
        const refreshed = await refreshIfNeeded(o.token, o.tokenUrl, o.clientId, o.clientSecret, o.scope)
        if (refreshed && refreshed.access_token) {
          applyBearer(refreshed.access_token)
          // best-effort: update in-memory config if setup window is open
          o.token = refreshed
        } else {
          applyBearer(o.token.access_token)
        }
      }
    } else if (auth && auth.type === 'oauth2_client_credentials') {
      const c = auth.clientCredentials || {}
      if (c.token && c.token.access_token) {
        applyBearer(c.token.access_token)
      }
    }

    // Make HTTP request
    const response = await fetch(finalUrl.toString(), {
      method: method || 'POST',
      headers,
      body: method !== 'GET' ? JSON.stringify(bodyParams) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const result = isJson ? await response.json() : await response.text()
    console.log('Form submission result:', result)

    return result
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
        if (!debugWindow || debugWindow.isDestroyed()) {
          this.createDebugWindow()
        }
        debugWindow.show()
        debugWindow.focus()
      })
      
      this.sendLogToMainWindow('info', '🔗 System tray created successfully')
      
    } catch (error) {
      console.error('Failed to create system tray:', error)
    }
  }

  // Update tray menu (useful for updating connection status)
  updateTrayMenu() {
    if (tray) {
      const devToolsSubmenu = []
      if (formWindow && !formWindow.isDestroyed() && formWindow.isVisible()) {
        devToolsSubmenu.push({
          label: 'Form Window',
          click: () => formWindow.webContents.openDevTools({ mode: 'detach' })
        })
      }
      if (setupWindow && !setupWindow.isDestroyed() && setupWindow.isVisible()) {
        devToolsSubmenu.push({
          label: 'Setup Window',
          click: () => setupWindow.webContents.openDevTools({ mode: 'detach' })
        })
      }
      if (debugWindow && !debugWindow.isDestroyed() && debugWindow.isVisible()) {
        devToolsSubmenu.push({
          label: 'Debug Window',
          click: () => debugWindow.webContents.openDevTools({ mode: 'detach' })
        })
      }

      const contextMenu = Menu.buildFromTemplate([
        // Removed explicit show window items per request
        devToolsSubmenu.length > 0 ? { label: 'Open Dev Tools', submenu: devToolsSubmenu } : { label: 'Open Dev Tools', enabled: false },
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
    
    // Close all windows
    if (formWindow && !formWindow.isDestroyed()) {
      formWindow.close()
    }
    if (setupWindow && !setupWindow.isDestroyed()) {
      setupWindow.close()
    }
    if (debugWindow && !debugWindow.isDestroyed()) {
      debugWindow.close()
    }
    
    // Quit the app
    if (app) {
      app.quit()
    }
  }
}

// Global Stream Deck connector instance
const streamDeck = new StreamDeckConnector()

// Note: For compiled executables (.exe), Stream Deck passes connection parameters 
// via command line arguments (parsed in parseCommandLineArgs()) instead of 
// using the connectElgatoStreamDeckSocket global function approach

// Electron app event handlers
app.whenReady().then(() => {
  streamDeck.sendLogToMainWindow('info', '🚀 Form Builder Electron app started')
  streamDeck.sendLogToMainWindow('debug', '🔧 Debug logging system initialized')
  streamDeck.sendLogToMainWindow('info', '⚡ Initializing Stream Deck plugin...')

  // Create system tray first
  streamDeck.createTray()

  // Create all windows (initially hidden)
  streamDeck.createAllWindows()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      streamDeck.createAllWindows()
    }
  })
})

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed - keep running in system tray
  // The app will only quit when explicitly closed from the tray menu or when Stream Deck disconnects
  console.log('All windows closed, but keeping app running in system tray')
})

app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance - show form window
  if (formWindow) {
    if (formWindow.isMinimized()) formWindow.restore()
    formWindow.show()
    formWindow.focus()
  }
})

// Handle app being launched with arguments (from Stream Deck)
app.on('open-url', (event, url) => {
  event.preventDefault()
  console.log('App opened with URL:', url)
})

// Export for potential use in other files
module.exports = { StreamDeckConnector: StreamDeckConnector }