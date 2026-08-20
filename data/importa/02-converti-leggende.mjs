// 02-converti-leggende.mjs — converte le carte FUT base "Icon" e "FUT Hero"
// nel formato del canale leggende (data/leggende/icons.json e heroes.json).
//
// FONTE: eafc24_ut_players.csv — dati delle carte Ultimate Team di EA FC 24
// raccolti da futwiz.com dal repository pubblico (licenza MIT)
// github.com/bartlomiej-niemiec/fc24-ultimate-team-players
//
// Perché FC 24 e non FC 26? È l'unica fonte aperta verificata con le
// STATISTICHE COMPLETE delle carte base: i file per FC 25/26 esistono ma
// hanno gli attributi dettagliati vuoti, e il dataset Kaggle delle carte
// FC 26 pesa >500 MB (non caricabile su GitHub). Le leggende cambiano poco
// tra un'edizione e l'altra: differenze documentate in docs/dati.md,
// affinabili con l'editor (M9).
//
// I file generati SOVRASCRIVONO icons.json e heroes.json: eventuali ritocchi
// manuali vanno fatti in file separati (es. correzioni.json) che questo
// script non tocca.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const cartellaDati = dirname(dirname(fileURLToPath(import.meta.url))) // → data/

// Le carte d'interesse: la versione "base" di ciascuna leggenda
const VERSIONE_ICON = 'Icon'
const VERSIONE_HERO = 'FUT Hero'

// L'età delle carte è riferita all'epoca di FC 24: le date di nascita
// generate sono SINTETICHE (le leggende sono ritirate, conta il personaggio)
const ANNO_RIFERIMENTO_ETA = 2024

// Ruoli FUT → nostro vocabolario (come in 03-costruisci-db.mjs)
const RUOLI = {
  GK: 'POR', CB: 'DC', RB: 'TD', RWB: 'TD', LB: 'TS', LWB: 'TS',
  CDM: 'MED', CM: 'CC', CAM: 'TRQ', RM: 'ED', RW: 'ED', LM: 'ES', LW: 'ES',
  ST: 'PC', CF: 'PC',
}

/** Parser per il CSV di futwiz: separatore ';', campi tra virgolette. */
function leggiCsvPuntoEVirgola(testo) {
  const righe = testo.replace(/\r/g, '').split('\n').filter((r) => r.length > 0)
  const analizza = (riga) => {
    const campi = []
    let corrente = ''
    let traVirgolette = false
    for (const ch of riga) {
      if (ch === '"') traVirgolette = !traVirgolette
      else if (ch === ';' && !traVirgolette) { campi.push(corrente); corrente = '' }
      else corrente += ch
    }
    campi.push(corrente)
    return campi
  }
  const intestazione = analizza(righe[0]).map((n) => n.trim())
  return righe.slice(1).map((riga) => {
    const campi = analizza(riga)
    const oggetto = {}
    intestazione.forEach((nome, i) => { oggetto[nome] = (campi[i] ?? '').trim() })
    return oggetto
  })
}

const intero = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }

/** "Diego Maradona" → nome "Diego", cognome "Maradona". */
function dividiNome(nomeCompleto) {
  const spazio = nomeCompleto.indexOf(' ')
  if (spazio === -1) return { nome: '', cognome: nomeCompleto }
  return { nome: nomeCompleto.slice(0, spazio), cognome: nomeCompleto.slice(spazio + 1) }
}

/** Converte una carta FUT in un giocatore del canale leggende. */
function convertiCarta(c) {
  const portiere = c.Position === 'GK'
  const { nome, cognome } = dividiNome(c.Name)
  const secondari = [...new Set(
    (c['Alt Pos.'] ?? '').split(',').map((p) => RUOLI[p.trim()]).filter((r) => r && r !== RUOLI[c.Position]),
  )]
  const eta = intero(c.Age) ?? 40

  const attributi = portiere
    ? {
        riflessi: intero(c['GK. Reflexes']), presa: intero(c['GK. Handling']),
        uscite: intero(c['GK. Pos']), rinvio: intero(c['GK. Kicking']),
        velocita: intero(c['Sprint Speed']), resistenza: intero(c.Stamina),
      }
    : {
        velocita: intero(c.PAC), resistenza: intero(c.Stamina),
        tecnica: intero(c['Ball Control']), passaggio: intero(c['Short Pass']),
        tiro: intero(c.SHO), dribbling: intero(c.DRI),
        colpo_testa: intero(c['Heading Acc.']), marcatura: intero(c['Def. Awareness']),
        contrasto: intero(c['Stand Tackle']), posizionamento: intero(c.Positioning),
        visione: intero(c.Vision), calci_piazzati: intero(c['FK. Acc.']),
      }

  return {
    nome,
    cognome,
    data_nascita: `${ANNO_RIFERIMENTO_ETA - eta}-07-01`, // sintetica (vedi sopra)
    nazionalita: c.Nationality,
    ruolo: RUOLI[c.Position] ?? 'CC',
    ruoli_secondari: secondari,
    piede: c.Foot === 'Left' ? 'sinistro' : 'destro',
    potenziale: intero(c['Overall Rating']) ?? 80,
    attributi,
  }
}

// ── Esecuzione ──────────────────────────────────────────────────────────────

console.log('Converto le carte base Icon e FUT Hero in data/leggende/ ...')
const carte = leggiCsvPuntoEVirgola(await readFile(fonteCsv(), 'utf8'))

function fonteCsv() {
  return join(cartellaDati, 'fonti', 'eafc24_ut_players.csv')
}

// Una carta base per giocatore: in caso di doppioni per nome tiene la
// versione con Overall più alto
function estraiBase(versione) {
  const perNome = new Map()
  for (const c of carte) {
    if ((c.Version ?? '').trim() !== versione) continue
    const esistente = perNome.get(c.Name)
    if (!esistente || (intero(c['Overall Rating']) ?? 0) > (intero(esistente['Overall Rating']) ?? 0)) {
      perNome.set(c.Name, c)
    }
  }
  return [...perNome.values()].map(convertiCarta)
}

const icone = estraiBase(VERSIONE_ICON)
const eroi = estraiBase(VERSIONE_HERO)

await mkdir(join(cartellaDati, 'leggende'), { recursive: true })
await writeFile(
  join(cartellaDati, 'leggende', 'icons.json'),
  JSON.stringify({ categoria: 'icon', giocatori: icone }, null, 2),
)
await writeFile(
  join(cartellaDati, 'leggende', 'heroes.json'),
  JSON.stringify({ categoria: 'hero', giocatori: eroi }, null, 2),
)

console.log(`  ✓ icons.json: ${icone.length} Icons`)
console.log(`  ✓ heroes.json: ${eroi.length} Heroes`)
console.log('Ora esegui: node data/importa/03-costruisci-db.mjs')
