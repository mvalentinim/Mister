// calibra-cli.ts — il TEST DI CALIBRAZIONE del motore (DoD di M3).
//
// Si lancia con: npm run calibra
//
// Cosa fa:
// 1. TEST DI DETERMINISMO: stessa partita con lo stesso seme due volte →
//    deve uscire IDENTICA in ogni dettaglio; con un seme diverso → diversa.
// 2. CALIBRAZIONE: simula più stagioni complete IA-vs-IA di Serie A e
//    Serie B e confronta le distribuzioni (gol/partita, esiti, punti del
//    campione, capocannoniere) con i valori reali di riferimento della
//    letteratura statistica (vedi docs/match-engine.md).
//
// Legge il database vero (public/mister.sqlite): gli stessi dati dell'app.

import { readFile } from 'node:fs/promises'
import initSqlJs, { type Database } from 'sql.js'
import { interroga } from '../db/query.ts'
import { generaCalendario } from '../carriera/calendario.ts'
import { creaRng, semeDaStringa } from './rng.ts'
import { preparaSquadra } from './preparazione.ts'
import { simulaPartitaMotore } from './partita.ts'
import type { SquadraMotore } from './tipi.ts'

const STAGIONI_PER_LEGA = 10

// Valori di riferimento reali (medie storiche dei campionati europei)
const RIFERIMENTI = {
  golAPartita: [2.4, 3.0] as const,
  vittorieCasa: [0.40, 0.50] as const,
  pareggi: [0.22, 0.32] as const,
  puntiCampioneSerieA: [75, 98] as const,
  puntiUltimaSerieA: [10, 35] as const,
  capocannoniere: [15, 32] as const,
}

function dentro(valore: number, [min, max]: readonly [number, number]) {
  return valore >= min && valore <= max
}

// ── Preparazione ────────────────────────────────────────────────────────────

const SQL = await initSqlJs()
const db: Database = new SQL.Database(await readFile('public/mister.sqlite'))

function squadreDellaLega(nomeLega: string): SquadraMotore[] {
  const club = interroga<{ id: number; nome: string }>(
    db,
    `SELECT c.id, c.nome FROM club c JOIN competizione co ON co.id = c.competizione_id
     WHERE co.nome = ? ORDER BY c.id`,
    [nomeLega],
  )
  return club.map((c) => preparaSquadra(db, c.id, c.nome))
}

// ── 1. Test di determinismo ────────────────────────────────────────────────

console.log('══════════ TEST DI DETERMINISMO ══════════')
const [squadraA, squadraB] = squadreDellaLega('Serie A')
const prova1 = simulaPartitaMotore(squadraA, squadraB, 'seme-di-prova')
const prova2 = simulaPartitaMotore(squadraA, squadraB, 'seme-di-prova')
const prova3 = simulaPartitaMotore(squadraA, squadraB, 'seme-diverso')

const identiche = JSON.stringify(prova1) === JSON.stringify(prova2)
const diverse = JSON.stringify(prova1) !== JSON.stringify(prova3)
console.log(`Stesso seme → stessa partita:   ${identiche ? '✅ PASSA' : '❌ FALLISCE'}`)
console.log(`Seme diverso → partita diversa: ${diverse ? '✅ PASSA' : '❌ FALLISCE'}`)
console.log(`(esempio: ${squadraA.nome}-${squadraB.nome} ${prova1.golCasa}-${prova1.golTrasferta}, ${prova1.eventi.length} eventi)`)

// ── 2. Calibrazione sulle stagioni ─────────────────────────────────────────

let tuttoOk = identiche && diverse

for (const nomeLega of ['Serie A', 'Serie B']) {
  const squadre = squadreDellaLega(nomeLega)
  const perClub = new Map(squadre.map((s) => [s.clubId, s]))

  let partite = 0
  let golTotali = 0
  let vittorieCasa = 0, pareggi = 0, vittorieTrasferta = 0
  let massimoGolPartita = 0
  const puntiCampione: number[] = []
  const puntiUltima: number[] = []
  const capocannonieri: number[] = []
  const conteggiRisultati = new Map<string, number>()

  for (let stagione = 0; stagione < STAGIONI_PER_LEGA; stagione++) {
    const punti = new Map<number, number>(squadre.map((s) => [s.clubId, 0]))
    const golGiocatore = new Map<number, number>()
    // calendario seminato: il test è identico a ogni esecuzione
    const rngCalendario = creaRng(semeDaStringa(`calendario-${nomeLega}-${stagione}`))
    const calendario = generaCalendario(squadre.map((s) => s.clubId), rngCalendario.numero)
    for (let giornata = 0; giornata < calendario.length; giornata++) {
      for (const p of calendario[giornata]) {
        const esito = simulaPartitaMotore(
          perClub.get(p.casaId)!,
          perClub.get(p.trasfertaId)!,
          `calibrazione-${nomeLega}-${stagione}-${giornata}-${p.casaId}-${p.trasfertaId}`,
        )
        partite++
        golTotali += esito.golCasa + esito.golTrasferta
        massimoGolPartita = Math.max(massimoGolPartita, esito.golCasa + esito.golTrasferta)
        const chiave = `${esito.golCasa}-${esito.golTrasferta}`
        conteggiRisultati.set(chiave, (conteggiRisultati.get(chiave) ?? 0) + 1)
        if (esito.golCasa > esito.golTrasferta) { vittorieCasa++; punti.set(p.casaId, punti.get(p.casaId)! + 3) }
        else if (esito.golCasa < esito.golTrasferta) { vittorieTrasferta++; punti.set(p.trasfertaId, punti.get(p.trasfertaId)! + 3) }
        else { pareggi++; punti.set(p.casaId, punti.get(p.casaId)! + 1); punti.set(p.trasfertaId, punti.get(p.trasfertaId)! + 1) }
        for (const e of esito.eventi) {
          if (e.tipo === 'gol') golGiocatore.set(e.giocatoreId, (golGiocatore.get(e.giocatoreId) ?? 0) + 1)
        }
      }
    }
    const classifica = [...punti.values()].sort((a, b) => b - a)
    puntiCampione.push(classifica[0])
    puntiUltima.push(classifica[classifica.length - 1])
    capocannonieri.push(Math.max(...golGiocatore.values()))
  }

  const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length
  const golAPartita = golTotali / partite
  const percCasa = vittorieCasa / partite
  const percPareggi = pareggi / partite
  const percTrasferta = vittorieTrasferta / partite
  const mediaCampione = media(puntiCampione)
  const mediaUltima = media(puntiUltima)
  const mediaCapocannoniere = media(capocannonieri)

  const topRisultati = [...conteggiRisultati.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([r, n]) => `${r} (${((n / partite) * 100).toFixed(1)}%)`)
    .join(', ')

  const controlla = (nome: string, valore: number, intervallo: readonly [number, number], formato = (v: number) => v.toFixed(2)) => {
    const ok = dentro(valore, intervallo)
    if (!ok) tuttoOk = false
    console.log(`  ${ok ? '✅' : '❌'} ${nome}: ${formato(valore)}  (atteso ${formato(intervallo[0])}–${formato(intervallo[1])})`)
  }

  console.log(`\n══════════ CALIBRAZIONE — ${nomeLega} (${STAGIONI_PER_LEGA} stagioni, ${partite} partite) ══════════`)
  controlla('Gol a partita', golAPartita, RIFERIMENTI.golAPartita)
  controlla('Vittorie in casa', percCasa, RIFERIMENTI.vittorieCasa, (v) => `${(v * 100).toFixed(1)}%`)
  controlla('Pareggi', percPareggi, RIFERIMENTI.pareggi, (v) => `${(v * 100).toFixed(1)}%`)
  console.log(`     Vittorie in trasferta: ${(percTrasferta * 100).toFixed(1)}%`)
  if (nomeLega === 'Serie A') {
    controlla('Punti del campione (media)', mediaCampione, RIFERIMENTI.puntiCampioneSerieA, (v) => v.toFixed(0))
    controlla("Punti dell'ultima (media)", mediaUltima, RIFERIMENTI.puntiUltimaSerieA, (v) => v.toFixed(0))
  } else {
    console.log(`     Punti del campione (media): ${mediaCampione.toFixed(0)} · ultima: ${mediaUltima.toFixed(0)}`)
  }
  controlla('Gol del capocannoniere (media)', mediaCapocannoniere, RIFERIMENTI.capocannoniere, (v) => v.toFixed(0))
  console.log(`     Risultati più frequenti: ${topRisultati}`)
  console.log(`     Partita col punteggio più alto: ${massimoGolPartita} gol totali ${massimoGolPartita <= 9 ? '✅' : '⚠️ (sopra 9: controllare)'}`)
  if (massimoGolPartita > 9) tuttoOk = false
}

console.log(`\n${tuttoOk ? '✅ CALIBRAZIONE SUPERATA' : '❌ CALIBRAZIONE FALLITA: ritoccare i PARAMETRI in src/motore/partita.ts'}`)
process.exit(tuttoOk ? 0 : 1)
