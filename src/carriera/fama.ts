// fama.ts — il sistema di fama completo, la fiducia della dirigenza,
// gli esoneri e le offerte di panchina (M8, FRD §4.3).
//
// Due contatori distinti e sempre visibili:
// - la FAMA (0-100) è la reputazione dell'allenatore nel mondo del calcio:
//   cresce con vittorie di prestigio, obiettivi, promozioni e trofei; cala
//   con esoneri, retrocessioni e promesse tradite. Le sue SOGLIE sbloccano
//   fasce di offerte migliori.
// - la FIDUCIA (0-100) è quanto la dirigenza del TUO club ti sopporta:
//   segue i risultati rispetto all'obiettivo; sotto la soglia → esonero.
// Ogni variazione di fama finisce in un registro spiegabile (FRD §12).

import type { Database } from 'sql.js'
import type { GiocatoreRiga } from '../db/tipi.ts'
import { creaRng, semeDaStringa } from '../motore/rng.ts'
import { tatticaDefault } from '../motore/preparazione.ts'
import { aggiungiNotizia, rosaClub } from '../mercato/stato.ts'
import { generaCalendario } from './calendario.ts'
import type { Carriera, ClubCarriera, Obiettivo, Offerta, RigaClassifica } from './tipi.ts'

/** Sotto questa fiducia (e dopo qualche giornata) scatta l'esonero. */
const SOGLIA_ESONERO = 5
/** Le soglie di fama che sbloccano le fasce di offerte (FRD §4.3). */
export const FASCE_FAMA = {
  mediA: 40, // club medi di prima divisione
  altaA: 55, // club alti di prima divisione
  top: 70, // i top club nazionali
} as const

/** Registra una variazione di fama con la sua spiegazione. */
export function variaFama(carriera: Carriera, delta: number, descrizione: string): void {
  if (delta === 0) return
  carriera.famaAllenatore = Math.max(0, Math.min(100, carriera.famaAllenatore + delta))
  carriera.eventiFama.push({ anno: carriera.anno, descrizione, delta })
}

/** La posizione "accettabile" per un obiettivo (per la fiducia). */
function dentroObiettivo(obiettivo: Obiettivo, posizione: number, totale: number): boolean {
  if (obiettivo === 'promozione') return posizione <= 5 // in corsa
  if (obiettivo === 'alta-classifica') return posizione <= 9
  return posizione <= totale - 4 // salvezza: fuori dalla zona calda
}

/** Aggiorna fiducia (e fama da vittorie di prestigio) dopo una giornata.
    Chiamata da avanzaGiornata, DOPO che la giornata è stata registrata. */
export function aggiornaFiducia(carriera: Carriera, classifica: RigaClassifica[]): void {
  const partita = carriera.calendario[carriera.giornata - 1]?.find(
    (p) => p.casaId === carriera.clubId || p.trasfertaId === carriera.clubId,
  )
  if (!partita || partita.golCasa === null || partita.golTrasferta === null) return
  const inCasa = partita.casaId === carriera.clubId
  const golMiei = inCasa ? partita.golCasa : partita.golTrasferta
  const golLoro = inCasa ? partita.golTrasferta : partita.golCasa
  const avversarioId = inCasa ? partita.trasfertaId : partita.casaId
  const avversario = carriera.club.find((c) => c.id === avversarioId)!
  const mio = carriera.club.find((c) => c.id === carriera.clubId)!
  const dislivello = avversario.forza - mio.forza // >0: loro più forti

  // ── il risultato muove la fiducia ──
  let delta = 0
  if (golMiei > golLoro) delta = dislivello > 4 ? 4 : 3
  else if (golMiei === golLoro) delta = dislivello > 4 ? 1 : 0
  else delta = dislivello < -4 ? -4 : -2 // perdere coi più deboli pesa di più

  // ── la classifica rispetto all'obiettivo (dalla 6ª giornata) ──
  if (carriera.giornata >= 6) {
    const posizione = classifica.findIndex((r) => r.clubId === carriera.clubId) + 1
    delta += dentroObiettivo(carriera.obiettivo, posizione, classifica.length) ? 1 : -1
  }
  carriera.fiducia = Math.max(0, Math.min(100, carriera.fiducia + delta))

  // ── vittoria di prestigio: la fama cresce (FRD §4.3) ──
  if (golMiei > golLoro && dislivello >= 5) {
    variaFama(carriera, 1, `Vittoria di prestigio contro ${avversario.nome}`)
  }
}

/** Se la fiducia è crollata scatta l'esonero: fama giù, e sul tavolo
    arrivano subito le offerte dei club in difficoltà della stessa
    divisione (si continua a giocare, altrove). */
export function controllaEsonero(carriera: Carriera, classifica: RigaClassifica[]): void {
  if (carriera.offerteSpeciali) return // c'è già una decisione in sospeso
  if (carriera.giornata < 8 || carriera.fiducia > SOGLIA_ESONERO) return

  const mio = carriera.club.find((c) => c.id === carriera.clubId)!
  carriera.esoneri++
  variaFama(carriera, -10, `Esonerato dal ${mio.nome}`)
  aggiungiNotizia(carriera, `⚡ ESONERO! Il ${mio.nome} ti solleva dall'incarico.`, 'avviso')

  // offerte dai club nella metà bassa della classifica (vogliono la svolta)
  const rng = creaRng(semeDaStringa(`esonero-${carriera.seme}-${carriera.anno}-${carriera.giornata}`))
  const inDifficolta = classifica
    .slice(Math.floor(classifica.length / 2))
    .filter((r) => r.clubId !== carriera.clubId)
    .map((r) => carriera.club.find((c) => c.id === r.clubId)!)
    .sort(() => rng.numero() - 0.5)
    .slice(0, 3)
  carriera.offerteSpeciali = {
    contesto: 'esonero',
    offerte: inDifficolta.map((c) => costruisciOfferta(c, 'salvezza')),
  }
}

/** Confeziona un'offerta di panchina da un club della carriera. */
function costruisciOfferta(club: ClubCarriera, obiettivo: Obiettivo): Offerta {
  return {
    clubId: club.id,
    clubNome: club.nome,
    fama: club.forza,
    budgetMercato: club.budgetMercato,
    budgetStipendi: Math.round(club.budgetMercato * 1.4),
    stipendioAllenatore: Math.max(80_000, Math.round(club.forza * 4_000)),
    durataAnni: obiettivo === 'salvezza' ? 1 : 2,
    obiettivo,
  }
}

/** L'obiettivo che un club chiede, in base al suo rango nella divisione. */
export function obiettivoDelClub(carriera: Carriera, club: ClubCarriera): Obiettivo {
  const compagne = carriera.club
    .filter((c) => c.nazioneId === club.nazioneId && c.livello === club.livello)
    .sort((a, b) => b.forza - a.forza)
  const rango = compagne.findIndex((c) => c.id === club.id)
  if (club.livello === 2) return rango < 4 ? 'promozione' : rango < 10 ? 'alta-classifica' : 'salvezza'
  return rango < 7 ? 'alta-classifica' : 'salvezza'
}

/** Le offerte di fine stagione: club di fascia superiore, sbloccati dalla
    fama (FRD §4.3). Restituisce 0-3 offerte (0 = nessuno ti ha cercato). */
export function offerteFineStagione(carriera: Carriera): Offerta[] {
  const mio = carriera.club.find((c) => c.id === carriera.clubId)!
  const fama = carriera.famaAllenatore
  const nazione = clubDellaNazione(carriera)
  const primaDivisione = nazione.filter((c) => c.livello === 1).sort((a, b) => b.forza - a.forza)
  const mediana = primaDivisione[Math.floor(primaDivisione.length / 2)]?.forza ?? 70

  const candidati = nazione.filter((c) => {
    if (c.id === carriera.clubId || c.forza <= mio.forza + 2) return false // solo fasce superiori
    if (c.livello === 2) return true // la B è sempre raggiungibile
    const rango = primaDivisione.findIndex((x) => x.id === c.id)
    if (rango < 4) return fama >= FASCE_FAMA.top // i top club
    if (c.forza >= mediana) return fama >= FASCE_FAMA.altaA
    return fama >= FASCE_FAMA.mediA
  })

  const rng = creaRng(semeDaStringa(`offerte-${carriera.seme}-${carriera.anno}`))
  const quante = Math.min(candidati.length, rng.intero(3) + (fama >= FASCE_FAMA.mediA ? 1 : 0)) // 0-3
  return [...candidati]
    .sort(() => rng.numero() - 0.5)
    .slice(0, quante)
    .map((c) => costruisciOfferta(c, obiettivoDelClub(carriera, c)))
}

function clubDellaNazione(carriera: Carriera): ClubCarriera[] {
  return carriera.club.filter(
    (c) => c.nazioneId === undefined || c.nazioneId === carriera.nazione.id,
  )
}

/** Accetta un'offerta di panchina: si cambia club (a stagione in corso dopo
    un esonero, o in estate). Rosa, tattica, budget e obiettivo diventano
    quelli del nuovo club; le promesse fatte ai vecchi giocatori decadono
    (non si possono più mantenere né tradire: non sono più i tuoi). */
export function accettaOffertaPanchina(db: Database, carriera: Carriera, offerta: Offerta): void {
  const quando = carriera.offerteSpeciali?.contesto ?? 'fine-stagione'
  carriera.clubId = offerta.clubId
  carriera.obiettivo = offerta.obiettivo
  carriera.fiducia = 55
  carriera.offerteSpeciali = null

  // budget del nuovo club
  const club = carriera.club.find((c) => c.id === offerta.clubId)!
  carriera.budget = {
    mercato: club.budgetMercato,
    stipendi: Math.max(offerta.budgetStipendi, Math.round(monteStipendiDi(carriera, offerta.clubId) * 1.1)),
  }

  // la tattica riparte dai migliori del nuovo club
  carriera.tattica = tatticaDefault(rosaMia(db, carriera))

  // le promesse ai giocatori rimasti altrove decadono in silenzio
  const mieiIds = new Set(carriera.rose[carriera.clubId] ?? [])
  carriera.promesse = carriera.promesse.filter(
    (p) => p.stato !== 'attiva' || mieiIds.has(p.giocatoreId),
  )

  // in estate il calendario si rigenera per la divisione del nuovo club
  if (quando === 'fine-stagione') {
    carriera.calendario = generaCalendario(
      clubDellaNazione(carriera).filter((c) => c.livello === club.livello).map((c) => c.id),
    )
    carriera.giornata = 0
  }
  aggiungiNotizia(carriera, `Nuova avventura: sei l'allenatore del ${club.nome}!`, 'ufficiale')
}

function rosaMia(db: Database, carriera: Carriera): GiocatoreRiga[] {
  return rosaClub(db, carriera, carriera.clubId)
}

function monteStipendiDi(carriera: Carriera, clubId: number): number {
  return (carriera.rose[clubId] ?? []).reduce(
    (somma, id) => somma + (carriera.contratti[id]?.stipendio ?? 0), 0,
  )
}

/** Il bilancio di fama di fine stagione (obiettivo, promozione, coppa,
    giovani valorizzati). Va chiamato PRIMA dell'azzeramento statistiche. */
export function famaFineStagione(
  db: Database,
  carriera: Carriera,
  esito: { posizione: number; obiettivoRaggiunto: boolean; promosso: boolean; retrocesso: boolean },
): void {
  if (esito.obiettivoRaggiunto) variaFama(carriera, 4, 'Obiettivo stagionale raggiunto')
  else variaFama(carriera, -4, 'Obiettivo stagionale fallito')
  if (esito.promosso) variaFama(carriera, 8, 'PROMOZIONE!')
  if (esito.retrocesso) variaFama(carriera, -6, 'Retrocessione')
  if (carriera.coppa?.vincitriceId === carriera.clubId) {
    variaFama(carriera, 6, 'Coppa nazionale vinta')
  }

  // giovani valorizzati (FRD §4.3): U23 con tante presenze e buoni voti
  let giovani = 0
  for (const g of rosaMia(db, carriera)) {
    const stat = carriera.statistiche[g.id]
    if (!stat || stat.presenze < 15 || stat.sommaVoti / stat.presenze < 6.2) continue
    const annoNascita = parseInt(g.data_nascita, 10)
    if (!Number.isNaN(annoNascita) && carriera.anno + 1 - annoNascita <= 23 && giovani < 2) {
      giovani++
      variaFama(carriera, 1, `Giovane valorizzato: ${g.nome} ${g.cognome}`)
    }
  }
}
