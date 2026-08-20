// tipi.ts — i tipi della carriera (milestone M2).
//
// La carriera è un oggetto autonomo che FOTOGRAFA il database statico al
// momento della creazione (FRD §5.4): dentro ci sono i club delle due
// divisioni della nazione scelta, il calendario e i risultati. Si salva
// in IndexedDB (vedi salvataggio.ts) dopo ogni avanzamento.

import type { EventoPartita, StatisticheSquadra } from '../motore/tipi.ts'
import type { Tattica } from '../tattica/definizioni.ts'

/** Il profilo dell'allenatore creato dall'utente. */
export interface ProfiloAllenatore {
  nome: string
  nazionalita: string
  eta: number
}

/** Gli obiettivi stagionali possibili di un'offerta (semplificati per M2). */
export type Obiettivo = 'promozione' | 'alta-classifica' | 'salvezza'

export const DESCRIZIONE_OBIETTIVO: Record<Obiettivo, string> = {
  promozione: 'Promozione (primi 3 posti)',
  'alta-classifica': 'Alta classifica (primi 8)',
  salvezza: 'Salvezza (evitare gli ultimi 3 posti)',
}

/** Un'offerta di panchina ricevuta a inizio carriera. */
export interface Offerta {
  clubId: number
  clubNome: string
  fama: number
  budgetMercato: number
  budgetStipendi: number
  stipendioAllenatore: number // euro/anno
  durataAnni: number
  obiettivo: Obiettivo
}

/** Una partita del calendario (i gol sono null finché non si gioca). */
export interface Partita {
  casaId: number
  trasfertaId: number
  golCasa: number | null
  golTrasferta: number | null
}

/** La fotografia di un club dentro la carriera. */
export interface ClubCarriera {
  id: number
  nome: string
  forza: number // la fama del DB statico: media overall dei migliori 18
  livello: 1 | 2 // divisione di appartenenza IN QUESTA CARRIERA (può cambiare!)
  /** budget mercato residuo (mutabile: i trasferimenti lo muovono, M6) */
  budgetMercato: number
  /** il budget di partenza, per il ripristino a inizio stagione */
  budgetMercatoIniziale: number
}

// ── Mercato (M6) ───────────────────────────────────────────────────────────

/** Un contratto dentro la carriera (fotografato e poi mutabile). */
export interface ContrattoCarriera {
  stipendio: number // euro/anno
  scadenza: number // anno solare del 30 giugno di scadenza (2027 = fine 2026-27)
}

/** Una notizia del notiziario di mercato. */
export interface Notizia {
  testo: string
  tipo: 'ufficiale' | 'rumor' | 'avviso'
  quando: string // es. "estate 2025, giorno 3" o "gennaio 2026"
}

/** Un'offerta ricevuta da un club IA per un giocatore dell'utente. */
export interface OffertaRicevuta {
  id: number
  clubId: number // chi offre
  giocatoreId: number
  tipo: 'acquisto' | 'prestito-diritto'
  prezzo: number // per il prestito: il prezzo del diritto di riscatto
}

/** Un prestito in corso (M6): il giocatore gioca nel club ospitante. */
export interface Prestito {
  giocatoreId: number
  proprietarioId: number
  ospitanteId: number
  diritto: number | null // prezzo del diritto di riscatto (null = secco)
  obbligo: boolean // true = riscatto obbligatorio a fine stagione
}

/** Lo stato del mercato nella carriera. */
export interface StatoMercato {
  aperto: boolean
  finestra: 'estiva' | 'invernale' | null
  giorniRimasti: number
  prossimaOffertaId: number
  offerteRicevute: OffertaRicevuta[]
  notizie: Notizia[]
  /** giocatori dell'utente dichiarati cedibili (più offerte in arrivo) */
  cedibili: number[]
}

/** Riepilogo di una stagione conclusa (per lo storico). */
export interface RiepilogoStagione {
  anno: number // 2025 = stagione 2025-26
  competizione: string
  posizione: number
  punti: number
  obiettivo: Obiettivo
  obiettivoRaggiunto: boolean
  promosso: boolean
  retrocesso: boolean
}

/** La cronaca dell'ultima partita della squadra dell'utente (M3):
    l'elenco eventi del motore + statistiche + voti, in attesa del
    Match Day visuale (M5). */
export interface CronacaPartita {
  giornata: number // 1-based, per l'intestazione
  casaNome: string
  trasfertaNome: string
  golCasa: number
  golTrasferta: number
  eventi: EventoPartita[]
  statistiche: { casa: StatisticheSquadra; trasferta: StatisticheSquadra }
  /** voti della squadra dell'utente: nome → voto */
  voti: Array<{ nome: string; ruolo: string; voto: number }>
}

/** Lo stato completo di una carriera. */
export interface Carriera {
  id: string
  versioneSchema: 4 // per le migrazioni dei salvataggi (FRD §11)
  /** le ROSE della carriera: club → id dei giocatori. Fotografate alla
      creazione dal DB statico, poi mosse dai trasferimenti (M6). */
  rose: Record<number, number[]>
  /** contratti dei giocatori della carriera (giocatoreId → contratto) */
  contratti: Record<number, ContrattoCarriera>
  /** giocatori senza contratto, ingaggiabili gratis */
  svincolati: number[]
  /** budget del club dell'utente (mercato e monte stipendi annuo) */
  budget: { mercato: number; stipendi: number }
  /** prestiti in corso */
  prestiti: Prestito[]
  mercato: StatoMercato
  /** seme della carriera: con lo stesso seme le partite sono riproducibili */
  seme: number
  /** cronaca dell'ultima partita giocata dalla squadra dell'utente */
  cronaca: CronacaPartita | null
  /** l'assetto tattico della squadra dell'utente (M4) */
  tattica: Tattica
  allenatore: ProfiloAllenatore
  nazione: { id: number; nome: string }
  competizioni: { 1: string; 2: string } // nomi delle due divisioni
  clubId: number
  obiettivo: Obiettivo
  annoInizio: number
  anno: number // anno della stagione corrente (2025 = 2025-26)
  club: ClubCarriera[] // tutti i club delle due divisioni
  calendario: Partita[][] // le giornate della competizione dell'utente
  giornata: number // prossima giornata da giocare (0 = prima)
  storico: RiepilogoStagione[]
  aggiornataIl: string // data ISO dell'ultimo salvataggio
}

/** Una riga della classifica calcolata dai risultati. */
export interface RigaClassifica {
  clubId: number
  nome: string
  punti: number
  giocate: number
  vinte: number
  pareggiate: number
  perse: number
  golFatti: number
  golSubiti: number
}

/** Etichetta leggibile della stagione: 2025 → "2025-26". */
export function etichettaStagione(anno: number): string {
  return `${anno}-${String((anno + 1) % 100).padStart(2, '0')}`
}
