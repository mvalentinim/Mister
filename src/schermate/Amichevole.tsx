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

function Amichevole({ db }: Props) {
  const [sceltaA, setSceltaA] = useState<Scelta>('')
  const [sceltaB, setSceltaB] = useState<Scelta>('')
  const [risultato, setRisultato] = useState<{ esito: RisultatoPartita; nomeA: string; nomeB: string } | null>(null)

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

  const opzioni = (valore: Scelta, cambia: (v: Scelta) => void) => (
    <select value={valore} onChange={(e) => cambia(e.target.value)}>
      <option value="">Scegli una squadra…</option>
      {legend.length > 0 && (
        <optgroup label="⭐ Squadre Legend">
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
      <h2>🤝 Amichevole</h2>
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
