// NuovaCarriera.tsx — il wizard di avvio carriera (FRD §4.1):
// 1. scelta della nazione  2. profilo allenatore  3. offerte → accettazione.

import { useState } from 'react'
import type { Database } from 'sql.js'
import { squadreLegend } from '../db/legends.ts'
import {
  creaCarriera, generaOfferte, nazioniDisponibili, ANNO_INIZIO_CARRIERA,
} from '../carriera/motore.ts'
import { DESCRIZIONE_OBIETTIVO, etichettaStagione, type Carriera, type Offerta } from '../carriera/tipi.ts'

interface Props {
  db: Database
  onCarrieraCreata: (carriera: Carriera) => void
}

function NuovaCarriera({ db, onCarrieraCreata }: Props) {
  // la squadra Legend da inserire nel campionato (M9, opzionale)
  const [legendScelta, setLegendScelta] = useState<number | ''>('')
  // le leggende free agent: '' = no, altrimenti dopo quante stagioni entrano
  const [leggendeOffset, setLeggendeOffset] = useState<number | ''>('')
  const legends = squadreLegend(db)
  const nazioni = nazioniDisponibili(db)

  // Stato del wizard: la nazione scelta, il profilo, le offerte generate
  const [nazione, setNazione] = useState<{ id: number; nome: string } | null>(null)
  const [nome, setNome] = useState('')
  const [nazionalita, setNazionalita] = useState('Italiana')
  const [eta, setEta] = useState(40)
  const [offerte, setOfferte] = useState<Offerta[] | null>(null)

  // ── Passo 1: nazione ──
  if (!nazione) {
    return (
      <section className="schermata">
        <h2>Nuova carriera — scegli la nazione</h2>
        <p className="nota">
          Inizierai dalla seconda divisione della nazione scelta, estate {ANNO_INIZIO_CARRIERA}.
        </p>
        <div className="menu">
          {nazioni.map((n) => (
            <button key={n.id} className="voce-menu" onClick={() => setNazione(n)}>
              <span className="voce-etichetta">{n.nome}</span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  // ── Passo 2: profilo allenatore ──
  if (!offerte) {
    return (
      <section className="schermata">
        <h2>Nuova carriera — il tuo profilo</h2>
        <p className="nota">
          Niente punti abilità da distribuire: la fama iniziale è bassa e uguale
          per tutti (FRD §4.1). Conteranno i risultati.
        </p>
        <div className="modulo">
          <label>
            Nome e cognome
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Mario Rossi" />
          </label>
          <label>
            Nazionalità
            <input value={nazionalita} onChange={(e) => setNazionalita(e.target.value)} />
          </label>
          <label>
            Età: {eta} anni
            <input type="range" min={30} max={70} value={eta} onChange={(e) => setEta(Number(e.target.value))} />
          </label>
          <button
            className="bottone-primario"
            disabled={nome.trim().length < 2}
            onClick={() => setOfferte(generaOfferte(db, nazione.id))}
          >
            Ricevi le offerte →
          </button>
        </div>
      </section>
    )
  }

  // ── Passo 3: offerte ──
  return (
    <section className="schermata">
      <h2>Le tue offerte — {nazione.nome}, estate {ANNO_INIZIO_CARRIERA}</h2>
      <p className="nota">
        {offerte.length} club di seconda divisione hanno bussato alla tua porta.
        Stagione {etichettaStagione(ANNO_INIZIO_CARRIERA)}.
      </p>
      {/* le LEGGENDE nel mercato come free agent (M9): opzionale */}
      <p className="nota">
        ⭐ Leggende nel mercato come free agent?{' '}
        <select value={leggendeOffset} onChange={(e) => setLeggendeOffset(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">No</option>
          <option value={0}>Sì, da subito</option>
          <option value={1}>Sì, dopo la 1ª stagione</option>
          <option value={2}>Sì, dopo la 2ª stagione</option>
          <option value={3}>Sì, dopo la 3ª stagione</option>
        </select>{' '}
        Entrano nel mercato estivo senza cartellino; le convince il progetto,
        non i soldi. Si ritirano dopo 5 stagioni.
      </p>
      {/* la Legend nel campionato (M9, FRD §5.3): opzionale */}
      {legends.length > 0 && (
        <p className="nota">
          ⭐ Vuoi una squadra Legend nel tuo campionato?{' '}
          <select value={legendScelta} onChange={(e) => setLegendScelta(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">No, campionato normale</option>
            {legends.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>{' '}
          Entrerà al posto del club più debole della seconda divisione.
        </p>
      )}
      <div className="menu">
        {offerte.map((o) => (
          <button
            key={o.clubId}
            className="voce-menu"
            onClick={() =>
              onCarrieraCreata(
                creaCarriera(db, { nome: nome.trim(), nazionalita, eta }, nazione, o,
                  legendScelta === '' ? undefined : legendScelta,
                  leggendeOffset === '' ? undefined : ANNO_INIZIO_CARRIERA + leggendeOffset),
              )
            }
          >
            <span className="voce-etichetta">{o.clubNome}</span>
            <span className="voce-descrizione">
              Obiettivo: {DESCRIZIONE_OBIETTIVO[o.obiettivo]} · contratto {o.durataAnni}{' '}
              {o.durataAnni === 1 ? 'anno' : 'anni'} · stipendio €{' '}
              {o.stipendioAllenatore.toLocaleString('it-IT')}/anno
            </span>
            <span className="voce-descrizione">
              Budget mercato € {o.budgetMercato.toLocaleString('it-IT')} · monte stipendi €{' '}
              {o.budgetStipendi.toLocaleString('it-IT')}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default NuovaCarriera
