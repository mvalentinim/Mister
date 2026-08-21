// ritratto.tsx — il RITRATTO CARTOON dei giocatori (stile "Day of the
// Tentacle", scelta dello sviluppatore: più definito della pixel art).
//
// Vettoriale puro: contorni neri spessi, colori piatti, tratti esagerati
// da avventura grafica anni '90. Ogni volto è generato dal seed del
// giocatore (id): forma della testa, carnagione, capigliatura, naso,
// bocca, sopracciglia, barba — stesso giocatore, stessa faccia, per
// sempre. La maglia usa colori e motivo del club.

import { creaRng, semeDaStringa } from '../motore/rng.ts'
import type { ColoriClub } from './colori-club.ts'

const CARNAGIONI = ['#f6cfa2', '#eab381', '#d99c6b', '#b97a4e', '#8d5a35', '#6b422a']
const CAPELLI = ['#1a1a1a', '#3b2a1a', '#5a3c22', '#8a5a2c', '#c8963c', '#8d8577', '#464646']
const INK = '#1a1a1a'
const TRATTO = 3.2 // lo spessore del contorno: il marchio dello stile

interface Props {
  giocatoreId: number
  colori: ColoriClub
  /** larghezza in pixel CSS (il disegno è in viewBox 100×112) */
  lato?: number
}

/** Il ritratto cartoon, deterministico dall'id del giocatore. */
export function Ritratto({ giocatoreId, colori, lato = 120 }: Props) {
  const rng = creaRng(semeDaStringa(`ritratto-${giocatoreId}`))
  const pelle = CARNAGIONI[rng.intero(CARNAGIONI.length)]
  const capelli = CAPELLI[rng.intero(CAPELLI.length)]

  // ── i tratti del volto, esagerati quanto basta ──
  const testaLarga = 21 + rng.intero(6) // semiasse orizzontale
  const testaAlta = 26 + rng.intero(5) // semiasse verticale
  const mento = rng.intero(3) // 0 tondo, 1 squadrato, 2 a punta
  const stileCapelli = rng.intero(6)
  const stileNaso = rng.intero(3)
  const stileBocca = rng.intero(3)
  const sopraccigliaFolte = rng.evento(0.5)
  const barba = rng.evento(0.3)
  const baffi = !barba && rng.evento(0.18)
  const occhiGrandi = rng.evento(0.5)

  const cx = 50
  const cy = 46 // centro del volto
  const fondoTesta = cy + testaAlta

  // la testa: ellisse con il mento modellato da una toppa
  const testa = (
    <g>
      <ellipse cx={cx} cy={cy} rx={testaLarga} ry={testaAlta} fill={pelle} stroke={INK} strokeWidth={TRATTO} />
      {mento === 1 && (
        <path
          d={`M ${cx - 12} ${fondoTesta - 8} L ${cx - 10} ${fondoTesta + 2} L ${cx + 10} ${fondoTesta + 2} L ${cx + 12} ${fondoTesta - 8}`}
          fill={pelle} stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round"
        />
      )}
      {mento === 2 && (
        <path
          d={`M ${cx - 10} ${fondoTesta - 7} L ${cx} ${fondoTesta + 5} L ${cx + 10} ${fondoTesta - 7}`}
          fill={pelle} stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round"
        />
      )}
      {/* le orecchie a sventola, molto cartoon */}
      <ellipse cx={cx - testaLarga - 2} cy={cy + 4} rx="5" ry="7" fill={pelle} stroke={INK} strokeWidth={TRATTO} />
      <ellipse cx={cx + testaLarga + 2} cy={cy + 4} rx="5" ry="7" fill={pelle} stroke={INK} strokeWidth={TRATTO} />
    </g>
  )

  // ── le capigliature: forme piene e decise ──
  const sopra = cy - testaAlta // la sommità della testa
  const CAPIGLIATURE = [
    // 0: rasato — solo l'ombra della ricrescita
    <path key="c" d={`M ${cx - testaLarga + 3} ${cy - 8} A ${testaLarga} ${testaAlta} 0 0 1 ${cx + testaLarga - 3} ${cy - 8} L ${cx + testaLarga - 5} ${cy - 12} A ${testaLarga - 6} ${testaAlta - 8} 0 0 0 ${cx - testaLarga + 5} ${cy - 12} Z`} fill={capelli} opacity="0.35" />,
    // 1: ciuffo spettinato a punte
    <path key="c" d={`M ${cx - testaLarga - 1} ${cy - 6} Q ${cx - testaLarga} ${sopra - 6} ${cx - 12} ${sopra - 3} L ${cx - 8} ${sopra - 10} L ${cx - 2} ${sopra - 2} L ${cx + 5} ${sopra - 11} L ${cx + 9} ${sopra - 1} L ${cx + 16} ${sopra - 7} Q ${cx + testaLarga + 1} ${sopra} ${cx + testaLarga + 1} ${cy - 6} Q ${cx} ${cy - 16} ${cx - testaLarga - 1} ${cy - 6} Z`} fill={capelli} stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round" />,
    // 2: caschetto pieno
    <path key="c" d={`M ${cx - testaLarga - 2} ${cy + 2} Q ${cx - testaLarga - 3} ${sopra - 4} ${cx} ${sopra - 5} Q ${cx + testaLarga + 3} ${sopra - 4} ${cx + testaLarga + 2} ${cy + 2} L ${cx + testaLarga - 4} ${cy + 1} Q ${cx + testaLarga - 4} ${cy - 12} ${cx} ${cy - 13} Q ${cx - testaLarga + 4} ${cy - 12} ${cx - testaLarga + 4} ${cy + 1} Z`} fill={capelli} stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round" />,
    // 3: cresta/ciuffo alto alla Bernard
    <path key="c" d={`M ${cx - 8} ${cy - testaAlta + 6} Q ${cx - 6} ${sopra - 14} ${cx + 2} ${sopra - 15} Q ${cx + 12} ${sopra - 14} ${cx + 8} ${sopra - 4} Q ${cx + 14} ${cy - testaAlta + 4} ${cx + 6} ${cy - testaAlta + 8} Q ${cx - 2} ${cy - testaAlta + 10} ${cx - 8} ${cy - testaAlta + 6} Z`} fill={capelli} stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round" />,
    // 4: riccio a nuvola
    <g key="c" stroke={INK} strokeWidth={TRATTO} fill={capelli}>
      <circle cx={cx - 14} cy={sopra + 2} r="9" />
      <circle cx={cx} cy={sopra - 4} r="10" />
      <circle cx={cx + 14} cy={sopra + 2} r="9" />
      <circle cx={cx - 7} cy={sopra - 1} r="9" stroke="none" />
      <circle cx={cx + 7} cy={sopra - 1} r="9" stroke="none" />
    </g>,
    // 5: lungo ai lati
    <path key="c" d={`M ${cx - testaLarga - 4} ${cy + 14} Q ${cx - testaLarga - 6} ${sopra - 2} ${cx} ${sopra - 4} Q ${cx + testaLarga + 6} ${sopra - 2} ${cx + testaLarga + 4} ${cy + 14} L ${cx + testaLarga - 3} ${cy + 12} Q ${cx + testaLarga - 2} ${cy - 10} ${cx} ${cy - 12} Q ${cx - testaLarga + 2} ${cy - 10} ${cx - testaLarga + 3} ${cy + 12} Z`} fill={capelli} stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round" />,
  ]

  // ── gli occhi: bianchi grandi con pupilla, alla DOTT ──
  const ry = occhiGrandi ? 6.5 : 5
  const occhi = (
    <g>
      <ellipse cx={cx - 9} cy={cy - 2} rx="5.5" ry={ry} fill="#ffffff" stroke={INK} strokeWidth={TRATTO - 0.8} />
      <ellipse cx={cx + 9} cy={cy - 2} rx="5.5" ry={ry} fill="#ffffff" stroke={INK} strokeWidth={TRATTO - 0.8} />
      <circle cx={cx - 8} cy={cy - 1} r="2.1" fill={INK} />
      <circle cx={cx + 10} cy={cy - 1} r="2.1" fill={INK} />
    </g>
  )

  const sopracciglia = (
    <g stroke={INK} strokeWidth={sopraccigliaFolte ? 4.2 : 2.6} strokeLinecap="round">
      <line x1={cx - 14} y1={cy - 11} x2={cx - 4} y2={cy - (sopraccigliaFolte ? 12 : 10)} />
      <line x1={cx + 4} y1={cy - (sopraccigliaFolte ? 12 : 10)} x2={cx + 14} y2={cy - 11} />
    </g>
  )

  // ── il naso: grande e orgoglioso ──
  const NASI = [
    <path key="n" d={`M ${cx} ${cy - 1} Q ${cx + 7} ${cy + 7} ${cx + 1} ${cy + 10} Q ${cx - 3} ${cy + 11} ${cx - 2} ${cy + 8}`} fill="none" stroke={INK} strokeWidth={TRATTO} strokeLinecap="round" />,
    <path key="n" d={`M ${cx - 1} ${cy} L ${cx + 6} ${cy + 9} Q ${cx + 2} ${cy + 12} ${cx - 2} ${cy + 9}`} fill={pelle} stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round" strokeLinecap="round" />,
    <ellipse key="n" cx={cx + 1} cy={cy + 8} rx="4.5" ry="3.5" fill={pelle} stroke={INK} strokeWidth={TRATTO} />,
  ]

  // ── la bocca ──
  const BOCCHE = [
    <path key="b" d={`M ${cx - 8} ${cy + 16} Q ${cx} ${cy + 22} ${cx + 8} ${cy + 16}`} fill="none" stroke={INK} strokeWidth={TRATTO} strokeLinecap="round" />, // sorriso
    <line key="b" x1={cx - 7} y1={cy + 18} x2={cx + 7} y2={cy + 18} stroke={INK} strokeWidth={TRATTO} strokeLinecap="round" />, // serio
    <path key="b" d={`M ${cx - 7} ${cy + 16} Q ${cx} ${cy + 21} ${cx + 7} ${cy + 16} Q ${cx} ${cy + 26} ${cx - 7} ${cy + 16} Z`} fill="#ffffff" stroke={INK} strokeWidth={TRATTO - 0.8} />, // sorrisone coi denti
  ]

  const peloFacciale = barba ? (
    <path
      d={`M ${cx - testaLarga + 4} ${cy + 6} Q ${cx - testaLarga + 6} ${fondoTesta + 6} ${cx} ${fondoTesta + 7} Q ${cx + testaLarga - 6} ${fondoTesta + 6} ${cx + testaLarga - 4} ${cy + 6} Q ${cx + testaLarga - 10} ${cy + 14} ${cx} ${cy + 13} Q ${cx - testaLarga + 10} ${cy + 14} ${cx - testaLarga + 4} ${cy + 6} Z`}
      fill={capelli} stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round"
    />
  ) : baffi ? (
    <path d={`M ${cx - 9} ${cy + 14} Q ${cx} ${cy + 18} ${cx + 9} ${cy + 14} Q ${cx} ${cy + 13} ${cx - 9} ${cy + 14} Z`} fill={capelli} stroke={INK} strokeWidth={2} />
  ) : null

  // ── il busto con la maglia del club ──
  const motivo = colori.motivo
  const busto = (
    <g>
      {/* il collo */}
      <rect x={cx - 7} y={fondoTesta - 4} width="14" height="14" fill={pelle} stroke={INK} strokeWidth={TRATTO} />
      {/* le spalle */}
      <path
        d={`M ${cx - 34} 112 L ${cx - 32} 96 Q ${cx - 28} 86 ${cx - 14} 84 L ${cx + 14} 84 Q ${cx + 28} 86 ${cx + 32} 96 L ${cx + 34} 112 Z`}
        fill={colori.primario} stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round"
      />
      {/* il motivo della maglia */}
      {motivo === 'palato' && (
        <g fill={colori.secondario}>
          <rect x={cx - 24} y={86} width="9" height="26" transform={`rotate(-4 ${cx - 20} 98)`} />
          <rect x={cx - 4} y={84} width="9" height="28" />
          <rect x={cx + 16} y={86} width="9" height="26" transform={`rotate(4 ${cx + 20} 98)`} />
        </g>
      )}
      {motivo === 'fascia' && <rect x={cx - 33} y={94} width="66" height="10" fill={colori.secondario} />}
      {motivo === 'meta' && (
        <path d={`M ${cx} 84 L ${cx + 14} 84 Q ${cx + 28} 86 ${cx + 32} 96 L ${cx + 34} 112 L ${cx} 112 Z`} fill={colori.secondario} />
      )}
      {/* il bordo del busto ridisegnato sopra il motivo */}
      <path
        d={`M ${cx - 34} 112 L ${cx - 32} 96 Q ${cx - 28} 86 ${cx - 14} 84 L ${cx + 14} 84 Q ${cx + 28} 86 ${cx + 32} 96 L ${cx + 34} 112`}
        fill="none" stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round"
      />
      {/* il colletto a V */}
      <path d={`M ${cx - 9} 84 L ${cx} 92 L ${cx + 9} 84`} fill="none" stroke={INK} strokeWidth={TRATTO} strokeLinejoin="round" />
    </g>
  )

  return (
    <svg viewBox="0 0 100 112" width={lato} height={Math.round((lato / 100) * 112)} aria-hidden>
      {busto}
      {testa}
      {peloFacciale}
      {occhi}
      {sopracciglia}
      {NASI[stileNaso]}
      {barba ? BOCCHE[1] : BOCCHE[stileBocca]}
      {CAPIGLIATURE[stileCapelli]}
    </svg>
  )
}
