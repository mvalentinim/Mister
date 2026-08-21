// SchedaGiocatore.tsx — la scheda giocatore, PRIMA SCHERMATA EROE dello
// stile "Almanacco" (DESIGN-MISTER.md §0.3 e §4.2): la Figurina al centro,
// e accanto la "pagina di almanacco" con contratto, nazionale e note.
// Questo è il campione di stile: approvato qui, si propaga altrove.

import type { Database } from 'sql.js'
import { interrogaUna } from '../db/database.ts'
import type { GiocatoreRiga } from '../db/tipi.ts'
import { Figurina } from '../design/Figurina.tsx'
import './scheda-giocatore.css'

interface Props {
  db: Database
  giocatoreId: number
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

  return (
    <section className="scheda-almanacco retino-righe">
      <div className="scheda-colonne">
        {/* la figurina: il cuore della pagina */}
        <Figurina giocatore={g} nomeClub={nomeClub ?? null} clubId={g.club_id} />

        {/* la pagina d'almanacco a fianco */}
        <div className="pagina-almanacco">
          <h2 className="titolo-almanacco">Scheda giocatore</h2>

          <div className="voce-almanacco">
            <span className="etichetta-almanacco">Squadra</span>
            <strong>{nomeClub ?? (g.categoria === 'normale' ? 'Svincolato' : 'Leggenda del calcio')}</strong>
          </div>

          {nazionale && (
            <div className="voce-almanacco">
              <span className="etichetta-almanacco">Nazionale</span>
              <strong>{nazionale.nome}</strong>
            </div>
          )}

          {contratto && (
            <div className="voce-almanacco">
              <span className="etichetta-almanacco">Contratto</span>
              <strong>
                € {contratto.stipendio.toLocaleString('it-IT')}/anno
                {' — '}scadenza {new Date(contratto.scadenza).toLocaleDateString('it-IT')}
              </strong>
            </div>
          )}

          <p className="nota-almanacco">
            Dall'album MISTER: numeri di maglia e ritratti sono quelli
            dell'almanacco — il campo dirà il resto.
          </p>
        </div>
      </div>
    </section>
  )
}

export default SchedaGiocatore
