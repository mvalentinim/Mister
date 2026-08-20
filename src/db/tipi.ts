// tipi.ts — i "tipi" TypeScript delle righe del database.
//
// Un tipo descrive la forma di un dato: quali campi ha e di che genere sono.
// Così, se in una schermata scriviamo per errore `giocatore.velocit`,
// TypeScript ce lo segnala subito invece di farci scoprire il problema nel
// browser. I campi rispecchiano le colonne di data/schema.sql.

/** Una riga della tabella club, arricchita con i dati della competizione. */
export interface ClubRiga {
  id: number
  nome: string
  citta: string | null
  fama: number
  competizione: string      // nome della competizione (dalla JOIN)
  livello: number           // 1 = Serie A, 2 = Serie B...
  numero_giocatori: number  // conteggio calcolato nella query
}

/** Una riga della tabella nazionale, con il conteggio dei convocati. */
export interface NazionaleRiga {
  id: number
  nome: string
  fama: number
  mondiale_2026: number // SQLite non ha i booleani: 0 = no, 1 = sì
  generata: number
  numero_giocatori: number
}

/** Una riga della tabella giocatore (gli attributi opzionali possono essere null). */
export interface GiocatoreRiga {
  id: number
  club_id: number | null
  club_esterno: string | null
  nome: string
  cognome: string
  data_nascita: string
  nazionalita: string
  ruolo: string
  piede: string
  // tecnici (null per i portieri)
  velocita: number | null
  resistenza: number | null
  tecnica: number | null
  passaggio: number | null
  tiro: number | null
  dribbling: number | null
  colpo_testa: number | null
  marcatura: number | null
  contrasto: number | null
  posizionamento: number | null
  visione: number | null
  calci_piazzati: number | null
  // portiere (null per i giocatori di movimento)
  riflessi: number | null
  presa: number | null
  uscite: number | null
  rinvio: number | null
  // comportamentali
  ambizione: number
  attaccamento_denaro: number
  fedelta: number
  bisogno_giocare: number
  professionalita: number
  leadership: number
  legame_territoriale: number
  // dinamici
  forma: number
  morale: number
  condizione: number
  potenziale: number
}

/** Calcola l'età (in anni compiuti) a partire dalla data di nascita ISO. */
export function calcolaEta(dataNascitaIso: string): number {
  const nascita = new Date(dataNascitaIso)
  const oggi = new Date()
  let eta = oggi.getFullYear() - nascita.getFullYear()
  // se il compleanno di quest'anno non è ancora passato, togli 1
  const compleannoPassato =
    oggi.getMonth() > nascita.getMonth() ||
    (oggi.getMonth() === nascita.getMonth() && oggi.getDate() >= nascita.getDate())
  if (!compleannoPassato) eta -= 1
  return eta
}

/**
 * Media complessiva del giocatore ("overall"): la media dei suoi attributi
 * tecnici, usando il set giusto (portiere o movimento). È un'indicazione
 * rapida per le tabelle, non un valore di gioco ufficiale.
 */
export function mediaComplessiva(g: GiocatoreRiga): number {
  const valori =
    g.ruolo === 'POR'
      ? [g.riflessi, g.presa, g.uscite, g.rinvio, g.velocita, g.resistenza]
      : [g.velocita, g.resistenza, g.tecnica, g.passaggio, g.tiro, g.dribbling,
         g.colpo_testa, g.marcatura, g.contrasto, g.posizionamento, g.visione, g.calci_piazzati]
  const presenti = valori.filter((v): v is number => v !== null)
  if (presenti.length === 0) return 0
  return Math.round(presenti.reduce((somma, v) => somma + v, 0) / presenti.length)
}
