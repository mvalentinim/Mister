// query.ts — funzioni di interrogazione del database.
//
// Stanno in un file separato da database.ts perché NON dipendono dal
// browser: le usano sia l'app (via database.ts) sia gli script Node come
// il test di calibrazione del motore (npm run calibra).

import type { Database, BindParams } from 'sql.js'

/**
 * Esegue una query e restituisce le righe come array di oggetti JavaScript.
 * Esempio: interroga(db, 'SELECT * FROM club WHERE id = ?', [3])
 * I "?" nella query vengono sostituiti dai parametri in modo sicuro.
 */
export function interroga<T>(db: Database, sql: string, parametri: BindParams = []): T[] {
  const statement = db.prepare(sql)
  statement.bind(parametri)
  const righe: T[] = []
  while (statement.step()) {
    righe.push(statement.getAsObject() as T)
  }
  statement.free() // libera la memoria dello statement
  return righe
}

/** Come interroga(), ma per query che restituiscono una sola riga (o nessuna). */
export function interrogaUna<T>(db: Database, sql: string, parametri: BindParams = []): T | null {
  return interroga<T>(db, sql, parametri)[0] ?? null
}
