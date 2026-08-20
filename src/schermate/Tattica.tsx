// Tattica.tsx — la schermata tattica (M4, FRD §8): scelta del modulo,
// undici titolare, movimenti prevalenti con le frecce sul campo, e le
// istruzioni di squadra. Ogni modifica si salva subito nella carriera e
// vale dalla prossima partita (il motore la legge in preparazione.ts).

import { useState } from 'react'
import type { Database } from 'sql.js'
import type { Carriera } from '../carriera/tipi.ts'
import { salvaCarriera } from '../carriera/salvataggio.ts'
import { interroga } from '../db/query.ts'
import { mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import { fattoreIdoneita, migliorUndici, REPARTO } from '../motore/preparazione.ts'
import {
  ISTRUZIONI_DEFAULT, MODULI, MOVIMENTI, movimentiDefault, movimentiPerRuolo,
  type Istruzioni, type Movimento,
} from '../tattica/definizioni.ts'

// elenchi completi usati per disegnare le frecce sul campo
const offensiviTutti = MOVIMENTI.filter((m) => m.fase === 'offensiva')
const difensiviTutti = MOVIMENTI.filter((m) => m.fase === 'difensiva')

interface Props {
  db: Database
  carriera: Carriera
  /** notifica il genitore che la carriera è cambiata (per ridisegnare) */
  onModificata: () => void
}

/** Cognome corto per il gettone. */
const cognome = (g: GiocatoreRiga) => g.cognome

/** Colore per l'idoneità di un giocatore a un movimento. */
function classeIdoneita(fattore: number): string {
  if (fattore >= 0.6) return 'idoneita ottima'
  if (fattore >= 0.1) return 'idoneita buona'
  if (fattore >= -0.2) return 'idoneita scarsa'
  return 'idoneita pessima'
}

function Tattica({ db, carriera, onModificata }: Props) {
  const [slotScelto, setSlotScelto] = useState(0)
  const tattica = carriera.tattica
  const slots = MODULI[tattica.modulo]

  const rosa = interroga<GiocatoreRiga>(db, 'SELECT * FROM giocatore WHERE club_id = ?', [
    carriera.clubId,
  ])
  const perId = new Map(rosa.map((g) => [g.id, g]))
  const titolareDelloSlot = (i: number) => perId.get(tattica.titolari[i])

  async function applica(modifica: () => void) {
    modifica()
    await salvaCarriera(carriera)
    onModificata()
  }

  function cambiaModulo(nuovoModulo: string) {
    void applica(() => {
      tattica.modulo = nuovoModulo
      tattica.titolari = migliorUndici(rosa, nuovoModulo)
      tattica.movimenti = MODULI[nuovoModulo].map((slot) => movimentiDefault(slot.ruolo))
    })
    setSlotScelto(0)
  }

  function assegnaGiocatore(giocatoreId: number) {
    void applica(() => {
      // se è già titolare in un altro slot, i due si scambiano il posto
      const slotAttuale = tattica.titolari.indexOf(giocatoreId)
      if (slotAttuale >= 0) tattica.titolari[slotAttuale] = tattica.titolari[slotScelto]
      tattica.titolari[slotScelto] = giocatoreId
    })
  }

  function commutaMovimento(movimento: Movimento) {
    void applica(() => {
      const scelti = tattica.movimenti[slotScelto] ?? []
      if (scelti.includes(movimento.id)) {
        tattica.movimenti[slotScelto] = scelti.filter((id) => id !== movimento.id)
      } else {
        // massimo 2 per fase (FRD §8.2): se il limite è pieno, il nuovo
        // sostituisce il più vecchio della stessa fase
        const stessaFase = (id: string) =>
          movimentiPerRuolo(slots[slotScelto].ruolo)[
            movimento.fase === 'offensiva' ? 'offensivi' : 'difensivi'
          ].some((m) => m.id === id)
        const dellaFase = scelti.filter(stessaFase)
        const altri = scelti.filter((id) => !stessaFase(id))
        tattica.movimenti[slotScelto] = [...altri, ...dellaFase.slice(-(2 - 1)), movimento.id]
      }
    })
  }

  function impostaIstruzione<K extends keyof Istruzioni>(chiave: K, valore: Istruzioni[K]) {
    void applica(() => {
      tattica.istruzioni[chiave] = valore
    })
  }

  const slot = slots[slotScelto]
  const titolare = titolareDelloSlot(slotScelto)
  const { offensivi, difensivi } = movimentiPerRuolo(slot.ruolo)
  // in panchina: chi non è tra i titolari, ordinato per idoneità allo slot
  const panchina = rosa
    .filter((g) => !tattica.titolari.includes(g.id))
    .sort(
      (a, b) =>
        Number(b.ruolo === slot.ruolo) - Number(a.ruolo === slot.ruolo) ||
        Number(REPARTO[b.ruolo] === REPARTO[slot.ruolo]) - Number(REPARTO[a.ruolo] === REPARTO[slot.ruolo]) ||
        mediaComplessiva(b) - mediaComplessiva(a),
    )

  return (
    <div className="tattica">
      {/* ── Modulo e istruzioni ── */}
      <div className="tattica-controlli">
        <label>
          Modulo{' '}
          <select value={tattica.modulo} onChange={(e) => cambiaModulo(e.target.value)}>
            {Object.keys(MODULI).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Mentalità{' '}
          <select
            value={tattica.istruzioni.mentalita}
            onChange={(e) => impostaIstruzione('mentalita', Number(e.target.value) as Istruzioni['mentalita'])}
          >
            <option value={-2}>Molto difensiva</option>
            <option value={-1}>Difensiva</option>
            <option value={0}>Equilibrata</option>
            <option value={1}>Offensiva</option>
            <option value={2}>Molto offensiva</option>
          </select>
        </label>
        {(['pressing', 'ampiezza', 'ritmo'] as const).map((chiave) => (
          <label key={chiave}>
            {chiave[0].toUpperCase() + chiave.slice(1)}{' '}
            <select
              value={tattica.istruzioni[chiave]}
              onChange={(e) => impostaIstruzione(chiave, e.target.value as never)}
            >
              {(chiave === 'ampiezza' ? ['stretta', 'media', 'larga'] : ['basso', 'medio', 'alto']).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
        ))}
        <button
          className="bottone-secondario"
          onClick={() =>
            void applica(() => {
              tattica.titolari = migliorUndici(rosa, tattica.modulo)
              tattica.movimenti = slots.map((s) => movimentiDefault(s.ruolo))
              tattica.istruzioni = { ...ISTRUZIONI_DEFAULT }
            })
          }
        >
          Ripristina default
        </button>
      </div>

      {/* ── Campo tattico con frecce dei movimenti ── */}
      <svg className="campo-tattico" viewBox="0 0 78 68">
        <rect x="0" y="0" width="78" height="68" rx="1.5" fill="#4a7c4e" />
        <g stroke="#e8efe9" strokeWidth="0.4" fill="none">
          <rect x="1" y="1" width="76" height="66" />
          <rect x="1" y="13.85" width="16.5" height="40.3" />
          <line x1="60" y1="1" x2="60" y2="67" strokeDasharray="2 1.6" />
          <circle cx="1" cy="34" r="9.15" clipPath="none" />
        </g>
        <defs>
          <marker id="punta" markerWidth="4" markerHeight="4" refX="2.6" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 z" fill="context-stroke" />
          </marker>
        </defs>
        {slots.map((s, i) => {
          const g = titolareDelloSlot(i)
          const scelti = tattica.movimenti[i] ?? []
          return (
            <g key={i} onClick={() => setSlotScelto(i)} className="slot">
              {/* frecce dei movimenti scelti (offensivi pieni, difensivi tratteggiati) */}
              {scelti.map((id) => {
                const m = [...offensiviTutti, ...difensiviTutti].find((x) => x.id === id)
                if (!m) return null
                return (
                  <line
                    key={id}
                    x1={s.x} y1={s.y}
                    x2={s.x + m.freccia[0]} y2={s.y + m.freccia[1]}
                    stroke={m.fase === 'offensiva' ? '#e8c547' : '#cfd8dc'}
                    strokeWidth="0.8"
                    strokeDasharray={m.fase === 'difensiva' ? '1.6 1' : undefined}
                    markerEnd="url(#punta)"
                  />
                )
              })}
              <circle
                cx={s.x} cy={s.y} r={i === slotScelto ? 3 : 2.3}
                fill="var(--accento)"
                stroke={i === slotScelto ? '#e8c547' : '#ffffff'}
                strokeWidth={i === slotScelto ? 0.8 : 0.4}
              />
              <text x={s.x} y={s.y + 0.9} textAnchor="middle" className="ruolo-slot">{s.ruolo}</text>
              <text x={s.x} y={s.y + 5.6} textAnchor="middle" className="nome-gettone">
                {g ? cognome(g) : '—'}
              </text>
            </g>
          )
        })}
      </svg>

      {/* ── Pannello dello slot selezionato ── */}
      <div className="pannello-slot">
        <h3>
          Slot {slot.ruolo} — {titolare ? `${titolare.nome} ${titolare.cognome}` : 'vuoto'}
          {titolare && <span className="nota"> (ruolo naturale {titolare.ruolo}, media {mediaComplessiva(titolare)})</span>}
        </h3>

        <label>
          Titolare{' '}
          <select
            value={tattica.titolari[slotScelto] ?? ''}
            onChange={(e) => assegnaGiocatore(Number(e.target.value))}
          >
            {titolare && (
              <option value={titolare.id}>
                {titolare.nome} {titolare.cognome} ({titolare.ruolo}, {mediaComplessiva(titolare)})
              </option>
            )}
            {panchina.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome} {g.cognome} ({g.ruolo}, {mediaComplessiva(g)})
              </option>
            ))}
          </select>
        </label>

        <div className="colonne-movimenti">
          {[
            { titolo: 'Movimenti offensivi (max 2)', lista: offensivi },
            { titolo: 'Movimenti difensivi (max 2)', lista: difensivi },
          ].map(({ titolo, lista }) => (
            <div key={titolo}>
              <h4>{titolo}</h4>
              {lista.length === 0 && <p className="nota">Nessun movimento per questo ruolo.</p>}
              {lista.map((m) => {
                const attivo = (tattica.movimenti[slotScelto] ?? []).includes(m.id)
                const fattore = titolare ? fattoreIdoneita(titolare, m.attributiChiave) : 0
                return (
                  <label key={m.id} className="voce-movimento">
                    <input type="checkbox" checked={attivo} onChange={() => commutaMovimento(m)} />
                    <span>{m.nome}</span>
                    <span className={classeIdoneita(fattore)}>
                      {fattore >= 0.6 ? 'ottimo' : fattore >= 0.1 ? 'buono' : fattore >= -0.2 ? 'scarso' : 'inadatto'}
                    </span>
                  </label>
                )
              })}
            </div>
          ))}
        </div>
        <p className="nota">
          L'efficacia dipende dagli attributi chiave del giocatore: un movimento
          «inadatto» peggiora la squadra invece di migliorarla (FRD §8.2).
        </p>
      </div>
    </div>
  )
}

export default Tattica
