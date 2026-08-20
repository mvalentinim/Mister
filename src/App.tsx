// App.tsx — il componente principale dell'applicazione.
//
// In React l'interfaccia è costruita con "componenti": funzioni che
// restituiscono un pezzo di HTML (in realtà JSX, un HTML potenziato che
// permette di inserire logica JavaScript). Questo componente disegna la
// pagina iniziale di MISTER: titolo + menu principale.
//
// Milestone M0: il menu è "finto" — i pulsanti esistono ma non portano
// ancora da nessuna parte. Cliccandoli appare solo un messaggio che dice
// in quale milestone quella funzione prenderà vita. Serve a vedere l'app
// girare nel browser e a fare pratica con modifiche e commit.

import { useState } from 'react'

// Le voci del menu principale. Ognuna dichiara la milestone in cui verrà
// implementata davvero (vedi piano-di-progetto-MISTER.md).
const VOCI_MENU = [
  {
    etichetta: 'Nuova carriera',
    descrizione: 'Scegli una nazione e inizia la scalata dalla Serie B',
    milestone: 'M2',
  },
  {
    etichetta: 'Carica carriera',
    descrizione: 'Riprendi una carriera salvata',
    milestone: 'M2',
  },
  {
    etichetta: 'Editor',
    descrizione: 'Modifica nazioni, club e giocatori del database',
    milestone: 'M9',
  },
] as const

function App() {
  // "useState" crea una variabile che, quando cambia, fa ridisegnare la
  // pagina. Qui memorizza il messaggio da mostrare dopo un click sul menu
  // (null = nessun messaggio).
  const [messaggio, setMessaggio] = useState<string | null>(null)

  return (
    <main className="schermata-titolo">
      <h1 className="logo">MISTER</h1>
      <p className="sottotitolo">Manageriale calcistico</p>

      <nav className="menu">
        {VOCI_MENU.map((voce) => (
          <button
            key={voce.etichetta}
            className="voce-menu"
            onClick={() =>
              setMessaggio(
                `«${voce.etichetta}» arriverà con la milestone ${voce.milestone}. Per ora il menu è solo una vetrina!`,
              )
            }
          >
            <span className="voce-etichetta">{voce.etichetta}</span>
            <span className="voce-descrizione">{voce.descrizione}</span>
          </button>
        ))}
      </nav>

      {/* Il messaggio appare solo se esiste (rendering condizionale) */}
      {messaggio && <p className="avviso">{messaggio}</p>}

      <footer className="versione">M0 — Fondamenta · versione 0.0.1</footer>
    </main>
  )
}

export default App
