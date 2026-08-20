// SchermataCarriera.tsx — il cuore della milestone M2: la stagione a
// giornate. Tre linguette (Partite, Classifica, Rosa), l'avanzamento con
// salvataggio automatico, e il riepilogo di fine stagione.

import { useEffect, useState } from 'react'
import type { Database } from 'sql.js'
import {
  avanzaGiornata, calcolaClassifica, chiudiStagione, livelloUtente, stagioneFinita,
} from '../carriera/motore.ts'
import { tatticaDefault } from '../motore/preparazione.ts'
import { interroga } from '../db/query.ts'
import type { GiocatoreRiga } from '../db/tipi.ts'
import { salvaCarriera } from '../carriera/salvataggio.ts'
import {
  DESCRIZIONE_OBIETTIVO, etichettaStagione, type Carriera, type CronacaPartita,
  type Offerta, type Partita,
} from '../carriera/tipi.ts'
import { accettaOffertaPanchina } from '../carriera/fama.ts'
import { euro } from '../mercato/valore.ts'
import type { EventoPartita } from '../motore/tipi.ts'
import { estendiMercatoAlMondo, inizializzaMercato } from '../mercato/stato.ts'
import MatchDay from './MatchDay.tsx'
import Mercato from './Mercato.tsx'
import Rosa from './Rosa.tsx'
import Tattica from './Tattica.tsx'

/** Trasforma un evento del motore in una riga di cronaca in italiano. */
function rigaCronaca(e: EventoPartita): string {
  switch (e.tipo) {
    case 'gol':
      return `⚽ GOL! ${e.giocatoreNome}${e.assistNome ? ` (assist di ${e.assistNome})` : ''}`
    case 'occasione-parata':
      return `🧤 Grande parata di ${e.giocatoreNome}`
    case 'occasione-fuori':
      return `💨 Occasione! ${e.giocatoreNome} manda fuori di poco`
    case 'occasione-murata':
      return `🛡 Conclusione di ${e.giocatoreNome} respinta dalla difesa`
    case 'ammonizione':
      return `🟨 Ammonito ${e.giocatoreNome}`
    case 'espulsione':
      return `🟥 ESPULSO ${e.giocatoreNome}!`
    case 'infortunio':
      return `🚑 Problema fisico per ${e.giocatoreNome}`
  }
}

/** Il pannello con la cronaca dell'ultima partita dell'utente. */
function PannelloCronaca({ cronaca }: { cronaca: CronacaPartita }) {
  const { casa, trasferta } = cronaca.statistiche
  return (
    <div className="cronaca">
      <h3>
        La tua partita — giornata {cronaca.giornata}:{' '}
        {cronaca.casaNome} {cronaca.golCasa} - {cronaca.golTrasferta} {cronaca.trasfertaNome}
      </h3>
      <p className="nota">
        Possesso {casa.possesso}%-{trasferta.possesso}% · tiri {casa.tiri}-{trasferta.tiri} ·
        in porta {casa.tiriInPorta}-{trasferta.tiriInPorta} · gol attesi {casa.golAttesi.toFixed(2)}-{trasferta.golAttesi.toFixed(2)}
      </p>
      <ul className="eventi">
        {cronaca.eventi.map((e, i) => (
          <li key={i}>
            <span className="minuto">{e.minuto}'</span> {rigaCronaca(e)}
          </li>
        ))}
        {cronaca.eventi.length === 0 && <li>Partita senza emozioni degne di nota.</li>}
      </ul>
      <h3>Pagelle</h3>
      <p className="pagelle">
        {cronaca.voti.map((v) => (
          <span key={v.nome} className="pagella">
            {v.nome} <strong>{v.voto.toFixed(1)}</strong>
          </span>
        ))}
      </p>
    </div>
  )
}

interface Props {
  db: Database
  carriera: Carriera
}

type Linguetta = 'partite' | 'classifica' | 'mercato' | 'tattica' | 'rosa'

/** Riepilogo restituito da chiudiStagione, per la schermata di fine stagione. */
type EsitoStagione = ReturnType<typeof chiudiStagione>

function SchermataCarriera({ db, carriera }: Props) {
  const [linguetta, setLinguetta] = useState<Linguetta>('partite')
  const [esitoStagione, setEsitoStagione] = useState<EsitoStagione | null>(null)
  const [matchDayAperto, setMatchDayAperto] = useState(false)
  // contatore usato solo per forzare il ridisegno dopo aver mutato la carriera
  const [, setVersione] = useState(0)

  // I salvataggi migrati da versioni vecchie non hanno tattica e/o mercato:
  // li costruiamo (e salviamo) al primo accesso alla carriera
  useEffect(() => {
    let cambiata = false
    if (!carriera.tattica) {
      const rosa = interroga<GiocatoreRiga>(db, 'SELECT * FROM giocatore WHERE club_id = ?', [carriera.clubId])
      carriera.tattica = tatticaDefault(rosa)
      cambiata = true
    }
    if (!carriera.rose) {
      // v3 → v4 (M6): fotografa rose/contratti/budget; i club vecchi non
      // hanno i campi budget → li leggiamo dal DB statico
      for (const club of carriera.club) {
        if (club.budgetMercato === undefined) {
          const riga = interroga<{ b: number }>(db, 'SELECT budget_mercato AS b FROM club WHERE id = ?', [club.id])[0]
          club.budgetMercato = riga?.b ?? 1_000_000
          club.budgetMercatoIniziale = club.budgetMercato
        }
      }
      inizializzaMercato(db, carriera, false) // senza aprire la finestra a metà stagione
      cambiata = true
    }
    if (carriera.rose && carriera.club.some((c) => c.nazioneId === undefined)) {
      // v5 → v6: il mercato diventa mondiale — si aggiungono i club esteri
      // (con le loro rose) ai salvataggi vecchi, senza toccare i trasferimenti
      estendiMercatoAlMondo(db, carriera)
      cambiata = true
    }
    if (cambiata) {
      void salvaCarriera(carriera)
      setVersione((v) => v + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carriera])

  const nomeClub = carriera.club.find((c) => c.id === carriera.clubId)!.nome
  const nomeCompetizione = carriera.competizioni[livelloUtente(carriera)]
  const nomeDi = (id: number) => carriera.club.find((c) => c.id === id)!.nome

  // Avanza di una giornata (o fino a fine stagione) e salva
  async function gioca(fineStagione: boolean) {
    do {
      avanzaGiornata(db, carriera)
      // la corsa si ferma se si apre il mercato invernale (M6) o se
      // scatta un esonero (M8): c'è una decisione da prendere
    } while (fineStagione && !stagioneFinita(carriera) && !carriera.mercato.aperto && !carriera.offerteSpeciali)
    await salvaCarriera(carriera)
    setVersione((v) => v + 1)
  }

  async function concludiStagione() {
    setEsitoStagione(chiudiStagione(db, carriera))
    await salvaCarriera(carriera)
  }

  // ── M8: accettare una panchina nuova (dopo esonero o a fine stagione) ──
  async function accettaOfferta(offerta: Offerta) {
    accettaOffertaPanchina(db, carriera, offerta)
    await salvaCarriera(carriera)
    setVersione((v) => v + 1)
  }

  /** "Resta al club": chiude il riepilogo scartando le offerte ricevute. */
  async function restaEIniziaStagione() {
    if (carriera.offerteSpeciali?.contesto === 'fine-stagione') {
      carriera.offerteSpeciali = null
      await salvaCarriera(carriera)
    }
    setEsitoStagione(null)
  }

  // ── Match Day in corso: la vista partita prende tutto lo schermo ──
  // Al fischio finale la giornata avanza usando IL RISULTATO VISTO (che
  // include cambi e regolazioni fatte in diretta, M5); le altre partite
  // vengono simulate normalmente.
  if (matchDayAperto) {
    return (
      <MatchDay
        db={db}
        carriera={carriera}
        onFine={async (risultato) => {
          avanzaGiornata(db, carriera, risultato)
          await salvaCarriera(carriera)
          setMatchDayAperto(false)
          setVersione((v) => v + 1)
        }}
      />
    )
  }

  // ── ESONERO (M8): la decisione blocca tutto il resto ──
  if (carriera.offerteSpeciali?.contesto === 'esonero') {
    return (
      <section className="schermata">
        <h2>⚡ Esonerato</h2>
        <div className="riquadro-esito">
          <p>
            La dirigenza ha perso la pazienza: sei stato sollevato dall'incarico.
            La fama accusa il colpo (ora {carriera.famaAllenatore}), ma il telefono
            squilla già: questi club vogliono la svolta.
          </p>
        </div>
        <div className="menu">
          {carriera.offerteSpeciali.offerte.map((o) => (
            <button key={o.clubId} className="voce-menu" onClick={() => void accettaOfferta(o)}>
              <span className="voce-etichetta">{o.clubNome}</span>
              <span className="nota">
                obiettivo {DESCRIZIONE_OBIETTIVO[o.obiettivo]} · budget mercato {euro(o.budgetMercato)}
              </span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  // ── Riepilogo di fine stagione (dopo chiudiStagione) ──
  if (esitoStagione) {
    const offerte = carriera.offerteSpeciali?.contesto === 'fine-stagione'
      ? carriera.offerteSpeciali.offerte : []
    return (
      <section className="schermata">
        <h2>Stagione {etichettaStagione(carriera.anno - 1)} conclusa!</h2>
        <div className="riquadro-esito">
          <p>
            <strong>{nomeClub}</strong> chiude al{' '}
            <strong>{esitoStagione.posizione}° posto</strong> su {esitoStagione.totale}.
          </p>
          <p>
            Obiettivo ({DESCRIZIONE_OBIETTIVO[carriera.obiettivo]}):{' '}
            {esitoStagione.obiettivoRaggiunto ? '✅ raggiunto' : '❌ mancato'}
          </p>
          {esitoStagione.promosso && <p>🎉 <strong>PROMOZIONE!</strong> Si sale di categoria.</p>}
          {esitoStagione.retrocesso && <p>😞 <strong>Retrocessione.</strong> Si riparte dal basso.</p>}
          {esitoStagione.coppaVinta && <p>🏆 <strong>COPPA NAZIONALE VINTA!</strong> Un trofeo in bacheca.</p>}
        </div>

        {/* il bilancio spiegabile della fama (M8, FRD §12) */}
        {esitoStagione.eventiFama.length > 0 && (
          <div className="riquadro-esito">
            <h3>La tua fama ora: {esitoStagione.famaDopo}</h3>
            <p className="nota">Gli episodi che l'hanno mossa in stagione:</p>
            <ul>
              {esitoStagione.eventiFama.map((e, i) => (
                <li key={i}>{e.delta > 0 ? '➕' : '➖'} {e.descrizione} ({e.delta > 0 ? '+' : ''}{e.delta})</li>
              ))}
            </ul>
          </div>
        )}

        {/* crescita e declino della rosa (M8) */}
        {esitoStagione.crescita.length > 0 && (
          <div className="riquadro-esito">
            <h3>📈 La rosa cresce (e invecchia)</h3>
            <p className="nota">Potenziale, età, utilizzo e prestazioni muovono gli attributi a fine stagione.</p>
            <ul>
              {esitoStagione.crescita.slice(0, 5).map((n) => (
                <li key={n.giocatoreId}>📈 <strong>{n.nome}</strong> +{n.delta} (media {n.nuovaMedia})</li>
              ))}
              {esitoStagione.crescita.filter((n) => n.delta < 0).slice(-3).map((n) => (
                <li key={n.giocatoreId}>📉 {n.nome} {n.delta} (media {n.nuovaMedia})</li>
              ))}
            </ul>
          </div>
        )}

        {/* le offerte di fascia superiore sbloccate dalla fama (M8, FRD §4.3) */}
        {offerte.length > 0 && (
          <div className="riquadro-esito">
            <h3>📞 Ti cercano</h3>
            <p className="nota">La tua fama ({carriera.famaAllenatore}) apre porte nuove. Decidi prima della nuova stagione.</p>
            <div className="menu">
              {offerte.map((o) => (
                <button key={o.clubId} className="voce-menu"
                  onClick={() => { void accettaOfferta(o); setEsitoStagione(null) }}>
                  <span className="voce-etichetta">{o.clubNome}</span>
                  <span className="nota">
                    obiettivo {DESCRIZIONE_OBIETTIVO[o.obiettivo]} · budget mercato {euro(o.budgetMercato)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="bottone-primario" onClick={() => void restaEIniziaStagione()}>
          {offerte.length > 0 ? `Resta al ${nomeClub} — ` : ''}Inizia la stagione {etichettaStagione(carriera.anno)} →
        </button>
      </section>
    )
  }

  const finita = stagioneFinita(carriera)
  const ultimaGiocata: Partita[] | null =
    carriera.giornata > 0 ? carriera.calendario[carriera.giornata - 1] : null
  const prossima: Partita[] | null = finita ? null : carriera.calendario[carriera.giornata]
  const classifica = calcolaClassifica(carriera)

  return (
    <section className="schermata">
      <h2>{nomeClub} — {nomeCompetizione} {etichettaStagione(carriera.anno)}</h2>
      <p className="nota">
        Allenatore: {carriera.allenatore.nome} (fama {carriera.famaAllenatore ?? 20}
        {' '}· fiducia {carriera.fiducia ?? 55})
        {carriera.trofei && carriera.trofei.length > 0 && <> · 🏆 {carriera.trofei.length}</>} ·
        obiettivo: {DESCRIZIONE_OBIETTIVO[carriera.obiettivo]} ·
        giornata {Math.min(carriera.giornata + 1, carriera.calendario.length)} di {carriera.calendario.length}
        {' '}· salvataggio automatico attivo
      </p>

      {/* Linguette di navigazione interna */}
      <nav className="linguette">
        {(['partite', 'classifica', 'mercato', 'tattica', 'rosa'] as const).map((l) => (
          <button
            key={l}
            className={l === linguetta ? 'linguetta attiva' : 'linguetta'}
            onClick={() => setLinguetta(l)}
          >
            {l === 'partite' ? 'Partite' : l === 'classifica' ? 'Classifica'
              : l === 'mercato' ? (carriera.mercato?.aperto ? 'Mercato 🟢' : 'Mercato')
              : l === 'tattica' ? 'Tattica' : 'Rosa'}
          </button>
        ))}
      </nav>

      {linguetta === 'partite' && (
        <>
          {!finita && carriera.mercato?.aperto && (
            <p className="avviso">
              🟢 Il mercato {carriera.mercato.finestra === 'estiva' ? 'estivo' : 'invernale'} è aperto
              ({carriera.mercato.giorniRimasti} giorni): il campionato riprende alla chiusura.
              Vai alla linguetta <strong>Mercato</strong> per operare o far scorrere i giorni.
            </p>
          )}
          {!finita && !carriera.mercato?.aperto && (
            <div className="riga-bottoni">
              <button className="bottone-primario" onClick={() => setMatchDayAperto(true)}>
                🎥 Match Day — giornata {carriera.giornata + 1}
              </button>
              <button className="bottone-secondario" onClick={() => gioca(false)}>
                ▶ Simula giornata
              </button>
              <button className="bottone-secondario" onClick={() => gioca(true)}>
                ⏩ Simula fino a fine stagione
              </button>
            </div>
          )}
          {finita && (
            <div className="riga-bottoni">
              <button className="bottone-primario" onClick={concludiStagione}>
                🏁 Concludi la stagione (verdetti e nuova stagione)
              </button>
            </div>
          )}

          {/* offerte di fine stagione ancora sul tavolo (es. dopo un ricaricamento) */}
          {carriera.offerteSpeciali?.contesto === 'fine-stagione' && (
            <div className="riquadro-esito">
              <h3>📞 Ti cercano</h3>
              <div className="menu">
                {carriera.offerteSpeciali.offerte.map((o) => (
                  <button key={o.clubId} className="voce-menu" onClick={() => void accettaOfferta(o)}>
                    <span className="voce-etichetta">{o.clubNome}</span>
                    <span className="nota">obiettivo {DESCRIZIONE_OBIETTIVO[o.obiettivo]} · budget mercato {euro(o.budgetMercato)}</span>
                  </button>
                ))}
              </div>
              <button className="bottone-secondario" onClick={() => void restaEIniziaStagione()}>
                Resta al {nomeClub}
              </button>
            </div>
          )}

          {/* la coppa nazionale (M8): l'ultimo turno giocato e il prossimo */}
          {carriera.coppa && (() => {
            const coppa = carriera.coppa
            const ultimoGiocato = [...coppa.turni].reverse()
              .find((t) => t.partite.some((p) => p.golCasa !== null))
            const miaUltima = ultimoGiocato?.partite.find(
              (p) => p.casaId === carriera.clubId || p.trasfertaId === carriera.clubId)
            const inCorsa = coppa.vincitriceId === null
              ? !miaUltima || miaUltima.vincitriceId === carriera.clubId
              : coppa.vincitriceId === carriera.clubId
            const prossimoTurno = coppa.turni[coppa.prossimoTurno]
            return (
              <div className="riquadro-coppa">
                <h3>🏆 Coppa nazionale</h3>
                {coppa.vincitriceId !== null ? (
                  <p>{coppa.vincitriceId === carriera.clubId
                    ? <strong>COPPA VINTA! 🎉</strong>
                    : <>Vinta dal {nomeDi(coppa.vincitriceId)}.</>}</p>
                ) : (
                  <>
                    {miaUltima && ultimoGiocato && (
                      <p>
                        {ultimoGiocato.nome}: {nomeDi(miaUltima.casaId)} {miaUltima.golCasa}-{miaUltima.golTrasferta} {nomeDi(miaUltima.trasfertaId)}
                        {miaUltima.golCasa === miaUltima.golTrasferta ? ' (rigori)' : ''} —{' '}
                        {miaUltima.vincitriceId === carriera.clubId ? 'passiamo il turno! ✅' : 'eliminati ❌'}
                      </p>
                    )}
                    {inCorsa && prossimoTurno && (
                      <p className="nota">
                        {prossimoTurno.nome}: si gioca dopo la giornata {prossimoTurno.dopoGiornata}.
                      </p>
                    )}
                    {!inCorsa && <p className="nota">Il cammino in coppa è finito per quest'anno.</p>}
                  </>
                )}
              </div>
            )
          })()}

          {/* lo spogliatoio: le reazioni dei giocatori (M7, FRD §7) */}
          {carriera.messaggi && carriera.messaggi.length > 0 && (
            <div className="spogliatoio">
              <h3>📣 Spogliatoio</h3>
              {carriera.messaggi.slice(0, 6).map((msg, i) => (
                <p key={i} className={`msg-spogliatoio ${msg.tono}`}>
                  <span className="nota">[g. {msg.giornata}]</span> <strong>{msg.giocatoreNome}</strong> {msg.testo}
                </p>
              ))}
            </div>
          )}

          {carriera.cronaca && <PannelloCronaca cronaca={carriera.cronaca} />}

          {ultimaGiocata && (
            <>
              <h3>Risultati — giornata {carriera.giornata}</h3>
              <table className="tabella">
                <tbody>
                  {ultimaGiocata.map((p, i) => (
                    <tr key={i} className={p.casaId === carriera.clubId || p.trasfertaId === carriera.clubId ? 'riga-mia' : ''}>
                      <td>{nomeDi(p.casaId)}</td>
                      <td className="num grassetto">{p.golCasa} - {p.golTrasferta}</td>
                      <td>{nomeDi(p.trasfertaId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {prossima && (
            <>
              <h3>Prossima giornata — {carriera.giornata + 1}</h3>
              <table className="tabella">
                <tbody>
                  {prossima.map((p, i) => (
                    <tr key={i} className={p.casaId === carriera.clubId || p.trasfertaId === carriera.clubId ? 'riga-mia' : ''}>
                      <td>{nomeDi(p.casaId)}</td>
                      <td className="num">vs</td>
                      <td>{nomeDi(p.trasfertaId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {linguetta === 'classifica' && (
        <table className="tabella">
          <thead>
            <tr>
              <th className="num">#</th><th>Squadra</th><th className="num">Pt</th>
              <th className="num">G</th><th className="num">V</th><th className="num">N</th>
              <th className="num">P</th><th className="num">GF</th><th className="num">GS</th>
            </tr>
          </thead>
          <tbody>
            {classifica.map((r, i) => (
              <tr key={r.clubId} className={r.clubId === carriera.clubId ? 'riga-mia' : ''}>
                <td className="num">{i + 1}</td>
                <td className="grassetto">{r.nome}</td>
                <td className="num grassetto">{r.punti}</td>
                <td className="num">{r.giocate}</td>
                <td className="num">{r.vinte}</td>
                <td className="num">{r.pareggiate}</td>
                <td className="num">{r.perse}</td>
                <td className="num">{r.golFatti}</td>
                <td className="num">{r.golSubiti}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {linguetta === 'mercato' && carriera.mercato && (
        <Mercato db={db} carriera={carriera} onModificata={() => setVersione((v) => v + 1)} />
      )}

      {linguetta === 'tattica' && carriera.tattica && (
        <Tattica db={db} carriera={carriera} onModificata={() => setVersione((v) => v + 1)} />
      )}

      {linguetta === 'rosa' && (
        <Rosa
          db={db}
          squadra={{ tipo: 'club', id: carriera.clubId }}
          giocatoriIds={carriera.rose?.[carriera.clubId]}
          crescita={carriera.crescita}
          onApriGiocatore={() => {}}
        />
      )}
    </section>
  )
}

export default SchermataCarriera
