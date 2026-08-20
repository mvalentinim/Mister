// ElencoSquadre.tsx — la schermata con tutte le squadre, per competizione.
// Cliccando una squadra si apre la sua rosa.

import type { Database } from 'sql.js'
import { interroga } from '../db/database.ts'
import type { ClubRiga } from '../db/tipi.ts'

interface Props {
  db: Database
  onApriRosa: (clubId: number) => void
}

function ElencoSquadre({ db, onApriRosa }: Props) {
  // JOIN: unisce club e competizione; il sotto-SELECT conta i giocatori.
  // La query gira a ogni render: va benissimo per questi volumi (è istantanea).
  const club = interroga<ClubRiga>(
    db,
    `SELECT c.id, c.nome, c.citta, c.fama,
            comp.nome AS competizione, comp.livello,
            (SELECT COUNT(*) FROM giocatore g WHERE g.club_id = c.id) AS numero_giocatori
     FROM club c
     JOIN competizione comp ON comp.id = c.competizione_id
     ORDER BY comp.livello, c.nome`,
  )

  // Raggruppa i club per competizione (Serie A, Serie B...)
  const competizioni = [...new Set(club.map((c) => c.competizione))]

  return (
    <section className="schermata">
      <h2>Squadre</h2>
      {competizioni.map((nomeCompetizione) => (
        <div key={nomeCompetizione}>
          <h3 className="titolo-competizione">{nomeCompetizione}</h3>
          <table className="tabella">
            <thead>
              <tr>
                <th>Squadra</th>
                <th>Città</th>
                <th className="num">Fama</th>
                <th className="num">Giocatori</th>
              </tr>
            </thead>
            <tbody>
              {club
                .filter((c) => c.competizione === nomeCompetizione)
                .map((c) => (
                  <tr key={c.id} className="riga-cliccabile" onClick={() => onApriRosa(c.id)}>
                    <td className="grassetto">{c.nome}</td>
                    <td>{c.citta}</td>
                    <td className="num">{c.fama}</td>
                    <td className="num">{c.numero_giocatori}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="nota">
        ⚠️ Rose di esempio (giocatori inventati): verranno sostituite dall'import
        dei dati reali — vedi <code>docs/dati.md</code>.
      </p>
    </section>
  )
}

export default ElencoSquadre
