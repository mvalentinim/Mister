// App.tsx — il componente principale: carica il database e gestisce la
// navigazione tra le schermate.
//
// La navigazione è volutamente semplice: una variabile di stato "vista"
// dice quale schermata mostrare (e con quali dati, es. quale club).
// Quando servirà qualcosa di più ricco valuteremo un router vero.

import { useEffect, useState } from 'react'
import type { Database } from 'sql.js'
import { apriDatabase } from './db/database.ts'
import ElencoSquadre from './schermate/ElencoSquadre.tsx'
import Rosa from './schermate/Rosa.tsx'
import SchedaGiocatore from './schermate/SchedaGiocatore.tsx'

// Una squadra sfogliabile: un club oppure una nazionale
type Squadra = { tipo: 'club' | 'nazionale'; id: number }

// Le viste possibili dell'app. Ogni voce porta con sé i dati che le servono
// (es. per la rosa serve sapere QUALE squadra mostrare).
type Vista =
  | { tipo: 'menu' }
  | { tipo: 'squadre' }
  | { tipo: 'rosa'; squadra: Squadra }
  // squadra assente = scheda aperta dall'elenco leggende (che non hanno club)
  | { tipo: 'giocatore'; giocatoreId: number; squadra?: Squadra }

// Voci del menu non ancora attive, con la milestone in cui arriveranno
const VOCI_FUTURE = [
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
  const [vista, setVista] = useState<Vista>({ tipo: 'menu' })
  const [messaggio, setMessaggio] = useState<string | null>(null)

  // Il database si carica in modo asincrono (deve scaricare il motore
  // WebAssembly): finché non è pronto mostriamo un'attesa.
  const [db, setDb] = useState<Database | null>(null)
  const [erroreDb, setErroreDb] = useState<string | null>(null)
  useEffect(() => {
    apriDatabase()
      .then(setDb)
      .catch((errore: unknown) => setErroreDb(String(errore)))
  }, [])

  // ---- Schermata titolo / menu ----
  if (vista.tipo === 'menu') {
    return (
      <main className="schermata-titolo">
        <h1 className="logo">MISTER</h1>
        <p className="sottotitolo">Manageriale calcistico</p>

        <nav className="menu">
          {VOCI_FUTURE.map((voce) => (
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

          {/* L'unica voce già attiva: il database sfogliabile (M1) */}
          <button
            className="voce-menu attiva"
            disabled={!db && !erroreDb}
            onClick={() => setVista({ tipo: 'squadre' })}
          >
            <span className="voce-etichetta">Database</span>
            <span className="voce-descrizione">
              {db ? 'Sfoglia squadre e giocatori' : erroreDb ?? 'Caricamento database…'}
            </span>
          </button>
        </nav>

        {messaggio && <p className="avviso">{messaggio}</p>}

        <footer className="versione">M1 — Database · versione 0.0.3</footer>
      </main>
    )
  }

  // ---- Schermate del database (servono db pronto) ----
  if (!db) return <main className="schermata"><p>Caricamento database…</p></main>

  return (
    <main>
      {/* Barra di navigazione con il percorso a ritroso */}
      <header className="barra-navigazione">
        <button className="bottone-indietro" onClick={() => setVista({ tipo: 'menu' })}>
          ⌂ Menu
        </button>
        <button className="bottone-indietro" onClick={() => setVista({ tipo: 'squadre' })}>
          Squadre
        </button>
        {(vista.tipo === 'rosa' || (vista.tipo === 'giocatore' && vista.squadra)) && (
          <button
            className="bottone-indietro"
            onClick={() => setVista({ tipo: 'rosa', squadra: vista.squadra! })}
          >
            Rosa
          </button>
        )}
      </header>

      {vista.tipo === 'squadre' && (
        <ElencoSquadre
          db={db}
          onApriRosa={(squadra) => setVista({ tipo: 'rosa', squadra })}
          onApriGiocatore={(giocatoreId) => setVista({ tipo: 'giocatore', giocatoreId })}
        />
      )}
      {vista.tipo === 'rosa' && (
        <Rosa
          db={db}
          squadra={vista.squadra}
          onApriGiocatore={(giocatoreId) =>
            setVista({ tipo: 'giocatore', giocatoreId, squadra: vista.squadra })
          }
        />
      )}
      {vista.tipo === 'giocatore' && <SchedaGiocatore db={db} giocatoreId={vista.giocatoreId} />}
    </main>
  )
}

export default App
