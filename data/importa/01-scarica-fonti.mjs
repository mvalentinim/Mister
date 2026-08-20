// 01-scarica-fonti.mjs — scarica le fonti dati aperte in data/fonti/.
//
// Si lancia con: npm run importa-dati (o: node data/importa/01-scarica-fonti.mjs)
// La cartella data/fonti/ NON va su git (è nel .gitignore): sono file di
// terze parti riscaricabili in ogni momento con questo script.
//
// FONTI (vedi docs/dati.md per la valutazione completa):
// 1. Dataset "FIFA 23 Players" (origine Kaggle, dataset pubblico di
//    sanjeetsinghnaik; qui usiamo il mirror pubblico su GitHub del repo
//    miraehab/FIFA-23-ML-Project): giocatori con attributi 1-99, club,
//    contratti e nazionali. Stagione di riferimento: 2022-23.
// 2. openfootball/worldcup (dataset pubblico): gironi del Mondiale 2026,
//    da cui ricaviamo l'elenco delle 48 nazionali qualificate.

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const cartellaDati = dirname(dirname(fileURLToPath(import.meta.url))) // → data/
const cartellaFonti = join(cartellaDati, 'fonti')

const FONTI = [
  {
    nome: 'players_fifa23.csv',
    url: 'https://raw.githubusercontent.com/miraehab/FIFA-23-ML-Project/main/players_fifa23.csv',
    descrizione: 'Giocatori FIFA 23 (18.539 giocatori, attributi 1-99)',
    byteMinimi: 5_000_000, // controllo di sanità: se il file è troppo piccolo, qualcosa è andato storto
  },
  {
    nome: 'teams_fifa23.csv',
    url: 'https://raw.githubusercontent.com/miraehab/FIFA-23-ML-Project/main/teams_fifa23.csv',
    descrizione: 'Squadre FIFA 23 (leghe, prestigio, budget)',
    byteMinimi: 50_000,
  },
  {
    nome: 'worldcup2026.txt',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup/master/2026--canada-usa-mexico/cup.txt',
    descrizione: 'Mondiale 2026: gironi e qualificate (openfootball)',
    byteMinimi: 3_000,
  },
]

console.log('Scarico le fonti dati in data/fonti/ ...\n')
await mkdir(cartellaFonti, { recursive: true })

for (const fonte of FONTI) {
  process.stdout.write(`▸ ${fonte.nome} — ${fonte.descrizione}\n  ${fonte.url}\n`)
  const risposta = await fetch(fonte.url)
  if (!risposta.ok) {
    throw new Error(`Download fallito (${risposta.status}) per ${fonte.url}`)
  }
  const contenuto = Buffer.from(await risposta.arrayBuffer())
  if (contenuto.length < fonte.byteMinimi) {
    throw new Error(
      `File sospettosamente piccolo (${contenuto.length} byte) per ${fonte.nome}: mi aspettavo almeno ${fonte.byteMinimi}`,
    )
  }
  await writeFile(join(cartellaFonti, fonte.nome), contenuto)
  console.log(`  ✓ salvato (${(contenuto.length / 1_000_000).toFixed(1)} MB)\n`)
}

console.log('Fonti scaricate. Ora esegui: node data/importa/02-costruisci-db.mjs')
