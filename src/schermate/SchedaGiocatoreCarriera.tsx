// SchedaGiocatoreCarriera.tsx — la scheda di un giocatore DENTRO la
// carriera (M11): figurina + curva di crescita, in una finestra sovrapposta.
//
// La regola dell'informazione (richiesta dello sviluppatore):
// - giocatore della MIA rosa → si vede tutto: potenziale, curva prevista
//   dal DB e curva reale;
// - giocatore degli altri (mercato) → solo la carriera reale fino a oggi:
//   potenziale e previsione restano nascosti finché non lo compro.
// (Nell'Editor del database, fuori dalla carriera, si vede sempre tutto.)

import type { Database } from 'sql.js'
import type { Carriera } from '../carriera/tipi.ts'
import { etaNellaStagione } from '../carriera/crescita.ts'
import { CurvaCrescita } from '../design/CurvaCrescita.tsx'
import { Figurina } from '../design/Figurina.tsx'
import { giocatoriPerId } from '../mercato/stato.ts'

interface Props {
  db: Database
  carriera: Carriera
  giocatoreId: number
  /** nome e id del club per la cornice della figurina */
  nomeClub: string | null
  clubId: number | null
  onChiudi: () => void
}

export function SchedaGiocatoreCarriera({ db, carriera, giocatoreId, nomeClub, clubId, onChiudi }: Props) {
  const g = giocatoriPerId(db, [giocatoreId], carriera)[0]
  if (!g) return null
  const mia = (carriera.rose?.[carriera.clubId] ?? []).includes(giocatoreId)

  return (
    <div className="velo-scheda" onClick={onChiudi}>
      <div className="scheda-sovrapposta" onClick={(e) => e.stopPropagation()}>
        <div className="scheda-sovrapposta-corpo">
          <Figurina
            giocatore={g}
            nomeClub={nomeClub}
            clubId={clubId}
            mostraPotenziale={mia}
            etaMostrata={etaNellaStagione(carriera, g)}
          />
          <div className="scheda-sovrapposta-curva">
            <h3>La parabola della carriera</h3>
            <CurvaCrescita giocatore={g} carriera={carriera} mia={mia} />
          </div>
        </div>
        <button className="bottone-almanacco secondario" onClick={onChiudi}>Chiudi</button>
      </div>
    </div>
  )
}
