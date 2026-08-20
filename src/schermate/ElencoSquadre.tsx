// ElencoSquadre.tsx — tutte le squadre del database: i club raggruppati per
// nazione e competizione, poi le squadre nazionali.
// Cliccando una squadra si apre la sua rosa.

import type { Database } from 'sql.js'
import { interroga } from '../db/database.ts'
import type { ClubRiga, NazionaleRiga } from '../db/tipi.ts'

interface Props {
  db: Database
  onApriRosa: (squadra: { tipo: 'club' | 'nazionale'; id: number }) => void
}

function ElencoSquadre({ db, onApriRosa }: Props) {
  // Club con nazione e competizione (JOIN) e conteggio giocatori
  const club = interroga<ClubRiga & { gruppo: string }>(
    db,
    `SELECT c.id, c.nome, c.citta, c.fama,
            naz.nome || ' — ' || comp.nome AS gruppo,
            comp.nome AS competizione, comp.livello,
            (SELECT COUNT(*) FROM giocatore g WHERE g.club_id = c.id) AS numero_giocatori
     FROM club c
     JOIN competizione comp ON comp.id = c.competizione_id
     JOIN nazione naz ON naz.id = comp.nazione_id
     ORDER BY naz.nome, comp.livello, c.nome`,
  )

  const nazionali = interroga<NazionaleRiga>(
    db,
    `SELECT n.id, n.nome, n.fama, n.mondiale_2026, n.generata,
            (SELECT COUNT(*) FROM convocazione cv WHERE cv.nazionale_id = n.id) AS numero_giocatori
     FROM nazionale n
     ORDER BY n.mondiale_2026 DESC, n.fama DESC`,
  )

  // Gruppi distinti mantenendo l'ordine della query
  const gruppi = [...new Set(club.map((c) => c.gruppo))]

  return (
    <section className="schermata">
      <h2>Squadre</h2>
      {gruppi.map((gruppo) => (
        <div key={gruppo}>
          <h3 className="titolo-competizione">{gruppo}</h3>
          <table className="tabella">
            <thead>
              <tr>
                <th>Squadra</th>
                <th className="num">Fama</th>
                <th className="num">Giocatori</th>
              </tr>
            </thead>
            <tbody>
              {club
                .filter((c) => c.gruppo === gruppo)
                .map((c) => (
                  <tr
                    key={c.id}
                    className="riga-cliccabile"
                    onClick={() => onApriRosa({ tipo: 'club', id: c.id })}
                  >
                    <td className="grassetto">{c.nome}</td>
                    <td className="num">{c.fama}</td>
                    <td className="num">{c.numero_giocatori}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}

      <h3 className="titolo-competizione">Nazionali</h3>
      <p className="nota">
        ⭐ = qualificata al Mondiale 2026. Le rose contrassegnate con «selezione
        automatica» non sono convocazioni ufficiali: sono i migliori giocatori
        di quella nazionalità presenti nel database (vedi docs/dati.md).
      </p>
      <table className="tabella">
        <thead>
          <tr>
            <th>Nazionale</th>
            <th className="num">Fama</th>
            <th className="num">Convocati</th>
            <th>Rosa</th>
          </tr>
        </thead>
        <tbody>
          {nazionali.map((n) => (
            <tr
              key={n.id}
              className="riga-cliccabile"
              onClick={() => onApriRosa({ tipo: 'nazionale', id: n.id })}
            >
              <td className="grassetto">{n.mondiale_2026 ? '⭐ ' : ''}{n.nome}</td>
              <td className="num">{n.fama}</td>
              <td className="num">{n.numero_giocatori}</td>
              <td className="nota">{n.generata ? 'selezione automatica' : 'ufficiale (fonte FIFA 23)'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default ElencoSquadre
