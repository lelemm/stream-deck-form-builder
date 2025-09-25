import React, { useState, useEffect } from 'react'
import FormBuilder from './FormBuilder'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import '../css/setup.css'

function Setup() {
  const [activeTab, setActiveTab] = useState('basic')
  const [formConfig, setFormConfig] = useState({
    title: '',
    url: '',
    method: 'POST',
    outputType: 'status',
    submitButtonText: 'Submit',
    fields: []
  })
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    // Load existing configuration
    loadExistingConfig()
    
    // Initialize WebSocket connection to Stream Deck (just like PropertyInspector)
    initializeStreamDeckConnection()
  }, [])

  useEffect(() => {
    // Validate configuration
    validateConfig()
  }, [formConfig])

  const loadExistingConfig = () => {
    try {
      const saved = localStorage.getItem('formBuilderConfig')
      if (saved) {
        setFormConfig(JSON.parse(saved))
      }
    } catch (err) {
      console.error('Error loading config:', err)
    }
  }

  const initializeStreamDeckConnection = () => {
    // Get connection info from URL params or global variables set by Electron
    if (window.streamDeckConnectionInfo) {
      const { websocket, context, device, contextData } = window.streamDeckConnectionInfo
      
      console.log('Setup window initialized with:', { context, device, contextData })
      
      // Load existing settings from contextData if available
      if (contextData && contextData.settings && contextData.settings.formBuilderConfig) {
        console.log('Loading settings from context data:', contextData.settings.formBuilderConfig)
        setFormConfig(contextData.settings.formBuilderConfig)
      }
      
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        // Listen for settings updates
        const handleMessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('Setup received WebSocket message:', data)
            
            if (data.event === 'didReceiveSettings' && data.context === context) {
              console.log('Received settings for our context:', data.payload.settings)
              if (data.payload.settings && data.payload.settings.formBuilderConfig) {
                setFormConfig(data.payload.settings.formBuilderConfig)
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }
        
        websocket.addEventListener('message', handleMessage)
        
        // Store websocket reference for saving
        window.currentWebSocket = websocket
        window.currentContext = context
        window.currentDevice = device
        
        return () => {
          websocket.removeEventListener('message', handleMessage)
        }
      }
    }
  }

  const validateConfig = () => {
    const isValid = formConfig.title && formConfig.url && formConfig.fields.length > 0
    setIsValid(isValid)
  }

  const handleConfigChange = (updates) => {
    setFormConfig(prev => ({ ...prev, ...updates }))
  }

  const handleSave = async () => {
    try {
      const settingsToSave = {
        formBuilderConfig: formConfig
      }
      
      // Save to localStorage for backwards compatibility
      localStorage.setItem('formBuilderConfig', JSON.stringify(formConfig))
      
      // Save to Stream Deck via WebSocket - use setSettings for the specific context
      if (window.currentWebSocket && window.currentWebSocket.readyState === WebSocket.OPEN && window.currentContext) {
        const setSettings = {
          event: 'setSettings',
          context: window.currentContext,
          payload: settingsToSave
        }
        console.log('Saving settings for context:', window.currentContext, 'device:', window.currentDevice)
        window.currentWebSocket.send(JSON.stringify(setSettings))
        alert('Configuration saved successfully!')
      } else {
        alert('Configuration saved locally! (No Stream Deck connection)')
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving configuration: ' + err.message)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all configuration?')) {
      setFormConfig({
        title: '',
        url: '',
        method: 'POST',
        outputType: 'status',
        submitButtonText: 'Submit',
        fields: []
      })
      localStorage.removeItem('formBuilderConfig')
      setActiveTab('basic')
    }
  }

  const renderBasicConfig = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Form Title</Label>
        <Input
          id="title"
          type="text"
          value={formConfig.title}
          onChange={(e) => handleConfigChange({ title: e.target.value })}
          placeholder="Enter form title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">API URL</Label>
        <Input
          id="url"
          type="url"
          value={formConfig.url}
          onChange={(e) => handleConfigChange({ url: e.target.value })}
          placeholder="https://api.example.com/endpoint"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="method">HTTP Method</Label>
        <Select value={formConfig.method} onValueChange={(value) => handleConfigChange({ method: value })}>
          <SelectTrigger id="method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderOutputConfig = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="outputType">Output Handling</Label>
        <Select value={formConfig.outputType} onValueChange={(value) => handleConfigChange({ outputType: value })}>
          <SelectTrigger id="outputType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Show status message</SelectItem>
            <SelectItem value="modal">Show result in modal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="submitButton">Submit Button Text</Label>
        <Input
          id="submitButton"
          type="text"
          value={formConfig.submitButtonText || 'Submit'}
          onChange={(e) => handleConfigChange({ submitButtonText: e.target.value })}
          placeholder="Submit"
        />
      </div>
    </div>
  )

  const renderReview = () => (
    <div className="space-y-6">
      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="text-xl font-semibold">Configuration Summary</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-muted-foreground">Form Title</Label>
            <p className="font-medium">{formConfig.title || 'Not set'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">API URL</Label>
            <p className="font-medium break-all">{formConfig.url || 'Not set'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">HTTP Method</Label>
            <p className="font-medium">{formConfig.method}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Output Type</Label>
            <p className="font-medium">{formConfig.outputType}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Button Text</Label>
            <p className="font-medium">{formConfig.submitButtonText}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Fields Count</Label>
            <p className="font-medium">{formConfig.fields.length} field(s)</p>
          </div>
        </div>
      </div>

      {formConfig.fields.length > 0 && (
        <div className="border rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">Form Fields</h4>
          <div className="space-y-3">
            {formConfig.fields.map((field, index) => (
              <div key={index} className="border rounded-md p-3 bg-muted/50">
                <div className="font-medium">{field.label}</div>
                <div className="text-sm text-muted-foreground">
                  Name: {field.name} • Type: {field.type || 'text'} • Send as: {field.sendAs || 'body'}
                  {field.required && ' • Required'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const getTabStatus = (tab) => {
    switch (tab) {
      case 'basic':
        return formConfig.title && formConfig.url
      case 'fields':
        return formConfig.fields.length > 0
      case 'output':
        return true
      case 'review':
        return isValid
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <svg
              className="h-6 w-6 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Form Builder Setup</h1>
            <p className="text-muted-foreground">Configure your custom form and API endpoint</p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getTabStatus('basic') ? 'bg-green-500' : 'bg-gray-400'}`} />
              Basic
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getTabStatus('fields') ? 'bg-green-500' : 'bg-gray-400'}`} />
              Fields
            </TabsTrigger>
            <TabsTrigger value="output" className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getTabStatus('output') ? 'bg-green-500' : 'bg-gray-400'}`} />
              Output
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getTabStatus('review') ? 'bg-green-500' : 'bg-gray-400'}`} />
              Review
            </TabsTrigger>
          </TabsList>

          <div className="min-h-[500px]">
            <TabsContent value="basic" className="space-y-6">
              <div className="rounded-lg border p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">Basic Configuration</h2>
                  <p className="text-muted-foreground">Set up your form's basic information and API endpoint</p>
                </div>
                {renderBasicConfig()}
              </div>
            </TabsContent>

            <TabsContent value="fields" className="space-y-6">
              <div className="rounded-lg border p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">Form Fields</h2>
                  <p className="text-muted-foreground">Define the fields that will appear in your form</p>
                </div>
                <FormBuilder
                  fields={formConfig.fields}
                  onFieldsChange={(fields) => handleConfigChange({ fields })}
                />
              </div>
            </TabsContent>

            <TabsContent value="output" className="space-y-6">
              <div className="rounded-lg border p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">Output Settings</h2>
                  <p className="text-muted-foreground">Configure how the form submission results are handled</p>
                </div>
                {renderOutputConfig()}
              </div>
            </TabsContent>

            <TabsContent value="review" className="space-y-6">
              <div className="space-y-6">
                {renderReview()}
                {activeTab === 'review' && (
                  <div className="flex justify-center">
                    <Button
                      onClick={() => alert('Configuration complete! You can now use the form button.')}
                      disabled={!isValid}
                      size="lg"
                      className="px-8"
                    >
                      Complete Setup
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset}>
                Reset All
              </Button>
              <Button variant="default" onClick={handleSave}>
                Save Configuration
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {isValid ? (
                <span className="text-green-600 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Configuration is valid
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  Please complete all required fields
                </span>
              )}
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default Setup