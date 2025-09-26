import React, { useState, useEffect } from 'react'
import FormBuilder from './FormBuilder'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Check } from "lucide-react"
// Removed Toggle in favor of Switch
import '../css/app.css'
import { Switch } from "@/components/ui/switch"

function Setup() {
  const [activeTab, setActiveTab] = useState('basic')
  const [formConfig, setFormConfig] = useState(window.globalFormConfig || {
    title: '',
    url: '',
    method: 'POST',
    outputType: 'status',
    submitButtonText: 'Submit',
    fields: [],
    headers: [],
    auth: {
      type: 'none',
      oauth: {
        authorizationUrl: '',
        tokenUrl: '',
        clientId: '',
        clientSecret: '',
        scope: '',
        authPlacement: 'header',
        redirectUrl: '',
        saveRefreshToken: false,
        token: null
      },
      clientCredentials: {
        tokenUrl: '',
        clientId: '',
        clientSecret: '',
        scope: '',
        authPlacement: 'header',
        token: null
      }
    }
  })
  const [oauthServerRunning, setOauthServerRunning] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [copiedRedirect, setCopiedRedirect] = useState(false)

  useEffect(() => {
    console.log('[Setup] React component mounted, registering update callback')
    
    // Register this component's update function with the global connection
    window.updateSetupReact = (newConfig) => {
      console.log('[Setup] Updating React state with global config:', newConfig)
      setFormConfig(newConfig)
    }
    
    // Sync with any existing global config
    if (window.globalFormConfig) {
      setFormConfig(window.globalFormConfig)
    }
    
    // Cleanup on unmount
    return () => {
      window.updateSetupReact = null
    }
  }, [])

  useEffect(() => {
    if (!window.electronAPI) return
    const handler = (data) => {
      // data may contain { code, state }
      setFormConfig(prev => ({
        ...prev,
        auth: {
          ...prev.auth,
          oauth: {
            ...prev.auth?.oauth,
            // store code temporarily; the exchange can be implemented later or via a button
            authorizationCode: data?.code || prev.auth?.oauth?.authorizationCode || null
          }
        }
      }))
    }
    window.electronAPI.onOAuthToken(handler)
  }, [])

  useEffect(() => {
    // Validate configuration
    validateConfig()
  }, [formConfig])


  const validateConfig = () => {
    const isValid = formConfig.title && formConfig.url && formConfig.fields.length > 0
    setIsValid(isValid)
  }

  const handleConfigChange = (updates) => {
    const newConfig = { ...formConfig, ...updates }
    setFormConfig(newConfig)
    // Keep global config in sync
    window.globalFormConfig = newConfig
  }

  const handleSave = async () => {
    try {
      const settingsToSave = {
        formBuilderConfig: formConfig
      }
      
      // Save only to Stream Deck (removed localStorage for proper Stream Deck integration)
      
      // Save to Stream Deck via Electron IPC to worker
      if (window.electronAPI && window.currentContext) {
        const setSettings = {
          event: 'setSettings',
          context: window.currentContext,
          payload: settingsToSave
        }
        
        console.log('Saving settings via Electron IPC for context:', window.currentContext)
        const result = await window.electronAPI.setupSendToStreamDeck(setSettings)
        
        if (result.success) {
          alert('Configuration saved successfully!')
        } else {
          throw new Error(result.error || 'Failed to save to Stream Deck')
        }
      } else {
        alert('Configuration saved locally! (No Stream Deck connection)')
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving configuration: ' + err.message)
    }
  }

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all configuration?')) {
      const resetConfig = {
        title: '',
        url: '',
        method: 'POST',
        outputType: 'status',
        submitButtonText: 'Submit',
        fields: [],
        headers: [],
        auth: {
          type: 'none',
          oauth: {
            authorizationUrl: '',
            tokenUrl: '',
            clientId: '',
            clientSecret: '',
            scope: '',
            authPlacement: 'header',
            redirectUrl: '',
            saveRefreshToken: false,
            token: null
          },
          clientCredentials: {
            tokenUrl: '',
            clientId: '',
            clientSecret: '',
            scope: '',
            authPlacement: 'header',
            token: null
          }
        }
      }
      
      setFormConfig(resetConfig)
      setActiveTab('basic')
      
      // Clear settings from Stream Deck as well
      try {
        if (window.electronAPI && window.currentContext) {
          const setSettings = {
            event: 'setSettings',
            context: window.currentContext,
            payload: { formBuilderConfig: resetConfig }
          }
          
          console.log('Resetting settings in Stream Deck for context:', window.currentContext)
          await window.electronAPI.setupSendToStreamDeck(setSettings)
        }
      } catch (err) {
        console.error('Error resetting Stream Deck settings:', err)
      }
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

      <div className="space-y-2 flex flex-col max-w-md">
        <Label htmlFor="method">HTTP Method</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button id="method" variant="outline">{formConfig.method || 'Select method'}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {['GET','POST','PUT','PATCH','DELETE'].map(m => (
              <DropdownMenuItem key={m} onSelect={() => handleConfigChange({ method: m })}>{m}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  const renderOutputConfig = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="outputType">Output Handling</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button id="outputType" variant="outline">{formConfig.outputType || 'Select output'}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => handleConfigChange({ outputType: 'status' })}>Show status message</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleConfigChange({ outputType: 'modal' })}>Show result in modal</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

  const renderHeadersConfig = () => {
    const headers = formConfig.headers || []

    const updateHeader = (index, key, value) => {
      const next = headers.map((h, i) => i === index ? { ...h, [key]: value } : h)
      handleConfigChange({ headers: next })
    }

    const addHeader = () => {
      handleConfigChange({ headers: [...headers, { key: '', value: '' }] })
    }

    const removeHeader = (index) => {
      const next = headers.filter((_, i) => i !== index)
      handleConfigChange({ headers: next })
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Custom Headers</Label>
          <p className="text-sm text-muted-foreground">Add key/value pairs to include with every request</p>
        </div>

        <div className="space-y-3">
          {headers.map((h, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <Input
                  placeholder="Header name (e.g. X-Api-Key)"
                  value={h.key}
                  onChange={(e) => updateHeader(idx, 'key', e.target.value)}
                />
              </div>
              <div className="col-span-6">
                <Input
                  placeholder="Header value"
                  value={h.value}
                  onChange={(e) => updateHeader(idx, 'value', e.target.value)}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button type="button" variant="destructive" onClick={() => removeHeader(idx)}>Remove</Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addHeader}>Add Header</Button>
        </div>
      </div>
    )
  }

  const renderAuthConfig = () => {
    const auth = formConfig.auth || { type: 'none' }

    const setAuth = (updates) => handleConfigChange({ auth: { ...auth, ...updates } })

    const oauth = auth.oauth || {}
    const setOAuth = (updates) => setAuth({ oauth: { ...oauth, ...updates } })

    const cc = auth.clientCredentials || {}
    const setCC = (updates) => setAuth({ clientCredentials: { ...cc, ...updates } })

    const startCallbackServer = async () => {
      try {
        if (!window.electronAPI) return alert('Electron API unavailable')
        const res = await window.electronAPI.oauthStartCallbackServer({})
        if (res && res.success) {
          setOAuth({ redirectUrl: res.redirectUrl, state: res.state })
          setOauthServerRunning(true)
        } else {
          alert('Failed to start callback server: ' + (res && res.error ? res.error : 'Unknown error'))
        }
      } catch (err) {
        alert('Start server error: ' + err.message)
      }
    }

    const stopCallbackServer = async () => {
      try {
        if (!window.electronAPI) return
        const res = await window.electronAPI.oauthStopCallbackServer()
        if (res && res.success) {
          setOauthServerRunning(false)
        }
      } catch {}
    }

    const openProviderLogin = async () => {
      try {
        if (!window.electronAPI) return alert('Electron API unavailable')
        if (!oauth.authorizationUrl || !oauth.clientId || !oauth.redirectUrl) {
          return alert('Please provide Authorization URL, Client ID and start the callback server first')
        }
        const state = oauth.state || Math.random().toString(36).slice(2)
        const auth = new URL(oauth.authorizationUrl)
        auth.searchParams.set('response_type', 'code')
        auth.searchParams.set('client_id', oauth.clientId)
        auth.searchParams.set('redirect_uri', oauth.redirectUrl)
        if (oauth.scope) auth.searchParams.set('scope', oauth.scope)
        auth.searchParams.set('state', state)
        // PKCE optional here; server-side handler supports code_verifier path in the other combined flow
        const res = await window.electronAPI.openExternalUrl(auth.toString())
        if (!res || !res.success) alert('Failed to open browser')
      } catch (err) {
        alert('Open browser error: ' + err.message)
      }
    }

    const fetchClientCredentials = async () => {
      try {
        if (!window.electronAPI) return alert('Electron API unavailable')
        const payload = {
          tokenUrl: cc.tokenUrl,
          clientId: cc.clientId,
          clientSecret: cc.clientSecret,
          scope: cc.scope,
          authPlacement: cc.authPlacement || 'header'
        }
        const res = await window.electronAPI.oauthClientCredentialsToken(payload)
        if (res && res.success) {
          setCC({ token: res.token })
          alert('Token fetched successfully')
        } else {
          alert('Token error: ' + (res && res.error ? res.error : 'Unknown error'))
        }
      } catch (err) {
        alert('Client Credentials error: ' + err.message)
      }
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2 flex flex-col max-w-md">
          <Label htmlFor="authType">Authentication</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button id="authType" variant="outline">{auth.type === 'none' ? 'None' : auth.type === 'oauth2_auth_code' ? 'OAuth 2.0 / OpenID - Authorization Code' : auth.type === 'oauth2_client_credentials' ? 'OAuth 2.0 - Client Credentials' : 'Select auth'}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setAuth({ type: 'none' })}>None</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAuth({ type: 'oauth2_auth_code' })}>OAuth 2.0 / OpenID - Authorization Code</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAuth({ type: 'oauth2_client_credentials' })}>OAuth 2.0 - Client Credentials</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {auth.type === 'oauth2_auth_code' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Authorization URL</Label>
                <Input value={oauth.authorizationUrl || ''} onChange={(e) => setOAuth({ authorizationUrl: e.target.value })} placeholder="https://auth.example.com/authorize" />
              </div>
              <div className="space-y-2">
                <Label>Access Token URL</Label>
                <Input value={oauth.tokenUrl || ''} onChange={(e) => setOAuth({ tokenUrl: e.target.value })} placeholder="https://auth.example.com/oauth/token" />
              </div>
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input value={oauth.clientId || ''} onChange={(e) => setOAuth({ clientId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input type="password" value={oauth.clientSecret || ''} onChange={(e) => setOAuth({ clientSecret: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Input value={oauth.scope || ''} onChange={(e) => setOAuth({ scope: e.target.value })} placeholder="e.g. openid profile email offline_access" />
              </div>
              <div className="space-y-2">
                <Label>Authentication (Header / Body)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">{oauth.authPlacement || 'header'}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setOAuth({ authPlacement: 'header' })}>Header</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setOAuth({ authPlacement: 'body' })}>Body</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2 flex flex-col max-w-md">
                <Label>OAuth Redirect URL (preview)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={oauth.redirectUrl || ''}
                    readOnly
                    placeholder="http://localhost:<dynamic-port>/callback"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!oauth.redirectUrl || !navigator.clipboard) return
                      try {
                        await navigator.clipboard.writeText(oauth.redirectUrl)
                        setCopiedRedirect(true)
                        setTimeout(() => setCopiedRedirect(false), 1200)
                      } catch {}
                    }}
                    disabled={!oauth.redirectUrl}
                    aria-label="Copy redirect URL"
                  >
                    {copiedRedirect ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="saveRefreshToken" checked={!!oauth.saveRefreshToken} onCheckedChange={(checked) => setOAuth({ saveRefreshToken: !!checked })} aria-label="Save refresh token" />
              <Label htmlFor="saveRefreshToken">Save refresh token</Label>
            </div>
            <div className="flex gap-2">
              {!oauthServerRunning ? (
                <Button type="button" variant="secondary" onClick={startCallbackServer}>Start callback server</Button>
              ) : (
                <Button type="button" variant="destructive" onClick={stopCallbackServer}>Stop callback server</Button>
              )}
              <Button type="button" onClick={openProviderLogin} disabled={!oauthServerRunning}>Login with provider</Button>
              {oauth?.token?.access_token && (
                <span className="text-sm text-muted-foreground">Access token acquired</span>
              )}
            </div>
          </div>
        )}

        {auth.type === 'oauth2_client_credentials' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Access Token URL</Label>
                <Input value={cc.tokenUrl || ''} onChange={(e) => setCC({ tokenUrl: e.target.value })} placeholder="https://auth.example.com/oauth/token" />
              </div>
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input value={cc.clientId || ''} onChange={(e) => setCC({ clientId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input type="password" value={cc.clientSecret || ''} onChange={(e) => setCC({ clientSecret: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Input value={cc.scope || ''} onChange={(e) => setCC({ scope: e.target.value })} placeholder="e.g. api.read api.write" />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label>Authentication (Header / Body)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">{cc.authPlacement || 'header'}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setCC({ authPlacement: 'header' })}>Header</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setCC({ authPlacement: 'body' })}>Body</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={fetchClientCredentials}>Fetch Token</Button>
              {cc?.token?.access_token && (
                <span className="text-sm text-muted-foreground">Access token acquired</span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

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
    <div>
      <div className="mx-auto space-y-6">
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
          <div className="flex flex-row gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Form Builder Setup</h1>
            <p className="text-muted-foreground">Configure your custom form and API endpoint</p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getTabStatus('basic') ? 'bg-green-500' : 'bg-gray-400'}`} />
              Basic
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getTabStatus('fields') ? 'bg-green-500' : 'bg-gray-400'}`} />
              Fields
            </TabsTrigger>
            <TabsTrigger value="headers" className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${true ? 'bg-green-500' : 'bg-gray-400'}`} />
              Headers
            </TabsTrigger>
            <TabsTrigger value="auth" className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${true ? 'bg-green-500' : 'bg-gray-400'}`} />
              Auth
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

            <TabsContent value="headers" className="space-y-6">
              <div className="rounded-lg border p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">Custom Headers</h2>
                  <p className="text-muted-foreground">Define headers to be sent with API requests</p>
                </div>
                {renderHeadersConfig()}
              </div>
            </TabsContent>

            <TabsContent value="auth" className="space-y-6">
              <div className="rounded-lg border p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">Authentication</h2>
                  <p className="text-muted-foreground">Configure OAuth2/OpenID or disable authentication</p>
                </div>
                {renderAuthConfig()}
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
              </div>
            </TabsContent>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6">
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