// DialogoIngaggio.tsx — la trattativa CON IL GIOCATORE (M7, FRD §6.3).
//
// Due modalità, stessa sostanza (le leve pesano sul punteggio del cervello
// deterministico, mai sull'arbitrio dell'LLM):
// - OFFLINE (default, il gioco è sempre completabile): dialogo strutturato,
//   le promesse si scelgono da un elenco (max 2);
// - LLM (con chiave API Anthropic): si scrive liberamente, l'LLM risponde
//   nei panni del giocatore e RICONOSCE le promesse nel discorso.
// In entrambe: massimo 3 round, riepilogo strutturato sempre visibile.

import { useState } from 'react'
import type { Database } from 'sql.js'
import type { Carriera } from '../carriera/tipi.ts'
import { calcolaEta, mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import { clubDiGiocatore } from '../mercato/stato.ts'
import { euro } from '../mercato/valore.ts'
import {
  DESCRIZIONE_LEVA, punteggioInteresse, SOGLIA_FIRMA, SOGLIA_TRATTABILE,
  type Leva, type OffertaIngaggio,
} from '../trattativa/interesse.ts'
import {
  chiaveApi, MODELLI_DISPONIBILI, modelloLlm, salvaChiaveApi, salvaModelloLlm,
  turnoDialogo, type BattutaDialogo,
} from '../trattativa/llm.ts'

interface Props {
  db: Database
  carriera: Carriera
  giocatore: GiocatoreRiga
  stipendioIniziale: number
  titolo: string // es. "Convinci Rossi a firmare"
  onEsito: (esito: { firmato: boolean; offerta: OffertaIngaggio }) => void
}

const TUTTE_LE_LEVE: Leva[] = ['titolarita', 'centralita', 'progetto', 'fascia']

/** La battuta del giocatore in modalità offline (template per fascia di interesse). */
function battutaOffline(punteggio: number, ostacolo: string | null, round: number): string {
  if (punteggio >= SOGLIA_FIRMA) {
    return 'Mister, il progetto mi convince. Se le condizioni sono queste, ci sto: dove si firma?'
  }
  if (punteggio >= SOGLIA_TRATTABILE) {
    return `Non le nascondo qualche dubbio${ostacolo ? `: ${ostacolo.toLowerCase()}` : ''}. ${
      round < 3 ? 'Mi dia un motivo in più per dire di sì.' : 'Così non me la sento di firmare.'
    }`
  }
  return `Mister, la ringrazio ma non ci siamo${ostacolo ? `: ${ostacolo.toLowerCase()}` : ''}. Non è la destinazione giusta per me.`
}

function DialogoIngaggio({ db, carriera, giocatore, stipendioIniziale, titolo, onEsito }: Props) {
  const [stipendio, setStipendio] = useState(stipendioIniziale)
  const [durata, setDurata] = useState(3)
  const [leve, setLeve] = useState<Leva[]>([])
  const [round, setRound] = useState(1)
  const [dialogo, setDialogo] = useState<BattutaDialogo[]>([])
  const [chiuso, setChiuso] = useState<null | 'firmato' | 'rifiutato'>(null)
  const [testoLibero, setTestoLibero] = useState('')
  const [usaLlm, setUsaLlm] = useState(Boolean(chiaveApi()))
  const [chiave, setChiave] = useState(chiaveApi() ?? '')
  const [modello, setModello] = useState(modelloLlm())
  const [inAttesa, setInAttesa] = useState(false)
  const [erroreLlm, setErroreLlm] = useState<string | null>(null)

  const offerta: OffertaIngaggio = { stipendio, durataAnni: durata, leve }
  const interesse = punteggioInteresse(db, carriera, giocatore, offerta)
  const clubAttuale = carriera.club.find((c) => c.id === clubDiGiocatore(carriera, giocatore.id))

  function commutaLeva(leva: Leva) {
    setLeve((attuali) =>
      attuali.includes(leva)
        ? attuali.filter((l) => l !== leva)
        : attuali.length < 2
          ? [...attuali, leva]
          : attuali, // massimo 2 promesse (FRD: vincoli chiari)
    )
  }

  /** Chiude il round: il cervello deterministico decide (in entrambe le modalità). */
  function decidi(battutaGiocatore: string) {
    setDialogo((d) => [...d, { chi: 'giocatore', testo: battutaGiocatore }])
    if (interesse.punteggio >= SOGLIA_FIRMA) {
      setChiuso('firmato')
    } else if (interesse.punteggio < SOGLIA_TRATTABILE || round >= 3) {
      setChiuso('rifiutato')
    } else {
      setRound((r) => r + 1)
    }
  }

  /** Round in modalità OFFLINE: l'offerta corrente è la "battuta" dell'allenatore. */
  function proponiOffline() {
    const riepilogo = `Ti offro ${euro(stipendio)}/anno per ${durata} anni${
      leve.length ? `, e ti prometto: ${leve.map((l) => DESCRIZIONE_LEVA[l].toLowerCase()).join(', ')}` : ''
    }.`
    setDialogo((d) => [...d, { chi: 'allenatore', testo: riepilogo }])
    decidi(battutaOffline(interesse.punteggio, interesse.ostacolo?.nome ?? null, round))
  }

  /** Round in modalità LLM: discorso libero + leve riconosciute dal modello. */
  async function proponiLlm() {
    if (!testoLibero.trim() || inAttesa) return
    setInAttesa(true)
    setErroreLlm(null)
    const messaggio = testoLibero.trim()
    setDialogo((d) => [...d, { chi: 'allenatore', testo: messaggio }])
    setTestoLibero('')
    try {
      const esito = await turnoDialogo(
        giocatore,
        {
          clubNome: carriera.club.find((c) => c.id === carriera.clubId)!.nome,
          clubAttualeNome: clubAttuale?.nome ?? 'svincolato',
          interesse,
          leveGiaRiconosciute: leve,
        },
        dialogo,
        messaggio,
      )
      // le leve riconosciute dall'LLM entrano nel punteggio (pesi del motore)
      const nuoveLeve = [...new Set([...leve, ...esito.leveRiconosciute])].slice(0, 2) as Leva[]
      setLeve(nuoveLeve)
      decidi(esito.rispostaGiocatore)
    } catch (errore) {
      // FRD §6.3: fallback offline — il gioco è sempre completabile
      setErroreLlm(`Chiamata LLM fallita (${String(errore).slice(0, 80)}…): passo alla modalità offline.`)
      setUsaLlm(false)
      setDialogo((d) => d.slice(0, -1)) // ritira la battuta non consegnata
      setTestoLibero(messaggio)
    } finally {
      setInAttesa(false)
    }
  }

  return (
    <div className="pannello-trattativa dialogo-ingaggio">
      <h3>{titolo}</h3>
      <p className="nota">
        {giocatore.ruolo} · {calcolaEta(giocatore.data_nascita)} anni · media {mediaComplessiva(giocatore)} ·{' '}
        {clubAttuale?.nome ?? 'svincolato'} · round {Math.min(round, 3)}/3
      </p>

      {/* ── riepilogo strutturato SEMPRE visibile (FRD §6.3) ── */}
      <div className="riepilogo-offerta">
        <strong>La tua offerta:</strong> {euro(stipendio)}/anno · {durata} anni
        {leve.length > 0 && (
          <> · promesse: {leve.map((l) => DESCRIZIONE_LEVA[l]).join(' + ')} <span className="nota">(le promesse vincolano: verranno verificate!)</span></>
        )}
        <span className={`termometro ${interesse.punteggio >= SOGLIA_FIRMA ? 'caldo' : interesse.punteggio >= SOGLIA_TRATTABILE ? 'tiepido' : 'freddo'}`}>
          interesse {interesse.punteggio}/100
        </span>
      </div>

      {/* ── i fattori spiegabili (tooltip "perché?", FRD §12) ── */}
      <details className="fattori">
        <summary>Perché questo interesse?</summary>
        <ul>
          {interesse.fattori.map((f, i) => (
            <li key={i}>
              {f.contributo >= 0 ? '➕' : '➖'} {f.nome} ({f.contributo > 0 ? '+' : ''}{f.contributo})
            </li>
          ))}
        </ul>
      </details>

      {/* ── il dialogo ── */}
      <div className="battute">
        {dialogo.map((b, i) => (
          <p key={i} className={b.chi === 'allenatore' ? 'battuta allenatore' : 'battuta giocatore'}>
            <strong>{b.chi === 'allenatore' ? 'Tu' : giocatore.cognome}:</strong> {b.testo}
          </p>
        ))}
        {dialogo.length === 0 && (
          <p className="nota">Il giocatore ti ascolta. Componi l’offerta e parla con lui.</p>
        )}
        {erroreLlm && <p className="nota">⚠️ {erroreLlm}</p>}
      </div>

      {chiuso === null && (
        <>
          {/* ── le condizioni economiche (comuni alle due modalità) ── */}
          <div className="leve">
            <label>
              Stipendio/anno{' '}
              <input type="number" step={50_000} min={100_000} value={stipendio}
                onChange={(e) => setStipendio(Number(e.target.value))} />
            </label>
            <label>
              Durata{' '}
              <select value={durata} onChange={(e) => setDurata(Number(e.target.value))}>
                {[1, 2, 3, 4].map((a) => <option key={a} value={a}>{a} anni</option>)}
              </select>
            </label>
          </div>

          {!usaLlm ? (
            <>
              {/* modalità OFFLINE: promesse a scelta multipla (max 2) */}
              <div className="scelte-promesse">
                {TUTTE_LE_LEVE.map((leva) => (
                  <label key={leva} className="voce-movimento">
                    <input type="checkbox" checked={leve.includes(leva)} onChange={() => commutaLeva(leva)} />
                    {DESCRIZIONE_LEVA[leva]}
                  </label>
                ))}
              </div>
              <div className="riga-bottoni">
                <button className="bottone-primario" onClick={proponiOffline}>
                  🗣 Proponi (round {Math.min(round, 3)})
                </button>
                <button className="bottone-secondario" onClick={() => onEsito({ firmato: false, offerta })}>
                  Abbandona
                </button>
              </div>
            </>
          ) : (
            <>
              {/* modalità LLM: discorso libero */}
              <textarea
                className="campo-discorso"
                placeholder="Parla col giocatore: raccontagli il progetto, fai le tue promesse… (l’IA le riconoscerà e peseranno davvero)"
                value={testoLibero}
                onChange={(e) => setTestoLibero(e.target.value)}
                rows={3}
              />
              <div className="riga-bottoni">
                <button className="bottone-primario" disabled={inAttesa || !testoLibero.trim()} onClick={() => void proponiLlm()}>
                  {inAttesa ? '… il giocatore riflette …' : `🗣 Parla (round ${Math.min(round, 3)})`}
                </button>
                <button className="bottone-secondario" onClick={() => onEsito({ firmato: false, offerta })}>
                  Abbandona
                </button>
              </div>
            </>
          )}

          {/* ── impostazioni LLM (protocollo risorse esterne: chiave SOLO nel browser) ── */}
          <details className="impostazioni-llm">
            <summary>⚙️ Modalità dialogo: {usaLlm ? `IA (${modello})` : 'offline (scelte multiple)'}</summary>
            <p className="nota">
              Con una chiave API Anthropic (console.anthropic.com → API Keys) il giocatore parla davvero.
              La chiave resta solo in questo browser. Costo: pochi centesimi a trattativa. Senza chiave, modalità offline.
            </p>
            <div className="riga-bottoni">
              <input type="password" placeholder="sk-ant-…" value={chiave} className="campo-ricerca"
                onChange={(e) => setChiave(e.target.value)} />
              <select value={modello} onChange={(e) => { setModello(e.target.value); salvaModelloLlm(e.target.value) }}>
                {MODELLI_DISPONIBILI.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button className="bottone-secondario" onClick={() => { salvaChiaveApi(chiave); setUsaLlm(Boolean(chiave.trim())) }}>
                Salva
              </button>
              {usaLlm && (
                <button className="bottone-secondario" onClick={() => setUsaLlm(false)}>Usa offline</button>
              )}
            </div>
          </details>
        </>
      )}

      {chiuso === 'firmato' && (
        <div className="riquadro-esito">
          <p>✅ <strong>{giocatore.cognome} accetta!</strong> {euro(stipendio)}/anno per {durata} anni{leve.length ? ` — promesse registrate: ${leve.map((l) => DESCRIZIONE_LEVA[l]).join(', ')}` : ''}.</p>
          <button className="bottone-primario" onClick={() => onEsito({ firmato: true, offerta })}>
            Ufficializza la firma
          </button>
        </div>
      )}
      {chiuso === 'rifiutato' && (
        <div className="riquadro-esito">
          <p>❌ <strong>{giocatore.cognome} rifiuta.</strong> La trattativa sfuma{interesse.ostacolo ? ` (${interesse.ostacolo.nome.toLowerCase()})` : ''}.</p>
          <button className="bottone-secondario" onClick={() => onEsito({ firmato: false, offerta })}>
            Chiudi
          </button>
        </div>
      )}
    </div>
  )
}

export default DialogoIngaggio
