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

// ── 2. Download dal web: Mondiale 2026 + carte FUT per le leggende ─────────
const DOWNLOAD = [
  {
    nome: 'worldcup2026.txt',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup/master/2026--canada-usa-mexico/cup.txt',
    descrizione: 'Mondiale 2026: gironi e qualificate (openfootball)',
    byteMinimi: 3_000,
  },
  {
    nome: 'eafc24_ut_players.csv',
    url: 'https://raw.githubusercontent.com/bartlomiej-niemiec/fc24-ultimate-team-players/main/eafc24_ut_players.csv',
    descrizione: 'Carte FUT di FC 24 (per le leggende Icons/Heroes, fonte futwiz — repo MIT)',
    byteMinimi: 3_000_000,
  },
]

for (const fonte of DOWNLOAD) {
  console.log(`▸ ${fonte.nome} — ${fonte.descrizione}\n  ${fonte.url}`)
  const risposta = await fetch(fonte.url)
  if (!risposta.ok) throw new Error(`Download fallito (${risposta.status}) per ${fonte.url}`)
  const contenuto = Buffer.from(await risposta.arrayBuffer())
  if (contenuto.length < fonte.byteMinimi) {
    throw new Error(`File sospettosamente piccolo (${contenuto.length} byte) per ${fonte.nome}`)
  }
  await writeFile(join(cartellaFonti, fonte.nome), contenuto)
  console.log(`  ✓ salvato (${(contenuto.length / 1_000).toFixed(0)} kB)\n`)
}

console.log('Fonti pronte. Ora esegui: node data/importa/02-converti-leggende.mjs')
