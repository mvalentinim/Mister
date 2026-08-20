// database.ts — apertura e interrogazione del database SQLite nel browser.
//
// Usiamo sql.js: è SQLite compilato in WebAssembly (un formato che i browser
// sanno eseguire quasi alla velocità di un programma nativo). Il database
// vive in memoria: all'avvio dell'app lo costruiamo eseguendo i file .sql
// che stanno in data/. Quando arriveranno le carriere (M2) i salvataggi
// verranno resi persistenti (IndexedDB), come da FRD §11.

import initSqlJs, { type Database, type BindParams } from 'sql.js'

// Vite: "?url" importa il percorso del file WebAssembly di SQLite,
// "?raw" importa il contenuto testuale dei file .sql.
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import schemaSql from '../../data/schema.sql?raw'
import seedSql from '../../data/seed-esempio.sql?raw'

// Il database è unico per tutta l'app (pattern "singleton"): la prima
// chiamata lo costruisce, le successive riusano la stessa istanza.
let istanza: Database | null = null

/** Apre (o riusa) il database, creando tabelle e dati di esempio. */
export async function apriDatabase(): Promise<Database> {
  if (istanza) return istanza

  // Carica il "motore" SQLite (il file .wasm) e crea un database vuoto
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
  const db = new SQL.Database()

  // Esegue i nostri file SQL: prima lo schema (le tabelle), poi i dati
  db.run(schemaSql)
  db.run(seedSql)

  istanza = db
  return db
}

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
