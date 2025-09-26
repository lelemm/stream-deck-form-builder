import React, { useState, useEffect } from 'react'
import '../css/app.css'

// Stream Deck Property Inspector connection - global variables
let websocket = null
let uuid = null
let actionInfo = null

// Global React setter functions (will be set by the component)
let globalSetSettings = null
let globalSetIsConnected = null
let globalSetIsLoading = null

// Stream Deck connection function (called by Stream Deck immediately when loaded)
window.connectElgatoStreamDeckSocket = (inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) => {
  console.log('PropertyInspector: Connecting to Stream Deck:', { inPort, inPropertyInspectorUUID, inRegisterEvent })

  uuid = inPropertyInspectorUUID
  actionInfo = JSON.parse(inActionInfo)

  websocket = new WebSocket('ws://127.0.0.1:' + inPort)

  websocket.onopen = () => {
    console.log('PropertyInspector: WebSocket connected')
    if (globalSetIsConnected) globalSetIsConnected(true)
    if (globalSetIsLoading) globalSetIsLoading(false)

    // Register as property inspector
    const registerEvent = {
      event: inRegisterEvent,
      uuid: inPropertyInspectorUUID
    }
    console.log('PropertyInspector: Sending registration:', registerEvent)
    websocket.send(JSON.stringify(registerEvent))
    console.log('PropertyInspector: Registration sent successfully')

    // Request current settings from Stream Deck
    const getSettingsEvent = {
      event: 'getSettings',
      context: inPropertyInspectorUUID
    }
    websocket.send(JSON.stringify(getSettingsEvent))
    console.log('PropertyInspector: Requested settings from Stream Deck')

    // Load current settings from action if available immediately
    if (actionInfo && actionInfo.payload && actionInfo.payload.settings) {
      if (globalSetSettings) globalSetSettings(actionInfo.payload.settings)
      console.log('PropertyInspector: Loaded initial settings:', actionInfo.payload.settings)
    }
  }

  websocket.onmessage = (evt) => {
    const jsonObj = JSON.parse(evt.data)
    console.log('PropertyInspector: Received message:', jsonObj)

    if (jsonObj.event === 'didReceiveSettings') {
      // Update settings
      if (globalSetSettings) globalSetSettings(jsonObj.payload.settings || {})

      // Update actionInfo if it's empty (populate from the message)
      if (!actionInfo || !actionInfo.action) {
        actionInfo = {
          action: jsonObj.action,
          context: jsonObj.context,
          device: jsonObj.device,
          payload: jsonObj.payload
        }
        console.log('PropertyInspector: Updated actionInfo from didReceiveSettings:', actionInfo)
      }

      websocket.send(JSON.stringify({
        event: 'setSettings',
        context: uuid,
        payload: jsonObj.payload.settings
      }))
    }
  }

  websocket.onclose = () => {
    console.log('PropertyInspector: WebSocket closed')
    if (globalSetIsConnected) globalSetIsConnected(false)
  }

  websocket.onerror = (error) => {
    console.error('PropertyInspector: WebSocket error:', error)
    if (globalSetIsConnected) globalSetIsConnected(false)
  }
}

function PropertyInspector() {
  const [settings, setSettings] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Set global references to React state setters
    globalSetSettings = setSettings
    globalSetIsConnected = setIsConnected
    globalSetIsLoading = setIsLoading

    // If connection already exists (Stream Deck loaded before React), update state
    if (websocket) {
      setIsConnected(websocket.readyState === WebSocket.OPEN)
      setIsLoading(false)

      if (actionInfo && actionInfo.payload && actionInfo.payload.settings) {
        setSettings(actionInfo.payload.settings)
      }
    } else {
      // If no connection yet, just stop loading (Stream Deck will connect when ready)
      setIsLoading(false)
    }

    return () => {
      // Clear global references on unmount
      globalSetSettings = null
      globalSetIsConnected = null
      globalSetIsLoading = null

      if (websocket) {
        websocket.close()
      }
    }
  }, [])

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

  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="pt-4 border-t border-gray-700">
      <button
        onClick={() => {
          // Send message to plugin to open setup in Electron window
          if (websocket && websocket.readyState === WebSocket.OPEN && actionInfo) {
            websocket.send(JSON.stringify({
              action: "com.leandro-menezes.formbuilder.action",
              event: 'sendToPlugin',
              context: uuid,
              payload: {
                action: 'openFullSetup'
              }
            }))
            console.log('sent sendToPlugin event');
          } else {
            console.log('PropertyInspector: Not connected to Stream Deck or actionInfo not available')
            console.log('websocket:', websocket)
            console.log('actionInfo:', actionInfo)
            console.log('openSetupEvent:', openSetupEvent)
          }
        }}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
      >
        Open Setup
      </button>
    </div>
  )
}

export default PropertyInspector