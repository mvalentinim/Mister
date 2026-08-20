// confronta-tattiche-cli.ts — il TEST COMPARATIVO delle tattiche (DoD di M4).
//
// Si lancia con: npm run confronta-tattiche
//
// La DoD di M4 chiede che cambiare modulo, movimenti e uomini produca
// "differenze misurabili e spiegabili" nelle partite. Questo test simula
// centinaia di partite tra le STESSE due squadre cambiando solo una cosa
// alla volta, e verifica che l'effetto vada nella direzione attesa:
// 1. mentalità offensiva → più gol fatti E più gol subiti della difensiva
// 2. movimenti adatti ai giocatori → più pericolosità dei movimenti inadatti
// 3. modulo 5-3-2 (difensivo) → meno gol subiti del 4-3-3 (offensivo)

import { readFile } from 'node:fs/promises'
import initSqlJs, { type Database } from 'sql.js'
import { interroga } from '../db/query.ts'
import type { GiocatoreRiga } from '../db/tipi.ts'
import { fattoreIdoneita, migliorUndici, preparaSquadra, tatticaDefault } from './preparazione.ts'
import { simulaPartitaMotore } from './partita.ts'
import {
  ISTRUZIONI_DEFAULT, MODULI, movimentiPerRuolo, type Tattica,
} from '../tattica/definizioni.ts'

const PARTITE = 1200

const SQL = await initSqlJs()
const db: Database = new SQL.Database(await readFile('public/mister.sqlite'))

// Due club di Serie B di forza simile (metà classifica per fama)
const club = interroga<{ id: number; nome: string }>(
  db,
  `SELECT c.id, c.nome FROM club c JOIN competizione co ON co.id = c.competizione_id
   WHERE co.nome = 'Serie B' ORDER BY c.fama DESC LIMIT 2 OFFSET 8`,
)
const [clubA, clubB] = club
const rosaA = interroga<GiocatoreRiga>(db, 'SELECT * FROM giocatore WHERE club_id = ?', [clubA.id])

console.log(`Squadre di prova: ${clubA.nome} (tattiche variabili) vs ${clubB.nome} (sempre default)`)
console.log(`${PARTITE} partite per configurazione, semi indipendenti.\n`)

/** Simula N partite di A (in casa) contro B col default e restituisce le medie. */
function misura(etichetta: string, tattica: Tattica) {
  const squadraA = preparaSquadra(db, clubA.id, clubA.nome, tattica)
  const squadraB = preparaSquadra(db, clubB.id, clubB.nome)
  let fatti = 0
  let subiti = 0
  let xg = 0
  for (let i = 0; i < PARTITE; i++) {
    const esito = simulaPartitaMotore(squadraA, squadraB, `confronto-${etichetta}-${i}`)
    fatti += esito.golCasa
    subiti += esito.golTrasferta
    xg += esito.statistiche.casa.golAttesi
  }
  return { fatti: fatti / PARTITE, subiti: subiti / PARTITE, xg: xg / PARTITE }
}

/** Tattica con i movimenti scelti per idoneità (i migliori o i peggiori). */
function tatticaConMovimenti(migliori: boolean): Tattica {
  const base = tatticaDefault(rosaA)
  const perId = new Map(rosaA.map((g) => [g.id, g]))
  base.movimenti = MODULI[base.modulo].map((slot, i) => {
    const giocatore = perId.get(base.titolari[i])
    if (!giocatore) return []
    const { offensivi, difensivi } = movimentiPerRuolo(slot.ruolo)
    const ordina = (lista: typeof offensivi) =>
      [...lista].sort((a, b) => {
        const diff = fattoreIdoneita(giocatore, b.attributiChiave) - fattoreIdoneita(giocatore, a.attributiChiave)
        return migliori ? diff : -diff
      })
    return [...ordina(offensivi).slice(0, 2), ...ordina(difensivi).slice(0, 2)].map((m) => m.id)
  })
  return base
}

let tuttoOk = true
const verifica = (nome: string, condizione: boolean, dettaglio: string) => {
  if (!condizione) tuttoOk = false
  console.log(`  ${condizione ? '✅' : '❌'} ${nome}: ${dettaglio}`)
}
const f = (v: number) => v.toFixed(2)

// ── 1. Mentalità ──
console.log('══════════ 1. MENTALITÀ (stesse squadre, stesso modulo) ══════════')
const offensiva = misura('off', { ...tatticaDefault(rosaA), istruzioni: { ...ISTRUZIONI_DEFAULT, mentalita: 2 } })
const difensiva = misura('dif', { ...tatticaDefault(rosaA), istruzioni: { ...ISTRUZIONI_DEFAULT, mentalita: -2 } })
console.log(`  Molto offensiva: ${f(offensiva.fatti)} gol fatti, ${f(offensiva.subiti)} subiti`)
console.log(`  Molto difensiva: ${f(difensiva.fatti)} gol fatti, ${f(difensiva.subiti)} subiti`)
verifica('più gol fatti con mentalità offensiva', offensiva.fatti > difensiva.fatti,
  `${f(offensiva.fatti)} > ${f(difensiva.fatti)}`)
verifica('più gol subiti con mentalità offensiva', offensiva.subiti > difensiva.subiti,
  `${f(offensiva.subiti)} > ${f(difensiva.subiti)}`)

// ── 2. Movimenti prevalenti ──
console.log('\n══════════ 2. MOVIMENTI (adatti vs inadatti ai giocatori) ══════════')
const adatti = misura('adatti', tatticaConMovimenti(true))
const inadatti = misura('inadatti', tatticaConMovimenti(false))
console.log(`  Movimenti adatti:   ${f(adatti.fatti)} gol fatti, ${f(adatti.subiti)} subiti, xG ${f(adatti.xg)}`)
console.log(`  Movimenti inadatti: ${f(inadatti.fatti)} gol fatti, ${f(inadatti.subiti)} subiti, xG ${f(inadatti.xg)}`)
verifica('più pericolosità (xG) con movimenti adatti', adatti.xg > inadatti.xg,
  `${f(adatti.xg)} > ${f(inadatti.xg)}`)
verifica('bilancio gol migliore con movimenti adatti',
  adatti.fatti - adatti.subiti > inadatti.fatti - inadatti.subiti,
  `${f(adatti.fatti - adatti.subiti)} > ${f(inadatti.fatti - inadatti.subiti)}`)

// ── 3. Modulo ──
console.log('\n══════════ 3. MODULO (5-3-2 difensivo vs 4-3-3 offensivo) ══════════')
const modulo532 = misura('532', { ...tatticaDefault(rosaA), modulo: '5-3-2', titolari: migliorUndici(rosaA, '5-3-2'), movimenti: MODULI['5-3-2'].map(() => []) })
const modulo433 = misura('433', { ...tatticaDefault(rosaA), modulo: '4-3-3', titolari: migliorUndici(rosaA, '4-3-3'), movimenti: MODULI['4-3-3'].map(() => []) })
console.log(`  5-3-2: ${f(modulo532.fatti)} gol fatti, ${f(modulo532.subiti)} subiti`)
console.log(`  4-3-3: ${f(modulo433.fatti)} gol fatti, ${f(modulo433.subiti)} subiti`)
verifica('meno gol subiti col 5-3-2', modulo532.subiti < modulo433.subiti,
  `${f(modulo532.subiti)} < ${f(modulo433.subiti)}`)

console.log(`\n${tuttoOk ? '✅ TEST TATTICHE SUPERATO: le scelte contano, nella direzione giusta' : '❌ TEST TATTICHE FALLITO'}`)
process.exit(tuttoOk ? 0 : 1)
