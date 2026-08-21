// Figurina.tsx — LA FIGURINA (DESIGN-MISTER.md §4.2): il componente eroe.
//
// La scheda giocatore come figurina da album anni '90: cornice spessa nei
// colori del club, nome in maiuscolo condensato su banda inchiostro,
// numero di maglia gigante, ritratto in pixel art, attributi come barre
// squadrate con numeroni colorati per fascia (§2.4). È il campione di
// stile: approvata questa, lo stesso linguaggio si propaga al gioco.

import type { GiocatoreRiga } from '../db/tipi.ts'
import { mediaComplessiva, calcolaEta } from '../db/tipi.ts'
import { coloriClub, numeroMaglia } from './colori-club.ts'
import { fascia } from './fasce.ts'
import { RitrattoPixel } from './pixelart.tsx'
import './figurina.css'

const ATTRIBUTI_MOVIMENTO: Array<[keyof GiocatoreRiga, string]> = [
  ['velocita', 'VEL'], ['resistenza', 'RES'], ['tecnica', 'TEC'],
  ['passaggio', 'PAS'], ['tiro', 'TIR'], ['dribbling', 'DRI'],
  ['colpo_testa', 'TES'], ['marcatura', 'MAR'], ['contrasto', 'CON'],
  ['posizionamento', 'POS'], ['visione', 'VIS'], ['calci_piazzati', 'PIA'],
]

const ATTRIBUTI_PORTIERE: Array<[keyof GiocatoreRiga, string]> = [
  ['riflessi', 'RIF'], ['presa', 'PRE'], ['uscite', 'USC'],
  ['rinvio', 'RIN'], ['velocita', 'VEL'], ['resistenza', 'RES'],
]

/** Una barra attributo squadrata: sigla, barra piena a segmenti, numerone. */
function BarraFigurina({ sigla, valore }: { sigla: string; valore: number | null }) {
  if (valore === null) return null
  const f = fascia(valore)
  return (
    <div className="fig-attributo">
      <span className="fig-attributo-sigla">{sigla}</span>
      <div className="fig-attributo-barra">
        <div className={`fig-attributo-pieno fascia-riempimento-${f}`} style={{ width: `${valore}%` }} />
      </div>
      <span className={`fig-attributo-numero fascia-${f}`}>{valore}</span>
    </div>
  )
}

interface Props {
  giocatore: GiocatoreRiga
  /** nome del club per la targhetta (null = svincolato/leggenda) */
  nomeClub: string | null
  /** id del club per i colori sociali (null = veste neutra) */
  clubId: number | null
}

/** La figurina intera: il ritratto del giocatore in formato album. */
export function Figurina({ giocatore: g, nomeClub, clubId }: Props) {
  const colori = coloriClub(clubId)
  const numero = numeroMaglia(g.id, g.ruolo)
  const media = mediaComplessiva(g)
  const attributi = g.ruolo === 'POR' ? ATTRIBUTI_PORTIERE : ATTRIBUTI_MOVIMENTO
  const leggenda = g.categoria !== 'normale'

  return (
    <article
      className={`figurina${leggenda ? ' figurina-oro' : ''}`}
      style={{ '--club-primary': colori.primario, '--club-secondary': colori.secondario } as React.CSSProperties}
    >
      {/* il ritratto, con numero di maglia gigante e media in medaglione */}
      <div className="fig-ritratto retino-punti">
        <span className="fig-numero-maglia">{numero}</span>
        <RitrattoPixel giocatoreId={g.id} colori={colori} lato={120} />
        <span className={`fig-media fascia-${fascia(media)}`}>
          {media}
          <small>MEDIA</small>
        </span>
        <span className="fig-ruolo">{g.ruolo}</span>
        {leggenda && <span className="fig-stella">★ {g.categoria === 'icon' ? 'ICON' : 'HERO'}</span>}
      </div>

      {/* la banda del nome, come sulla figurina stampata */}
      <header className="fig-nome">
        {g.nome} {g.cognome}
      </header>

      {/* la riga anagrafica: club, età, nazionalità, piede */}
      <p className="fig-anagrafica">
        {nomeClub ?? (leggenda ? 'LEGGENDA' : 'SVINCOLATO')} · {calcolaEta(g.data_nascita)} ANNI
        · {g.nazionalita} · {g.piede === 'sinistro' ? 'SX' : g.piede === 'destro' ? 'DX' : 'AMBI'}
      </p>

      {/* gli attributi: barre squadrate su due colonne */}
      <div className="fig-attributi">
        {attributi.map(([chiave, sigla]) => (
          <BarraFigurina key={sigla + chiave} sigla={sigla} valore={g[chiave] as number | null} />
        ))}
      </div>

      {/* il piè di figurina: la collezione e il potenziale */}
      <footer className="fig-piede">
        <span className="fig-marchio">MISTER</span>
        <span className="etichetta-almanacco">
          POT <strong className={`fascia-${fascia(g.potenziale)}`}>{g.potenziale}</strong>
        </span>
      </footer>
    </article>
  )
}
