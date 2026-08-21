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

/** La fotografia di un club dentro la carriera.
    Da quando il mercato è mondiale, l'elenco copre TUTTI i club del DB:
    nazioneId e campionato distinguono il campionato giocato dagli altri. */
export interface ClubCarriera {
  id: number
  nome: string
  forza: number // la fama del DB statico: media overall dei migliori 18
  livello: 1 | 2 // divisione di appartenenza IN QUESTA CARRIERA (può cambiare!)
  nazioneId: number // la nazione del campionato del club
  campionato: string // nome della competizione (es. "Serie A", "Premier League")
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

// ── Comportamento giocatori e promesse (M7, FRD §6.3 e §7) ────────────────

/** Statistiche stagionali di un giocatore della rosa dell'utente. */
export interface StatisticheGiocatore {
  presenze: number
  sommaVoti: number
  gol: number
  /** ultima giornata (1-based) in cui è sceso in campo, 0 = mai */
  ultimaPresenza: number
}

/** Una promessa fatta in trattativa, con verifica automatica nel tempo. */
export interface Promessa {
  id: number
  giocatoreId: number
  tipo: 'titolarita' | 'centralita' | 'progetto'
  descrizione: string
  annoCreazione: number
  giornataCreazione: number
  presenzeAllaCreazione: number
  stato: 'attiva' | 'mantenuta' | 'tradita'
}

/** Un messaggio dallo spogliatoio (reazioni dei giocatori, FRD §7). */
export interface MessaggioGiocatore {
  anno: number
  giornata: number
  giocatoreNome: string
  testo: string
  tono: 'positivo' | 'negativo' | 'neutro'
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

// ── M8: coppa nazionale, fama completa, fiducia, esoneri ──────────────────

/** Una partita di coppa (a eliminazione diretta). */
export interface PartitaCoppa {
  casaId: number
  trasfertaId: number
  golCasa: number | null
  golTrasferta: number | null
  /** vincitrice (dopo i rigori in caso di pareggio) */
  vincitriceId: number | null
}

export interface TurnoCoppa {
  nome: string // "Sedicesimi di finale", …, "Finale"
  dopoGiornata: number // si gioca quando il campionato supera questa giornata
  partite: PartitaCoppa[]
}

/** Una coppa a eliminazione diretta (32 squadre): quella nazionale o
    quella europea (M8 parte 2). */
export interface CoppaStagione {
  nome: string // "Coppa nazionale" o "Coppa Europa"
  turni: TurnoCoppa[]
  prossimoTurno: number // indice del prossimo turno da giocare
  vincitriceId: number | null
}

/** Il contratto dell'allenatore col suo club (M8 parte 2): è pluriennale,
    e romperlo per accettare un'altra panchina costa fama. */
export interface ContrattoAllenatore {
  scadenza: number // l'anno in cui termina (come i contratti dei giocatori)
  stipendio: number
}

// ── M8 parte 3: la panchina della NAZIONALE (FRD §4.3) ────────────────────

export interface PartitaNazionale {
  casaId: number // id della tabella `nazionale` (namespace separato dai club!)
  trasfertaId: number
  golCasa: number | null
  golTrasferta: number | null
}

/** L'incarico di CT (esclusivo: si lasciano i club, FRD §4.3 default).
    Il ciclo è compresso in UNA stagione: girone di qualificazione a 6
    (10 date), poi — per le prime 2 — torneo internazionale a 16. */
export interface IncaricoNazionale {
  nazionaleId: number
  nome: string
  fase: 'qualificazioni' | 'torneo' | 'conclusa'
  esito: 'in-corso' | 'campione' | 'finalista' | 'eliminato' | 'fallito'
  /** il girone di qualificazione: io + 5 avversarie (id nazionali) */
  squadre: number[]
  /** id nazionale → nome, fotografati (i render non interrogano il DB) */
  nomi: Record<number, string>
  calendario: PartitaNazionale[][] // 10 date da 3 partite
  data: number // prossima data da giocare (0-based)
  /** il torneo a eliminazione diretta (riusa la struttura delle coppe) */
  torneo: TurnoCoppa[] | null
  turnoTorneo: number
}

/** Una voce del registro spiegabile della fama (FRD §12: si vede il perché). */
export interface EventoFama {
  anno: number
  descrizione: string
  delta: number
}

/** Un trofeo vinto in carriera. */
export interface Trofeo {
  anno: number
  nome: string
}

/** Offerte di panchina fuori dal flusso normale: dopo un esonero
    (si sceglie subito una nuova squadra) o a fine stagione (club di
    fascia superiore attirati dalla fama). */
export interface OfferteSpeciali {
  contesto: 'esonero' | 'fine-stagione'
  offerte: Offerta[]
}

/** Lo stato completo di una carriera. */
export interface Carriera {
  id: string
  versioneSchema: 10 // per le migrazioni dei salvataggi (FRD §11)
  /** l'impronta del database con cui è nata la carriera (0 = originale,
      -1 = sconosciuta nei salvataggi vecchi). Se il DB attuale è diverso,
      l'app avvisa: nomi e attributi potrebbero non corrispondere. */
  dbImpronta: number
  // ── M8 parte 3: la nazionale ──
  /** l'incarico di CT in corso (null = si allena un club) */
  nazionale: IncaricoNazionale | null
  /** offerta di una federazione in attesa di risposta (fama alta) */
  offertaNazionale: { id: number; nome: string } | null
  // ── M8: fama completa, fiducia, coppa, crescita ──
  /** fiducia della dirigenza (0-100): sotto la soglia scatta l'esonero */
  fiducia: number
  /** crescita/declino accumulato dei giocatori (giocatoreId → delta attributi) */
  crescita: Record<number, number>
  /** la coppa nazionale della stagione (null nei salvataggi migrati a metà stagione) */
  coppa: CoppaStagione | null
  // ── M8 parte 2: Europa e contratto dell'allenatore ──
  /** la coppa europea: esiste solo nelle stagioni in cui ci si è qualificati */
  coppaEuropa: CoppaStagione | null
  /** true se l'ULTIMA stagione chiusa vale la qualificazione europea */
  qualificatoEuropa: boolean
  contrattoAllenatore: ContrattoAllenatore
  /** registro spiegabile delle variazioni di fama */
  eventiFama: EventoFama[]
  trofei: Trofeo[]
  /** quante volte l'allenatore è stato esonerato */
  esoneri: number
  /** offerte in attesa di risposta (esonero o fine stagione); blocca il resto */
  offerteSpeciali: OfferteSpeciali | null
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
  // ── M7: comportamento e promesse ──
  /** morale dei giocatori dell'utente (0-100, default 50) */
  morale: Record<number, number>
  /** statistiche stagionali dei giocatori dell'utente */
  statistiche: Record<number, StatisticheGiocatore>
  /** registro delle promesse (FRD §6.3: fondamentale) */
  promesse: Promessa[]
  prossimaPromessaId: number
  /** promesse tradite in carriera: i giocatori "sanno" (FRD §6.3) */
  promesseTradite: number
  /** fama dell'allenatore (0-100; il sistema completo arriva in M8) */
  famaAllenatore: number
  /** messaggi dallo spogliatoio */
  messaggi: MessaggioGiocatore[]
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
