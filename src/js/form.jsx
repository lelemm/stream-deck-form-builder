import React from 'react'
import { createRoot } from 'react-dom/client'
import Form from '../components/Form'

console.log('[Form] React form.js loaded - electronAPI initialization handled by HTML')

// Note: electronAPI initialization is now handled directly in form.html
// Global variables are also set by the HTML script

// Render React component
const container = document.getElementById('root')
const root = createRoot(container)
root.render(<Form />)