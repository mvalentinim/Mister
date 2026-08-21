// main.tsx — il punto di ingresso dell'applicazione.
// Prende il componente App e lo "monta" dentro il div #root di index.html.
// StrictMode è una modalità di sviluppo di React che segnala errori comuni.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// i font del design system (M11), impacchettati nell'app: niente rete
import '@fontsource-variable/inter'
import '@fontsource-variable/outfit'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
