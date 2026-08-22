// Rosa.tsx — la rosa di un club: tabella ordinabile dei giocatori,
// oppure — a scelta — la GRIGLIA DELLE FIGURINE (DESIGN-MISTER.md §6),
// come la pagina di un album. Cliccando l'intestazione di una colonna si
// ordina per quella colonna; cliccando un giocatore si apre la sua scheda.

import { useState } from 'react'
import type { Database } from 'sql.js'
import { applicaDelta } from '../carriera/crescita.ts'
import { interroga, interrogaUna } from '../db/database.ts'
import { nazionalitaInItaliano } from '../db/nazionalita.ts'
import { calcolaEta, mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import { fascia } from '../design/fasce.ts'
import { VoltoPixel } from '../design/VoltoPixel.tsx'

interface Props {
  db: Database
  squadra: { tipo: 'club' | 'nazionale'; id: number }
  /** rosa di carriera (M6): se presente, sostituisce quella del DB statico */
  giocatoriIds?: number[]
  /** crescita/declino di carriera (M8): applicata agli attributi in lettura */
  crescita?: Record<number, number>
  onApriGiocatore: (giocatoreId: number) => void
}

// Le colonne ordinabili della tabella. "valore" estrae dal giocatore il
// dato da mostrare e su cui ordinare.
const COLONNE = [
  { chiave: 'cognome', etichetta: 'Giocatore', valore: (g: GiocatoreRiga) => g.cognome },
  { chiave: 'ruolo', etichetta: 'Ruolo', valore: (g: GiocatoreRiga) => g.ruolo },
  { chiave: 'eta', etichetta: 'Età', valore: (g: GiocatoreRiga) => calcolaEta(g.data_nascita) },
  { chiave: 'nazionalita', etichetta: 'Naz.', valore: (g: GiocatoreRiga) => g.nazionalita },
  { chiave: 'media', etichetta: 'Media', valore: (g: GiocatoreRiga) => mediaComplessiva(g) },
  { chiave: 'potenziale', etichetta: 'Pot.', valore: (g: GiocatoreRiga) => g.potenziale },
] as const

type ChiaveColonna = (typeof COLONNE)[number]['chiave']

// Ordine "naturale" dei ruoli nelle rose: portieri, difesa, centrocampo, attacco
const ORDINE_RUOLI = ['POR', 'DC', 'TD', 'TS', 'MED', 'CC', 'TRQ', 'ED', 'ES', 'PC']

function Rosa({ db, squadra, giocatoriIds, crescita, onApriGiocatore }: Props) {
  const [colonnaOrdine, setColonnaOrdine] = useState<ChiaveColonna>('ruolo')
  const [discendente, setDiscendente] = useState(false)
  // vista "elenco" (tabella da almanacco) o "album" (griglia di figurine)
  const [aAlbum, setAAlbum] = useState(false)

  // Club e nazionali usano tabelle diverse: la rosa di un club è "giocatori
  // con quel club_id", quella di una nazionale passa dalle convocazioni
  const nomeClub =
    squadra.tipo === 'club'
      ? interrogaUna<{ nome: string }>(db, 'SELECT nome FROM club WHERE id = ?', [squadra.id])?.nome
      : interrogaUna<{ nome: string }>(db, 'SELECT nome FROM nazionale WHERE id = ?', [squadra.id])?.nome
  const giocatori = applicaDelta(crescita,
    giocatoriIds
      ? giocatoriIds.length > 0
        ? interroga<GiocatoreRiga>(
            db,
            `SELECT * FROM giocatore WHERE id IN (${giocatoriIds.map(() => '?').join(',')})`,
            giocatoriIds,
          )
        : []
      : squadra.tipo === 'club'
      ? interroga<GiocatoreRiga>(db, 'SELECT * FROM giocatore WHERE club_id = ?', [squadra.id])
      : interroga<GiocatoreRiga>(
          db,
          `SELECT g.* FROM giocatore g
           JOIN convocazione cv ON cv.giocatore_id = g.id
           WHERE cv.nazionale_id = ?`,
          [squadra.id],
        ))

  // Ordina la copia dell'elenco secondo la colonna scelta
  const colonna = COLONNE.find((c) => c.chiave === colonnaOrdine)!
  const ordinati = [...giocatori].sort((a, b) => {
    let confronto: number
    if (colonnaOrdine === 'ruolo') {
      confronto = ORDINE_RUOLI.indexOf(a.ruolo) - ORDINE_RUOLI.indexOf(b.ruolo)
    } else {
      const va = colonna.valore(a)
      const vb = colonna.valore(b)
      confronto = typeof va === 'string' ? va.localeCompare(String(vb)) : Number(va) - Number(vb)
    }
    return discendente ? -confronto : confronto
  })

  // Click su un'intestazione: stessa colonna = inverte il verso, altra = riparte
  function ordinaPer(chiave: ChiaveColonna) {
    if (chiave === colonnaOrdine) {
      setDiscendente(!discendente)
    } else {
      setColonnaOrdine(chiave)
      // per i valori numerici è più utile partire dal più alto
      setDiscendente(chiave === 'media' || chiave === 'potenziale')
    }
  }

  return (
    <section className="schermata">
      <h2>Rosa — {nomeClub}</h2>

      {/* l'interruttore elenco / album di figurine */}
      <nav className="linguette">
        <button className={aAlbum ? 'linguetta' : 'linguetta attiva'} onClick={() => setAAlbum(false)}>
          Elenco
        </button>
        <button className={aAlbum ? 'linguetta attiva' : 'linguetta'} onClick={() => setAAlbum(true)}>
          Album figurine
        </button>
      </nav>

      {aAlbum ? (
        <div className="griglia-figurine">
          {ordinati.map((g) => (
            <button key={g.id} className="figurina-mini" onClick={() => onApriGiocatore(g.id)}>
              <span className="mini-volto"><VoltoPixel giocatore={g} lato={96} /></span>
              <span className="mini-nome" title={`${g.nome} ${g.cognome}`}>{g.cognome}</span>
              <span className="mini-riga">
                <span className="mini-ruolo">{g.ruolo}</span>
                <span className={`mini-media fascia-${fascia(mediaComplessiva(g))}`}>
                  {mediaComplessiva(g)}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
      <table className="tabella">
        <thead>
          <tr>
            {COLONNE.map((c) => (
              <th key={c.chiave} className="ordinabile" onClick={() => ordinaPer(c.chiave)}>
                {c.etichetta}
                {c.chiave === colonnaOrdine && (discendente ? ' ▼' : ' ▲')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordinati.map((g) => (
            <tr key={g.id} className="riga-cliccabile" onClick={() => onApriGiocatore(g.id)}>
              <td className="grassetto">{g.nome} {g.cognome}</td>
              <td>{g.ruolo}</td>
              <td className="num">{calcolaEta(g.data_nascita)}</td>
              <td>{nazionalitaInItaliano(g.nazionalita)}</td>
              <td className={`num grassetto fascia-${fascia(mediaComplessiva(g))}`}>{mediaComplessiva(g)}</td>
              <td className="num">{g.potenziale}</td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </section>
  )
}

export default Rosa
