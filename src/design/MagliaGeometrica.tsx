// MagliaGeometrica.tsx — la MAGLIA stilizzata sotto il volto (richiesta
// esplicita dello sviluppatore: "è geometria, non ritratto"): torso e
// colletto a forme geometriche semplici nei colori sociali del club —
// 4-5 rettangoli che completano l'effetto figurina.

import type { ColoriClub } from './colori-club.ts'

const INK = '#1a1a1a'

interface Props {
  colori: ColoriClub
  /** larghezza in pixel CSS (il disegno è in viewBox 96×34) */
  larghezza?: number
}

/** Il torso geometrico con colletto, tinto e rigato come la maglia del club. */
export function MagliaGeometrica({ colori, larghezza = 96 }: Props) {
  const { primario, secondario, motivo } = colori
  return (
    <svg viewBox="0 0 96 34" width={larghezza} height={Math.round((larghezza / 96) * 34)} aria-hidden>
      {/* le spalle: due rettangoli inclinati */}
      <rect x="4" y="10" width="26" height="24" fill={primario} stroke={INK} strokeWidth="2" transform="rotate(-8 17 22)" />
      <rect x="66" y="10" width="26" height="24" fill={primario} stroke={INK} strokeWidth="2" transform="rotate(8 79 22)" />
      {/* il torso */}
      <rect x="22" y="6" width="52" height="28" fill={primario} stroke={INK} strokeWidth="2" />
      {/* il motivo della maglia, squadrato come una stampa */}
      {motivo === 'palato' && (
        <g fill={secondario}>
          <rect x="28" y="7" width="9" height="26" />
          <rect x="44" y="7" width="9" height="26" />
          <rect x="60" y="7" width="9" height="26" />
        </g>
      )}
      {motivo === 'fascia' && <rect x="23" y="15" width="50" height="10" fill={secondario} />}
      {motivo === 'meta' && <rect x="48" y="7" width="25" height="26" fill={secondario} />}
      {/* il bordo del torso ripassato sopra il motivo */}
      <rect x="22" y="6" width="52" height="28" fill="none" stroke={INK} strokeWidth="2" />
      {/* il colletto a V: due rettangolini obliqui nel secondario */}
      <rect x="38" y="2" width="12" height="5" fill={secondario} stroke={INK} strokeWidth="1.6" transform="rotate(24 44 4)" />
      <rect x="46" y="2" width="12" height="5" fill={secondario} stroke={INK} strokeWidth="1.6" transform="rotate(-24 52 4)" />
    </svg>
  )
}
