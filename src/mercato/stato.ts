// stato.ts — lo stato del mercato dentro la carriera (M6):
// inizializzazione (fotografia di rose e contratti), lettura delle rose,
// operazione di trasferimento, e chiusura di stagione (prestiti, scadenze,
// svincolati, riapertura della finestra estiva).

import type { Database } from 'sql.js'
import { interroga } from '../db/query.ts'
import { mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import type { Carriera, ContrattoCarriera, Notizia } from '../carriera/tipi.ts'
import { valoreMercato, euro } from './valore.ts'

export const GIORNI_FINESTRA_ESTIVA = 8
export const GIORNI_FINESTRA_INVERNALE = 5

// ── Lettura ────────────────────────────────────────────────────────────────

/** La rosa DI CARRIERA di un club (non quella del DB statico!). */
export function rosaClub(db: Database, carriera: Carriera, clubId: number): GiocatoreRiga[] {
  const ids = carriera.rose[clubId] ?? []
  if (ids.length === 0) return []
  return interroga<GiocatoreRiga>(
    db,
    `SELECT * FROM giocatore WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids,
  )
}

/** Le righe di un elenco di giocatori. */
export function giocatoriPerId(db: Database, ids: number[]): GiocatoreRiga[] {
  if (ids.length === 0) return []
  return interroga<GiocatoreRiga>(
    db,
    `SELECT * FROM giocatore WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids,
  )
}

/** In quale club gioca (in questa carriera) un giocatore? null = svincolato. */
export function clubDiGiocatore(carriera: Carriera, giocatoreId: number): number | null {
  for (const [clubId, ids] of Object.entries(carriera.rose)) {
    if (ids.includes(giocatoreId)) return Number(clubId)
  }
  return null
}

/** Anni di contratto rimasti DOPO la stagione corrente (0 = in scadenza). */
export function anniContratto(carriera: Carriera, giocatoreId: number): number {
  const contratto = carriera.contratti[giocatoreId]
  return contratto ? Math.max(0, contratto.scadenza - carriera.anno - 1) : 0
}

/** Il valore di mercato di un giocatore in questa carriera. */
export function valoreInCarriera(carriera: Carriera, g: GiocatoreRiga): number {
  const clubId = clubDiGiocatore(carriera, g.id)
  const fama = clubId ? carriera.club.find((c) => c.id === clubId)?.forza ?? 50 : 50
  return valoreMercato(g, anniContratto(carriera, g.id), fama)
}

/** Monte stipendi attuale del club dell'utente. */
export function monteStipendi(carriera: Carriera): number {
  return (carriera.rose[carriera.clubId] ?? []).reduce(
    (somma, id) => somma + (carriera.contratti[id]?.stipendio ?? 0),
    0,
  )
}

export function aggiungiNotizia(carriera: Carriera, testo: string, tipo: Notizia['tipo']) {
  const m = carriera.mercato
  const quando = m.aperto
    ? `${m.finestra === 'estiva' ? 'estate' : 'gennaio'}, giorno ${
        (m.finestra === 'estiva' ? GIORNI_FINESTRA_ESTIVA : GIORNI_FINESTRA_INVERNALE) - m.giorniRimasti + 1
      }`
    : `stagione ${carriera.anno}-${String((carriera.anno + 1) % 100).padStart(2, '0')}`
  m.notizie.unshift({ testo, tipo, quando })
  if (m.notizie.length > 60) m.notizie.length = 60 // il notiziario non cresce all'infinito
}

// ── Inizializzazione (creazione carriera e migrazione dei salvataggi) ─────

/** Fotografa rose, contratti e budget dal DB statico dentro la carriera.
    `apriFinestra` = false per i salvataggi migrati a metà stagione. */
export function inizializzaMercato(db: Database, carriera: Carriera, apriFinestra = true): void {
  carriera.rose = {}
  carriera.contratti = {}
  carriera.svincolati = []
  carriera.prestiti = []
  for (const club of carriera.club) {
    const righe = interroga<{ id: number; stipendio: number; scadenza: string }>(
      db,
      `SELECT g.id, c.stipendio, c.scadenza FROM giocatore g
       LEFT JOIN contratto c ON c.giocatore_id = g.id
       WHERE g.club_id = ?`,
      [club.id],
    )
    carriera.rose[club.id] = righe.map((r) => r.id)
    for (const r of righe) {
      carriera.contratti[r.id] = {
        stipendio: r.stipendio ?? 300_000,
        // "2028-06-30" → 2028; senza contratto: 2 anni da adesso
        scadenza: r.scadenza ? parseInt(r.scadenza, 10) : carriera.anno + 2,
      }
    }
  }
  const mioClub = carriera.club.find((c) => c.id === carriera.clubId)!
  carriera.budget = {
    mercato: mioClub.budgetMercato,
    stipendi: Math.round(monteStipendi(carriera) * 1.2), // 20% di margine
  }
  carriera.mercato = {
    aperto: apriFinestra,
    finestra: apriFinestra ? 'estiva' : null,
    giorniRimasti: apriFinestra ? GIORNI_FINESTRA_ESTIVA : 0,
    prossimaOffertaId: 1,
    offerteRicevute: [],
    notizie: [],
    cedibili: [],
  }
  if (apriFinestra) aggiungiNotizia(carriera, 'Si apre la finestra di mercato estiva!', 'avviso')
}

// ── Operazioni ─────────────────────────────────────────────────────────────

/** Sposta un giocatore tra club (o da/verso gli svincolati) e sistema il
    contratto. NON tocca i budget: lo fanno i chiamanti (che sanno il prezzo). */
export function spostaGiocatore(
  carriera: Carriera,
  giocatoreId: number,
  versoClubId: number | null,
  nuovoContratto?: ContrattoCarriera,
): void {
  const daClubId = clubDiGiocatore(carriera, giocatoreId)
  if (daClubId !== null) {
    carriera.rose[daClubId] = carriera.rose[daClubId].filter((id) => id !== giocatoreId)
  }
  carriera.svincolati = carriera.svincolati.filter((id) => id !== giocatoreId)
  if (versoClubId !== null) {
    carriera.rose[versoClubId] = [...(carriera.rose[versoClubId] ?? []), giocatoreId]
  } else {
    carriera.svincolati.push(giocatoreId)
  }
  if (nuovoContratto) carriera.contratti[giocatoreId] = nuovoContratto
  carriera.mercato.cedibili = carriera.mercato.cedibili.filter((id) => id !== giocatoreId)
}

// ── Chiusura di stagione (chiamata da chiudiStagione) ─────────────────────

/** Risolve prestiti e scadenze, poi riapre la finestra estiva. */
export function fineStagioneMercato(db: Database, carriera: Carriera): void {
  // 1. prestiti: obbligo = riscatto; diritto = riscatto se il giocatore è
  //    nella metà buona della rosa ospitante; altrimenti rientro
  for (const p of [...carriera.prestiti]) {
    const g = giocatoriPerId(db, [p.giocatoreId])[0]
    const rosaOspitante = rosaClub(db, carriera, p.ospitanteId)
    const mediana = rosaOspitante.map(mediaComplessiva).sort((a, b) => a - b)[
      Math.floor(rosaOspitante.length / 2)
    ] ?? 0
    const riscatta = p.obbligo || (p.diritto !== null && mediaComplessiva(g) >= mediana)
    const ospitante = carriera.club.find((c) => c.id === p.ospitanteId)
    const proprietario = carriera.club.find((c) => c.id === p.proprietarioId)
    if (riscatta && p.diritto !== null) {
      // il cartellino passa all'ospitante (il giocatore è già lì)
      if (p.proprietarioId === carriera.clubId) carriera.budget.mercato += p.diritto
      aggiungiNotizia(
        carriera,
        `${ospitante?.nome} riscatta ${g.nome} ${g.cognome} per ${euro(p.diritto)}.`,
        'ufficiale',
      )
    } else {
      // rientro alla base
      spostaGiocatore(carriera, p.giocatoreId, p.proprietarioId)
      aggiungiNotizia(
        carriera,
        `${g.nome} ${g.cognome} rientra al ${proprietario?.nome} dal prestito.`,
        'ufficiale',
      )
    }
  }
  carriera.prestiti = []

  // 2. scadenze: i club IA rinnovano i giocatori importanti, gli altri si
  //    svincolano; il club dell'utente doveva rinnovare durante la stagione
  for (const club of carriera.club) {
    const rosa = rosaClub(db, carriera, club.id)
    const ordinata = [...rosa].sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a))
    for (const g of rosa) {
      const contratto = carriera.contratti[g.id]
      if (!contratto || contratto.scadenza > carriera.anno) continue // non in scadenza
      const importante = ordinata.indexOf(g) < 14
      if (club.id !== carriera.clubId && importante) {
        contratto.scadenza = carriera.anno + 2 + (g.id % 2) // rinnovo IA 2-3 anni
        contratto.stipendio = Math.round(contratto.stipendio * 1.1)
      } else {
        spostaGiocatore(carriera, g.id, null)
        aggiungiNotizia(carriera, `${g.nome} ${g.cognome} si svincola dal ${club.nome}.`, 'ufficiale')
      }
    }
  }

  // 3. nuova stagione: budget ripristinati e finestra estiva aperta
  for (const club of carriera.club) {
    club.budgetMercato = Math.max(club.budgetMercato, club.budgetMercatoIniziale)
  }
  const mioClub = carriera.club.find((c) => c.id === carriera.clubId)!
  carriera.budget.mercato = mioClub.budgetMercato
  carriera.budget.stipendi = Math.max(carriera.budget.stipendi, Math.round(monteStipendi(carriera) * 1.15))
  carriera.mercato.aperto = true
  carriera.mercato.finestra = 'estiva'
  carriera.mercato.giorniRimasti = GIORNI_FINESTRA_ESTIVA
  carriera.mercato.offerteRicevute = []
  aggiungiNotizia(carriera, 'Si apre la finestra di mercato estiva!', 'avviso')
}
