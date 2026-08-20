// preparazione.ts — dal database (e dalla tattica) alla squadra pronta per
// il motore: 11 titolari negli slot del modulo, forze di reparto, effetti
// dei movimenti prevalenti e delle istruzioni di squadra (M4, FRD §8).

import type { Database } from 'sql.js'
import { applicaDelta } from '../carriera/crescita.ts'
import { interroga } from '../db/query.ts'
import type { GiocatoreRiga } from '../db/tipi.ts'
import { mediaComplessiva } from '../db/tipi.ts'
import {
  ISTRUZIONI_DEFAULT, MODULI, MOVIMENTI, movimentiDefault, type Tattica,
} from '../tattica/definizioni.ts'
import type { GiocatoreMotore, SquadraMotore } from './tipi.ts'

/** Macro-reparto di ogni ruolo (per aggregare le forze). */
export const REPARTO: Record<string, 'POR' | 'DIF' | 'CEN' | 'ATT'> = {
  POR: 'POR', DC: 'DIF', TD: 'DIF', TS: 'DIF',
  MED: 'CEN', CC: 'CEN', TRQ: 'CEN', ED: 'CEN', ES: 'CEN',
  PC: 'ATT',
}

/** Media dei valori non nulli (0 se nessuno). */
const media = (valori: Array<number | null>) => {
  const presenti = valori.filter((v): v is number => v !== null)
  return presenti.length ? presenti.reduce((s, v) => s + v, 0) / presenti.length : 0
}

const limita = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Converte una riga del database in un giocatore per il motore. */
function preparaGiocatore(g: GiocatoreRiga): GiocatoreMotore {
  return {
    id: g.id,
    nome: `${g.nome} ${g.cognome}`.trim(),
    ruolo: g.ruolo,
    attacco: media([g.tiro, g.dribbling, g.posizionamento, g.velocita]),
    regia: media([g.passaggio, g.visione, g.tecnica]),
    difesa: media([g.marcatura, g.contrasto, g.posizionamento]),
    portiere: g.ruolo === 'POR' ? media([g.riflessi, g.presa, g.uscite]) : 0,
    forma: g.forma,
    pesoTiroExtra: 1,
  }
}

/**
 * IDONEITÀ di un giocatore a un movimento: la media dei suoi attributi
 * chiave, trasformata in un fattore. Sopra ~62 il movimento rende (fino a
 * +1.1× a 84); sotto, il giocatore "lo esegue male" e l'effetto diventa un
 * MALUS (conseguenza voluta: FRD §8.2 — si compra sul mercato in funzione
 * dei movimenti che si vogliono giocare).
 */
export function fattoreIdoneita(g: GiocatoreRiga, attributiChiave: string[]): number {
  const valori = attributiChiave.map((a) => (g as unknown as Record<string, number | null>)[a])
  return limita((media(valori) - 62) / 20, -0.8, 1.1)
}

/**
 * Il reparto di uno SLOT si decide dalla POSIZIONE sul campo, non dal nome
 * del ruolo: le ali alte di un 4-3-3 (ED/ES) contano come attacco, i quinti
 * di un 3-5-2 come centrocampo. Così il modulo ha effetti reali e spiegabili.
 */
function repartoSlot(slot: { ruolo: string; x: number }): 'POR' | 'DIF' | 'CEN' | 'ATT' {
  if (slot.ruolo === 'POR') return 'POR'
  if (slot.x < 30) return 'DIF'
  if (slot.x < 56) return 'CEN'
  return 'ATT'
}

/** Il miglior undici di una rosa per gli slot di un modulo. */
export function migliorUndici(rosa: GiocatoreRiga[], modulo: keyof typeof MODULI): number[] {
  const slots = MODULI[modulo]
  const disponibili = [...rosa].sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a))
  const scelti = new Set<number>()
  const titolari: number[] = []
  for (const slot of slots) {
    // prima chi ha il ruolo esatto, poi stesso reparto, poi il migliore libero
    const candidato =
      disponibili.find((g) => !scelti.has(g.id) && g.ruolo === slot.ruolo) ??
      disponibili.find((g) => !scelti.has(g.id) && REPARTO[g.ruolo] === REPARTO[slot.ruolo]) ??
      disponibili.find((g) => !scelti.has(g.id))
    if (!candidato) break
    scelti.add(candidato.id)
    titolari.push(candidato.id)
  }
  return titolari
}

/** La tattica di default di una rosa: 4-4-2, miglior undici, movimenti base. */
export function tatticaDefault(rosa: GiocatoreRiga[]): Tattica {
  const modulo = '4-4-2'
  return {
    modulo,
    titolari: migliorUndici(rosa, modulo),
    movimenti: MODULI[modulo].map((slot) => movimentiDefault(slot.ruolo)),
    istruzioni: { ...ISTRUZIONI_DEFAULT },
  }
}

/**
 * Prepara una squadra per il motore. Senza tattica esplicita usa il default
 * (4-4-2 col miglior undici): è l'assetto dei club controllati dall'IA.
 * `giocatoriIds` è la rosa DI CARRIERA (M6): se assente si usa quella del
 * DB statico (consultazione database, calibrazione).
 */
export function preparaSquadra(
  db: Database,
  clubId: number,
  nomeClub: string,
  tattica?: Tattica,
  giocatoriIds?: number[],
  crescita?: Record<number, number>, // crescita/declino di carriera (M8)
): SquadraMotore {
  const rosa = applicaDelta(crescita, giocatoriIds
    ? giocatoriIds.length > 0
      ? interroga<GiocatoreRiga>(
          db,
          `SELECT * FROM giocatore WHERE id IN (${giocatoriIds.map(() => '?').join(',')})`,
          giocatoriIds,
        )
      : []
    : interroga<GiocatoreRiga>(db, 'SELECT * FROM giocatore WHERE club_id = ?', [clubId]))
  const assetto = tattica ?? tatticaDefault(rosa)
  const slots = MODULI[assetto.modulo]
  const perId = new Map(rosa.map((g) => [g.id, g]))

  // giocatori negli slot (se un id non è più in rosa si ripiega sul default)
  const righe: GiocatoreRiga[] = []
  for (let i = 0; i < slots.length; i++) {
    const riga = perId.get(assetto.titolari[i])
    if (riga && !righe.includes(riga)) righe.push(riga)
  }
  if (righe.length < 11) {
    for (const id of migliorUndici(rosa, assetto.modulo)) {
      if (righe.length >= 11) break
      const riga = perId.get(id)!
      if (!righe.includes(riga)) righe.push(riga)
    }
  }

  const giocatori = righe.map(preparaGiocatore)

  // ── forze di reparto in base agli SLOT del modulo (per posizione) ──
  // un giocatore fuori reparto rende un po' meno (adattamento ×0.92)
  const contributo = (i: number, valore: number) => {
    const naturale = REPARTO[giocatori[i].ruolo]
    const assegnato = slots[i] ? repartoSlot(slots[i]) : naturale
    return naturale === assegnato ? valore : valore * 0.92
  }

  const indiciReparto = (reparto: 'DIF' | 'CEN' | 'ATT') =>
    slots.map((s, i) => (repartoSlot(s) === reparto ? i : -1)).filter((i) => i >= 0 && i < giocatori.length)

  const dif = indiciReparto('DIF')
  const cen = indiciReparto('CEN')
  const att = indiciReparto('ATT')
  const indicePortiere = slots.findIndex((s) => s.ruolo === 'POR')

  // il NUMERO di uomini per reparto conta (è l'effetto del modulo): giocare
  // con 5 difensori copre di più, con 3 punte si attacca di più. Il peso è
  // più forte in difesa (gli uomini in area proteggono) e più morbido a
  // centrocampo (dove conta di più la qualità).
  const pesoNumerico = (quanti: number, riferimento: number, forza: number) =>
    1 + forza * (quanti - riferimento)

  let attacco =
    (media(att.map((i) => contributo(i, giocatori[i].attacco))) * 0.7 +
      media(cen.map((i) => contributo(i, giocatori[i].attacco))) * 0.3) *
    pesoNumerico(att.length, 2, 0.055)
  let centrocampo =
    (media(cen.map((i) => contributo(i, giocatori[i].regia))) * 0.7 +
      media(giocatori.map((g) => g.regia)) * 0.3) *
    pesoNumerico(cen.length, 4, 0.035)
  let difesa =
    (media(dif.map((i) => contributo(i, giocatori[i].difesa))) * 0.7 +
      media(cen.map((i) => contributo(i, giocatori[i].difesa))) * 0.3) *
    pesoNumerico(dif.length, 4, 0.08)
  const portiere = giocatori[indicePortiere]?.portiere ?? 40

  // ── movimenti prevalenti: effetto × idoneità del giocatore dello slot ──
  const modificatori = { attacco: 0, centrocampo: 0, difesa: 0 }
  for (let i = 0; i < slots.length && i < righe.length; i++) {
    for (const idMovimento of assetto.movimenti[i] ?? []) {
      const movimento = MOVIMENTI.find((m) => m.id === idMovimento)
      if (!movimento) continue
      const fattore = fattoreIdoneita(righe[i], movimento.attributiChiave)
      modificatori.attacco += (movimento.effetto.attacco ?? 0) * fattore
      modificatori.centrocampo += (movimento.effetto.centrocampo ?? 0) * fattore
      modificatori.difesa += (movimento.effetto.difesa ?? 0) * fattore
      if (movimento.tiratore && fattore > 0) giocatori[i].pesoTiroExtra = 1 + fattore * 0.5
    }
  }
  // ── istruzioni di squadra (FRD §8.3) ──
  // (il totale dei movimenti, col tetto ±8, entra nel delta qui sotto)
  const istr = assetto.istruzioni
  const deltaIstruzioni = { attacco: 0, centrocampo: 0, difesa: 0 }
  deltaIstruzioni.attacco += istr.mentalita * 2.5 // mentalità offensiva: più pericolosità...
  deltaIstruzioni.difesa -= istr.mentalita * 2.5 // ...ma più spazi concessi
  if (istr.pressing === 'alto') { deltaIstruzioni.centrocampo += 2; deltaIstruzioni.difesa -= 1.5 }
  if (istr.pressing === 'basso') { deltaIstruzioni.centrocampo -= 2; deltaIstruzioni.difesa += 1.5 }
  if (istr.ampiezza === 'larga') { deltaIstruzioni.attacco += 1.5; deltaIstruzioni.centrocampo -= 1 }
  if (istr.ampiezza === 'stretta') { deltaIstruzioni.attacco -= 1; deltaIstruzioni.centrocampo += 1 }
  const ritmo = istr.ritmo === 'alto' ? 1.12 : istr.ritmo === 'basso' ? 0.9 : 1

  // il delta complessivo (movimenti col tetto + istruzioni) viene registrato
  // sulla squadra: serve a ricalcolare le forze dopo un cambio (M5)
  const deltaTattici = {
    attacco: limita(modificatori.attacco, -8, 8) + deltaIstruzioni.attacco,
    centrocampo: limita(modificatori.centrocampo, -8, 8) + deltaIstruzioni.centrocampo,
    difesa: limita(modificatori.difesa, -8, 8) + deltaIstruzioni.difesa,
  }

  // la panchina: chi non è titolare, in ordine di media (per i cambi, M5)
  const idTitolari = new Set(righe.map((g) => g.id))
  const panchina = rosa
    .filter((g) => !idTitolari.has(g.id))
    .sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a))
    .slice(0, 12)
    .map(preparaGiocatore)

  return {
    clubId,
    nome: nomeClub,
    titolari: giocatori,
    panchina,
    posizioni: slots.map((s) => [s.x, s.y] as [number, number]),
    repartiSlot: slots.map(repartoSlot),
    attacco: attacco + deltaTattici.attacco,
    centrocampo: centrocampo + deltaTattici.centrocampo,
    difesa: difesa + deltaTattici.difesa,
    portiere,
    deltaTattici,
    mentalita: istr.mentalita,
    ritmo,
  }
}
