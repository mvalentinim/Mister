// 01-scarica-fonti.mjs — prepara le fonti dati in data/fonti/.
//
// Si lancia con: npm run importa-dati (o: node data/importa/01-scarica-fonti.mjs)
// La cartella data/fonti/ NON va su git (è nel .gitignore): contiene file
// ricavabili in ogni momento con questo script.
//
// FONTI (vedi docs/dati.md per la valutazione completa):
// 1. Dataset "EA Sports FC 26" (origine Kaggle, scaricato dallo sviluppatore
//    e committato nel repository come data/fc26-kaggle.zip): giocatori con
//    attributi 1-99, club, leghe, contratti e nazionali.
//    Stagione: 2025-26 (snapshot del 21/09/2025).
// 2. openfootball/worldcup (dataset pubblico, scaricato dal web): gironi del
//    Mondiale 2026, da cui ricaviamo l'elenco delle 48 nazionali qualificate.

import { writeFile, mkdir, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const cartellaDati = dirname(dirname(fileURLToPath(import.meta.url))) // → data/
const cartellaFonti = join(cartellaDati, 'fonti')

console.log('Preparo le fonti dati in data/fonti/ ...\n')
await mkdir(cartellaFonti, { recursive: true })

// ── 1. Dataset FC 26: estrazione dallo zip committato nel repository ───────
const zipFc26 = join(cartellaDati, 'fc26-kaggle.zip')
const csvFc26 = join(cartellaFonti, 'FC26_20250921.csv')
try {
  await access(csvFc26)
  console.log('▸ FC26_20250921.csv già presente in data/fonti/ ✓\n')
} catch {
  console.log('▸ Estraggo FC26_20250921.csv da data/fc26-kaggle.zip ...')
  // "unzip" è preinstallato su macOS e Linux; -o sovrascrive, -d è la destinazione
  execFileSync('unzip', ['-o', zipFc26, '-d', cartellaFonti], { stdio: 'inherit' })
  console.log()
}

// ── 2. Mondiale 2026 da openfootball ───────────────────────────────────────
const urlMondiale =
  'https://raw.githubusercontent.com/openfootball/worldcup/master/2026--canada-usa-mexico/cup.txt'
console.log('▸ worldcup2026.txt — gironi e qualificate (openfootball)\n  ' + urlMondiale)
const risposta = await fetch(urlMondiale)
if (!risposta.ok) throw new Error(`Download fallito (${risposta.status}) per ${urlMondiale}`)
const contenuto = Buffer.from(await risposta.arrayBuffer())
if (contenuto.length < 3_000) {
  throw new Error(`File sospettosamente piccolo (${contenuto.length} byte): mi aspettavo almeno 3000`)
}
await writeFile(join(cartellaFonti, 'worldcup2026.txt'), contenuto)
console.log(`  ✓ salvato (${(contenuto.length / 1_000).toFixed(0)} kB)\n`)

console.log('Fonti pronte. Ora esegui: node data/importa/02-costruisci-db.mjs')
