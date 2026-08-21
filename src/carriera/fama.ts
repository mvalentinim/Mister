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
import { interroga } from '../db/query.ts'
import type { GiocatoreRiga } from '../db/tipi.ts'
import { creaRng, semeDaStringa } from '../motore/rng.ts'
import { tatticaDefault } from '../motore/preparazione.ts'
import { GIORNI_FINESTRA_ESTIVA, aggiungiNotizia, rosaClub } from '../mercato/stato.ts'
import { generaCalendario } from './calendario.ts'
import { creaCoppa } from './coppa.ts'
import { ingressoLeggendeSeDovuto } from './leggende.ts'
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

/** Quanta fama in più serve perché un club ESTERO ti chiami: all'estero
    la reputazione viaggia più lenta. (Il perimetro del DB è già solo
    europeo: le 10 leghe dei 5 grandi campionati.) */
const SOVRAPPREZZO_ESTERO = 10

/** Le offerte di fine stagione: club di fascia superiore, sbloccati dalla
    fama (FRD §4.3) — da TUTTA Europa, non solo dalla nazione in cui si
    allena. Restituisce 0-3 offerte (0 = nessuno ti ha cercato). */
export function offerteFineStagione(carriera: Carriera): Offerta[] {
  const mio = carriera.club.find((c) => c.id === carriera.clubId)!
  const fama = carriera.famaAllenatore

  // per giudicare la fascia di un club serve la classifica di forza della
  // SUA prima divisione (ogni nazione ha la propria)
  const primaDivPerNazione = new Map<number, ClubCarriera[]>()
  for (const c of carriera.club) {
    if (c.livello !== 1) continue
    const chiave = c.nazioneId ?? carriera.nazione.id
    if (!primaDivPerNazione.has(chiave)) primaDivPerNazione.set(chiave, [])
    primaDivPerNazione.get(chiave)!.push(c)
  }
  for (const lega of primaDivPerNazione.values()) lega.sort((a, b) => b.forza - a.forza)

  const candidati = carriera.club.filter((c) => {
    if (c.id === carriera.clubId || c.forza <= mio.forza + 2) return false // solo fasce superiori
    const nazioneClub = c.nazioneId ?? carriera.nazione.id
    const estero = nazioneClub !== carriera.nazione.id
    const extra = estero ? SOVRAPPREZZO_ESTERO : 0
    if (c.livello === 2) return estero ? fama >= FASCE_FAMA.mediA : true // la B di casa è sempre raggiungibile
    const lega = primaDivPerNazione.get(nazioneClub) ?? []
    const rango = lega.findIndex((x) => x.id === c.id)
    const mediana = lega[Math.floor(lega.length / 2)]?.forza ?? 70
    if (rango >= 0 && rango < 4) return fama >= FASCE_FAMA.top + extra // i top club
    if (c.forza >= mediana) return fama >= FASCE_FAMA.altaA + extra
    return fama >= FASCE_FAMA.mediA + extra
  })

  const rng = creaRng(semeDaStringa(`offerte-${carriera.seme}-${carriera.anno}`))
  // più fama → più telefonate: da 1-2 offerte per uno sconosciuto fino a
  // 4-5 per un allenatore da 90+ (sempre nei limiti dei candidati veri)
  const quante = Math.min(candidati.length, 1 + Math.floor(fama / 25) + rng.intero(2))
  const mescolati = [...candidati].sort(() => rng.numero() - 0.5)

  // garanzia: almeno UN'offerta della nazione in cui si lavora (se esiste),
  // così restare nel proprio campionato è sempre possibile
  const scelte: ClubCarriera[] = []
  const diCasa = mescolati.find((c) => (c.nazioneId ?? carriera.nazione.id) === carriera.nazione.id)
  if (diCasa) scelte.push(diCasa)
  for (const c of mescolati) {
    if (scelte.length >= quante) break
    if (!scelte.includes(c)) scelte.push(c)
  }
  return scelte.map((c) => costruisciOfferta(c, obiettivoDelClub(carriera, c)))
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
  const vecchioClub = carriera.club.find((c) => c.id === carriera.clubId)
  const eraCt = carriera.nazionale !== null

  // ── rompere un contratto in essere costa fama (M8 parte 2) ──
  // Dopo un esonero no: è il club ad averti cacciato. A fine stagione sì,
  // se il contratto copriva ancora la stagione che sta per iniziare.
  if (quando === 'fine-stagione' && carriera.contrattoAllenatore &&
      carriera.contrattoAllenatore.scadenza > carriera.anno) {
    variaFama(carriera, -3, `Contratto rotto col ${vecchioClub?.nome ?? 'vecchio club'}`)
  }

  carriera.clubId = offerta.clubId
  carriera.obiettivo = offerta.obiettivo
  carriera.fiducia = 55
  carriera.offerteSpeciali = null
  // il nuovo contratto dell'allenatore
  carriera.contrattoAllenatore = {
    scadenza: carriera.anno + offerta.durataAnni,
    stipendio: offerta.stipendioAllenatore,
  }
  // il posto in Coppa Europa era del vecchio club: cambiando, si perde
  if (quando === 'fine-stagione') carriera.coppaEuropa = null
  // si torna ai club: l'avventura da CT (se c'era) è chiusa (M8 parte 3),
  // e il mercato estivo riapre per accogliere il nuovo allenatore
  carriera.nazionale = null
  carriera.offertaNazionale = null
  if (eraCt) {
    carriera.mercato.aperto = true
    carriera.mercato.finestra = 'estiva'
    carriera.mercato.giorniRimasti = GIORNI_FINESTRA_ESTIVA
    ingressoLeggendeSeDovuto(db, carriera) // M9: anche al rientro dalla nazionale
  }

  // budget del nuovo club
  const club = carriera.club.find((c) => c.id === offerta.clubId)!
  carriera.budget = {
    mercato: club.budgetMercato,
    stipendi: Math.max(offerta.budgetStipendi, Math.round(monteStipendiDi(carriera, offerta.clubId) * 1.1)),
  }

  // ── trasloco all'estero (solo in estate): cambia la nazione di lavoro ──
  // Il campionato che si gioca diventa quello del nuovo club: nomi delle
  // divisioni, calendario e coppa seguono. Le nazioni estere si possono
  // raggiungere solo a fine stagione (a metà campionato non avrebbe senso).
  const nazioneClub = club.nazioneId ?? carriera.nazione.id
  if (quando === 'fine-stagione' && nazioneClub !== carriera.nazione.id) {
    const nomeNazione =
      interroga<{ nome: string }>(db, 'SELECT nome FROM nazione WHERE id = ?', [nazioneClub])[0]?.nome ?? 'Estero'
    carriera.nazione = { id: nazioneClub, nome: nomeNazione }
    carriera.competizioni = {
      1: carriera.club.find((c) => c.nazioneId === nazioneClub && c.livello === 1)?.campionato ?? 'Prima divisione',
      2: carriera.club.find((c) => c.nazioneId === nazioneClub && c.livello === 2)?.campionato ?? 'Seconda divisione',
    }
    aggiungiNotizia(carriera, `Si va all'estero! Nuova vita in ${nomeNazione}.`, 'ufficiale')
  }

  // la tattica riparte dai migliori del nuovo club
  carriera.tattica = tatticaDefault(rosaMia(db, carriera))

  // le promesse ai giocatori rimasti altrove decadono in silenzio
  const mieiIds = new Set(carriera.rose[carriera.clubId] ?? [])
  carriera.promesse = carriera.promesse.filter(
    (p) => p.stato !== 'attiva' || mieiIds.has(p.giocatoreId),
  )

  // in estate il calendario si rigenera per la divisione del nuovo club
  // (che può essere in un'altra nazione) e la coppa rifà il tabellone
  if (quando === 'fine-stagione') {
    carriera.calendario = generaCalendario(
      clubDellaNazione(carriera).filter((c) => c.livello === club.livello).map((c) => c.id),
    )
    carriera.giornata = 0
    carriera.coppa = creaCoppa(carriera)
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
  // (le coppe premiano la fama al momento della vittoria, in coppa.ts)

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
