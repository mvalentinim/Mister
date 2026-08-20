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

/** Migra un salvataggio di una versione vecchia alla versione corrente.
    È il meccanismo previsto dal FRD §11: i salvataggi dichiarano la loro
    versione e vengono aggiornati al caricamento, mai buttati. */
function migra(caricato: Omit<Carriera, 'versioneSchema'> & { versioneSchema: number }): Carriera {
  const salvataggio = caricato as Carriera
  if (caricato.versioneSchema === 1) {
    // v1 → v2 (M3): arrivano il seme del motore e la cronaca
    salvataggio.seme = Math.floor(Math.random() * 2_147_483_647)
    salvataggio.cronaca = null
    caricato.versioneSchema = 2
  }
  if (caricato.versioneSchema === 2) {
    // v2 → v3 (M4): arriva la tattica; qui non abbiamo il DB per costruire
    // il default, quindi la marchiamo "da costruire" — ci pensa la schermata
    // carriera al primo accesso (vedi App/SchermataCarriera)
    salvataggio.tattica = null as unknown as Carriera['tattica']
    caricato.versioneSchema = 3
  }
  if (caricato.versioneSchema === 3) {
    // v3 → v4 (M6): arrivano rose, contratti e mercato; anche qui la
    // fotografia si costruisce al primo accesso (serve il DB)
    salvataggio.rose = null as unknown as Carriera['rose']
    caricato.versioneSchema = 4
  }
  if (caricato.versioneSchema === 4) {
    // v4 → v5 (M7): morale, statistiche, promesse, fama e spogliatoio
    salvataggio.morale = {}
    salvataggio.statistiche = {}
    salvataggio.promesse = []
    salvataggio.prossimaPromessaId = 1
    salvataggio.promesseTradite = 0
    salvataggio.famaAllenatore = 20
    salvataggio.messaggi = []
    caricato.versioneSchema = 5
  }
  if (caricato.versioneSchema === 5) {
    // v5 → v6: il mercato diventa mondiale. Anche qui il lavoro vero
    // (aggiungere i club esteri e fotografarne le rose) serve il DB,
    // quindi avviene al primo accesso alla carriera: lo si riconosce
    // dai club senza il campo `nazioneId`.
    caricato.versioneSchema = 6
  }
  if (caricato.versioneSchema === 6) {
    // v6 → v7 (M8): fiducia, crescita giocatori, coppa, trofei, esoneri.
    // La coppa resta null per la stagione in corso (parte dalla prossima).
    salvataggio.fiducia = 55
    salvataggio.crescita = {}
    salvataggio.coppa = null
    salvataggio.eventiFama = []
    salvataggio.trofei = []
    salvataggio.esoneri = 0
    salvataggio.offerteSpeciali = null
    caricato.versioneSchema = 7
  }
  if (caricato.versioneSchema === 7) {
    // v7 → v8 (M8 parte 2): coppa Europa e contratto dell'allenatore.
    salvataggio.coppaEuropa = null
    salvataggio.qualificatoEuropa = false
    salvataggio.contrattoAllenatore = { scadenza: salvataggio.anno + 2, stipendio: 200_000 }
    if (salvataggio.coppa && !salvataggio.coppa.nome) salvataggio.coppa.nome = 'Coppa nazionale'
    caricato.versioneSchema = 8
  }
  return salvataggio
}

/** Tutte le carriere salvate, dalla più recente. */
export async function caricaCarriere(): Promise<Carriera[]> {
  const db = await apriDbSalvataggi()
  return new Promise((risolvi, rifiuta) => {
    const richiesta = db.transaction(NOME_STORE, 'readonly').objectStore(NOME_STORE).getAll()
    richiesta.onsuccess = () =>
      risolvi(
        (richiesta.result as Carriera[])
          .map(migra)
          .sort((a, b) => b.aggiornataIl.localeCompare(a.aggiornataIl)),
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
