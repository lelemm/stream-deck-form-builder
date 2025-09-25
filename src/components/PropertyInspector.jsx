import React, { useState, useEffect } from 'react'
import '../css/setup.css'

// Stream Deck Property Inspector connection
let websocket = null
let uuid = null
let actionInfo = null

function PropertyInspector() {
  const [settings, setSettings] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize Stream Deck connection
    initializeStreamDeck()
    
    return () => {
      if (websocket) {
        websocket.close()
      }
    }
  }, [])

  const initializeStreamDeck = () => {
    // Check if we're in the actual Stream Deck environment
    if (window.connectElgatoStreamDeckSocket) {
      console.log('PropertyInspector: Stream Deck environment detected')
    } else {
      console.log('PropertyInspector: Not in Stream Deck environment, using localStorage fallback')
      loadSettingsFromLocalStorage()
    }
  }

  const loadSettingsFromLocalStorage = () => {
    try {
      const savedSettings = localStorage.getItem('formBuilderConfig')
      if (savedSettings) {
        const config = JSON.parse(savedSettings)
        setSettings(config)
        console.log('PropertyInspector: Loaded settings from localStorage:', config)
      }
    } catch (err) {
      console.error('PropertyInspector: Error loading settings from localStorage:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Stream Deck connection function (called by Stream Deck)
  window.connectElgatoStreamDeckSocket = (inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) => {
    console.log('PropertyInspector: Connecting to Stream Deck:', { inPort, inPropertyInspectorUUID, inRegisterEvent })
    
    uuid = inPropertyInspectorUUID
    actionInfo = JSON.parse(inActionInfo)
    
    websocket = new WebSocket('ws://127.0.0.1:' + inPort)
    
    websocket.onopen = () => {
      console.log('PropertyInspector: WebSocket connected')
      setIsConnected(true)
      setIsLoading(false)
      
      // Register as property inspector
      const registerEvent = {
        event: inRegisterEvent,
        uuid: inPropertyInspectorUUID
      }
      websocket.send(JSON.stringify(registerEvent))
      
      // Load current settings from action
      if (actionInfo && actionInfo.payload && actionInfo.payload.settings) {
        setSettings(actionInfo.payload.settings)
        console.log('PropertyInspector: Loaded initial settings:', actionInfo.payload.settings)
      }
    }
    
    websocket.onmessage = (evt) => {
      const jsonObj = JSON.parse(evt.data)
      console.log('PropertyInspector: Received message:', jsonObj)
      
      if (jsonObj.event === 'didReceiveSettings') {
        setSettings(jsonObj.payload.settings || {})
      }
    }
    
    websocket.onclose = () => {
      console.log('PropertyInspector: WebSocket closed')
      setIsConnected(false)
    }
    
    websocket.onerror = (error) => {
      console.error('PropertyInspector: WebSocket error:', error)
      setIsConnected(false)
    }
  }

  const updateSettings = (newSettings) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    console.log('PropertyInspector: Updating settings:', updatedSettings)

    // Send to Stream Deck if connected
    if (websocket && websocket.readyState === WebSocket.OPEN && actionInfo) {
      const setSettingsEvent = {
        event: 'setSettings',
        context: actionInfo.context,
        payload: updatedSettings
      }
      websocket.send(JSON.stringify(setSettingsEvent))
      console.log('PropertyInspector: Sent settings to Stream Deck:', setSettingsEvent)
    }

    // Also save to localStorage as backup
    localStorage.setItem('formBuilderConfig', JSON.stringify(updatedSettings))
  }

  const testConnection = async () => {
    if (!settings.url) {
      alert('Please set a URL first')
      return
    }

    try {
      // This would make a test request to the API
      const response = await fetch(settings.url, {
        method: 'OPTIONS', // Use OPTIONS to test connectivity without side effects
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        alert('Connection successful! API endpoint is reachable.')
      } else {
        alert(`Connection test failed: ${response.status} ${response.statusText}`)
      }
    } catch (err) {
      alert(`Connection test failed: ${err.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Form Builder</h1>
              <p className="text-gray-400 text-sm">Property Inspector</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-400">
                {isConnected ? 'Connected to Stream Deck' : 'Not connected'}
              </span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                API URL
              </label>
              <input
                type="url"
                value={settings.url || ''}
                onChange={(e) => updateSettings({ url: e.target.value })}
                placeholder="https://api.example.com/endpoint"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                HTTP Method
              </label>
              <select
                value={settings.method || 'POST'}
                onChange={(e) => updateSettings({ method: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Form Title
              </label>
              <input
                type="text"
                value={settings.title || ''}
                onChange={(e) => updateSettings({ title: e.target.value })}
                placeholder="Enter form title"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-4 border-t border-gray-700">
              <button
                onClick={testConnection}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors mb-3"
              >
                Test Connection
              </button>

              <button
                onClick={() => {
                  // Send message to plugin to open setup in Electron window
                  if (websocket && websocket.readyState === WebSocket.OPEN && actionInfo) {
                    const openSetupEvent = {
                      event: 'sendToPlugin',
                      context: actionInfo.context,
                      payload: { action: 'openFullSetup' }
                    }
                    websocket.send(JSON.stringify(openSetupEvent))
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Open Full Setup
              </button>
            </div>

            <div className="text-xs text-gray-400 mt-4">
              <p><strong>Instructions:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Set your API endpoint URL above</li>
                <li>Use the full setup page for detailed configuration</li>
                <li>Test your connection before using the button</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyInspector