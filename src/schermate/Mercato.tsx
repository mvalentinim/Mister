// Mercato.tsx — la schermata del mercato (M6, FRD §6):
// finestre e giorni di mercato, ricerca giocatori con trattativa a 5 leve
// (max 3 round, rifiuti motivati), offerte ricevute dai club IA, gestione
// della propria rosa (rinnovi, cedibili), svincolati e notiziario.

import { useMemo, useState } from 'react'
import type { Database } from 'sql.js'
import type { Carriera } from '../carriera/tipi.ts'
import { salvaCarriera } from '../carriera/salvataggio.ts'
import { nazionalitaInItaliano } from '../db/nazionalita.ts'
import { calcolaEta, mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import {
  accettaOfferta, eseguiAcquisto, giornoDiMercato, ingaggiaSvincolato,
  proponiCessione, rinnovaContratto, valutaProposta, type Proposta, type Risposta,
} from '../mercato/ia.ts'
import {
  anniContratto, giocatoriPerId, monteStipendi, rosaClub, valoreInCarriera,
} from '../mercato/stato.ts'
import { stipendioAttesoSvincolato } from '../mercato/ia.ts'
import { euro } from '../mercato/valore.ts'
import { registraPromessa } from '../comportamento/comportamento.ts'
import { suona } from '../design/suoni.ts'
import type { OffertaIngaggio } from '../trattativa/interesse.ts'
import DialogoIngaggio from './DialogoIngaggio.tsx'

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

/** I criteri con cui si può ordinare la ricerca. */
type ChiaveOrdinamento = 'valore' | 'media' | 'scadenza' | 'eta'

function Mercato({ db, carriera, onModificata }: Props) {
  const m = carriera.mercato
  const [ricerca, setRicerca] = useState('')
  const [filtroRuolo, setFiltroRuolo] = useState('')
  const [filtroSquadra, setFiltroSquadra] = useState<number | ''>('')
  const [filtroCampionato, setFiltroCampionato] = useState('')
  const [filtroNazione, setFiltroNazione] = useState('')
  // incrementato dopo ogni operazione: fa ricalcolare il bacino della ricerca
  const [versioneRose, setVersioneRose] = useState(0)
  const [mediaMin, setMediaMin] = useState('') // tenuti come testo: campo vuoto = nessun filtro
  const [etaMax, setEtaMax] = useState('')
  const [scadenzaEntro, setScadenzaEntro] = useState<number | ''>('')
  const [ordina, setOrdina] = useState<ChiaveOrdinamento>('valore')
  const [decrescente, setDecrescente] = useState(true)
  const [trattativa, setTrattativa] = useState<Trattativa | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)
  // trattativa col GIOCATORE (M7): dopo l'accordo col club, o per gli svincolati
  const [ingaggio, setIngaggio] = useState<
    | { tipo: 'acquisto'; proposta: Proposta; giocatore: GiocatoreRiga }
    | { tipo: 'svincolato'; giocatore: GiocatoreRiga }
    | null
  >(null)

  const miaRosa = rosaClub(db, carriera, carriera.clubId)
    .sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a))
  const stipendiUsati = monteStipendi(carriera)

  async function applica(modifica: () => void) {
    modifica()
    await salvaCarriera(carriera)
    setVersioneRose((v) => v + 1) // le rose possono essere cambiate
    onModificata()
  }

  // ── ricerca: TUTTI i giocatori del mondo (mercato mondiale) ──
  // Col mercato aperto su ~200 club (≈6.000 giocatori) il bacino non si può
  // ricostruire a ogni tasto premuto: lo si fotografa una volta (useMemo) e
  // lo si rinfresca solo dopo un'operazione di mercato (versioneRose).
  const tuttiGliAltri = useMemo(() => {
    const bacino: { g: GiocatoreRiga; club: string; clubId: number; campionato: string }[] = []
    for (const club of carriera.club) {
      if (club.id === carriera.clubId) continue
      for (const g of rosaClub(db, carriera, club.id)) {
        bacino.push({ g, club: club.nome, clubId: club.id, campionato: club.campionato ?? '' })
      }
    }
    return bacino
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, carriera, versioneRose])

  // le opzioni dei filtri, ricavate dal bacino reale
  const nazionalita = useMemo(
    () => [...new Set(tuttiGliAltri.map(({ g }) => g.nazionalita))]
      .sort((a, b) => nazionalitaInItaliano(a).localeCompare(nazionalitaInItaliano(b))),
    [tuttiGliAltri],
  )
  const campionati = useMemo(
    () => [...new Set(carriera.club.map((c) => c.campionato).filter(Boolean))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [carriera, versioneRose],
  )

  // La ricerca parte solo quando c'è almeno un criterio: così la schermata
  // non mostra 6.000 giocatori a caso appena la apri.
  const ricercaAttiva =
    ricerca.length >= 2 || filtroRuolo !== '' || filtroSquadra !== '' ||
    filtroCampionato !== '' || filtroNazione !== '' ||
    mediaMin !== '' || etaMax !== '' || scadenzaEntro !== ''

  /** Il valore usato per ordinare, in base al criterio scelto. */
  function chiave(g: GiocatoreRiga): number {
    if (ordina === 'media') return mediaComplessiva(g)
    if (ordina === 'eta') return calcolaEta(g.data_nascita)
    if (ordina === 'scadenza') return carriera.contratti[g.id]?.scadenza ?? 9999
    return valoreInCarriera(carriera, g)
  }

  const filtrati = !ricercaAttiva ? [] : tuttiGliAltri.filter(({ g, clubId, campionato }) =>
    (filtroSquadra === '' || clubId === filtroSquadra) &&
    (!filtroCampionato || campionato === filtroCampionato) &&
    (!filtroRuolo || g.ruolo === filtroRuolo) &&
    (!filtroNazione || g.nazionalita === filtroNazione) &&
    (mediaMin === '' || mediaComplessiva(g) >= Number(mediaMin)) &&
    (etaMax === '' || calcolaEta(g.data_nascita) <= Number(etaMax)) &&
    (scadenzaEntro === '' || (carriera.contratti[g.id]?.scadenza ?? 9999) <= scadenzaEntro) &&
    (ricerca.length < 2 || `${g.nome} ${g.cognome}`.toLowerCase().includes(ricerca.toLowerCase())),
  )
  // il valore di ordinamento si calcola UNA volta per riga (non a ogni
  // confronto del sort: su migliaia di righe farebbe la differenza)
  const risultati = filtrati
    .map((r) => ({ ...r, ordine: chiave(r.g) }))
    .sort((a, b) => (decrescente ? b.ordine - a.ordine : a.ordine - b.ordine))
    .slice(0, 30)

  /** Cambia criterio di ordinamento scegliendo anche il verso più naturale:
      valore e media dal più alto, scadenza ed età dal più basso. */
  function cambiaOrdinamento(nuova: ChiaveOrdinamento) {
    setOrdina(nuova)
    setDecrescente(nuova === 'valore' || nuova === 'media')
  }

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
      // accordo tra club trovato: ora serve il SÌ del giocatore (M7, FRD §6.3)
      setTrattativa({
        ...t, chiusa: true,
        storia: [...t.storia, `🤝 Accordo tra i club! Ora devi convincere ${t.giocatore.cognome} a firmare.`],
      })
      setIngaggio({ tipo: 'acquisto', proposta, giocatore: t.giocatore })
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

  /** Chiusura della trattativa col giocatore: firma (con promesse registrate)
      o rifiuto. Il contratto è quello negoziato nel dialogo. */
  async function concludiIngaggio(esito: { firmato: boolean; offerta: OffertaIngaggio }) {
    await applica(() => {
      if (!ingaggio || !esito.firmato) return
      const contratto = { stipendio: esito.offerta.stipendio, durataAnni: esito.offerta.durataAnni }
      const errore =
        ingaggio.tipo === 'acquisto'
          ? eseguiAcquisto(db, carriera, ingaggio.proposta, contratto)
          : ingaggiaSvincolato(db, carriera, ingaggio.giocatore.id, contratto)
      if (errore) {
        setAvviso(errore)
        return
      }
      // le promesse fatte diventano impegni verificabili (FRD §6.3)
      for (const leva of esito.offerta.leve) {
        if (leva !== 'fascia') registraPromessa(carriera, ingaggio.giocatore.id, leva)
      }
      carriera.morale[ingaggio.giocatore.id] = 65 // arriva carico
      suona('mercato') // il din-din del colpo di mercato (§5)
    })
    setIngaggio(null)
    setTrattativa(null)
  }

  const RUOLI = ['POR', 'DC', 'TD', 'TS', 'MED', 'CC', 'TRQ', 'ED', 'ES', 'PC']
  const svincolati = giocatoriPerId(db, carriera.svincolati, carriera)
    .sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a))
    .slice(0, 20)

  return (
    <div className="mercato">
      {/* ── stato della finestra e budget ── */}
      <div className="mercato-testata">
        <div>
          {m.aperto ? (
            <strong>MERCATO {m.finestra === 'estiva' ? 'ESTIVO' : 'INVERNALE'} APERTO — {m.giorniRimasti} giorni rimasti</strong>
          ) : (
            <strong>Mercato chiuso (riapre {carriera.giornata < carriera.calendario.length / 2 ? 'a gennaio' : 'in estate'})</strong>
          )}
          <p className="nota">
            Budget mercato: <strong>{euro(carriera.budget.mercato)}</strong> · monte stipendi:{' '}
            {euro(stipendiUsati)} / {euro(carriera.budget.stipendi)}
          </p>
        </div>
        {m.aperto && (
          <div className="riga-bottoni">
            <button className="bottone-primario" onClick={() => void applica(() => giornoDiMercato(db, carriera))}>
              Avanza un giorno
            </button>
            <button
              className="bottone-secondario"
              onClick={() => void applica(() => { while (carriera.mercato.aperto) giornoDiMercato(db, carriera) })}
            >
              Fino a chiusura
            </button>
          </div>
        )}
      </div>

      {/* il TICKER (§6): le ultime notizie scorrono come su un telex */}
      {m.notizie.length > 0 && (
        <div className="ticker-mercato" aria-hidden>
          <span className="ticker-etichetta">Ultim'ora</span>
          <span className="ticker-testo">
            <span>
              {m.notizie.slice(0, 8).map((n) => `+++ ${n.testo}`).join('  ')} +++
            </span>
          </span>
        </div>
      )}

      {avviso && <p className="avviso">{avviso}</p>}

      {/* ── offerte ricevute ── */}
      {m.offerteRicevute.length > 0 && (
        <>
          <h3>Offerte ricevute</h3>
          <table className="tabella">
            <tbody>
              {m.offerteRicevute.map((o) => {
                const g = giocatoriPerId(db, [o.giocatoreId], carriera)[0]
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
                      <button
                        className="bottone-primario"
                        onClick={() => void applica(() => { accettaOfferta(db, carriera, o.id); suona('mercato') })}
                      >
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

      {/* ── trattativa col giocatore (M7) ── */}
      {ingaggio && (
        <DialogoIngaggio
          db={db}
          carriera={carriera}
          giocatore={ingaggio.giocatore}
          stipendioIniziale={
            ingaggio.tipo === 'svincolato'
              ? stipendioAttesoSvincolato(carriera, ingaggio.giocatore)
              : Math.round((carriera.contratti[ingaggio.giocatore.id]?.stipendio ?? 300_000) * 1.15)
          }
          titolo={`Convinci ${ingaggio.giocatore.nome} ${ingaggio.giocatore.cognome} a firmare`}
          onEsito={(esito) => void concludiIngaggio(esito)}
        />
      )}

      {/* ── ricerca giocatori ── */}
      {m.aperto && !trattativa && !ingaggio && (
        <>
          <h3>Cerca un rinforzo</h3>
          {/* prima riga: chi cerchi (nome, squadra, ruolo, nazionalità) */}
          <div className="riga-bottoni filtri-mercato">
            <input placeholder="Nome del giocatore (min 2 lettere)…" value={ricerca}
              onChange={(e) => setRicerca(e.target.value)} className="campo-ricerca" />
            <select value={filtroCampionato}
              onChange={(e) => { setFiltroCampionato(e.target.value); setFiltroSquadra('') }}>
              <option value="">Tutti i campionati</option>
              {campionati.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select value={filtroSquadra} onChange={(e) => setFiltroSquadra(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Tutte le squadre</option>
              {/* raggruppate per campionato (o solo quello filtrato) */}
              {campionati
                .filter((k) => !filtroCampionato || k === filtroCampionato)
                .map((k) => (
                  <optgroup key={k} label={k}>
                    {carriera.club
                      .filter((c) => c.campionato === k && c.id !== carriera.clubId)
                      .sort((a, b) => a.nome.localeCompare(b.nome))
                      .map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </optgroup>
                ))}
            </select>
            <select value={filtroRuolo} onChange={(e) => setFiltroRuolo(e.target.value)}>
              <option value="">Tutti i ruoli</option>
              {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filtroNazione} onChange={(e) => setFiltroNazione(e.target.value)}>
              <option value="">Tutte le nazionalità</option>
              {nazionalita.map((n) => <option key={n} value={n}>{nazionalitaInItaliano(n)}</option>)}
            </select>
          </div>
          {/* seconda riga: filtri numerici e ordinamento */}
          <div className="riga-bottoni filtri-mercato">
            <label>Media min{' '}
              <input type="number" min={40} max={99} value={mediaMin} className="campo-numero"
                onChange={(e) => setMediaMin(e.target.value)} />
            </label>
            <label>Età max{' '}
              <input type="number" min={15} max={45} value={etaMax} className="campo-numero"
                onChange={(e) => setEtaMax(e.target.value)} />
            </label>
            <label>Scadenza entro{' '}
              <select value={scadenzaEntro} onChange={(e) => setScadenzaEntro(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">—</option>
                {[1, 2, 3, 4].map((n) => <option key={n} value={carriera.anno + n}>{carriera.anno + n}</option>)}
              </select>
            </label>
            <label>Ordina per{' '}
              <select value={ordina} onChange={(e) => cambiaOrdinamento(e.target.value as ChiaveOrdinamento)}>
                <option value="valore">Valore di mercato</option>
                <option value="media">Media (valore generale)</option>
                <option value="scadenza">Scadenza contratto</option>
                <option value="eta">Età</option>
              </select>
            </label>
            <button className="bottone-secondario" title="Inverti l'ordinamento"
              onClick={() => setDecrescente((d) => !d)}>
              {decrescente ? '↓ decrescente' : '↑ crescente'}
            </button>
          </div>
          {ricercaAttiva && risultati.length === 0 && (
            <p className="nota">Nessun giocatore trovato con questi filtri.</p>
          )}
          {risultati.length > 0 && (
            <>
              {filtrati.length > risultati.length && (
                <p className="nota">Mostro i primi {risultati.length} di {filtrati.length} risultati: restringi i filtri o cambia ordinamento.</p>
              )}
              <table className="tabella">
                <thead>
                  <tr><th>Giocatore</th><th>Ruolo</th><th>Naz.</th><th className="num">Età</th><th className="num">Media</th><th>Club</th><th className="num">Scad.</th><th className="num">Valore</th><th></th></tr>
                </thead>
                <tbody>
                  {risultati.map(({ g, club }) => (
                    <tr key={g.id}>
                      <td className="grassetto">{g.nome} {g.cognome}</td>
                      <td>{g.ruolo}</td>
                      <td>{nazionalitaInItaliano(g.nazionalita)}</td>
                      <td className="num">{calcolaEta(g.data_nascita)}</td>
                      <td className="num evidenza">{mediaComplessiva(g)}</td>
                      <td>{club}</td>
                      <td className="num">{carriera.contratti[g.id]?.scadenza}</td>
                      <td className="num">{euro(valoreInCarriera(carriera, g))}</td>
                      <td><button className="bottone-secondario" onClick={() => apriTrattativa(g)}>Tratta</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {/* ── svincolati ── */}
      {m.aperto && svincolati.length > 0 && !trattativa && !ingaggio && (
        <>
          <h3>🆓 Svincolati</h3>
          <table className="tabella">
            <tbody>
              {svincolati.map((g) => (
                <tr key={g.id}>
                  <td className="grassetto">{g.categoria !== 'normale' ? '★ ' : ''}{g.nome} {g.cognome}</td>
                  <td>{g.ruolo}</td>
                  <td className="num">{calcolaEta(g.data_nascita)}</td>
                  <td className="num evidenza">{mediaComplessiva(g)}</td>
                  <td className="num">
                    <button className="bottone-secondario"
                      onClick={() => setIngaggio({ tipo: 'svincolato', giocatore: g })}>
                      Tratta l'ingaggio
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── la mia rosa: rinnovi e cedibili ── */}
      <h3>La tua rosa (contratti)</h3>
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
      <h3>Notiziario</h3>
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
