import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import './index.css'
import App from './App.jsx'
import { MonitoringProvider } from './context/MonitoringContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <MonitoringProvider>
        <App />
      </MonitoringProvider>
    </BrowserRouter>
  </StrictMode>,
)
