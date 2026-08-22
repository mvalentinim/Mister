// verifica-curve-cli.ts — test del modello di curve personali (M11): npm run curve
import { curvaModello, curvaReale, parametriCurva } from './crescita.ts'
import type { GiocatoreRiga } from '../db/tipi.ts'

const base = {
  id: 1, club_id: 1, club_esterno: null, nome: 'Test', cognome: 'Uno',
  data_nascita: '2008-01-01', nazionalita: 'Italy', ruolo: 'CC', piede: 'destro',
  categoria: 'normale', velocita: 60, resistenza: 60, tecnica: 60, passaggio: 60,
  tiro: 60, dribbling: 60, colpo_testa: 60, marcatura: 60, contrasto: 60,
  posizionamento: 60, visione: 60, calci_piazzati: 60, riflessi: null, presa: null,
  uscite: null, rinvio: null, ambizione: 50, attaccamento_denaro: 50, fedelta: 50,
  bisogno_giocare: 50, professionalita: 50, leadership: 50, legame_territoriale: 50,
  forma: 50, morale: 50, condizione: 100, potenziale: 88,
} as unknown as GiocatoreRiga

const medio = { ...base }
const professionale = { ...base, professionalita: 95 }
const sciatto = { ...base, professionalita: 10 }
const ambizioso = { ...base, ambizione: 95 }

console.log('parametri medio:        ', parametriCurva(medio))
console.log('parametri professionale:', parametriCurva(professionale))
console.log('parametri sciatto:      ', parametriCurva(sciatto))
console.log('parametri ambizioso:    ', parametriCurva(ambizioso))

// curva modello di un 18enne (media 60, potenziale 88)
function riassunto(nome: string, g: GiocatoreRiga) {
  const c = curvaModello(g, 18, 60)
  const picco = c.reduce((m, p) => (p[1] > m[1] ? p : m))
  const a35 = c.find(([e]) => e === 35)!
  console.log(`${nome}: picco ${picco[1].toFixed(1)} a ${picco[0]} anni · a 35 anni ${a35[1].toFixed(1)} · a 40 ${c[c.length - 1][1].toFixed(1)}`)
  return { picco, a35 }
}
const rMedio = riassunto('medio        ', medio)
const rProf = riassunto('professionale', professionale)
const rSciat = riassunto('sciatto      ', sciatto)
riassunto('ambizioso    ', ambizioso)

let ok = true
function attesa(nome: string, cond: boolean) {
  console.log(`${cond ? '✅' : '❌'} ${nome}`)
  if (!cond) ok = false
}
attesa('il talento medio arriva a ridosso del potenziale (>= 84 su 88)', rMedio.picco[1] >= 84)
attesa('il professionale declina più tardi/meno (a 35 sta sopra il medio)', rProf.a35[1] > rMedio.a35[1])
attesa('lo sciatto declina prima/di più (a 35 sta sotto il medio)', rSciat.a35[1] < rMedio.a35[1])
attesa('l\'ambizioso cresce più in fretta (a 22 sta sopra il medio)',
  curvaModello(ambizioso, 18, 60).find(([e]) => e === 22)![1] >
  curvaModello(medio, 18, 60).find(([e]) => e === 22)![1])
attesa('il picco dello sciatto arriva prima di quello del professionale',
  rSciat.picco[0] < rProf.picco[0])

// curva reale con storico: passa per i punti fotografati e finisce a oggi
const storico: Array<[number, number]> = [[24, 70], [25, 73], [26, 75]]
const reale = curvaReale(medio, 27, 78, storico)
attesa('la curva reale passa per lo storico (25→73)', reale.find(([e]) => e === 25)![1] === 73)
attesa('la curva reale finisce a oggi (27→78)', reale[reale.length - 1][0] === 27 && reale[reale.length - 1][1] === 78)
attesa('la curva reale parte da 16 anni (passato ricostruito)', reale[0][0] === 16)
attesa('senza storico (mercato): finisce comunque a oggi e parte da 16',
  (() => { const c = curvaReale(medio, 29, 74, undefined); return c[0][0] === 16 && c[c.length - 1][0] === 29 })())

console.log(ok ? '\n✅ MODELLO CURVE OK' : '\n❌ MODELLO CURVE DA RIVEDERE')
process.exit(ok ? 0 : 1)
