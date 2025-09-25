import React from 'react'
import { createRoot } from 'react-dom/client'
import Setup from '../components/Setup'

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<Setup />)