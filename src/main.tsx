// main.tsx — il punto di ingresso dell'applicazione.
// Prende il componente App e lo "monta" dentro il div #root di index.html.
// StrictMode è una modalità di sviluppo di React che segnala errori comuni.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// i font dello stile "Almanacco" (DESIGN-MISTER.md §3), impacchettati
// nell'app: niente rete, funzionano anche nell'app nativa
import '@fontsource/archivo-black'
import '@fontsource-variable/oswald'
import '@fontsource-variable/inter'
import '@fontsource/press-start-2p'
import '@fontsource/ibm-plex-mono'
import './design/tokens.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
