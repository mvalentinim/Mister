// SchermataCarriera.tsx — il cuore della milestone M2: la stagione a
// giornate. Tre linguette (Partite, Classifica, Rosa), l'avanzamento con
// salvataggio automatico, e il riepilogo di fine stagione.

import { useState } from 'react'
import type { Database } from 'sql.js'
import {
  avanzaGiornata, calcolaClassifica, chiudiStagione, livelloUtente, stagioneFinita,
} from '../carriera/motore.ts'
import { salvaCarriera } from '../carriera/salvataggio.ts'
import {
  DESCRIZIONE_OBIETTIVO, etichettaStagione, type Carriera, type CronacaPartita, type Partita,
} from '../carriera/tipi.ts'
import type { EventoPartita } from '../motore/tipi.ts'
import Rosa from './Rosa.tsx'

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

type Linguetta = 'partite' | 'classifica' | 'rosa'

/** Riepilogo restituito da chiudiStagione, per la schermata di fine stagione. */
type EsitoStagione = ReturnType<typeof chiudiStagione>

function SchermataCarriera({ db, carriera }: Props) {
  const [linguetta, setLinguetta] = useState<Linguetta>('partite')
  const [esitoStagione, setEsitoStagione] = useState<EsitoStagione | null>(null)
  // contatore usato solo per forzare il ridisegno dopo aver mutato la carriera
  const [, setVersione] = useState(0)

  const nomeClub = carriera.club.find((c) => c.id === carriera.clubId)!.nome
  const nomeCompetizione = carriera.competizioni[livelloUtente(carriera)]
  const nomeDi = (id: number) => carriera.club.find((c) => c.id === id)!.nome

  // Avanza di una giornata (o fino a fine stagione) e salva
  async function gioca(fineStagione: boolean) {
    do {
      avanzaGiornata(db, carriera)
    } while (fineStagione && !stagioneFinita(carriera))
    await salvaCarriera(carriera)
    setVersione((v) => v + 1)
  }

  async function concludiStagione() {
    setEsitoStagione(chiudiStagione(db, carriera))
    await salvaCarriera(carriera)
  }

  // ── Riepilogo di fine stagione (dopo chiudiStagione) ──
  if (esitoStagione) {
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
        </div>
        <button className="bottone-primario" onClick={() => setEsitoStagione(null)}>
          Inizia la stagione {etichettaStagione(carriera.anno)} →
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
        Allenatore: {carriera.allenatore.nome} · obiettivo: {DESCRIZIONE_OBIETTIVO[carriera.obiettivo]} ·
        giornata {Math.min(carriera.giornata + 1, carriera.calendario.length)} di {carriera.calendario.length}
        {' '}· salvataggio automatico attivo
      </p>

      {/* Linguette di navigazione interna */}
      <nav className="linguette">
        {(['partite', 'classifica', 'rosa'] as const).map((l) => (
          <button
            key={l}
            className={l === linguetta ? 'linguetta attiva' : 'linguetta'}
            onClick={() => setLinguetta(l)}
          >
            {l === 'partite' ? 'Partite' : l === 'classifica' ? 'Classifica' : 'Rosa'}
          </button>
        ))}
      </nav>

      {linguetta === 'partite' && (
        <>
          {!finita && (
            <div className="riga-bottoni">
              <button className="bottone-primario" onClick={() => gioca(false)}>
                ▶ Gioca giornata {carriera.giornata + 1}
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

      {linguetta === 'rosa' && (
        <Rosa db={db} squadra={{ tipo: 'club', id: carriera.clubId }} onApriGiocatore={() => {}} />
      )}
    </section>
  )
}

export default SchermataCarriera
