// Mercato.tsx — la schermata del mercato (M6, FRD §6):
// finestre e giorni di mercato, ricerca giocatori con trattativa a 5 leve
// (max 3 round, rifiuti motivati), offerte ricevute dai club IA, gestione
// della propria rosa (rinnovi, cedibili), svincolati e notiziario.

import { useState } from 'react'
import type { Database } from 'sql.js'
import type { Carriera } from '../carriera/tipi.ts'
import { salvaCarriera } from '../carriera/salvataggio.ts'
import { calcolaEta, mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import {
  accettaOfferta, eseguiAcquisto, giornoDiMercato, ingaggiaSvincolato,
  proponiCessione, rinnovaContratto, valutaProposta, type Proposta, type Risposta,
} from '../mercato/ia.ts'
import {
  anniContratto, clubDiGiocatore, giocatoriPerId, monteStipendi, rosaClub, valoreInCarriera,
} from '../mercato/stato.ts'
import { euro } from '../mercato/valore.ts'

interface Props {
  db: Database
  carriera: Carriera
  onModificata: () => void
}

/** Lo stato di una trattativa in corso. */
interface Trattativa {
  giocatore: GiocatoreRiga
  round: number
  storia: string[] // le battute precedenti
  chiusa: boolean
  // le 5 leve
  prezzo: number
  bonus: number
  inPrestito: boolean
  diritto: number
  obbligo: boolean
  contropartitaId: number | ''
}

function Mercato({ db, carriera, onModificata }: Props) {
  const m = carriera.mercato
  const [ricerca, setRicerca] = useState('')
  const [filtroRuolo, setFiltroRuolo] = useState('')
  const [trattativa, setTrattativa] = useState<Trattativa | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)

  const miaRosa = rosaClub(db, carriera, carriera.clubId)
    .sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a))
  const stipendiUsati = monteStipendi(carriera)

  async function applica(modifica: () => void) {
    modifica()
    await salvaCarriera(carriera)
    onModificata()
  }

  // ── ricerca: giocatori degli altri club della nazione ──
  const tuttiGliAltri: GiocatoreRiga[] = []
  if (ricerca.length >= 2 || filtroRuolo) {
    for (const club of carriera.club) {
      if (club.id === carriera.clubId) continue
      tuttiGliAltri.push(...rosaClub(db, carriera, club.id))
    }
  }
  const risultati = tuttiGliAltri
    .filter((g) =>
      (!filtroRuolo || g.ruolo === filtroRuolo) &&
      (ricerca.length < 2 || `${g.nome} ${g.cognome}`.toLowerCase().includes(ricerca.toLowerCase())),
    )
    .sort((a, b) => valoreInCarriera(carriera, b) - valoreInCarriera(carriera, a))
    .slice(0, 25)

  function apriTrattativa(g: GiocatoreRiga) {
    setTrattativa({
      giocatore: g, round: 1, storia: [], chiusa: false,
      prezzo: valoreInCarriera(carriera, g), bonus: 0,
      inPrestito: false, diritto: Math.round(valoreInCarriera(carriera, g) * 1.05), obbligo: false,
      contropartitaId: '',
    })
    setAvviso(null)
  }

  async function invia() {
    if (!trattativa || trattativa.chiusa) return
    const t = trattativa
    const proposta: Proposta = {
      giocatoreId: t.giocatore.id,
      prezzo: t.prezzo,
      bonus: t.bonus,
      prestito: t.inPrestito ? { diritto: t.diritto, obbligo: t.obbligo } : null,
      contropartitaId: t.contropartitaId === '' ? null : t.contropartitaId,
      round: t.round,
    }
    const risposta: Risposta = valutaProposta(db, carriera, proposta)
    if (risposta.esito === 'accettata') {
      const errore = eseguiAcquisto(db, carriera, proposta)
      if (errore) {
        setTrattativa({ ...t, storia: [...t.storia, `⚠️ ${errore}`] })
        return
      }
      await applica(() => {})
      setTrattativa({ ...t, chiusa: true, storia: [...t.storia, `✅ Accordo trovato! ${t.giocatore.cognome} è tuo.`] })
    } else if (risposta.esito === 'contro') {
      setTrattativa({
        ...t,
        round: t.round + 1,
        prezzo: t.inPrestito ? t.prezzo : risposta.controPrezzo,
        diritto: t.inPrestito ? risposta.controPrezzo : t.diritto,
        storia: [...t.storia, `↩️ Round ${t.round}: ${risposta.motivo}`],
      })
    } else {
      setTrattativa({ ...t, chiusa: true, storia: [...t.storia, `❌ ${risposta.motivo}`] })
    }
  }

  const RUOLI = ['POR', 'DC', 'TD', 'TS', 'MED', 'CC', 'TRQ', 'ED', 'ES', 'PC']
  const svincolati = giocatoriPerId(db, carriera.svincolati)
    .sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a))
    .slice(0, 15)

  return (
    <div className="mercato">
      {/* ── stato della finestra e budget ── */}
      <div className="mercato-testata">
        <div>
          {m.aperto ? (
            <strong>🟢 Mercato {m.finestra === 'estiva' ? 'estivo' : 'invernale'} aperto — {m.giorniRimasti} giorni rimasti</strong>
          ) : (
            <strong>🔴 Mercato chiuso (riapre {carriera.giornata < carriera.calendario.length / 2 ? 'a gennaio' : 'in estate'})</strong>
          )}
          <p className="nota">
            Budget mercato: <strong>{euro(carriera.budget.mercato)}</strong> · monte stipendi:{' '}
            {euro(stipendiUsati)} / {euro(carriera.budget.stipendi)}
          </p>
        </div>
        {m.aperto && (
          <div className="riga-bottoni">
            <button className="bottone-primario" onClick={() => void applica(() => giornoDiMercato(db, carriera))}>
              ▶ Avanza un giorno
            </button>
            <button
              className="bottone-secondario"
              onClick={() => void applica(() => { while (carriera.mercato.aperto) giornoDiMercato(db, carriera) })}
            >
              ⏩ Fino a chiusura
            </button>
          </div>
        )}
      </div>

      {avviso && <p className="avviso">{avviso}</p>}

      {/* ── offerte ricevute ── */}
      {m.offerteRicevute.length > 0 && (
        <>
          <h3>📨 Offerte ricevute</h3>
          <table className="tabella">
            <tbody>
              {m.offerteRicevute.map((o) => {
                const g = giocatoriPerId(db, [o.giocatoreId])[0]
                const club = carriera.club.find((c) => c.id === o.clubId)
                return (
                  <tr key={o.id}>
                    <td className="grassetto">{g.nome} {g.cognome}</td>
                    <td>
                      {club?.nome} offre{' '}
                      {o.tipo === 'acquisto'
                        ? `${euro(o.prezzo)} per il cartellino`
                        : `un prestito con diritto di riscatto a ${euro(o.prezzo)}`}
                    </td>
                    <td className="num">
                      <button className="bottone-primario" onClick={() => void applica(() => accettaOfferta(db, carriera, o.id))}>
                        Accetta
                      </button>{' '}
                      <button
                        className="bottone-secondario"
                        onClick={() => void applica(() => { m.offerteRicevute = m.offerteRicevute.filter((x) => x.id !== o.id) })}
                      >
                        Rifiuta
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {/* ── trattativa in corso ── */}
      {trattativa && (
        <div className="pannello-trattativa">
          <h3>
            Trattativa: {trattativa.giocatore.nome} {trattativa.giocatore.cognome}{' '}
            <span className="nota">
              ({trattativa.giocatore.ruolo}, media {mediaComplessiva(trattativa.giocatore)}, valore{' '}
              {euro(valoreInCarriera(carriera, trattativa.giocatore))}, contratto fino al{' '}
              {carriera.contratti[trattativa.giocatore.id]?.scadenza ?? '?'} — round {Math.min(trattativa.round, 3)}/3)
            </span>
          </h3>
          {trattativa.storia.length > 0 && (
            <ul className="storia-trattativa">
              {trattativa.storia.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
          {!trattativa.chiusa && (
            <div className="leve">
              <label>
                Prezzo{' '}
                <input type="number" step={100_000} min={0} value={trattativa.inPrestito ? 0 : trattativa.prezzo}
                  disabled={trattativa.inPrestito}
                  onChange={(e) => setTrattativa({ ...trattativa, prezzo: Number(e.target.value) })} />
              </label>
              <label>
                Bonus{' '}
                <input type="number" step={100_000} min={0} value={trattativa.bonus}
                  disabled={trattativa.inPrestito}
                  onChange={(e) => setTrattativa({ ...trattativa, bonus: Number(e.target.value) })} />
              </label>
              <label className="leva-spunta">
                <input type="checkbox" checked={trattativa.inPrestito}
                  onChange={(e) => setTrattativa({ ...trattativa, inPrestito: e.target.checked })} />
                Prestito
              </label>
              {trattativa.inPrestito && (
                <>
                  <label>
                    Riscatto{' '}
                    <input type="number" step={100_000} min={0} value={trattativa.diritto}
                      onChange={(e) => setTrattativa({ ...trattativa, diritto: Number(e.target.value) })} />
                  </label>
                  <label className="leva-spunta">
                    <input type="checkbox" checked={trattativa.obbligo}
                      onChange={(e) => setTrattativa({ ...trattativa, obbligo: e.target.checked })} />
                    Obbligo
                  </label>
                </>
              )}
              {!trattativa.inPrestito && (
                <label>
                  Contropartita{' '}
                  <select value={trattativa.contropartitaId}
                    onChange={(e) => setTrattativa({ ...trattativa, contropartitaId: e.target.value === '' ? '' : Number(e.target.value) })}>
                    <option value="">Nessuna</option>
                    {miaRosa.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.cognome} ({g.ruolo}, {euro(valoreInCarriera(carriera, g))})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button className="bottone-primario" onClick={() => void invia()}>Invia proposta</button>
            </div>
          )}
          <button className="bottone-secondario" onClick={() => setTrattativa(null)}>Chiudi</button>
        </div>
      )}

      {/* ── ricerca giocatori ── */}
      {m.aperto && !trattativa && (
        <>
          <h3>🔎 Cerca un rinforzo</h3>
          <div className="riga-bottoni">
            <input placeholder="Nome del giocatore (min 2 lettere)…" value={ricerca}
              onChange={(e) => setRicerca(e.target.value)} className="campo-ricerca" />
            <select value={filtroRuolo} onChange={(e) => setFiltroRuolo(e.target.value)}>
              <option value="">Tutti i ruoli</option>
              {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {risultati.length > 0 && (
            <table className="tabella">
              <thead>
                <tr><th>Giocatore</th><th>Ruolo</th><th className="num">Età</th><th className="num">Media</th><th>Club</th><th className="num">Scad.</th><th className="num">Valore</th><th></th></tr>
              </thead>
              <tbody>
                {risultati.map((g) => (
                  <tr key={g.id}>
                    <td className="grassetto">{g.nome} {g.cognome}</td>
                    <td>{g.ruolo}</td>
                    <td className="num">{calcolaEta(g.data_nascita)}</td>
                    <td className="num evidenza">{mediaComplessiva(g)}</td>
                    <td>{carriera.club.find((c) => c.id === clubDiGiocatore(carriera, g.id))?.nome}</td>
                    <td className="num">{carriera.contratti[g.id]?.scadenza}</td>
                    <td className="num">{euro(valoreInCarriera(carriera, g))}</td>
                    <td><button className="bottone-secondario" onClick={() => apriTrattativa(g)}>Tratta</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── svincolati ── */}
      {m.aperto && svincolati.length > 0 && !trattativa && (
        <>
          <h3>🆓 Svincolati</h3>
          <table className="tabella">
            <tbody>
              {svincolati.map((g) => (
                <tr key={g.id}>
                  <td className="grassetto">{g.nome} {g.cognome}</td>
                  <td>{g.ruolo}</td>
                  <td className="num">{calcolaEta(g.data_nascita)}</td>
                  <td className="num evidenza">{mediaComplessiva(g)}</td>
                  <td className="num">
                    <button className="bottone-secondario"
                      onClick={() => void applica(() => setAvviso(ingaggiaSvincolato(db, carriera, g.id)))}>
                      Ingaggia
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── la mia rosa: rinnovi e cedibili ── */}
      <h3>👥 La tua rosa (contratti)</h3>
      <table className="tabella">
        <thead>
          <tr><th>Giocatore</th><th>Ruolo</th><th className="num">Media</th><th className="num">Stipendio</th><th className="num">Scad.</th><th className="num">Valore</th><th></th></tr>
        </thead>
        <tbody>
          {miaRosa.map((g) => {
            const contratto = carriera.contratti[g.id]
            const inScadenza = anniContratto(carriera, g.id) === 0
            const cedibile = m.cedibili.includes(g.id)
            return (
              <tr key={g.id} className={inScadenza ? 'riga-scadenza' : ''}>
                <td className="grassetto">{g.nome} {g.cognome}{cedibile ? ' 🏷️' : ''}</td>
                <td>{g.ruolo}</td>
                <td className="num evidenza">{mediaComplessiva(g)}</td>
                <td className="num">{euro(contratto?.stipendio ?? 0)}</td>
                <td className="num">{contratto?.scadenza}{inScadenza ? ' ⚠️' : ''}</td>
                <td className="num">{euro(valoreInCarriera(carriera, g))}</td>
                <td className="num">
                  <button className="bottone-secondario"
                    onClick={() => void applica(() => setAvviso(rinnovaContratto(carriera, g.id)))}>
                    Rinnova
                  </button>{' '}
                  <button className="bottone-secondario"
                    onClick={() => void applica(() => {
                      m.cedibili = cedibile ? m.cedibili.filter((id) => id !== g.id) : [...m.cedibili, g.id]
                    })}>
                    {cedibile ? 'Non cedibile' : 'Cedibile'}
                  </button>
                  {m.aperto && (
                    <>
                      {' '}
                      <button className="bottone-secondario"
                        onClick={() => void applica(() => setAvviso(proponiCessione(db, carriera, g.id, 'vendita')))}>
                        Vendi
                      </button>{' '}
                      <button className="bottone-secondario"
                        onClick={() => void applica(() => setAvviso(proponiCessione(db, carriera, g.id, 'prestito')))}>
                        Prestito
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ── notiziario ── */}
      <h3>📰 Notiziario</h3>
      <ul className="notiziario">
        {m.notizie.slice(0, 40).map((n, i) => (
          <li key={i} className={`notizia ${n.tipo}`}>
            <span className="nota">[{n.quando}]</span> {n.testo}
          </li>
        ))}
        {m.notizie.length === 0 && <li className="nota">Nessuna notizia (ancora).</li>}
      </ul>
    </div>
  )
}

export default Mercato
