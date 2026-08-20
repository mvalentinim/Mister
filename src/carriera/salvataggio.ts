// salvataggio.ts — persistenza delle carriere in IndexedDB (FRD §11).
//
// IndexedDB è il database interno del browser: i dati restano sul disco
// dell'utente anche chiudendo il browser. La sua API nativa è a callback,
// vecchio stile: queste funzioni la incapsulano in Promise per usarla con
// async/await. L'esportazione su file .mister arriverà in M10.

import type { Carriera } from './tipi.ts'

const NOME_DB = 'mister-salvataggi'
const NOME_STORE = 'carriere'

/** Apre (creandolo la prima volta) il database dei salvataggi. */
function apriDbSalvataggi(): Promise<IDBDatabase> {
  return new Promise((risolvi, rifiuta) => {
    const richiesta = indexedDB.open(NOME_DB, 1)
    // eseguito solo la prima volta (o al cambio di versione): crea lo "store"
    richiesta.onupgradeneeded = () => {
      richiesta.result.createObjectStore(NOME_STORE, { keyPath: 'id' })
    }
    richiesta.onsuccess = () => risolvi(richiesta.result)
    richiesta.onerror = () => rifiuta(richiesta.error)
  })
}

/** Salva (o sovrascrive) una carriera. Aggiorna la data di salvataggio. */
export async function salvaCarriera(carriera: Carriera): Promise<void> {
  carriera.aggiornataIl = new Date().toISOString()
  const db = await apriDbSalvataggi()
  return new Promise((risolvi, rifiuta) => {
    const transazione = db.transaction(NOME_STORE, 'readwrite')
    transazione.objectStore(NOME_STORE).put(carriera)
    transazione.oncomplete = () => risolvi()
    transazione.onerror = () => rifiuta(transazione.error)
  })
}

/** Tutte le carriere salvate, dalla più recente. */
export async function caricaCarriere(): Promise<Carriera[]> {
  const db = await apriDbSalvataggi()
  return new Promise((risolvi, rifiuta) => {
    const richiesta = db.transaction(NOME_STORE, 'readonly').objectStore(NOME_STORE).getAll()
    richiesta.onsuccess = () =>
      risolvi(
        (richiesta.result as Carriera[]).sort((a, b) => b.aggiornataIl.localeCompare(a.aggiornataIl)),
      )
    richiesta.onerror = () => rifiuta(richiesta.error)
  })
}

/** Elimina una carriera salvata. */
export async function eliminaCarriera(id: string): Promise<void> {
  const db = await apriDbSalvataggi()
  return new Promise((risolvi, rifiuta) => {
    const transazione = db.transaction(NOME_STORE, 'readwrite')
    transazione.objectStore(NOME_STORE).delete(id)
    transazione.oncomplete = () => risolvi()
    transazione.onerror = () => rifiuta(transazione.error)
  })
}
