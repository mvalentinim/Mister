// Amichevole.tsx — le amichevoli (M9, FRD §5.3): qualunque squadra contro
// qualunque squadra, incluse le squadre Legend create con l'editor.
// La partita usa il motore vero (attributi, tattica 4-4-2 automatica);
// il risultato non tocca nessuna carriera: è un'esibizione.

import { useMemo, useState } from 'react'
import type { Database } from 'sql.js'
import { interroga } from '../db/database.ts'
import { preparaSquadra } from '../motore/preparazione.ts'
import { simulaPartitaMotore } from '../motore/partita.ts'
import type { EventoPartita, RisultatoPartita } from '../motore/tipi.ts'
import { rosaLegendIds, squadreLegend } from '../db/legends.ts'

interface Props {
  db: Database
}

/** Una squadra selezionabile: "legend:3" oppure "club:67". */
type Scelta = string

function testoEvento(e: EventoPartita): string {
  switch (e.tipo) {
    case 'gol': return `⚽ GOL! ${e.giocatoreNome}${e.assistNome ? ` (assist di ${e.assistNome})` : ''}`
    case 'occasione-parata': return `🧤 Grande parata su ${e.giocatoreNome}`
    case 'occasione-fuori': return `💨 ${e.giocatoreNome} manda fuori di poco`
    case 'occasione-murata': return `🛡 Conclusione di ${e.giocatoreNome} respinta`
    case 'ammonizione': return `🟨 Ammonito ${e.giocatoreNome}`
    case 'espulsione': return `🟥 ESPULSO ${e.giocatoreNome}!`
    case 'infortunio': return `🚑 Problema fisico per ${e.giocatoreNome}`
  }
}

/** Un turno del torneo fantasy, già giocato. */
interface TurnoTorneo {
  nome: string
  partite: Array<{ a: string; b: string; golA: number; golB: number; vincitrice: string; rigori: boolean }>
}

function Amichevole({ db }: Props) {
  const [sceltaA, setSceltaA] = useState<Scelta>('')
  const [sceltaB, setSceltaB] = useState<Scelta>('')
  const [risultato, setRisultato] = useState<{ esito: RisultatoPartita; nomeA: string; nomeB: string } | null>(null)
  // torneo fantasy
  const [partecipanti, setPartecipanti] = useState<Scelta[]>([])
  const [torneo, setTorneo] = useState<{ turni: TurnoTorneo[]; campione: string } | null>(null)

  const legend = useMemo(() => squadreLegend(db), [db])
  const club = useMemo(
    () => interroga<{ id: number; nome: string; campionato: string }>(
      db,
      `SELECT c.id, c.nome, k.nome AS campionato FROM club c
       JOIN competizione k ON k.id = c.competizione_id ORDER BY k.nome, c.nome`,
    ),
    [db],
  )
  const campionati = useMemo(() => [...new Set(club.map((c) => c.campionato))], [club])

  function nomeDi(scelta: Scelta): string {
    const [tipo, id] = scelta.split(':')
    return tipo === 'legend'
      ? legend.find((s) => s.id === Number(id))?.nome ?? '?'
      : club.find((c) => c.id === Number(id))?.nome ?? '?'
  }

  /** Prepara una squadra per il motore (Legend = rosa dalle tabelle dedicate). */
  function squadra(scelta: Scelta) {
    const [tipo, id] = scelta.split(':')
    return tipo === 'legend'
      ? preparaSquadra(db, -Number(id), nomeDi(scelta), undefined, rosaLegendIds(db, Number(id)))
      : preparaSquadra(db, Number(id), nomeDi(scelta))
  }

  function gioca() {
    if (!sceltaA || !sceltaB || sceltaA === sceltaB) return
    const esito = simulaPartitaMotore(
      squadra(sceltaA), squadra(sceltaB),
      `amichevole-${Date.now()}`, // ogni amichevole è una storia a sé
    )
    setRisultato({ esito, nomeA: nomeDi(sceltaA), nomeB: nomeDi(sceltaB) })
  }

  /** Il torneo fantasy: 4 o 8 squadre, eliminazione diretta secca. */
  function giocaTorneo() {
    let inCorsa = [...partecipanti].sort(() => Math.random() - 0.5)
    const nomiTurni = inCorsa.length === 8 ? ['Quarti di finale', 'Semifinali', 'Finale'] : ['Semifinali', 'Finale']
    const turni: TurnoTorneo[] = []
    for (const nomeTurno of nomiTurni) {
      const turno: TurnoTorneo = { nome: nomeTurno, partite: [] }
      const vincitrici: Scelta[] = []
      for (let i = 0; i < inCorsa.length; i += 2) {
        const esito = simulaPartitaMotore(
          squadra(inCorsa[i]), squadra(inCorsa[i + 1]),
          `torneo-fantasy-${Date.now()}-${nomeTurno}-${i}`,
        )
        const pari = esito.golCasa === esito.golTrasferta
        const vincitrice = esito.golCasa > esito.golTrasferta || (pari && Math.random() < 0.5)
          ? inCorsa[i] : inCorsa[i + 1]
        turno.partite.push({
          a: nomeDi(inCorsa[i]), b: nomeDi(inCorsa[i + 1]),
          golA: esito.golCasa, golB: esito.golTrasferta,
          vincitrice: nomeDi(vincitrice), rigori: pari,
        })
        vincitrici.push(vincitrice)
      }
      turni.push(turno)
      inCorsa = vincitrici
    }
    setTorneo({ turni, campione: nomeDi(inCorsa[0]) })
  }

  const opzioni = (valore: Scelta, cambia: (v: Scelta) => void) => (
    <select value={valore} onChange={(e) => cambia(e.target.value)}>
      <option value="">Scegli una squadra…</option>
      {legend.length > 0 && (
        <optgroup label="★ Squadre Legend">
          {legend.map((s) => <option key={s.id} value={`legend:${s.id}`}>{s.nome}</option>)}
        </optgroup>
      )}
      {campionati.map((k) => (
        <optgroup key={k} label={k}>
          {club.filter((c) => c.campionato === k).map((c) => (
            <option key={c.id} value={`club:${c.id}`}>{c.nome}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )

  return (
    <section className="schermata">
      <h2>Amichevole</h2>
      <p className="nota">
        Qualunque sfida ti venga in mente: le squadre Legend contro i club di
        oggi, o le leggende tra loro. Il risultato non tocca le carriere.
      </p>
      <div className="riga-bottoni filtri-mercato">
        {opzioni(sceltaA, setSceltaA)}
        <span className="nota">contro</span>
        {opzioni(sceltaB, setSceltaB)}
        <button className="bottone-primario" disabled={!sceltaA || !sceltaB || sceltaA === sceltaB}
          onClick={gioca}>
          ⚽ Gioca l'amichevole
        </button>
      </div>

      {/* ── il torneo fantasy (FRD §5.3) ── */}
      <h3>Torneo fantasy</h3>
      <p className="nota">Scegli 4 oppure 8 squadre: eliminazione diretta secca, il tabellone si gioca in un colpo.</p>
      <div className="riga-bottoni filtri-mercato">
        {opzioni('', (v) => { if (v && !partecipanti.includes(v) && partecipanti.length < 8) setPartecipanti([...partecipanti, v]) })}
        <span className="nota">
          {partecipanti.length === 0 ? 'nessuna squadra scelta' : partecipanti.map(nomeDi).join(' · ')}
        </span>
        {partecipanti.length > 0 && (
          <button className="bottone-secondario" onClick={() => { setPartecipanti([]); setTorneo(null) }}>Svuota</button>
        )}
        <button className="bottone-primario"
          disabled={partecipanti.length !== 4 && partecipanti.length !== 8}
          onClick={giocaTorneo}>
          Gioca il torneo ({partecipanti.length}/4 o 8)
        </button>
      </div>
      {torneo && (
        <div className="cronaca">
          <h3>{torneo.campione} vince il torneo!</h3>
          {torneo.turni.map((t) => (
            <div key={t.nome}>
              <h4>{t.nome}</h4>
              {t.partite.map((p, i) => (
                <p key={i} className="nota">
                  {p.a} <strong>{p.golA} - {p.golB}</strong> {p.b}
                  {p.rigori ? ` (rigori: passa ${p.vincitrice})` : ''}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {risultato && (
        <div className="cronaca">
          <h3>
            {risultato.nomeA} {risultato.esito.golCasa} - {risultato.esito.golTrasferta} {risultato.nomeB}
          </h3>
          <p className="nota">
            Possesso {risultato.esito.statistiche.casa.possesso}%-{risultato.esito.statistiche.trasferta.possesso}% ·
            tiri {risultato.esito.statistiche.casa.tiri}-{risultato.esito.statistiche.trasferta.tiri} ·
            in porta {risultato.esito.statistiche.casa.tiriInPorta}-{risultato.esito.statistiche.trasferta.tiriInPorta}
          </p>
          <ul className="eventi">
            {risultato.esito.eventi.filter((e) => e.tipo !== 'occasione-murata').map((e, i) => (
              <li key={i}><span className="minuto">{e.minuto}'</span> {testoEvento(e)}</li>
            ))}
          </ul>
          <h3>Pagelle</h3>
          {(['casa', 'trasferta'] as const).map((lato) => (
            <p className="pagelle" key={lato}>
              <strong>{lato === 'casa' ? risultato.nomeA : risultato.nomeB}:</strong>{' '}
              {risultato.esito.pagelle[lato].map((p) => (
                <span key={p.nome} className="pagella">{p.nome} <strong>{p.voto.toFixed(1)}</strong></span>
              ))}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}

export default Amichevole
