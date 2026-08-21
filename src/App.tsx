// App.tsx — il componente principale: carica il database e gestisce la
// navigazione tra le schermate.
//
// La navigazione è volutamente semplice: una variabile di stato "vista"
// dice quale schermata mostrare (e con quali dati, es. quale club).
// Quando servirà qualcosa di più ricco valuteremo un router vero.

import { useEffect, useState } from 'react'
import type { Database } from 'sql.js'
import { apriDatabase } from './db/database.ts'
import { caricaCarriere, eliminaCarriera, salvaCarriera } from './carriera/salvataggio.ts'
import { etichettaStagione, type Carriera } from './carriera/tipi.ts'
import Amichevole from './schermate/Amichevole.tsx'
import Editor from './schermate/Editor.tsx'
import ElencoSquadre from './schermate/ElencoSquadre.tsx'
import NuovaCarriera from './schermate/NuovaCarriera.tsx'
import Rosa from './schermate/Rosa.tsx'
import SchedaGiocatore from './schermate/SchedaGiocatore.tsx'
import SchermataCarriera from './schermate/SchermataCarriera.tsx'

// Una squadra sfogliabile: un club oppure una nazionale
type Squadra = { tipo: 'club' | 'nazionale'; id: number }

// Le viste possibili dell'app. Ogni voce porta con sé i dati che le servono.
type Vista =
  | { tipo: 'menu' }
  | { tipo: 'squadre' }
  | { tipo: 'rosa'; squadra: Squadra }
  // squadra assente = scheda aperta dall'elenco leggende (che non hanno club)
  | { tipo: 'giocatore'; giocatoreId: number; squadra?: Squadra }
  | { tipo: 'nuova-carriera' }
  | { tipo: 'carica-carriera' }
  | { tipo: 'carriera'; carriera: Carriera }
  | { tipo: 'editor' }
  | { tipo: 'amichevole' }

function App() {
  const [vista, setVista] = useState<Vista>({ tipo: 'menu' })
  const [carriereSalvate, setCarriereSalvate] = useState<Carriera[] | null>(null)

  // Il database si carica in modo asincrono (deve scaricare il motore
  // WebAssembly): finché non è pronto mostriamo un'attesa.
  const [db, setDb] = useState<Database | null>(null)
  const [erroreDb, setErroreDb] = useState<string | null>(null)
  useEffect(() => {
    apriDatabase()
      .then(setDb)
      .catch((errore: unknown) => setErroreDb(String(errore)))
  }, [])

  // Avvia una nuova carriera: salva subito e apre la schermata stagione
  async function avviaCarriera(carriera: Carriera) {
    await salvaCarriera(carriera)
    setVista({ tipo: 'carriera', carriera })
  }

  // Apre la lista dei salvataggi
  async function apriCaricaCarriera() {
    setCarriereSalvate(await caricaCarriere())
    setVista({ tipo: 'carica-carriera' })
  }

  // ── Schermata titolo / menu ──
  if (vista.tipo === 'menu') {
    return (
      <main className="schermata-titolo">
        <h1 className="logo">MISTER</h1>
        <p className="sottotitolo">Manageriale calcistico</p>

        <nav className="menu">
          <button className="voce-menu attiva" disabled={!db} onClick={() => setVista({ tipo: 'nuova-carriera' })}>
            <span className="voce-etichetta">Nuova carriera</span>
            <span className="voce-descrizione">Scegli una nazione e inizia la scalata dalla seconda divisione</span>
          </button>
          <button className="voce-menu attiva" disabled={!db} onClick={apriCaricaCarriera}>
            <span className="voce-etichetta">Carica carriera</span>
            <span className="voce-descrizione">Riprendi una carriera salvata</span>
          </button>
          <button className="voce-menu attiva" disabled={!db && !erroreDb} onClick={() => setVista({ tipo: 'squadre' })}>
            <span className="voce-etichetta">Database</span>
            <span className="voce-descrizione">
              {db ? 'Sfoglia squadre, nazionali e leggende' : erroreDb ?? 'Caricamento database…'}
            </span>
          </button>
          <button className="voce-menu attiva" disabled={!db} onClick={() => setVista({ tipo: 'amichevole' })}>
            <span className="voce-etichetta">Amichevole</span>
            <span className="voce-descrizione">Sfide libere: le squadre Legend contro chiunque</span>
          </button>
          <button className="voce-menu attiva" disabled={!db} onClick={() => setVista({ tipo: 'editor' })}>
            <span className="voce-etichetta">Editor</span>
            <span className="voce-descrizione">Modifica giocatori e club, crea le tue leggende (M9)</span>
          </button>
        </nav>

        <footer className="versione">M2 — Carriera · versione 0.2.0</footer>
      </main>
    )
  }

  if (!db) return <main className="schermata"><p>Caricamento database…</p></main>

  return (
    <main>
      {/* Barra di navigazione con il percorso a ritroso */}
      <header className="barra-navigazione">
        <button className="bottone-indietro" onClick={() => setVista({ tipo: 'menu' })}>
          ⌂ Menu
        </button>
        {(vista.tipo === 'rosa' || vista.tipo === 'giocatore') && (
          <button className="bottone-indietro" onClick={() => setVista({ tipo: 'squadre' })}>
            Squadre
          </button>
        )}
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

      {vista.tipo === 'editor' && <Editor db={db} />}

      {vista.tipo === 'amichevole' && <Amichevole db={db} />}

      {vista.tipo === 'nuova-carriera' && (
        <NuovaCarriera db={db} onCarrieraCreata={avviaCarriera} />
      )}

      {vista.tipo === 'carica-carriera' && (
        <section className="schermata">
          <h2>Carica carriera</h2>
          {carriereSalvate?.length === 0 && (
            <p className="nota">Nessuna carriera salvata: inizia una nuova carriera dal menu.</p>
          )}
          <div className="menu">
            {carriereSalvate?.map((c) => (
              <div key={c.id} className="voce-salvataggio">
                <button className="voce-menu" onClick={() => setVista({ tipo: 'carriera', carriera: c })}>
                  <span className="voce-etichetta">
                    {c.allenatore.nome} — {c.club.find((x) => x.id === c.clubId)?.nome}
                  </span>
                  <span className="voce-descrizione">
                    {c.nazione.nome} · stagione {etichettaStagione(c.anno)} · giornata{' '}
                    {Math.min(c.giornata + 1, c.calendario.length)}/{c.calendario.length} · salvata il{' '}
                    {new Date(c.aggiornataIl).toLocaleString('it-IT')}
                  </span>
                </button>
                <button
                  className="bottone-secondario"
                  onClick={async () => {
                    await eliminaCarriera(c.id)
                    setCarriereSalvate(await caricaCarriere())
                  }}
                >
                  Elimina
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {vista.tipo === 'carriera' && <SchermataCarriera db={db} carriera={vista.carriera} />}
    </main>
  )
}

export default App
