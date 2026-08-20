// tipi.ts — i tipi del motore di simulazione (M3).
//
// Il motore riceve due SquadraMotore (club + 11 titolari con attributi),
// produce un RisultatoPartita: eventi in ordine di tempo, statistiche,
// marcatori e voti. Il renderer (M5) e la carriera leggono solo questo.

/** Un giocatore come lo vede il motore: solo ciò che serve a simulare. */
export interface GiocatoreMotore {
  id: number
  nome: string // "K. De Bruyne"
  ruolo: string // POR DC TD TS MED CC TRQ ED ES PC
  // attributi 1-99 già "digeriti" per reparto (calcolati in preparazione.ts)
  attacco: number // capacità di creare e concludere
  regia: number // costruzione del gioco
  difesa: number // capacità difensiva
  portiere: number // solo per il POR (0 per gli altri)
  forma: number // 1-99, per ora costante (dinamica in M8)
  /** moltiplicatore del peso col quale il giocatore viene scelto per
      concludere le azioni (>1 con movimenti offensivi ben eseguiti) */
  pesoTiroExtra: number
}

/** Una squadra pronta per la simulazione. */
export interface SquadraMotore {
  clubId: number
  nome: string
  titolari: GiocatoreMotore[] // 11 giocatori
  /** la panchina, per le sostituzioni nel Match Day (M5) */
  panchina: GiocatoreMotore[]
  /** posizione [x, y] di ogni titolare (dagli slot del modulo scelto) */
  posizioni: Array<[number, number]>
  /** reparto di ogni slot (deciso dalla posizione sul campo, M4) */
  repartiSlot: Array<'POR' | 'DIF' | 'CEN' | 'ATT'>
  // forze di reparto aggregate (media pesata dei titolari, scala ~1-99),
  // già comprensive di movimenti prevalenti e istruzioni (M4)
  attacco: number
  centrocampo: number
  difesa: number
  portiere: number
  /** il delta di movimenti+istruzioni, per ricalcolare dopo un cambio (M5) */
  deltaTattici: { attacco: number; centrocampo: number; difesa: number }
  /** mentalità corrente (per le regolazioni a partita in corso, M5) */
  mentalita: number
  /** fattore di ritmo (istruzioni): moltiplica la frequenza delle azioni */
  ritmo: number
}

/** I tipi di evento che il motore può generare. */
export type TipoEvento =
  | 'gol'
  | 'occasione-parata'
  | 'occasione-fuori'
  | 'occasione-murata'
  | 'ammonizione'
  | 'espulsione'
  | 'infortunio'

/** Un evento della partita, con minuto e protagonisti. */
export interface EventoPartita {
  minuto: number
  tipo: TipoEvento
  squadra: 'casa' | 'trasferta'
  giocatoreId: number
  giocatoreNome: string
  /** per i gol: chi ha servito l'assist (se c'è) */
  assistNome?: string
}

/** Le statistiche di una squadra a fine partita. */
export interface StatisticheSquadra {
  possesso: number // percentuale
  tiri: number
  tiriInPorta: number
  golAttesi: number // xG semplificato: somma della qualità delle occasioni
}

/** Una pagella: giocatore + voto. */
export interface Pagella {
  id: number
  nome: string
  ruolo: string
  voto: number
}

/** Il risultato completo prodotto dal motore. */
export interface RisultatoPartita {
  golCasa: number
  golTrasferta: number
  eventi: EventoPartita[]
  statistiche: { casa: StatisticheSquadra; trasferta: StatisticheSquadra }
  /** voto 4-10 per ogni titolare (chiave: id giocatore) */
  voti: Record<number, number>
  /** le pagelle con i nomi, per squadra (chi era in campo al fischio finale) */
  pagelle: { casa: Pagella[]; trasferta: Pagella[] }
}
