// main.tsx — il punto di ingresso dell'applicazione.
// Prende il componente App e lo "monta" dentro il div #root di index.html.
// StrictMode è una modalità di sviluppo di React che segnala errori comuni.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
