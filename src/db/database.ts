// database.ts — apertura e interrogazione del database SQLite nel browser.
//
// Usiamo sql.js: è SQLite compilato in WebAssembly (un formato che i browser
// sanno eseguire quasi alla velocità di un programma nativo). Il database
// vive in memoria: all'avvio dell'app lo costruiamo eseguendo i file .sql
// che stanno in data/. Quando arriveranno le carriere (M2) i salvataggi
// verranno resi persistenti (IndexedDB), come da FRD §11.

import initSqlJs, { type Database } from 'sql.js'

// Vite: "?url" importa il percorso del file WebAssembly di SQLite,
// "?raw" importa il contenuto testuale dei file .sql.
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import schemaSql from '../../data/schema.sql?raw'
import seedSql from '../../data/seed-esempio.sql?raw'

// Il database è unico per tutta l'app (pattern "singleton"): la prima
// chiamata lo costruisce, le successive riusano la stessa istanza.
let istanza: Database | null = null

/** Apre (o riusa) il database del gioco.
 *  Prima scelta: public/mister.sqlite, il database REALE costruito dalla
 *  pipeline di importazione (npm run importa-dati).
 *  Ripiego: se il file non c'è, costruisce in memoria il piccolo database
 *  di esempio da data/*.sql (così l'app funziona anche appena clonata). */
export async function apriDatabase(): Promise<Database> {
  if (istanza) return istanza

  // Carica il "motore" SQLite (il file WebAssembly)
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })

  // BASE_URL = radice del sito (di solito "/"): lì Vite serve i file di public/
  const risposta = await fetch(`${import.meta.env.BASE_URL}mister.sqlite`)
  if (risposta.ok) {
    const contenuto = new Uint8Array(await risposta.arrayBuffer())
    istanza = new SQL.Database(contenuto)
    return istanza
  }

  console.warn('mister.sqlite non trovato: uso i dati di esempio. Esegui `npm run importa-dati`.')
  const db = new SQL.Database()
  db.run(schemaSql) // le tabelle...
  db.run(seedSql) // ...e i dati di esempio
  istanza = db
  return db
}

// Le funzioni di interrogazione vivono in query.ts (condivise con gli
// script Node): le ri-esportiamo da qui per comodità delle schermate.
export { interroga, interrogaUna } from './query.ts'
