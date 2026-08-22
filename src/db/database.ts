// database.ts — apertura e interrogazione del database SQLite nel browser.
//
// Usiamo sql.js: è SQLite compilato in WebAssembly (un formato che i browser
// sanno eseguire quasi alla velocità di un programma nativo). Il database
// vive in memoria: all'avvio dell'app lo costruiamo eseguendo i file .sql
// che stanno in data/. Quando arriveranno le carriere (M2) i salvataggi
// verranno resi persistenti (IndexedDB), come da FRD §11.

import initSqlJs, { type Database } from 'sql.js'
import { caricaDatabaseUtente } from './persistenza.ts'

// Vite: "?url" importa il percorso del file WebAssembly di SQLite,
// "?raw" importa il contenuto testuale dei file .sql.
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import schemaSql from '../../data/schema.sql?raw'
import seedSql from '../../data/seed-esempio.sql?raw'

// Il database è unico per tutta l'app (pattern "singleton"): la prima
// chiamata lo costruisce, le successive riusano la stessa istanza.
let istanza: Database | null = null

// ── L'IMPRONTA del database (coerenza carriere ↔ DB, FRD §11) ─────────────
// Ogni database ha un'identità scritta DENTRO il file (PRAGMA user_version):
// 0 = database originale; l'editor assegna un numero casuale al primo
// salvataggio, che viaggia con l'export/import. Le carriere memorizzano
// l'impronta del DB con cui sono nate: se non combacia, l'app avvisa.
let impronta = 0

/** L'impronta del database attualmente in uso (0 = originale). */
export function improntaDbCorrente(): number {
  return impronta
}

/** Prima di salvare un DB personalizzato: se è ancora "originale" (0),
    gli viene assegnata un'identità casuale, scritta nel file stesso. */
export function assegnaImprontaSeMancante(db: Database): void {
  if (leggiImpronta(db) !== 0) return
  const nuova = 1 + Math.floor(Math.random() * 2_000_000_000)
  db.run(`PRAGMA user_version = ${nuova}`)
  impronta = nuova
}

function leggiImpronta(db: Database): number {
  const risultato = db.exec('PRAGMA user_version')
  return Number(risultato[0]?.values[0]?.[0] ?? 0)
}

/** Le colonne volto_* della FIGURINA (VOLTI-MISTER §7): si aggiungono a
    runtime ai database che non le hanno (ALTER TABLE è idempotente qui
    grazie al try/catch: se la colonna esiste già, SQLite protesta e si
    passa oltre). Le personalizzazioni viaggiano col DB personalizzato. */
export function assicuraColonneVolto(db: Database): void {
  for (const colonna of [
    'volto_seme INTEGER', 'volto_pelle INTEGER', 'volto_capelli TEXT',
    'volto_colore TEXT', 'volto_barba TEXT',
    // le REGOLAZIONI fini: spostamento (px della griglia 48) e scala (%)
    'volto_barba_dx INTEGER', 'volto_barba_dy INTEGER', 'volto_barba_scala INTEGER',
    'volto_capelli_dx INTEGER', 'volto_capelli_dy INTEGER', 'volto_capelli_scala INTEGER',
  ]) {
    try {
      db.run(`ALTER TABLE giocatore ADD COLUMN ${colonna}`)
    } catch {
      // la colonna c'è già: va bene così
    }
  }
}

/** Apre (o riusa) il database del gioco.
 *  Prima scelta: public/mister.sqlite, il database REALE costruito dalla
 *  pipeline di importazione (npm run importa-dati).
 *  Ripiego: se il file non c'è, costruisce in memoria il piccolo database
 *  di esempio da data/*.sql (così l'app funziona anche appena clonata). */
export async function apriDatabase(): Promise<Database> {
  if (istanza) return istanza

  // Carica il "motore" SQLite (il file WebAssembly)
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })

  // 0. il DATABASE PERSONALIZZATO dell'editor (M9), se esiste, vince su tutto
  const personalizzato = await caricaDatabaseUtente()
  if (personalizzato) {
    try {
      const db = new SQL.Database(personalizzato)
      db.exec('SELECT COUNT(*) FROM giocatore') // sonda: il file è davvero un DB MISTER?
      assicuraColonneVolto(db)
      impronta = leggiImpronta(db)
      istanza = db
      return istanza
    } catch {
      // file corrotto o estraneo (es. import sbagliato): si ripiega
      // sull'originale invece di lasciare l'app rotta
      console.warn('Database personalizzato non valido: uso quello originale.')
    }
  }

  // BASE_URL = radice del sito (di solito "/"): lì Vite serve i file di public/
  const risposta = await fetch(`${import.meta.env.BASE_URL}mister.sqlite`)
  if (risposta.ok) {
    const contenuto = new Uint8Array(await risposta.arrayBuffer())
    istanza = new SQL.Database(contenuto)
    assicuraColonneVolto(istanza)
    impronta = leggiImpronta(istanza)
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
