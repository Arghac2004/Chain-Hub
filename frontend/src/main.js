import React from 'react'
import ReactDOM from 'react-dom/client'

// Initialize Reown AppKit (must be before App)
import './config/web3.js'

import App from './App.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
