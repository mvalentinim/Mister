// legends.ts — le squadre Legend (M9, FRD §5.3).
//
// Vivono in tabelle dedicate (squadra_legend + rosa_legend), FUORI dalla
// tabella club: così non toccano carriere, mercato e coppe. Si usano nelle
// amichevoli (e più avanti nei tornei fantasy / nel campionato, a scelta).

import type { Database } from 'sql.js'
import { interroga } from './query.ts'

export interface SquadraLegend {
  id: number
  nome: string
  descrizione: string | null
  giocatori: number
}

/** Crea le tabelle se mancano (i DB personalizzati vecchi non le hanno). */
export function assicuraTabelleLegend(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS squadra_legend (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descrizione TEXT
    );
    CREATE TABLE IF NOT EXISTS rosa_legend (
      squadra_id INTEGER NOT NULL REFERENCES squadra_legend(id) ON DELETE CASCADE,
      giocatore_id INTEGER NOT NULL REFERENCES giocatore(id),
      PRIMARY KEY (squadra_id, giocatore_id)
    );
  `)
}

export function squadreLegend(db: Database): SquadraLegend[] {
  assicuraTabelleLegend(db)
  return interroga<SquadraLegend>(
    db,
    `SELECT s.id, s.nome, s.descrizione, COUNT(r.giocatore_id) AS giocatori
     FROM squadra_legend s LEFT JOIN rosa_legend r ON r.squadra_id = s.id
     GROUP BY s.id ORDER BY s.nome`,
  )
}

/** Gli id dei giocatori di una squadra Legend. */
export function rosaLegendIds(db: Database, squadraId: number): number[] {
  return interroga<{ id: number }>(
    db, 'SELECT giocatore_id AS id FROM rosa_legend WHERE squadra_id = ?', [squadraId],
  ).map((r) => r.id)
}

/** Crea o aggiorna una squadra Legend con la sua rosa. Restituisce l'id. */
export function salvaSquadraLegend(
  db: Database,
  nome: string,
  giocatoriIds: number[],
  id?: number,
): number {
  assicuraTabelleLegend(db)
  let squadraId = id
  if (squadraId === undefined) {
    db.run('INSERT INTO squadra_legend (nome, descrizione) VALUES (?, ?)', [nome, ''])
    squadraId = Number(db.exec('SELECT last_insert_rowid()')[0].values[0][0])
  } else {
    db.run('UPDATE squadra_legend SET nome = ? WHERE id = ?', [nome, squadraId])
    db.run('DELETE FROM rosa_legend WHERE squadra_id = ?', [squadraId])
  }
  for (const gid of giocatoriIds) {
    db.run('INSERT OR IGNORE INTO rosa_legend VALUES (?, ?)', [squadraId, gid])
  }
  return squadraId
}

export function eliminaSquadraLegend(db: Database, id: number): void {
  db.run('DELETE FROM rosa_legend WHERE squadra_id = ?', [id])
  db.run('DELETE FROM squadra_legend WHERE id = ?', [id])
}
