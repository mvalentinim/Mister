// CurvaCrescita.tsx — il GRAFICO della carriera di un giocatore (M11):
// età sull'asse X, valore generale sull'asse Y.
//
// Due curve:
// - la curva IPOTETICA (tratteggiata, inchiostro): il destino "sulla carta"
//   secondo il DB — potenziale e personalità. SOLO per i giocatori della
//   propria rosa: degli altri non si conosce il potenziale.
// - la curva REALE (verde, piena): la storia vera fino all'età di oggi,
//   fotografata stagione per stagione — può stare sopra o sotto il modello,
//   a seconda di quanto (e quanto bene) il giocatore ha giocato davvero.

import type { Carriera } from '../carriera/tipi.ts'
import {
  curvaModello, curvaReale, etaNellaStagione, ETA_FINE_CURVA, ETA_INIZIO_CURVA,
} from '../carriera/crescita.ts'
import { mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'

interface Props {
  /** la riga del giocatore, GIÀ con la crescita di carriera applicata */
  giocatore: GiocatoreRiga
  carriera: Carriera
  /** true = è nella mia rosa: si vede anche il modello e il potenziale */
  mia: boolean
}

// la geometria del disegno (viewBox fisso, il CSS lo scala)
const L = 460, A = 235
const SX = 34, DX = 12, SU = 14, GIU = 30 // margini: sinistra/destra/sopra/sotto
const VAL_MIN = 30, VAL_MAX = 100

const x = (eta: number) =>
  SX + ((eta - ETA_INIZIO_CURVA) / (ETA_FINE_CURVA - ETA_INIZIO_CURVA)) * (L - SX - DX)
const y = (valore: number) =>
  A - GIU - ((valore - VAL_MIN) / (VAL_MAX - VAL_MIN)) * (A - GIU - SU)

const linea = (punti: Array<[number, number]>) =>
  punti.map(([e, v], i) => `${i === 0 ? 'M' : 'L'}${x(e).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

export function CurvaCrescita({ giocatore: g, carriera, mia }: Props) {
  const eta = etaNellaStagione(carriera, g)
  const media = mediaComplessiva(g)

  // la curva reale: storico (se c'è) + oggi, col passato ricostruito
  const reale = curvaReale(g, eta, media, carriera.storiaMedie?.[g.id])

  // il modello parte dal PRIMO punto certo (com'era quando l'ho conosciuto):
  // se non c'è storia, dal valore del DB (la media di oggi senza la crescita)
  const storia = carriera.storiaMedie?.[g.id]
  const [ancoraEta, ancoraMedia] = storia && storia.length > 0
    ? storia[0]
    : [eta, media - (carriera.crescita?.[g.id] ?? 0)]
  const modello = mia ? curvaModello(g, ancoraEta, ancoraMedia) : null

  const anni = [16, 20, 24, 28, 32, 36, 40]
  const valori = [30, 40, 50, 60, 70, 80, 90]

  return (
    <figure className="curva-crescita">
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Curva di crescita">
        {/* griglia leggera */}
        {anni.map((e) => (
          <line key={e} x1={x(e)} y1={SU} x2={x(e)} y2={A - GIU} className="cc-griglia" />
        ))}
        {valori.map((v) => (
          <line key={v} x1={SX} y1={y(v)} x2={L - DX} y2={y(v)} className="cc-griglia" />
        ))}

        {/* il potenziale: filetto oro (solo per i miei) */}
        {mia && (
          <>
            <line x1={SX} y1={y(g.potenziale)} x2={L - DX} y2={y(g.potenziale)} className="cc-potenziale" />
            <text x={L - DX} y={y(g.potenziale) - 4} textAnchor="end" className="cc-etichetta-pot">
              POT {g.potenziale}
            </text>
          </>
        )}

        {/* la curva ipotetica dal DB (tratteggiata) */}
        {modello && <path d={linea(modello)} className="cc-modello" />}

        {/* la curva reale, fino a oggi */}
        <path d={linea(reale)} className="cc-reale" />
        {/* il quadratino su "oggi" */}
        <rect x={x(eta) - 3} y={y(media) - 3} width="6" height="6" className="cc-oggi" />
        <text x={x(eta)} y={y(media) - 7} textAnchor="middle" className="cc-etichetta-oggi">
          {media}
        </text>

        {/* assi e tacche */}
        <line x1={SX} y1={A - GIU} x2={L - DX} y2={A - GIU} className="cc-asse" />
        <line x1={SX} y1={SU} x2={SX} y2={A - GIU} className="cc-asse" />
        {anni.map((e) => (
          <text key={e} x={x(e)} y={A - GIU + 14} textAnchor="middle" className="cc-tacca">{e}</text>
        ))}
        {valori.map((v) => (
          <text key={v} x={SX - 5} y={y(v) + 3} textAnchor="end" className="cc-tacca">{v}</text>
        ))}
        <text x={L - DX} y={A - 4} textAnchor="end" className="cc-tacca">ETÀ</text>
      </svg>
      <figcaption className="cc-legenda etichetta-almanacco">
        <span><i className="cc-campione reale" /> carriera reale</span>
        {mia
          ? <span><i className="cc-campione modello" /> curva prevista dal DB</span>
          : <span className="nota">potenziale e previsione: riservati (non è dei tuoi)</span>}
      </figcaption>
    </figure>
  )
}
