// ritratto.tsx — il RITRATTO dei giocatori in stile "Curse of Monkey
// Island" (riferimento esplicito dello sviluppatore): il disegno a mano
// LucasArts — visi allungati e spigolosi, menti a punta, nasi lunghi
// disegnati con una curva sola, occhi a mandorla con la palpebra,
// sopracciglia espressive, ciocche di capelli a punta, ombreggiatura
// calda a due toni, contorni sottili color seppia (mai neri e uniformi).
//
// Ogni volto è generato dal seed del giocatore (id): stesso giocatore,
// stessa faccia, per sempre. La maglia usa colori e motivo del club.

import { creaRng, semeDaStringa } from '../motore/rng.ts'
import type { ColoriClub } from './colori-club.ts'

/* pelle: tono base + tono d'ombra (il "lato in penombra" del viso) */
const PELLI: Array<[string, string]> = [
  ['#f8d2a4', '#dfa87a'], ['#f0bc88', '#d49a62'], ['#e0a26d', '#bf8050'],
  ['#c28253', '#9c6238'], ['#98613b', '#7a4a2a'], ['#70462a', '#57341c'],
]

/* capelli: tono base + tono delle ciocche in ombra */
const CHIOME: Array<[string, string]> = [
  ['#241a12', '#0f0a06'], ['#43301d', '#2a1c0e'], ['#6b4a26', '#4a3015'],
  ['#a06c33', '#7a4e1f'], ['#d9a850', '#b07f30'], ['#8d8577', '#6a6355'],
  ['#b6452c', '#8c3018'],
]

const INK = '#3a2417' /* il contorno seppia, caldo come una china diluita */

interface Props {
  giocatoreId: number
  colori: ColoriClub
  /** larghezza in pixel CSS (il disegno è in viewBox 100×112) */
  lato?: number
}

/** Il ritratto in stile avventura grafica, deterministico dall'id. */
export function Ritratto({ giocatoreId, colori, lato = 120 }: Props) {
  const rng = creaRng(semeDaStringa(`volto-cmi-${giocatoreId}`))
  const [pelle, pelleOmbra] = PELLI[rng.intero(PELLI.length)]
  const [chioma, chiomaOmbra] = CHIOME[rng.intero(CHIOME.length)]

  // ── le proporzioni del viso: allungate, mai tonde ──
  const cx = 50
  const fronteY = 22 + rng.intero(4)       // attaccatura della fronte
  const mentoY = 78 + rng.intero(6)        // la punta del mento, in basso
  const mezzaFronte = 16 + rng.intero(4)   // mezza larghezza alle tempie
  const zigomo = mezzaFronte - 1 - rng.intero(2)
  const mentoLargo = 2 + rng.intero(4)     // 2 = mento a punta, 5 = squadrato
  const occhiY = 46 + rng.intero(3)
  const nasoLungo = 12 + rng.intero(7)     // il naso importante, alla Guybrush
  const stileNaso = rng.intero(3)          // 0 dritto a punta, 1 aquilino, 2 all'insù
  const stileBocca = rng.intero(3)         // 0 sorrisetto, 1 serio, 2 sorriso coi denti
  const sorrisoAsimmetrico = rng.evento(0.6) ? 1 : -1
  // il rasato (4) esce di rado: le chiome piene sono il pane dello stile
  const stileChioma = [0, 1, 2, 3, 5, 0, 1, 3, 5, 4][rng.intero(10)]
  const sopraccigliaArcuate = rng.evento(0.5)
  const barba = rng.evento(0.26)
  const baffi = !barba && rng.evento(0.16)
  const orecchino = rng.evento(0.12)       // il tocco da pirata

  const craniotY = fronteY - 10            // la sommità del cranio

  // il profilo del viso: fronte ampia, zigomi, guance scavate, mento a punta
  const profiloViso = `
    M ${cx} ${craniotY + 2}
    C ${cx - mezzaFronte * 0.9} ${craniotY + 2}, ${cx - mezzaFronte} ${fronteY + 4}, ${cx - mezzaFronte} ${occhiY - 6}
    C ${cx - mezzaFronte} ${occhiY + 6}, ${cx - zigomo} ${occhiY + 12}, ${cx - zigomo + 1} ${occhiY + 16}
    C ${cx - zigomo + 2} ${mentoY - 10}, ${cx - mentoLargo - 3} ${mentoY - 3}, ${cx - mentoLargo} ${mentoY}
    Q ${cx} ${mentoY + 3.5} ${cx + mentoLargo} ${mentoY}
    C ${cx + mentoLargo + 3} ${mentoY - 3}, ${cx + zigomo - 2} ${mentoY - 10}, ${cx + zigomo - 1} ${occhiY + 16}
    C ${cx + zigomo} ${occhiY + 12}, ${cx + mezzaFronte} ${occhiY + 6}, ${cx + mezzaFronte} ${occhiY - 6}
    C ${cx + mezzaFronte} ${fronteY + 4}, ${cx + mezzaFronte * 0.9} ${craniotY + 2}, ${cx} ${craniotY + 2}
    Z`

  // l'ombra calda sul lato destro del viso (due toni, alla LucasArts)
  const ombraViso = `
    M ${cx + mezzaFronte - 1} ${occhiY - 8}
    C ${cx + mezzaFronte - 1} ${occhiY + 6}, ${cx + zigomo - 1} ${occhiY + 13}, ${cx + zigomo - 2} ${occhiY + 17}
    C ${cx + zigomo - 3} ${mentoY - 9}, ${cx + mentoLargo + 2} ${mentoY - 2}, ${cx + mentoLargo - 1} ${mentoY + 1}
    Q ${cx + mentoLargo + 6} ${mentoY - 8}, ${cx + zigomo + 2} ${occhiY + 10}
    Q ${cx + mezzaFronte + 1} ${occhiY - 2}, ${cx + mezzaFronte - 1} ${occhiY - 8}
    Z`

  // ── il collo e le spalle con la maglia del club ──
  const busto = (
    <g>
      <path
        d={`M ${cx - 6} ${mentoY - 6} L ${cx - 6.5} ${mentoY + 12} L ${cx + 6.5} ${mentoY + 12} L ${cx + 6} ${mentoY - 6} Z`}
        fill={pelle} stroke={INK} strokeWidth="1.6"
      />
      {/* l'ombra del mento sul collo */}
      <path d={`M ${cx - 5.5} ${mentoY - 4} Q ${cx} ${mentoY + 4} ${cx + 5.5} ${mentoY - 4} L ${cx + 6} ${mentoY + 2} Q ${cx} ${mentoY + 8} ${cx - 6} ${mentoY + 2} Z`} fill={pelleOmbra} />
      <path
        d={`M ${cx - 33} 112 L ${cx - 31} 100 Q ${cx - 27} 91 ${cx - 12} 89 L ${cx + 12} 89 Q ${cx + 27} 91 ${cx + 31} 100 L ${cx + 33} 112 Z`}
        fill={colori.primario} stroke={INK} strokeWidth="1.8" strokeLinejoin="round"
      />
      {colori.motivo === 'palato' && (
        <g fill={colori.secondario}>
          <path d={`M ${cx - 22} 91 L ${cx - 15} 90 L ${cx - 13} 112 L ${cx - 21} 112 Z`} />
          <path d={`M ${cx - 4} 89 L ${cx + 4} 89 L ${cx + 4} 112 L ${cx - 4} 112 Z`} />
          <path d={`M ${cx + 15} 90 L ${cx + 22} 91 L ${cx + 21} 112 L ${cx + 13} 112 Z`} />
        </g>
      )}
      {colori.motivo === 'fascia' && <path d={`M ${cx - 31.5} 99 L ${cx + 31.5} 99 L ${cx + 32.5} 107 L ${cx - 32.5} 107 Z`} fill={colori.secondario} />}
      {colori.motivo === 'meta' && (
        <path d={`M ${cx} 89 L ${cx + 12} 89 Q ${cx + 27} 91 ${cx + 31} 100 L ${cx + 33} 112 L ${cx} 112 Z`} fill={colori.secondario} />
      )}
      {/* il bordo del busto ripassato e il colletto aperto, da bucaniere */}
      <path
        d={`M ${cx - 33} 112 L ${cx - 31} 100 Q ${cx - 27} 91 ${cx - 12} 89 L ${cx + 12} 89 Q ${cx + 27} 91 ${cx + 31} 100 L ${cx + 33} 112`}
        fill="none" stroke={INK} strokeWidth="1.8" strokeLinejoin="round"
      />
      <path d={`M ${cx - 10} 89 L ${cx} 98 L ${cx + 10} 89`} fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  )

  // ── GLI OCCHI: ovali ALTI ed espressivi alla Guybrush — bianchi grandi,
  //    pupilla importante, palpebra che decide l'espressione ──
  const distOcchi = 7.5 + rng.intero(3)         // distanza dal centro del viso
  const occhioLarg = 2.9 + rng.intero(3) * 0.5  // mezzo asse orizzontale
  const occhioAlt = occhioLarg + 1 + rng.intero(4) * 0.6 // SEMPRE più alti che larghi
  const pupillaR = 1.6 + rng.intero(3) * 0.35
  const palpebra = [0.1, 0.28, 0.45][rng.intero(3)] // quanto la palpebra scende
  const sguardo = (rng.intero(3) - 1) * 0.9      // pupille verso sx/centro/dx
  const uid = `v${giocatoreId}` // id univoci per i clip (più ritratti in pagina)

  const occhio = (ex: number, lato: 'l' | 'r') => {
    const ey = occhiY - 1
    const coperchioY = ey - occhioAlt + palpebra * occhioAlt * 2
    return (
      <g>
        <clipPath id={`${uid}-${lato}`}>
          <ellipse cx={ex} cy={ey} rx={occhioLarg} ry={occhioAlt} />
        </clipPath>
        <ellipse cx={ex} cy={ey} rx={occhioLarg} ry={occhioAlt} fill="#fdf8ee" stroke={INK} strokeWidth="1.2" />
        {/* la pupilla, grande, appesa alla palpebra */}
        <circle
          cx={ex + sguardo} cy={Math.max(ey - 0.4, coperchioY + pupillaR * 0.8)} r={pupillaR}
          fill={INK} clipPath={`url(#${uid}-${lato})`}
        />
        {/* la palpebra: pelle che scende sull'ovale, col suo tratto */}
        <path
          d={`M ${ex - occhioLarg - 1} ${ey - occhioAlt - 1} L ${ex + occhioLarg + 1} ${ey - occhioAlt - 1} L ${ex + occhioLarg + 1} ${coperchioY - 0.6} Q ${ex} ${coperchioY + 1.4} ${ex - occhioLarg - 1} ${coperchioY - 0.6} Z`}
          fill={pelle} clipPath={`url(#${uid}-${lato})`}
        />
        <path
          d={`M ${ex - occhioLarg} ${coperchioY - 0.4} Q ${ex} ${coperchioY + 1.6} ${ex + occhioLarg} ${coperchioY - 0.4}`}
          fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round"
        />
      </g>
    )
  }

  // ── le sopracciglia: sottili e arcuate in alto (preoccupato, alla
  //    Guybrush), piene e dritte (neutro) o calate all'interno (severo) ──
  const espressione = rng.intero(3) // 0 preoccupato, 1 neutro, 2 severo
  const spessoreCiglio = sopraccigliaArcuate ? 1.6 : 2.6
  const cigliaY = occhiY - occhioAlt - 4 - (espressione === 0 ? 2.5 : 0)
  const internoDy = espressione === 0 ? 2.2 : espressione === 2 ? -2 : 0.4
  const sopracciglia = (
    <g fill={chiomaOmbra}>
      {/* sinistro: dall'esterno all'interno (l'interno segue l'espressione) */}
      <path d={`M ${cx - distOcchi - occhioLarg - 1.5} ${cigliaY + 1.5}
        Q ${cx - distOcchi} ${cigliaY - 1.5} ${cx - 3} ${cigliaY + internoDy}
        L ${cx - 3.2} ${cigliaY + internoDy + spessoreCiglio}
        Q ${cx - distOcchi} ${cigliaY - 1.5 + spessoreCiglio} ${cx - distOcchi - occhioLarg - 1.2} ${cigliaY + 1.5 + spessoreCiglio * 0.7} Z`} />
      <path d={`M ${cx + distOcchi + occhioLarg + 1.5} ${cigliaY + 1.5}
        Q ${cx + distOcchi} ${cigliaY - 1.5} ${cx + 3} ${cigliaY + internoDy}
        L ${cx + 3.2} ${cigliaY + internoDy + spessoreCiglio}
        Q ${cx + distOcchi} ${cigliaY - 1.5 + spessoreCiglio} ${cx + distOcchi + occhioLarg + 1.2} ${cigliaY + 1.5 + spessoreCiglio * 0.7} Z`} />
    </g>
  )

  // ── IL NASO: una FORMA piena con la sua silhouette, non un filo ──
  const nasoTipY = occhiY + nasoLungo
  const nasoW = 3 + rng.intero(3) * 0.8 // la larghezza della punta
  const nasoForma = (() => {
    switch (stileNaso) {
      case 0: /* il cuneo lungo alla Guybrush: dritto, punta tonda in basso */
        return `M ${cx - 1.5} ${occhiY + 0.5}
          C ${cx - 2} ${occhiY + nasoLungo * 0.45}, ${cx - nasoW - 0.5} ${nasoTipY - 3.5}, ${cx - nasoW} ${nasoTipY - 0.8}
          Q ${cx - nasoW + 0.5} ${nasoTipY + 2}, ${cx - 0.8} ${nasoTipY + 1.7}
          Q ${cx + 1.6} ${nasoTipY + 2.6}, ${cx + nasoW + 0.7} ${nasoTipY + 0.7}
          Q ${cx + nasoW + 1.2} ${nasoTipY - 2.6}, ${cx + 2.1} ${occhiY + nasoLungo * 0.42}
          C ${cx + 1.9} ${occhiY + 3}, ${cx + 1.7} ${occhiY + 1.5}, ${cx + 1.5} ${occhiY + 0.5}`
      case 1: /* aquilino: la gobba sul dorso e la punta che scende */
        return `M ${cx - 1.5} ${occhiY + 0.5}
          C ${cx - 3.2} ${occhiY + 4.5}, ${cx - 1.2} ${occhiY + nasoLungo * 0.5}, ${cx - nasoW - 0.8} ${nasoTipY - 2}
          Q ${cx - nasoW - 0.6} ${nasoTipY + 1.6}, ${cx - 0.5} ${nasoTipY + 2.2}
          Q ${cx + 1.8} ${nasoTipY + 2.8}, ${cx + nasoW + 0.4} ${nasoTipY + 0.4}
          Q ${cx + nasoW + 0.8} ${nasoTipY - 2.8}, ${cx + 2.3} ${occhiY + nasoLungo * 0.45}
          C ${cx + 3.4} ${occhiY + 4.5}, ${cx + 1.7} ${occhiY + 1.5}, ${cx + 1.5} ${occhiY + 0.5}`
      default: /* bulboso: il patatone tondo in punta */
        return `M ${cx - 1.4} ${occhiY + 0.5}
          C ${cx - 1.8} ${occhiY + nasoLungo * 0.4}, ${cx - nasoW - 1.4} ${nasoTipY - 4.5}, ${cx - nasoW - 1} ${nasoTipY - 1}
          C ${cx - nasoW - 0.6} ${nasoTipY + 2.6}, ${cx + nasoW + 1} ${nasoTipY + 2.8}, ${cx + nasoW + 1.3} ${nasoTipY - 0.8}
          C ${cx + nasoW + 1.5} ${nasoTipY - 4.2}, ${cx + 2} ${occhiY + nasoLungo * 0.38}, ${cx + 1.4} ${occhiY + 0.5}`
    }
  })()
  const naso = (
    <g>
      <path d={nasoForma} fill={pelle} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      {/* l'ombra sul lato destro del dorso, dentro la silhouette */}
      <path
        d={`M ${cx + 1.3} ${occhiY + 3} Q ${cx + 2.6} ${nasoTipY - 5} ${cx + nasoW - 0.4} ${nasoTipY - 0.6} Q ${cx + 1} ${nasoTipY} ${cx + 0.4} ${nasoTipY - 1.2} Q ${cx + 1.2} ${nasoTipY - 5} ${cx + 0.3} ${occhiY + 3} Z`}
        fill={pelleOmbra} opacity="0.8"
      />
      {/* le narici, appena accennate */}
      <path d={`M ${cx - nasoW + 0.6} ${nasoTipY - 0.2} Q ${cx - nasoW + 1.4} ${nasoTipY + 0.9} ${cx - 1.4} ${nasoTipY + 0.7}`} fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <path d={`M ${cx + nasoW - 0.4} ${nasoTipY + 0.2} Q ${cx + nasoW - 1} ${nasoTipY + 1.1} ${cx + 1.8} ${nasoTipY + 1.1}`} fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
    </g>
  )

  // ── la bocca: piccola e storta, sotto il naso ──
  const boccaY = nasoTipY + 5.5 + rng.intero(2)
  const boccaW = 5 + rng.intero(3)
  const BOCCHE = [
    <path key="b" d={`M ${cx - boccaW} ${boccaY} Q ${cx + sorrisoAsimmetrico * 3} ${boccaY + 2.6} ${cx + boccaW + 1} ${boccaY - 1.6}`} fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />,
    <path key="b" d={`M ${cx - boccaW + 0.5} ${boccaY + 0.5} Q ${cx + 1} ${boccaY + 1.4} ${cx + boccaW} ${boccaY}`} fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />,
    <path key="b" d={`M ${cx - boccaW - 0.5} ${boccaY - 0.5} Q ${cx} ${boccaY + 5} ${cx + boccaW + 1.5} ${boccaY - 2} Q ${cx + 1} ${boccaY + 0.8} ${cx - boccaW - 0.5} ${boccaY - 0.5} Z`} fill="#fdf8ee" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />,
  ]
  /* il labbro inferiore accennato, quando la bocca è chiusa */
  const labbro = stileBocca !== 2
    ? <path d={`M ${cx - 2.5} ${boccaY + 3.2} Q ${cx + 0.5} ${boccaY + 4.2} ${cx + 3.5} ${boccaY + 3}`} fill="none" stroke={pelleOmbra} strokeWidth="1.4" strokeLinecap="round" />
    : null

  // ── le orecchie, discrete, con l'orecchino da pirata a sorte ──
  const orecchie = (
    <g>
      <path d={`M ${cx - mezzaFronte + 0.5} ${occhiY + 1} Q ${cx - mezzaFronte - 3.5} ${occhiY - 1} ${cx - mezzaFronte - 2.5} ${occhiY + 4} Q ${cx - mezzaFronte - 1.5} ${occhiY + 8} ${cx - zigomo - 1} ${occhiY + 8}`} fill={pelle} stroke={INK} strokeWidth="1.4" />
      <path d={`M ${cx + mezzaFronte - 0.5} ${occhiY + 1} Q ${cx + mezzaFronte + 3.5} ${occhiY - 1} ${cx + mezzaFronte + 2.5} ${occhiY + 4} Q ${cx + mezzaFronte + 1.5} ${occhiY + 8} ${cx + zigomo + 1} ${occhiY + 8}`} fill={pelle} stroke={INK} strokeWidth="1.4" />
      {orecchino && <circle cx={cx + mezzaFronte + 1.5} cy={occhiY + 9.5} r="1.6" fill="none" stroke="#c9a227" strokeWidth="1.2" />}
    </g>
  )

  // ── le chiome: ciocche piene con le PUNTE, alla Monkey Island ──
  const sx = cx - mezzaFronte
  const dx = cx + mezzaFronte
  const CHIOME_FORME = [
    /* 0: pettinata all'indietro con codini ai lati (alla Guybrush) */
    <g key="c">
      <path d={`M ${sx - 2} ${occhiY - 4} Q ${sx - 3} ${fronteY - 2} ${cx - 8} ${craniotY - 3} Q ${cx} ${craniotY - 6} ${cx + 8} ${craniotY - 3} Q ${dx + 3} ${fronteY - 2} ${dx + 2} ${occhiY - 4} L ${dx + 4} ${occhiY + 6} L ${dx - 1} ${occhiY - 2} Q ${dx - 2} ${fronteY + 3} ${cx + 5} ${fronteY - 1} Q ${cx - 6} ${fronteY - 1} ${sx + 1} ${fronteY + 5} Q ${sx + 1} ${occhiY - 2} ${sx - 4} ${occhiY + 7} Z`} fill={chioma} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={`M ${cx - 6} ${craniotY} Q ${cx + 2} ${craniotY - 3} ${cx + 9} ${craniotY + 1}`} fill="none" stroke={chiomaOmbra} strokeWidth="1.4" />
    </g>,
    /* 1: frangia a ciocche appuntite, punte ben calate sulla fronte */
    <g key="c">
      <path d={`M ${sx - 1} ${occhiY - 6} Q ${sx - 2} ${fronteY - 4} ${cx - 7} ${craniotY - 3} Q ${cx + 4} ${craniotY - 6} ${dx + 1} ${fronteY - 5} L ${dx + 1} ${occhiY - 7} L ${dx - 3} ${fronteY + 6} L ${cx + 7} ${fronteY - 2} L ${cx + 4} ${fronteY + 9} L ${cx} ${fronteY - 1} L ${cx - 4} ${fronteY + 10} L ${cx - 8} ${fronteY} L ${sx + 3} ${fronteY + 7} Z`} fill={chioma} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={`M ${cx - 3} ${craniotY + 1} Q ${cx + 4} ${craniotY - 2} ${cx + 9} ${craniotY + 3}`} fill="none" stroke={chiomaOmbra} strokeWidth="1.4" />
    </g>,
    /* 2: chioma lunga e fluente fino alle spalle (alla Elaine) */
    <g key="c">
      <path d={`M ${sx - 6} ${mentoY - 6} Q ${sx - 8} ${occhiY} ${sx - 3} ${fronteY - 3} Q ${cx} ${craniotY - 7} ${dx + 3} ${fronteY - 3} Q ${dx + 8} ${occhiY} ${dx + 6} ${mentoY - 6} L ${dx + 1} ${mentoY - 10} Q ${dx + 2} ${occhiY + 2} ${dx - 1} ${fronteY + 2} Q ${cx} ${fronteY - 3} ${sx + 1} ${fronteY + 2} Q ${sx - 2} ${occhiY + 2} ${sx - 1} ${mentoY - 10} Z`} fill={chioma} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={`M ${sx - 4} ${occhiY + 6} Q ${sx - 5} ${occhiY + 16} ${sx - 2} ${mentoY - 8}`} fill="none" stroke={chiomaOmbra} strokeWidth="1.4" />
      <path d={`M ${dx + 4} ${occhiY + 6} Q ${dx + 5} ${occhiY + 16} ${dx + 2} ${mentoY - 8}`} fill="none" stroke={chiomaOmbra} strokeWidth="1.4" />
    </g>,
    /* 3: riccio pieno, bordo a onde */
    <g key="c">
      <path d={`M ${sx - 3} ${occhiY - 5} Q ${sx - 6} ${fronteY} ${sx} ${fronteY - 6} Q ${cx - 12} ${craniotY - 5} ${cx - 4} ${craniotY - 6} Q ${cx + 4} ${craniotY - 9} ${cx + 10} ${craniotY - 4} Q ${dx + 4} ${fronteY - 6} ${dx + 3} ${fronteY + 1} Q ${dx + 5} ${occhiY - 6} ${dx + 1} ${occhiY - 3} Q ${dx - 1} ${fronteY + 4} ${cx + 3} ${fronteY + 1} Q ${cx - 5} ${fronteY + 3} ${sx + 2} ${fronteY + 5} Q ${sx} ${occhiY - 2} ${sx - 3} ${occhiY - 5} Z`} fill={chioma} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={cx - 8} cy={craniotY - 1} r="1.1" fill={chiomaOmbra} />
      <circle cx={cx + 3} cy={craniotY - 3} r="1.1" fill={chiomaOmbra} />
    </g>,
    /* 4: rasato con l'attaccatura in vista */
    <path key="c" d={`M ${sx + 0.5} ${occhiY - 8} Q ${sx + 1} ${fronteY} ${cx - 6} ${fronteY - 4} Q ${cx} ${fronteY - 6} ${cx + 6} ${fronteY - 4} Q ${dx - 1} ${fronteY} ${dx - 0.5} ${occhiY - 8} Q ${dx - 2} ${fronteY - 6} ${cx + 4} ${craniotY + 3} Q ${cx} ${craniotY + 2} ${cx - 4} ${craniotY + 3} Q ${sx + 2} ${fronteY - 6} ${sx + 0.5} ${occhiY - 8} Z`} fill={chiomaOmbra} opacity="0.5" />,
    /* 5: ciuffo alto spavaldo con le basette */
    <g key="c">
      <path d={`M ${sx} ${occhiY - 5} Q ${sx - 1} ${fronteY - 2} ${cx - 8} ${fronteY - 6} Q ${cx - 10} ${craniotY - 4} ${cx - 1} ${craniotY - 8} Q ${cx + 10} ${craniotY - 10} ${cx + 8} ${craniotY - 1} Q ${dx + 1} ${fronteY - 4} ${dx} ${occhiY - 5} L ${dx - 2} ${fronteY + 3} Q ${cx + 5} ${fronteY - 3} ${cx - 2} ${fronteY + 1} Q ${sx + 3} ${fronteY + 2} ${sx + 2} ${fronteY + 4} Z`} fill={chioma} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={`M ${sx - 0.5} ${occhiY - 3} L ${sx + 2} ${occhiY + 6} L ${sx + 0.5} ${occhiY + 6.5} Z`} fill={chioma} />
      <path d={`M ${dx + 0.5} ${occhiY - 3} L ${dx - 2} ${occhiY + 6} L ${dx - 0.5} ${occhiY + 6.5} Z`} fill={chioma} />
    </g>,
  ]

  // ── barba e baffi, pieni e sagomati ──
  const peloFacciale = barba ? (
    <path
      d={`M ${cx - zigomo + 1} ${occhiY + 14} Q ${cx - zigomo} ${mentoY + 1} ${cx - mentoLargo - 1} ${mentoY + 4} Q ${cx} ${mentoY + 8} ${cx + mentoLargo + 1} ${mentoY + 4} Q ${cx + zigomo} ${mentoY + 1} ${cx + zigomo - 1} ${occhiY + 14} Q ${cx + zigomo - 4} ${mentoY - 6} ${cx + 2} ${boccaY + 4.5} Q ${cx} ${boccaY + 5} ${cx - 2} ${boccaY + 4.5} Q ${cx - zigomo + 4} ${mentoY - 6} ${cx - zigomo + 1} ${occhiY + 14} Z`}
      fill={chiomaOmbra} stroke={INK} strokeWidth="1.5" strokeLinejoin="round"
    />
  ) : baffi ? (
    <path d={`M ${cx - 8} ${boccaY - 1.5} Q ${cx} ${boccaY - 5} ${cx + 8} ${boccaY - 1.5} Q ${cx + 4} ${boccaY - 3.5} ${cx} ${boccaY - 2.5} Q ${cx - 4} ${boccaY - 3.5} ${cx - 8} ${boccaY - 1.5} Z`} fill={chiomaOmbra} stroke={INK} strokeWidth="1" />
  ) : null

  return (
    <svg viewBox="0 0 100 112" width={lato} height={Math.round((lato / 100) * 112)} aria-hidden>
      {busto}
      <path d={profiloViso} fill={pelle} stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
      <path d={ombraViso} fill={pelleOmbra} />
      {orecchie}
      {occhio(cx - distOcchi, 'l')}
      {occhio(cx + distOcchi, 'r')}
      {sopracciglia}
      {naso}
      {barba ? BOCCHE[1] : BOCCHE[stileBocca]}
      {labbro}
      {peloFacciale}
      {CHIOME_FORME[stileChioma]}
    </svg>
  )
}
