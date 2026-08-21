// pixelart.tsx — il RITRATTO PROCEDURALE in pixel art (DESIGN-MISTER.md §4.2).
//
// Ogni giocatore ha un volto generato dal suo id (il "seed"): carnagione,
// capelli, barba, maglia nei colori del club. Stesso giocatore, stessa
// faccia, per sempre — senza licenze, perfettamente in stile 16-bit.
// Il disegno è una griglia 12×14 di "pixel" resi come rettangoli SVG
// (shape-rendering crispEdges: niente antialias, spigoli vivi).

import { creaRng, semeDaStringa } from '../motore/rng.ts'
import type { ColoriClub } from './colori-club.ts'

const CARNAGIONI = ['#f2c79b', '#e8b183', '#d99c6b', '#b97a4e', '#8d5a35', '#6b422a']
const CAPELLI = ['#1a1a1a', '#2e2118', '#4a3220', '#7a5230', '#b8862e', '#8d8577', '#3d3d3d']

// Ogni stile di capigliatura è l'elenco delle celle [colonna, riga] piene.
// La testa occupa le colonne 3-8, righe 1-6; la fronte è alla riga 2.
type Cella = [number, number]
const CIUFFI: Record<string, Cella[]> = {
  rasato: [[4, 1], [5, 1], [6, 1], [7, 1]],
  corto: [[3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [3, 2], [8, 2]],
  folto: [[3, 1], [4, 0], [5, 0], [6, 0], [7, 0], [8, 1], [3, 2], [8, 2], [4, 1], [5, 1], [6, 1], [7, 1]],
  riccio: [[3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [2, 1], [9, 1], [3, 2], [8, 2]],
  lungo: [[3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [3, 2], [8, 2], [3, 3], [8, 3], [3, 4], [8, 4], [3, 5], [8, 5]],
  stempiato: [[5, 1], [6, 1], [3, 2], [8, 2]],
}
const STILI = Object.keys(CIUFFI)

interface Props {
  /** il seed del volto: l'id del giocatore */
  giocatoreId: number
  colori: ColoriClub
  /** lato in pixel CSS (il disegno resta 12×14 celle) */
  lato?: number
}

/** Il ritratto pixel art di un giocatore, deterministico dall'id. */
export function RitrattoPixel({ giocatoreId, colori, lato = 96 }: Props) {
  const rng = creaRng(semeDaStringa(`volto-${giocatoreId}`))
  const pelle = CARNAGIONI[rng.intero(CARNAGIONI.length)]
  const capelli = CAPELLI[rng.intero(CAPELLI.length)]
  const stile = STILI[rng.intero(STILI.length)]
  const barba = rng.evento(0.35)
  const baffi = !barba && rng.evento(0.15)

  // la griglia si costruisce cella per cella: prima la testa…
  const celle: Array<{ x: number; y: number; c: string }> = []
  for (let x = 3; x <= 8; x++) {
    for (let y = 2; y <= 6; y++) celle.push({ x, y, c: pelle })
  }
  // il mento: riga 7, più stretto della testa
  for (const x of [4, 5, 6, 7]) celle.push({ x, y: 7, c: pelle })

  // …poi capelli, occhi, bocca, barba…
  for (const [x, y] of CIUFFI[stile]) celle.push({ x, y, c: capelli })
  celle.push({ x: 4, y: 4, c: '#1a1a1a' }, { x: 7, y: 4, c: '#1a1a1a' }) // occhi
  celle.push({ x: 5, y: 6, c: baffi ? capelli : '#00000022' }, { x: 6, y: 6, c: baffi ? capelli : '#00000022' }) // bocca/baffi
  if (barba) {
    for (const [x, y] of [[3, 5], [8, 5], [3, 6], [8, 6], [4, 7], [5, 7], [6, 7], [7, 7]] as Cella[]) {
      celle.push({ x, y, c: capelli })
    }
  }

  // …infine spalle e maglia nei colori del club, col suo motivo
  for (let x = 1; x <= 10; x++) {
    for (let y = 9; y <= 13; y++) {
      if (y === 9 && (x < 3 || x > 8)) continue // spallata
      let colore = colori.primario
      if (colori.motivo === 'palato' && x % 2 === 0) colore = colori.secondario
      if (colori.motivo === 'fascia' && (y === 10 || y === 11)) colore = colori.secondario
      if (colori.motivo === 'meta' && x >= 6) colore = colori.secondario
      celle.push({ x, y, c: colore })
    }
  }
  // il colletto
  celle.push({ x: 5, y: 9, c: '#f4efe3' }, { x: 6, y: 9, c: '#f4efe3' })
  // il collo sopra il colletto
  celle.push({ x: 5, y: 8, c: pelle }, { x: 6, y: 8, c: pelle })

  return (
    <svg
      viewBox="0 0 12 14"
      width={lato}
      height={Math.round((lato / 12) * 14)}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {celle.map((cella, i) => (
        <rect key={i} x={cella.x} y={cella.y} width="1" height="1" fill={cella.c} />
      ))}
    </svg>
  )
}
