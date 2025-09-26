import React, { useState, useEffect } from 'react'
import FormModal from './FormModal'
import '../css/app.css'

function App() {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Load configuration from Stream Deck settings
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    try {
      console.log('App: Requesting configuration from Electron main process')
      
      // Request current settings from Electron main process via IPC
      if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings()
        console.log('App: Received settings from Electron:', settings)
        if (settings) {
          setFormData(settings)
        }
      } else {
        console.log('App: electronAPI not available, using window.globalFormConfig fallback')
        // Fallback to global config if available
        if (window.globalFormConfig) {
          setFormData(window.globalFormConfig)
        }
      }
    } catch (err) {
      console.error('Error loading configuration:', err)
    }
  }

  const handleButtonPress = async () => {
    if (!formData) {
      setError('No form configuration found. Please configure the form first.')
      return
    }

    setShowModal(true)
  }

  const handleFormSubmit = async (formValues) => {
    setLoading(true)
    setError(null)

    try {
      // Process the form data according to configuration
      const result = await processFormSubmission(formValues)

      // Handle the result based on configuration
      if (formData.outputType === 'modal') {
        // Show result in modal
        setShowModal(false)
        // Show result modal
      } else {
        // Show default message based on status
        console.log('Success:', result)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const processFormSubmission = async (formValues) => {
    // Build the HTTP request based on formData configuration
    const { url, method, fields } = formData

    // Separate query params and body params
    const queryParams = {}
    const bodyParams = {}

    fields.forEach(field => {
      if (field.sendAs === 'query') {
        queryParams[field.name] = formValues[field.name]
      } else {
        bodyParams[field.name] = formValues[field.name]
      }
    })

    // Build URL with query parameters
    const finalUrl = new URL(url)
    Object.keys(queryParams).forEach(key => {
      finalUrl.searchParams.append(key, queryParams[key])
    })

    // Make the HTTP request
    const response = await fetch(finalUrl.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(bodyParams) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  return (
    <div className="bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>

          <h1 className="text-xl font-bold mb-2">Form Builder</h1>
          <p className="text-gray-400 mb-6">
            {formData ? 'Ready to submit form' : 'No form configured'}
          </p>

          {error && (
            <div className="bg-red-600 text-white p-3 rounded mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleButtonPress}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded transition-colors"
          >
            {loading ? 'Processing...' : 'Open Form'}
          </button>

          <button
            onClick={() => window.open('setup.html', '_blank')}
            className="w-full bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded mt-2 transition-colors"
          >
            Configure Form
          </button>
        </div>
      </div>

      {showModal && formData && (
        <FormModal
          formData={formData}
          onSubmit={handleFormSubmit}
          onClose={() => setShowModal(false)}
          loading={loading}
        />
      )}
    </div>
  )
}

export default App