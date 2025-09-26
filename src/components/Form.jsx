import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, Copy, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import JsonView from 'react18-json-view'
import 'react18-json-view/src/style.css'

function Form() {
  const [formData, setFormData] = useState(null)
  const [formValues, setFormValues] = useState({})
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resultModal, setResultModal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[Form] React component mounted')

    // Listen for form settings from main process
    if (window.electronAPI) {
      window.electronAPI.onFormSettings((event, settings) => {
        console.log('Received form settings:', settings)
        setFormData(settings?.formBuilderConfig ?? {})
        setLoading(false)
      })

      // Listen for form submission results
      window.electronAPI.onFormResult((event, result) => {
        console.log('Form result:', result)
        setIsSubmitting(false)

        if (result.success) {
          setResultModal(result.data)
        } else {
          setError('Form submission failed: ' + result.error)
        }
      })
    } else {
      setLoading(false)
    }

    // Cleanup on unmount
    return () => {
      setResultModal(null)
    }
  }, [])

  const handleInputChange = (fieldName, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }))
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: null
      }))
    }
  }

  const validateForm = () => {
    if (!formData?.fields) return false

    const newErrors = {}
    formData.fields.forEach(field => {
      if (field.required && !formValues[field.name]) {
        newErrors[field.name] = `${field.label} is required`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmitClick = async () => {
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const { url, method, fields } = formData || {}
      if (!url) throw new Error('Missing URL')

      // Prefer Electron main to handle HTTP, auth, and headers
      if (window.electronAPI && window.electronAPI.submitForm) {
        const payload = {
          url,
          method: method || 'POST',
          fields: fields || [],
          values: formValues,
          headers: formData.headers || [],
          auth: formData.auth || { type: 'none' }
        }
        const res = await window.electronAPI.submitForm(payload)
        if (res && res.success) {
          setIsSubmitting(false)
          if ((formData.outputType || 'status') === 'modal') {
            setResultModal(res.data)
          } else {
            setSuccess('Submitted successfully')
          }
        } else {
          throw new Error(res && res.error ? res.error : 'Unknown error')
        }
      } else {
        // Fallback: direct fetch without auth handling
        const queryParams = {}
        const bodyParams = {}
        ;(fields || []).forEach(field => {
          if (field.sendAs === 'query') {
            queryParams[field.name] = formValues[field.name]
          } else {
            bodyParams[field.name] = formValues[field.name]
          }
        })

        const finalUrl = new URL(url)
        Object.keys(queryParams).forEach(key => {
          finalUrl.searchParams.append(key, queryParams[key])
        })

        const response = await fetch(finalUrl.toString(), {
          method: method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: (method && method.toUpperCase() === 'GET') ? undefined : JSON.stringify(bodyParams)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type') || ''
        const isJson = contentType.includes('application/json')
        const result = isJson ? await response.json() : await response.text()
        setIsSubmitting(false)
        if ((formData.outputType || 'status') === 'modal') {
          setResultModal(result)
        } else {
          setSuccess('Submitted successfully')
        }
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setIsSubmitting(false)
      setError('Failed to submit form: ' + error.message)
    }
  }

  const copyToClipboard = async () => {
    if (resultModal && navigator.clipboard) {
      const textToCopy = typeof resultModal === 'string' ? resultModal : JSON.stringify(resultModal, null, 2)
      try {
        await navigator.clipboard.writeText(textToCopy)
        setSuccess('Copied to clipboard!')
        setTimeout(() => setSuccess(''), 2000)
      } catch (err) {
        console.error('Failed to copy text: ', err)
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setSuccess('Copied to clipboard!')
        setTimeout(() => setSuccess(''), 2000)
      }
    }
  }

  const renderField = (field) => {
    const value = formValues[field.name] || ''
    const hasError = errors[field.name]

    const commonProps = {
      id: field.name,
      name: field.name,
      placeholder: field.placeholder || '',
      className: hasError ? 'border-destructive' : '',
      onChange: (e) => handleInputChange(field.name, e.target.value),
      required: field.required || false,
    }

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            value={value}
            rows={4}
          />
        )

      case 'select':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={hasError ? 'border-destructive' : ''}>
                {value || field.placeholder || 'Select an option'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(field.options || []).map(option => (
                <DropdownMenuItem key={option.value} onSelect={() => handleInputChange(field.name, option.value)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Switch id={field.name} checked={value === true} onCheckedChange={(checked) => handleInputChange(field.name, !!checked)} aria-label={field.label} />
            <Label htmlFor={field.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {field.label}
            </Label>
          </div>
        )

      default:
        return (
          <Input
            {...commonProps}
            type={field.type || 'text'}
            value={value}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading form...</span>
        </div>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Form Builder</CardTitle>
            <CardDescription>No form configuration received</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please configure your form in the Stream Deck setup.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-transparent p-3">
      <div className="max-w-4xl mx-auto">

        {/* Main Content */}
        <Card className="rounded-t-none border-t-0 bg-white/10 backdrop-blur-xl border-white/10 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">{formData.title || 'Submit Form'}</CardTitle>
            <CardDescription className="text-foreground">{formData.description || 'Please fill out the form below'}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {formData.fields?.map(field => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name} className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {field.description && (
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                  )}

                  {renderField(field)}

                  {errors[field.name] && (
                    <p className="text-sm text-destructive">{errors[field.name]}</p>
                  )}
                </div>
              ))}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => window.close()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitClick}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Submitting...' : (formData.submitButtonText || 'Submit')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Modal */}
        {resultModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-white/10 backdrop-blur-xl border-white/10 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>API Response</CardTitle>
                  <CardDescription>The API call completed successfully</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResultModal(null)
                    window.close()
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {typeof resultModal === 'object' ? (
                  <div className="min-h-[300px] text-sm">
                    <JsonView src={resultModal} />
                  </div>
                ) : (
                  <Textarea
                    value={typeof resultModal === 'string' ? resultModal : JSON.stringify(resultModal, null, 2)}
                    readOnly
                    className="min-h-[300px] font-mono text-sm"
                  />
                )}
                <div className="flex justify-end space-x-2">
                  <Button onClick={copyToClipboard} size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default Form