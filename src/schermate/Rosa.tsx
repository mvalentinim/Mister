// Rosa.tsx — la rosa di un club: tabella ordinabile dei giocatori.
// Cliccando l'intestazione di una colonna si ordina per quella colonna;
// cliccando un giocatore si apre la sua scheda.

import { useState } from 'react'
import type { Database } from 'sql.js'
import { interroga, interrogaUna } from '../db/database.ts'
import { calcolaEta, mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'

interface Props {
  db: Database
  clubId: number
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

function Rosa({ db, clubId, onApriGiocatore }: Props) {
  const [colonnaOrdine, setColonnaOrdine] = useState<ChiaveColonna>('ruolo')
  const [discendente, setDiscendente] = useState(false)

  const nomeClub = interrogaUna<{ nome: string }>(db, 'SELECT nome FROM club WHERE id = ?', [clubId])?.nome
  const giocatori = interroga<GiocatoreRiga>(db, 'SELECT * FROM giocatore WHERE club_id = ?', [clubId])

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
              <td>{g.nazionalita}</td>
              <td className="num evidenza">{mediaComplessiva(g)}</td>
              <td className="num">{g.potenziale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default Rosa
