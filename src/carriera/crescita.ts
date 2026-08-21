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
    anche l'identità dei RIGENERATI (post-ritiro): anno di nascita nuovo e
    potenziale pari al picco della carriera precedente. */
export function applicaCrescita(carriera: Carriera, righe: GiocatoreRiga[]): GiocatoreRiga[] {
  const conDelta = applicaDelta(carriera.crescita, righe)
  const rinati = carriera.rinati
  if (!rinati || Object.keys(rinati).length === 0) return conDelta
  return conDelta.map((g) => {
    const rinascita = rinati[g.id]
    if (!rinascita) return g
    return {
      ...g,
      data_nascita: `${rinascita.annoNascita}-07-01`,
      potenziale: rinascita.potenziale,
    }
  })
}

/** L'età "di gioco" a fine stagione: gli anni della carriera avanzano
    anche se l'orologio reale no (l'anno di nascita si legge dalla data). */
function etaNellaStagione(carriera: Carriera, g: GiocatoreRiga): number {
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
  if (!carriera.crescitaMassima) carriera.crescitaMassima = {}
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

      // ── il cuore della regola: età + potenziale… ──
      let delta = 0
      if (eta <= 21) delta = margine > 0 ? 1 + rng.intero(3) : 0 // +1..+3
      else if (eta <= 24) delta = margine > 0 ? rng.intero(3) : 0 // 0..+2
      else if (eta <= 28) delta = margine > 0 && rng.evento(0.15) ? 1 : rng.evento(0.1) ? -1 : 0
      else if (eta <= 31) delta = rng.evento(0.5) ? -1 : 0
      else if (eta <= 34) delta = -1 - rng.intero(2) // -1..-2
      else delta = -2 - rng.intero(2) // -2..-3

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
      // il registro dei MASSIMI: memorizza l'apice della crescita (solo se
      // positivo) — al ritiro ricostruisce il picco della carriera
      if (nuovo > 0 && nuovo > (carriera.crescitaMassima[g.id] ?? 0)) {
        carriera.crescitaMassima[g.id] = nuovo
      }

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
