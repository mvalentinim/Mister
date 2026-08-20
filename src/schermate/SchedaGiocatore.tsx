// SchedaGiocatore.tsx — la scheda completa di un singolo giocatore:
// anagrafica, attributi tecnici con barre, contratto.

import type { Database } from 'sql.js'
import { interrogaUna } from '../db/database.ts'
import { calcolaEta, mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'

interface Props {
  db: Database
  giocatoreId: number
}

// Attributi da mostrare, con etichetta leggibile, per ciascun set
const ATTRIBUTI_MOVIMENTO: Array<[keyof GiocatoreRiga, string]> = [
  ['velocita', 'Velocità'], ['resistenza', 'Resistenza'], ['tecnica', 'Tecnica'],
  ['passaggio', 'Passaggio'], ['tiro', 'Tiro'], ['dribbling', 'Dribbling'],
  ['colpo_testa', 'Colpo di testa'], ['marcatura', 'Marcatura'], ['contrasto', 'Contrasto'],
  ['posizionamento', 'Posizionamento'], ['visione', 'Visione'], ['calci_piazzati', 'Calci piazzati'],
]

const ATTRIBUTI_PORTIERE: Array<[keyof GiocatoreRiga, string]> = [
  ['riflessi', 'Riflessi'], ['presa', 'Presa'], ['uscite', 'Uscite'],
  ['rinvio', 'Rinvio'], ['velocita', 'Velocità'], ['resistenza', 'Resistenza'],
]

/** Una barra colorata proporzionale al valore dell'attributo (1-99). */
function BarraAttributo({ etichetta, valore }: { etichetta: string; valore: number | null }) {
  if (valore === null) return null
  return (
    <div className="attributo">
      <span className="attributo-nome">{etichetta}</span>
      <div className="attributo-barra">
        {/* larghezza = valore in percentuale; colore dal rosso (scarso) al
            verde (ottimo) usando la tonalità HSL: 0 = rosso, ~120 = verde */}
        <div
          className="attributo-riempimento"
          style={{ width: `${valore}%`, backgroundColor: `hsl(${valore * 1.2}, 70%, 45%)` }}
        />
      </div>
      <span className="attributo-valore">{valore}</span>
    </div>
  )
}

function SchedaGiocatore({ db, giocatoreId }: Props) {
  const g = interrogaUna<GiocatoreRiga>(db, 'SELECT * FROM giocatore WHERE id = ?', [giocatoreId])
  if (!g) return <p>Giocatore non trovato.</p>

  // Il club può essere: uno dei nostri, uno fuori perimetro (club_esterno),
  // o nessuno (svincolato)
  const club = interrogaUna<{ nome: string }>(db, 'SELECT nome FROM club WHERE id = ?', [g.club_id])
  const nomeClub = club?.nome ?? g.club_esterno
  const nazionale = interrogaUna<{ nome: string }>(
    db,
    `SELECT n.nome FROM nazionale n JOIN convocazione cv ON cv.nazionale_id = n.id
     WHERE cv.giocatore_id = ? AND n.generata = 0`,
    [giocatoreId],
  )
  const contratto = interrogaUna<{ stipendio: number; scadenza: string }>(
    db, 'SELECT stipendio, scadenza FROM contratto WHERE giocatore_id = ?', [giocatoreId],
  )

  const attributi = g.ruolo === 'POR' ? ATTRIBUTI_PORTIERE : ATTRIBUTI_MOVIMENTO

  return (
    <section className="schermata">
      <h2>{g.nome} {g.cognome}</h2>
      <p className="riga-info">
        <span className="etichetta-ruolo">{g.ruolo}</span>
        {/* Badge per le leggende (tag categoria: icon/hero) */}
        {g.categoria !== 'normale' && (
          <>{' '}<span className="etichetta-leggenda">{g.categoria === 'icon' ? '★ ICON' : '⚡ HERO'}</span></>
        )}
        {' '}· {nomeClub ?? (g.categoria === 'normale' ? 'Svincolato' : 'Leggenda')} ·{' '}
        {calcolaEta(g.data_nascita)} anni · {g.nazionalita} ·
        piede {g.piede} · <strong>media {mediaComplessiva(g)}</strong> · potenziale {g.potenziale}
        {nazionale && <> · 🏆 nazionale: {nazionale.nome}</>}
      </p>

      <h3>Attributi</h3>
      <div className="griglia-attributi">
        {attributi.map(([chiave, etichetta]) => (
          <BarraAttributo key={chiave} etichetta={etichetta} valore={g[chiave] as number | null} />
        ))}
      </div>

      {contratto && (
        <>
          <h3>Contratto</h3>
          <p>
            {/* toLocaleString: formatta 250000 come "250.000" all'italiana */}
            Stipendio: € {contratto.stipendio.toLocaleString('it-IT')}/anno ·
            scadenza {new Date(contratto.scadenza).toLocaleDateString('it-IT')}
          </p>
        </>
      )}
    </section>
  )
}

export default SchedaGiocatore
