// ia.ts — l'intelligenza del mercato (M6, FRD §6.1-6.2):
// - l'IA dei club: analisi della rosa (ruoli scoperti, esuberi), personalità
//   economica, acquisti e cessioni tra club IA, offerte per i giocatori
//   dell'utente, notizie e rumor;
// - la valutazione delle PROPOSTE dell'utente con le 5 leve del FRD §6.2
//   (prezzo, bonus, scadenza, prestito con diritto/obbligo, contropartite),
//   in massimo 3 round e con i rifiuti sempre motivati.
//
// Il mercato è deterministico: il generatore è seminato con carriera+
// stagione+finestra+giorno (stessa carriera → stesso mercato).

import type { Database } from 'sql.js'
import { mediaComplessiva, calcolaEta, type GiocatoreRiga } from '../db/tipi.ts'
import { REPARTO } from '../motore/preparazione.ts'
import { creaRng, semeDaStringa } from '../motore/rng.ts'
import type { Carriera } from '../carriera/tipi.ts'
import { euro } from './valore.ts'
import {
  aggiungiNotizia, anniContratto, clubDiGiocatore, giocatoriPerId, monteStipendi,
  rosaClub, spostaGiocatore, valoreInCarriera,
} from './stato.ts'

// ── Personalità economica dei club (FRD §6.1) ─────────────────────────────
// Deterministica: deriva dall'id del club, uguale in tutte le carriere.

export interface Personalita {
  /** 0-1: quanto volentieri vende (0 = bottega carissima) */
  propensioneVendita: number
  /** 0-1: quanto è aggressivo negli acquisti */
  aggressivita: number
  /** predilige i giovani da valorizzare */
  valorizzaGiovani: boolean
}

export function personalitaClub(clubId: number): Personalita {
  const rng = creaRng(semeDaStringa(`personalita-${clubId}`))
  return {
    propensioneVendita: 0.25 + rng.numero() * 0.6,
    aggressivita: 0.2 + rng.numero() * 0.7,
    valorizzaGiovani: rng.evento(0.4),
  }
}

// ── Analisi della rosa (FRD §6.1: "club con bisogni reali") ───────────────

/** Organici minimi e massimi per reparto (rosa tipo: 3 POR, 8 DIF, 8 CEN, 5 ATT). */
const MINIMI: Record<string, number> = { POR: 2, DIF: 7, CEN: 7, ATT: 3 }
const MASSIMI: Record<string, number> = { POR: 3, DIF: 9, CEN: 9, ATT: 5 }
const NOME_REPARTO: Record<string, string> = {
  POR: 'in porta', DIF: 'in difesa', CEN: 'a centrocampo', ATT: 'in attacco',
}

export interface AnalisiRosa {
  /** reparti sotto l'organico minimo */
  scoperti: string[]
  /** giocatori in eccesso nei reparti pieni (i peggiori prima) */
  esuberi: GiocatoreRiga[]
  /** i 6 migliori: i club non li cedono volentieri */
  chiave: Set<number>
}

export function analizzaRosa(db: Database, carriera: Carriera, clubId: number): AnalisiRosa {
  const rosa = rosaClub(db, carriera, clubId)
  const perReparto: Record<string, GiocatoreRiga[]> = { POR: [], DIF: [], CEN: [], ATT: [] }
  for (const g of rosa) perReparto[REPARTO[g.ruolo]]?.push(g)
  const scoperti = Object.keys(MINIMI).filter((r) => perReparto[r].length < MINIMI[r])
  const esuberi: GiocatoreRiga[] = []
  for (const reparto of Object.keys(MASSIMI)) {
    const lista = [...perReparto[reparto]].sort((a, b) => mediaComplessiva(a) - mediaComplessiva(b))
    const eccesso = lista.length - MASSIMI[reparto]
    if (eccesso > 0) esuberi.push(...lista.slice(0, eccesso))
  }
  const chiave = new Set(
    [...rosa].sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a)).slice(0, 6).map((g) => g.id),
  )
  return { scoperti, esuberi, chiave }
}

// ── Il giorno di mercato dell'IA ───────────────────────────────────────────

/** Esegue un trasferimento tra club IA (o verso/da svincolati). */
function trasferimentoIA(
  carriera: Carriera, g: GiocatoreRiga,
  compratoreId: number, prezzo: number, motivazione: string,
) {
  const venditoreId = clubDiGiocatore(carriera, g.id)
  const compratore = carriera.club.find((c) => c.id === compratoreId)!
  const venditore = carriera.club.find((c) => c.id === venditoreId)
  compratore.budgetMercato -= prezzo
  if (venditore) venditore.budgetMercato += Math.round(prezzo * 0.9)
  if (venditoreId === carriera.clubId) carriera.budget.mercato += prezzo
  const vecchio = carriera.contratti[g.id]
  spostaGiocatore(carriera, g.id, compratoreId, {
    stipendio: Math.round((vecchio?.stipendio ?? 300_000) * 1.15),
    scadenza: carriera.anno + 2 + (g.id % 3), // 2-4 anni
  })
  aggiungiNotizia(
    carriera,
    `UFFICIALE: ${g.nome} ${g.cognome} ${venditore ? `dal ${venditore.nome} ` : 'da svincolato '}al ${compratore.nome} ${prezzo > 0 ? `per ${euro(prezzo)}` : 'a parametro zero'} (${motivazione}).`,
    'ufficiale',
  )
}

/**
 * Avanza il mercato di un giorno: alcuni club IA con ruoli scoperti cercano
 * rinforzi tra gli esuberi altrui e gli svincolati; qualcuno bussa alla
 * porta dell'utente. Genera notizie ufficiali e rumor.
 */
export function giornoDiMercato(db: Database, carriera: Carriera): void {
  const m = carriera.mercato
  if (!m.aperto || m.giorniRimasti <= 0) return
  const giorno = m.giorniRimasti
  const rng = creaRng(semeDaStringa(`mercato-${carriera.seme}-${carriera.anno}-${m.finestra}-${giorno}`))

  const clubIA = carriera.club.filter((c) => c.id !== carriera.clubId)
  // col mercato mondiale i club sono ~200: l'attività IA resta un campione
  // (8-11 compratori al giorno), il mescolamento è deterministico (seminato)
  const mescolati = [...clubIA].sort(() => rng.numero() - 0.5)
  const attivi = mescolati.slice(0, 8 + rng.intero(4))

  for (const compratore of attivi) {
    const analisi = analizzaRosa(db, carriera, compratore.id)
    if (analisi.scoperti.length === 0 || compratore.budgetMercato < 200_000) continue
    const reparto = analisi.scoperti[rng.intero(analisi.scoperti.length)]
    const personalita = personalitaClub(compratore.id)

    // candidati: esuberi degli altri club (utente escluso: con lui si
    // tratta, non si saccheggia) + svincolati del reparto giusto.
    // Analizzare 200 rose costerebbe troppo: si guarda un campione di 40.
    const venditori = mescolati.filter((c) => c.id !== compratore.id).slice(0, 40)
    const candidati: GiocatoreRiga[] = []
    for (const altro of venditori) {
      candidati.push(...analizzaRosa(db, carriera, altro.id).esuberi.filter((g) => REPARTO[g.ruolo] === reparto))
    }
    const svincolatiReparto = giocatoriPerId(db, carriera.svincolati).filter((g) => REPARTO[g.ruolo] === reparto)
    candidati.push(...svincolatiReparto)

    const acquistabili = candidati
      .filter((g) => valoreInCarriera(carriera, g) <= compratore.budgetMercato * 0.75)
      .sort((a, b) => {
        // i valorizzatori di giovani pesano l'età, gli altri la media
        const punteggio = (g: GiocatoreRiga) =>
          mediaComplessiva(g) - (personalita.valorizzaGiovani ? calcolaEta(g.data_nascita) * 0.8 : 0)
        return punteggio(b) - punteggio(a)
      })
    const obiettivo = acquistabili[0]
    if (!obiettivo) continue

    const svincolato = carriera.svincolati.includes(obiettivo.id)
    const valore = valoreInCarriera(carriera, obiettivo)
    if (svincolato) {
      trasferimentoIA(carriera, obiettivo, compratore.id, 0, `serviva un rinforzo ${NOME_REPARTO[reparto]}`)
      continue
    }
    // il venditore accetta? (è un suo esubero: quasi sempre)
    const venditore = personalitaClub(clubDiGiocatore(carriera, obiettivo.id)!)
    if (rng.evento(0.55 + venditore.propensioneVendita * 0.4)) {
      const prezzo = Math.round(valore * (0.95 + rng.numero() * 0.2))
      trasferimentoIA(carriera, obiettivo, compratore.id, prezzo, `serviva un rinforzo ${NOME_REPARTO[reparto]}`)
    } else if (rng.evento(0.5)) {
      aggiungiNotizia(
        carriera,
        `Rumor: il ${compratore.nome} avrebbe messo gli occhi su ${obiettivo.nome} ${obiettivo.cognome}, ma la trattativa non decolla.`,
        'rumor',
      )
    }
  }

  // qualche club bussa alla porta dell'utente (più spesso per i cedibili)
  if (rng.evento(0.6) && m.offerteRicevute.length < 4) {
    const miaRosa = rosaClub(db, carriera, carriera.clubId)
    const analisiMia = analizzaRosa(db, carriera, carriera.clubId)
    const bersagli = miaRosa.filter(
      (g) => m.cedibili.includes(g.id) || (!analisiMia.chiave.has(g.id) && rng.evento(0.3)),
    )
    const bersaglio = bersagli[rng.intero(Math.max(1, bersagli.length))]
    if (bersaglio) {
      const offerente = clubIA[rng.intero(clubIA.length)]
      const valore = valoreInCarriera(carriera, bersaglio)
      if (offerente.budgetMercato > valore * 0.8) {
        const giovane = calcolaEta(bersaglio.data_nascita) <= 22
        const prestito = giovane && rng.evento(0.4)
        m.offerteRicevute.push({
          id: m.prossimaOffertaId++,
          clubId: offerente.id,
          giocatoreId: bersaglio.id,
          tipo: prestito ? 'prestito-diritto' : 'acquisto',
          prezzo: Math.round(valore * (prestito ? 1.1 : 0.9 + rng.numero() * 0.4)),
        })
        aggiungiNotizia(
          carriera,
          `Il ${offerente.nome} ha presentato un'offerta per ${bersaglio.nome} ${bersaglio.cognome}.`,
          'rumor',
        )
      }
    }
  }

  m.giorniRimasti--
  if (m.giorniRimasti <= 0) {
    m.aperto = false
    m.offerteRicevute = []
    aggiungiNotizia(carriera, `La finestra di mercato ${m.finestra === 'estiva' ? 'estiva' : 'invernale'} è CHIUSA.`, 'avviso')
  }
}

// ── La trattativa dell'utente (FRD §6.2: 5 leve, max 3 round) ─────────────

export interface Proposta {
  giocatoreId: number
  prezzo: number
  bonus: number
  /** prestito con diritto (prezzo) o obbligo di riscatto */
  prestito: { diritto: number; obbligo: boolean } | null
  /** contropartita tecnica: un giocatore dell'utente */
  contropartitaId: number | null
  round: number // 1, 2 o 3
}

export type Risposta =
  | { esito: 'accettata' }
  | { esito: 'contro'; motivo: string; controPrezzo: number }
  | { esito: 'rifiutata'; motivo: string }

/** Il club valuta una proposta dell'utente per un suo giocatore. */
export function valutaProposta(db: Database, carriera: Carriera, p: Proposta): Risposta {
  const g = giocatoriPerId(db, [p.giocatoreId])[0]
  const clubId = clubDiGiocatore(carriera, p.giocatoreId)!
  const personalita = personalitaClub(clubId)
  const analisi = analizzaRosa(db, carriera, clubId)
  const valore = valoreInCarriera(carriera, g)
  const inScadenza = anniContratto(carriera, p.giocatoreId) === 0

  // quanto chiede il club: dipende da quanto il giocatore gli serve
  const chiave = analisi.chiave.has(g.id)
  const esubero = analisi.esuberi.some((e) => e.id === g.id)
  let richiesta = valore * (chiave ? 1.4 : esubero ? 0.85 : 1.1)
  richiesta *= 1.1 - personalita.propensioneVendita * 0.25 // le botteghe care chiedono di più
  if (inScadenza) richiesta *= 0.75 // in scadenza: meglio monetizzare

  // incedibile: un top-3 di un club che non vende, non in scadenza
  const top3 = [...analisi.chiave].slice(0, 3).includes(g.id)
  if (top3 && personalita.propensioneVendita < 0.45 && !inScadenza) {
    return { esito: 'rifiutata', motivo: `${g.cognome} è incedibile: è un pilastro del progetto.` }
  }

  // ── prestito ──
  if (p.prestito) {
    if (chiave) {
      return { esito: 'rifiutata', motivo: `Non cediamo in prestito un titolare come ${g.cognome}.` }
    }
    const dirittoMinimo = Math.round(valore * 1.05)
    if (p.prestito.obbligo || p.prestito.diritto >= dirittoMinimo) {
      return { esito: 'accettata' }
    }
    if (p.round >= 3) {
      return { esito: 'rifiutata', motivo: 'Il diritto di riscatto proposto è troppo basso: la trattativa si chiude qui.' }
    }
    return {
      esito: 'contro',
      motivo: `Sul prestito ci siamo, ma il diritto di riscatto deve valere almeno ${euro(dirittoMinimo)}.`,
      controPrezzo: dirittoMinimo,
    }
  }

  // ── acquisto: le leve compongono il valore percepito dell'offerta ──
  // i bonus valgono la metà (sono soldi incerti)
  let valoreOfferta = p.prezzo + p.bonus * 0.5
  let contropartitaUtile = true
  if (p.contropartitaId) {
    const contro = giocatoriPerId(db, [p.contropartitaId])[0]
    const valoreContro = valoreInCarriera(carriera, contro)
    // la contropartita interessa solo se copre un reparto scoperto (o quasi)
    contropartitaUtile =
      analisi.scoperti.includes(REPARTO[contro.ruolo]) ||
      !analisi.esuberi.some((e) => REPARTO[e.ruolo] === REPARTO[contro.ruolo])
    if (!contropartitaUtile && valoreContro > valoreOfferta * 0.4) {
      return {
        esito: 'rifiutata',
        motivo: `Non ci interessa la contropartita: in quel ruolo siamo già coperti.`,
      }
    }
    valoreOfferta += valoreContro * (contropartitaUtile ? 0.85 : 0.35)
  }

  if (valoreOfferta >= richiesta) return { esito: 'accettata' }

  if (p.round >= 3) {
    return { esito: 'rifiutata', motivo: `L'offerta resta troppo bassa: la trattativa si chiude qui.` }
  }
  if (valoreOfferta >= richiesta * 0.65) {
    // controproposta: il prezzo cash che manca per arrivare alla richiesta
    const controPrezzo = Math.round((richiesta - (valoreOfferta - p.prezzo)) / 100_000) * 100_000
    return {
      esito: 'contro',
      motivo: `${euro(p.prezzo)} non bastano: per ${g.cognome} vogliamo ${euro(controPrezzo)} di parte fissa.`,
      controPrezzo,
    }
  }
  return { esito: 'rifiutata', motivo: `L'offerta è fuori mercato: ${g.cognome} vale molto di più.` }
}

/** Esegue l'acquisto (o il prestito) concordato. Restituisce un eventuale
    errore di budget, altrimenti null. `contrattoNegoziato` arriva dalla
    trattativa col giocatore (M7); senza, stipendio attuale +10%. */
export function eseguiAcquisto(
  db: Database,
  carriera: Carriera,
  p: Proposta,
  contrattoNegoziato?: { stipendio: number; durataAnni: number },
): string | null {
  const g = giocatoriPerId(db, [p.giocatoreId])[0]
  const venditoreId = clubDiGiocatore(carriera, p.giocatoreId)!
  const venditore = carriera.club.find((c) => c.id === venditoreId)!
  const vecchioContratto = carriera.contratti[p.giocatoreId]
  const nuovoStipendio =
    contrattoNegoziato?.stipendio ?? Math.round((vecchioContratto?.stipendio ?? 300_000) * 1.1)
  const scadenzaNegoziata = carriera.anno + (contrattoNegoziato?.durataAnni ?? 4)

  const costoCartellino = p.prestito ? 0 : p.prezzo
  if (costoCartellino > carriera.budget.mercato) {
    return 'Budget mercato insufficiente per questa operazione.'
  }
  if (monteStipendi(carriera) + nuovoStipendio > carriera.budget.stipendi) {
    return 'Monte stipendi insufficiente: cedi qualcuno o rinuncia.'
  }

  let testoContropartita = ''
  if (p.contropartitaId) {
    const contro = giocatoriPerId(db, [p.contropartitaId])[0]
    spostaGiocatore(carriera, p.contropartitaId, venditoreId, {
      stipendio: carriera.contratti[p.contropartitaId]?.stipendio ?? 300_000,
      scadenza: carriera.anno + 3,
    })
    testoContropartita = ` (con ${contro.nome} ${contro.cognome} come contropartita)`
  }

  carriera.budget.mercato -= costoCartellino
  venditore.budgetMercato += Math.round(costoCartellino * 0.9)

  if (p.prestito) {
    spostaGiocatore(carriera, p.giocatoreId, carriera.clubId) // contratto resta del proprietario
    carriera.prestiti.push({
      giocatoreId: p.giocatoreId,
      proprietarioId: venditoreId,
      ospitanteId: carriera.clubId,
      diritto: p.prestito.diritto,
      obbligo: p.prestito.obbligo,
    })
    aggiungiNotizia(
      carriera,
      `UFFICIALE: ${g.nome} ${g.cognome} arriva in prestito dal ${venditore.nome} con ${p.prestito.obbligo ? 'OBBLIGO' : 'diritto'} di riscatto a ${euro(p.prestito.diritto)}.`,
      'ufficiale',
    )
  } else {
    spostaGiocatore(carriera, p.giocatoreId, carriera.clubId, {
      stipendio: nuovoStipendio,
      scadenza: scadenzaNegoziata,
    })
    aggiungiNotizia(
      carriera,
      `UFFICIALE: ${g.nome} ${g.cognome} è un nuovo giocatore del tuo club! ${euro(p.prezzo)}${p.bonus ? ` + ${euro(p.bonus)} di bonus` : ''} al ${venditore.nome}${testoContropartita}.`,
      'ufficiale',
    )
  }
  return null
}

/** L'utente accetta un'offerta ricevuta da un club IA. */
export function accettaOfferta(db: Database, carriera: Carriera, offertaId: number): void {
  const m = carriera.mercato
  const offerta = m.offerteRicevute.find((o) => o.id === offertaId)
  if (!offerta) return
  const g = giocatoriPerId(db, [offerta.giocatoreId])[0]
  const compratore = carriera.club.find((c) => c.id === offerta.clubId)!

  if (offerta.tipo === 'acquisto') {
    carriera.budget.mercato += offerta.prezzo
    compratore.budgetMercato -= offerta.prezzo
    spostaGiocatore(carriera, offerta.giocatoreId, offerta.clubId, {
      stipendio: Math.round((carriera.contratti[offerta.giocatoreId]?.stipendio ?? 300_000) * 1.15),
      scadenza: carriera.anno + 3,
    })
    aggiungiNotizia(carriera, `UFFICIALE: hai ceduto ${g.nome} ${g.cognome} al ${compratore.nome} per ${euro(offerta.prezzo)}.`, 'ufficiale')
  } else {
    // prestito con diritto: il giocatore va, il cartellino resta tuo
    spostaGiocatore(carriera, offerta.giocatoreId, offerta.clubId)
    carriera.prestiti.push({
      giocatoreId: offerta.giocatoreId,
      proprietarioId: carriera.clubId,
      ospitanteId: offerta.clubId,
      diritto: offerta.prezzo,
      obbligo: false,
    })
    aggiungiNotizia(carriera, `UFFICIALE: ${g.nome} ${g.cognome} va in prestito al ${compratore.nome} con diritto di riscatto a ${euro(offerta.prezzo)}.`, 'ufficiale')
  }
  m.offerteRicevute = m.offerteRicevute.filter((o) => o.id !== offertaId)
}

/**
 * L'utente PROPONE un suo giocatore ai club IA (vendita o prestito).
 * Se un club interessato esiste (ruolo utile + budget), la sua offerta
 * arriva tra le "offerte ricevute"; altrimenti si spiega il perché.
 */
export function proponiCessione(
  db: Database,
  carriera: Carriera,
  giocatoreId: number,
  tipo: 'vendita' | 'prestito',
): string | null {
  const m = carriera.mercato
  if (!m.aperto) return 'Il mercato è chiuso.'
  const g = giocatoriPerId(db, [giocatoreId])[0]
  const valore = valoreInCarriera(carriera, g)
  const rng = creaRng(semeDaStringa(`proposta-${carriera.seme}-${carriera.anno}-${m.giorniRimasti}-${giocatoreId}-${tipo}`))

  // club interessati: hanno quel reparto scoperto (o quasi) e i soldi.
  // Prima i filtri economici (economici anche da calcolare), poi l'analisi
  // della rosa su un campione di 40 club: col mercato mondiale sono ~200.
  const conSoldi = carriera.club.filter((c) => {
    if (c.id === carriera.clubId) return false
    if (tipo === 'vendita' && c.budgetMercato < valore * 0.8) return false
    return true
  })
  const interessati = conSoldi
    .sort(() => rng.numero() - 0.5)
    .slice(0, 40)
    .filter((c) => {
      const analisi = analizzaRosa(db, carriera, c.id)
      const reparto = REPARTO[g.ruolo]
      return (
        analisi.scoperti.includes(reparto) ||
        (!analisi.esuberi.some((e) => REPARTO[e.ruolo] === reparto) && rng.evento(0.4))
      )
    })
  if (interessati.length === 0) {
    return `Per ora nessun club cerca un ${g.ruolo}: riprova nei prossimi giorni o abbassa le pretese.`
  }
  const offerente = interessati[rng.intero(interessati.length)]
  m.offerteRicevute.push({
    id: m.prossimaOffertaId++,
    clubId: offerente.id,
    giocatoreId,
    tipo: tipo === 'vendita' ? 'acquisto' : 'prestito-diritto',
    prezzo: Math.round(valore * (tipo === 'vendita' ? 0.85 + rng.numero() * 0.2 : 1.05)),
  })
  aggiungiNotizia(
    carriera,
    `Il ${offerente.nome} risponde alla tua proposta per ${g.nome} ${g.cognome}: offerta in arrivo.`,
    'rumor',
  )
  return null
}

/** Rinnovo semplice di un contratto (FRD: M6 base, la trattativa vera è M7). */
export function rinnovaContratto(carriera: Carriera, giocatoreId: number): string | null {
  const contratto = carriera.contratti[giocatoreId]
  if (!contratto) return 'Contratto non trovato.'
  const nuovoStipendio = Math.round(contratto.stipendio * 1.2)
  if (monteStipendi(carriera) - contratto.stipendio + nuovoStipendio > carriera.budget.stipendi) {
    return 'Monte stipendi insufficiente per il rinnovo.'
  }
  contratto.stipendio = nuovoStipendio
  contratto.scadenza = carriera.anno + 3
  return null
}

/** Lo stipendio che uno svincolato si aspetta (per aprire la trattativa). */
export function stipendioAttesoSvincolato(carriera: Carriera, g: GiocatoreRiga): number {
  return Math.round(Math.max(200_000, valoreInCarriera(carriera, g) * 0.08))
}

/** Ingaggio di uno svincolato (gratis, pesa solo sugli stipendi).
    Il contratto arriva dalla trattativa col giocatore (M7). */
export function ingaggiaSvincolato(
  db: Database,
  carriera: Carriera,
  giocatoreId: number,
  contratto?: { stipendio: number; durataAnni: number },
): string | null {
  const g = giocatoriPerId(db, [giocatoreId])[0]
  const stipendio = contratto?.stipendio ?? stipendioAttesoSvincolato(carriera, g)
  if (monteStipendi(carriera) + stipendio > carriera.budget.stipendi) {
    return 'Monte stipendi insufficiente.'
  }
  spostaGiocatore(carriera, giocatoreId, carriera.clubId, {
    stipendio,
    scadenza: carriera.anno + (contratto?.durataAnni ?? 2),
  })
  aggiungiNotizia(carriera, `UFFICIALE: ${g.nome} ${g.cognome} firma da svincolato!`, 'ufficiale')
  return null
}
