// persistenza.ts — il DATABASE PERSONALIZZATO dell'editor (M9, FRD §5.4).
//
// L'editor modifica il database statico del gioco. Le modifiche non possono
// finire nel file public/mister.sqlite (il browser non può riscriverlo):
// l'intero database modificato viene quindi salvato in IndexedDB e, da lì
// in poi, l'app carica QUELLO all'avvio invece del file originale.
// "Ripristina il database originale" cancella la copia personalizzata.
//
// Nota di design (FRD §5.4): l'editor tocca solo il DB statico, MAI le
// carriere in corso — le carriere fotografano il DB alla creazione.

import type { Database } from 'sql.js'

const NOME_DB = 'mister-db-utente'
const NOME_STORE = 'database'
const CHIAVE = 'db' // c'è un solo database personalizzato

function apriIndexedDb(): Promise<IDBDatabase> {
  return new Promise((risolvi, rifiuta) => {
    const richiesta = indexedDB.open(NOME_DB, 1)
    richiesta.onupgradeneeded = () => {
      richiesta.result.createObjectStore(NOME_STORE)
    }
    richiesta.onsuccess = () => risolvi(richiesta.result)
    richiesta.onerror = () => rifiuta(new Error('Impossibile aprire il database dei salvataggi editor'))
  })
}

/** Salva l'intero database (modificato dall'editor) in IndexedDB. */
export async function salvaDatabaseUtente(db: Database): Promise<void> {
  const idb = await apriIndexedDb()
  const dati = db.export() // l'intero file SQLite come bytes
  return new Promise((risolvi, rifiuta) => {
    const tx = idb.transaction(NOME_STORE, 'readwrite')
    tx.objectStore(NOME_STORE).put({ dati, salvatoIl: new Date().toISOString() }, CHIAVE)
    tx.oncomplete = () => { idb.close(); risolvi() }
    tx.onerror = () => rifiuta(new Error('Salvataggio del database fallito'))
  })
}

/** Salva dei bytes SQLite grezzi come database personalizzato (import da file). */
export async function salvaBytesDatabase(dati: Uint8Array): Promise<void> {
  const idb = await apriIndexedDb()
  return new Promise((risolvi, rifiuta) => {
    const tx = idb.transaction(NOME_STORE, 'readwrite')
    tx.objectStore(NOME_STORE).put({ dati, salvatoIl: new Date().toISOString() }, CHIAVE)
    tx.oncomplete = () => { idb.close(); risolvi() }
    tx.onerror = () => rifiuta(new Error('Import del database fallito'))
  })
}

/** Il database personalizzato, se esiste (altrimenti null). */
export async function caricaDatabaseUtente(): Promise<Uint8Array | null> {
  const idb = await apriIndexedDb()
  return new Promise((risolvi) => {
    const richiesta = idb.transaction(NOME_STORE, 'readonly').objectStore(NOME_STORE).get(CHIAVE)
    richiesta.onsuccess = () => {
      idb.close()
      const voce = richiesta.result as { dati: Uint8Array } | undefined
      risolvi(voce?.dati ?? null)
    }
    richiesta.onerror = () => { idb.close(); risolvi(null) }
  })
}

/** true se l'app sta usando (o userà) un database personalizzato. */
export async function esisteDatabaseUtente(): Promise<boolean> {
  return (await caricaDatabaseUtente()) !== null
}

/** Cancella la copia personalizzata: al prossimo avvio torna l'originale. */
export async function eliminaDatabaseUtente(): Promise<void> {
  const idb = await apriIndexedDb()
  return new Promise((risolvi, rifiuta) => {
    const tx = idb.transaction(NOME_STORE, 'readwrite')
    tx.objectStore(NOME_STORE).delete(CHIAVE)
    tx.oncomplete = () => { idb.close(); risolvi() }
    tx.onerror = () => rifiuta(new Error('Ripristino fallito'))
  })
}
