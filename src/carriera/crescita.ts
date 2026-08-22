// crescita.ts — crescita e declino dei giocatori tra le stagioni (M8).
//
// L'idea (FRD §4 / piano M8): gli attributi non sono più congelati.
// A fine stagione ogni giocatore riceve un "delta" (positivo o negativo)
// in base a QUATTRO fattori: potenziale, età, utilizzo e prestazioni.
// Il DB statico non si tocca mai: il delta vive nella carriera
// (`carriera.crescita`, giocatoreId → punti) e viene applicato agli
// attributi al momento della lettura (applicaCrescita).

import type { Database } from 'sql.js'
import { interroga } from '../db/query.ts'
import { calcolaEta, mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import { creaRng, semeDaStringa } from '../motore/rng.ts'
import type { Carriera } from './tipi.ts'

/** Gli attributi che crescono e calano (quelli tecnici/fisici; la
    personalità resta fissa). */
const ATTRIBUTI_MUTABILI = [
  'velocita', 'resistenza', 'tecnica', 'passaggio', 'tiro', 'dribbling',
  'colpo_testa', 'marcatura', 'contrasto', 'posizionamento', 'visione',
  'calci_piazzati', 'riflessi', 'presa', 'uscite', 'rinvio',
] as const

/** Il declino massimo accumulabile in carriera (oltre non si scende). */
const DECLINO_MASSIMO = -12

// ── M11: la CURVA PERSONALE — la personalità modella crescita e declino ──
//
// Ogni giocatore ha la SUA parabola, ricavata (deterministicamente) da due
// tratti del carattere:
// - PROFESSIONALITÀ: sposta l'età del picco (chi si cura dura di più) e
//   frena — o aggrava — il declino;
// - AMBIZIONE: spinge (o smorza) la crescita giovanile.
// Vale per tutti, RIGENERATI compresi: rinascono con la stessa personalità,
// quindi con la stessa curva.

export interface ParametriCurva {
  /** l'età in cui finisce la maturità e comincia il declino (26-30) */
  etaPicco: number
  /** correzione alla crescita giovanile: +1 ambiziosi, -1 svogliati */
  spintaGiovanile: number
  /** correzione al declino: +1 lo frena (professionali), -1 lo aggrava */
  frenoDeclino: number
}

/** I parametri personali della curva, dalla personalità (deterministici). */
export function parametriCurva(g: GiocatoreRiga): ParametriCurva {
  return {
    // professionalità 50 → picco a 28 (il modello base); 1-99 → 26-30
    etaPicco: 28 + Math.max(-2, Math.min(2, Math.round((g.professionalita - 50) / 25))),
    spintaGiovanile: g.ambizione >= 75 ? 1 : g.ambizione <= 30 ? -1 : 0,
    frenoDeclino: g.professionalita >= 75 ? 1 : g.professionalita <= 30 ? -1 : 0,
  }
}

/** Il delta ATTESO in un anno (la media delle fasce del motore, senza dadi):
    è il "passo" con cui si disegnano le curve del grafico. La crescita è
    PROPORZIONALE al margine verso il potenziale: chi è lontano dal suo
    tetto brucia le tappe, chi ci è vicino rifinisce — così un talento (o
    un rigenerato sedicenne) arriva DAVVERO a ridosso del potenziale. */
export function passoAtteso(eta: number, p: ParametriCurva, margine: number): number {
  if (margine > 0) {
    if (eta <= p.etaPicco - 7) // esplosione giovanile: chiude ~35% del gap
      return Math.max(0, Math.max(1, Math.min(6, margine * 0.35)) + 0.5 + p.spintaGiovanile)
    if (eta <= p.etaPicco - 4) // rifinitura: ~20% del gap
      return Math.max(0, Math.min(3, margine * 0.2) + p.spintaGiovanile * 0.5)
    if (eta <= p.etaPicco) // maturità: ultimo 10% l'anno
      return Math.min(1, margine * 0.1)
  }
  if (eta <= p.etaPicco) return 0
  if (eta <= p.etaPicco + 3) return Math.min(0, -0.5 + p.frenoDeclino * 0.5)
  if (eta <= p.etaPicco + 6) return Math.min(0, -1.5 + p.frenoDeclino)
  return Math.min(0, -2.5 + p.frenoDeclino)
}

/** Un'ETÀ di riferimento del grafico. */
export const ETA_INIZIO_CURVA = 16
export const ETA_FINE_CURVA = 40

/**
 * La curva IPOTETICA "come da DB" (solo per i giocatori della propria rosa):
 * parte dal punto certo (età e media di oggi), integra i passi attesi in
 * avanti (tetto: il potenziale) e a ritroso fino a 16 anni. È il destino
 * sulla carta; quella reale può fare meglio o peggio.
 */
export function curvaModello(g: GiocatoreRiga, eta: number, media: number): Array<[number, number]> {
  const p = parametriCurva(g)
  const punti: Array<[number, number]> = [[eta, media]]
  // in avanti, verso il potenziale e poi giù
  let valore = media
  for (let e = eta + 1; e <= ETA_FINE_CURVA; e++) {
    valore = Math.min(g.potenziale, Math.max(30, valore + passoAtteso(e, p, g.potenziale - valore)))
    punti.push([e, valore])
  }
  // a ritroso, togliendo il passo che quell'età avrebbe dato
  valore = media
  for (let e = eta - 1; e >= ETA_INIZIO_CURVA; e--) {
    valore = Math.min(g.potenziale, Math.max(30, valore - passoAtteso(e + 1, p, 1)))
    punti.unshift([e, valore])
  }
  return punti
}

/**
 * La curva REALE fino a oggi: i punti fotografati nello storico (firma e
 * fini stagione), più il punto attuale; il passato precedente allo storico
 * viene ricostruito a ritroso col modello. Per i giocatori NON della rosa
 * (mercato) lo storico è vuoto: si vede solo la ricostruzione — il futuro
 * e il potenziale restano nascosti finché non si compra.
 */
export function curvaReale(
  g: GiocatoreRiga, eta: number, media: number,
  storia: Array<[number, number]> | undefined,
): Array<[number, number]> {
  const p = parametriCurva(g)
  // i punti certi: storico (se c'è) + oggi, ordinati e senza doppioni d'età
  const certi = new Map<number, number>()
  for (const [e, m] of storia ?? []) certi.set(e, m)
  certi.set(eta, media)
  const punti = [...certi.entries()].sort((a, b) => a[0] - b[0]) as Array<[number, number]>
  // il passato ignoto, a ritroso dal primo punto certo
  let [primaEta, valore] = punti[0]
  for (let e = primaEta - 1; e >= ETA_INIZIO_CURVA; e--) {
    valore = Math.max(30, valore - passoAtteso(e + 1, p, 1))
    punti.unshift([e, valore])
  }
  return punti
}

/** Fotografa nello storico le medie della MIA rosa. Alla creazione della
    carriera scarto = 0 (il punto di partenza, l'ancora del modello "come
    da DB"); a fine stagione scarto = 1: la fotografia vale per l'età
    SUCCESSIVA — è il valore con cui il giocatore entra nel nuovo anno —
    così non sovrascrive il punto di inizio stagione (un punto per età). */
export function fotografaMiaRosa(db: Database, carriera: Carriera, scarto: 0 | 1 = 0): void {
  if (!carriera.storiaMedie) carriera.storiaMedie = {}
  const ids = carriera.rose?.[carriera.clubId] ?? []
  if (ids.length === 0) return
  const righe = applicaCrescita(carriera, interroga<GiocatoreRiga>(
    db,
    `SELECT * FROM giocatore WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids,
  ))
  for (const g of righe) fotografaGiocatore(carriera, g, scarto)
}

/** Fotografa un singolo giocatore (alla firma di un acquisto o svincolato).
    La riga deve avere GIÀ la crescita applicata. */
export function fotografaGiocatore(carriera: Carriera, g: GiocatoreRiga, scarto: 0 | 1 = 0): void {
  if (!carriera.storiaMedie) carriera.storiaMedie = {}
  const eta = etaNellaStagione(carriera, g) + scarto
  const media = mediaComplessiva(g)
  const storia = carriera.storiaMedie[g.id] ?? []
  // un punto per età: l'ultimo scatto vince
  carriera.storiaMedie[g.id] = [...storia.filter(([e]) => e !== eta), [eta, media] as [number, number]]
    .sort((a, b) => a[0] - b[0])
}

/** Applica un registro di delta a delle righe giocatore. Restituisce COPIE
    modificate: le righe lette dal DB restano intatte. */
export function applicaDelta(
  crescita: Record<number, number> | undefined,
  righe: GiocatoreRiga[],
): GiocatoreRiga[] {
  if (!crescita) return righe // salvataggi non ancora migrati
  return righe.map((g) => {
    const delta = crescita[g.id]
    if (!delta) return g
    const copia = { ...g }
    for (const attributo of ATTRIBUTI_MUTABILI) {
      const valore = g[attributo]
      if (valore === null) continue // attributo non pertinente (es. presa per una punta)
      copia[attributo] = Math.max(1, Math.min(99, valore + delta))
    }
    return copia
  })
}

/** Come applicaDelta, ma leggendo il registro dalla carriera — e applicando
    anche l'identità dei RIGENERATI (post-ritiro): l'anno di nascita nuovo.
    Il potenziale resta quello del DB: è il tetto verso cui può risalire. */
export function applicaCrescita(carriera: Carriera, righe: GiocatoreRiga[]): GiocatoreRiga[] {
  const conDelta = applicaDelta(carriera.crescita, righe)
  const rinati = carriera.rinati
  if (!rinati || Object.keys(rinati).length === 0) return conDelta
  return conDelta.map((g) => {
    const rinascita = rinati[g.id]
    if (!rinascita) return g
    return { ...g, data_nascita: `${rinascita.annoNascita}-07-01` }
  })
}

/** L'età "di gioco" nella stagione corrente: gli anni della carriera
    avanzano anche se l'orologio reale no (l'anno di nascita dalla data). */
export function etaNellaStagione(carriera: Carriera, g: GiocatoreRiga): number {
  const annoNascita = parseInt(g.data_nascita, 10)
  if (Number.isNaN(annoNascita)) return calcolaEta(g.data_nascita)
  return carriera.anno + 1 - annoNascita
}

export interface NotaCrescita {
  giocatoreId: number
  nome: string
  delta: number
  nuovaMedia: number
}

/** A fine stagione, aggiorna `carriera.crescita` per TUTTI i giocatori
    tracciati (rose di tutto il mondo + svincolati). Deterministico: stesso
    seme, stessa evoluzione. Va chiamata PRIMA dell'azzeramento delle
    statistiche stagionali (che alimentano utilizzo e prestazioni).
    Restituisce le variazioni dei giocatori del club dell'utente,
    da mostrare nel riepilogo di fine stagione. */
export function crescitaFineStagione(db: Database, carriera: Carriera): NotaCrescita[] {
  if (!carriera.crescita) carriera.crescita = {}
  const rng = creaRng(semeDaStringa(`crescita-${carriera.seme}-${carriera.anno}`))
  const note: NotaCrescita[] = []

  const gruppi: Array<{ ids: number[]; mio: boolean }> = [
    ...Object.entries(carriera.rose).map(([clubId, ids]) => ({
      ids, mio: Number(clubId) === carriera.clubId,
    })),
    { ids: carriera.svincolati, mio: false },
  ]

  for (const gruppo of gruppi) {
    if (gruppo.ids.length === 0) continue
    // a blocchi di 500: SQLite accetta al massimo 999 segnaposto per query
    const grezze: GiocatoreRiga[] = []
    for (let i = 0; i < gruppo.ids.length; i += 500) {
      const blocco = gruppo.ids.slice(i, i + 500)
      grezze.push(...interroga<GiocatoreRiga>(
        db,
        `SELECT * FROM giocatore WHERE id IN (${blocco.map(() => '?').join(',')})`,
        blocco,
      ))
    }
    const righe = applicaCrescita(carriera, grezze)
    for (const g of righe) {
      // le LEGGENDE sono fuori dal tempo: niente crescita né declino
      // (con date di nascita storiche il declino le azzererebbe subito)
      if (g.categoria !== 'normale') continue
      const eta = etaNellaStagione(carriera, g)
      const media = mediaComplessiva(g) // già col delta attuale
      const margine = g.potenziale - media // quanto può ancora crescere

      // ── il cuore della regola: età + potenziale, sulla CURVA PERSONALE
      //    (M11): le fasce scorrono con l'età di picco del giocatore, e la
      //    personalità spinge la crescita o frena il declino ──
      const p = parametriCurva(g)
      let delta = 0
      if (eta <= p.etaPicco - 7)
        // esplosione giovanile: proporzionale al margine (chi è lontano dal
        // potenziale brucia le tappe) + il dado; tetto +6 l'anno
        delta = margine > 0 ? Math.max(1, Math.min(6, Math.round(margine * 0.35))) + rng.intero(2) : 0
      else if (eta <= p.etaPicco - 4)
        delta = margine > 0 ? Math.min(3, Math.round(margine * 0.2)) + rng.intero(2) : 0 // rifinitura
      else if (eta <= p.etaPicco) delta = margine > 0 && rng.evento(0.3) ? 1 : rng.evento(0.1) ? -1 : 0
      else if (eta <= p.etaPicco + 3) delta = rng.evento(0.5) ? -1 : 0 // primo declino
      else if (eta <= p.etaPicco + 6) delta = -1 - rng.intero(2) // -1..-2
      else delta = -2 - rng.intero(2) // -2..-3
      if (delta > 0) delta = Math.max(0, delta + p.spintaGiovanile) // ambizione
      if (delta < 0) delta = Math.min(0, delta + p.frenoDeclino) // professionalità

      // ── …più utilizzo e prestazioni (solo per la squadra dell'utente,
      //    l'unica di cui esistono statistiche vere) ──
      if (gruppo.mio && delta >= 0 && margine > 0) {
        const stat = carriera.statistiche[g.id]
        if (stat && stat.presenze >= 15) delta += 1 // ha giocato tanto
        if (stat && stat.presenze >= 5 && stat.sommaVoti / stat.presenze >= 6.4) delta += 1 // e bene
      }

      // la crescita non supera il potenziale, il declino ha un fondo.
      // Il fondo però non "risucchia in su": un RIGENERATO parte con un
      // delta ben sotto -12 e deve risalire un passo alla volta, non
      // scattare al fondo standard alla prima stagione.
      if (delta > 0) delta = Math.min(delta, Math.max(0, margine))
      const attuale = carriera.crescita[g.id] ?? 0
      const fondo = Math.min(DECLINO_MASSIMO, attuale)
      const nuovo = Math.max(fondo, attuale + delta)
      if (nuovo === attuale) continue
      carriera.crescita[g.id] = nuovo

      if (gruppo.mio) {
        note.push({
          giocatoreId: g.id,
          nome: `${g.nome} ${g.cognome}`,
          delta: nuovo - attuale,
          nuovaMedia: media + (nuovo - attuale),
        })
      }
    }
  }
  // prima i migliori progressi, poi i declini peggiori
  return note.sort((a, b) => b.delta - a.delta)
}
