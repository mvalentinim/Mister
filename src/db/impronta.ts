// impronta.ts — l'IMPRONTA del database (coerenza carriere ↔ DB, FRD §11).
//
// Ogni database ha un'identità scritta DENTRO il file (PRAGMA user_version):
// 0 = database originale; l'editor assegna un numero casuale al primo
// salvataggio, che viaggia con l'export/import. Le carriere memorizzano
// l'impronta del DB con cui sono nate: se non combacia, l'app avvisa.
//
// Vive in un modulo SENZA import speciali di Vite (?raw/?url), così anche
// i collaudi da riga di comando (tsx) possono usarla: il motore della
// carriera la legge alla creazione.

import type { Database } from 'sql.js'

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

/** Rilegge l'impronta dal database appena aperto (chiamata da apriDatabase). */
export function aggiornaImprontaDa(db: Database): void {
  impronta = leggiImpronta(db)
}

function leggiImpronta(db: Database): number {
  const risultato = db.exec('PRAGMA user_version')
  return Number(risultato[0]?.values[0]?.[0] ?? 0)
}
