import React from 'react'
import { createRoot } from 'react-dom/client'
import Setup from '../components/Setup'

console.log('[Setup] React setup.js loaded - electronAPI initialization handled by HTML')

// Note: electronAPI initialization is now handled directly in setup.html
// Global variables (window.globalFormConfig, window.updateSetupReact, etc.) 
// are also set by the HTML script

// Render React component
const container = document.getElementById('root')
const root = createRoot(container)
root.render(<Setup />)