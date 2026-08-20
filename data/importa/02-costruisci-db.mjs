// 02-costruisci-db.mjs — costruisce il database statico del gioco
// (public/mister.sqlite) a partire dalle fonti preparate in data/fonti/.
//
// Si lancia con: node data/importa/02-costruisci-db.mjs
// (o tutto insieme: npm run importa-dati)
//
// COSA FA, IN ORDINE:
// 1. legge il CSV di EA Sports FC 26 e il file del Mondiale 2026
// 2. filtra il perimetro del FRD §5.2 Fase A: le 10 leghe top europee
//    (identificate dal league_id numerico di EA: i nomi sono ambigui,
//    es. la Bundesliga tedesca e quella austriaca si chiamano uguali)
// 3. mappa ogni campo della fonte sulle colonne del nostro schema
//    (la mappatura completa è documentata in docs/dati.md)
// 4. costruisce le nazionali (rose ufficiali FC 26 + selezione automatica
//    per le qualificate al Mondiale 2026 senza rosa ufficiale)
// 5. salva il database SQLite e stampa il report di verifica (DoD M1)

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'

const cartellaDati = dirname(dirname(fileURLToPath(import.meta.url))) // → data/
const radiceProgetto = dirname(cartellaDati)
const fonti = (nome) => join(cartellaDati, 'fonti', nome)

// ── Costanti di progetto ────────────────────────────────────────────────────

// Le 10 leghe del perimetro: league_id EA → nostra struttura
const LEGHE = {
  31: { nazione: 'Italia',      nome: 'Serie A',          livello: 1 },
  32: { nazione: 'Italia',      nome: 'Serie B',          livello: 2 },
  13: { nazione: 'Inghilterra', nome: 'Premier League',   livello: 1 },
  14: { nazione: 'Inghilterra', nome: 'Championship',     livello: 2 },
  53: { nazione: 'Spagna',      nome: 'La Liga',          livello: 1 },
  54: { nazione: 'Spagna',      nome: 'La Liga 2',        livello: 2 },
  19: { nazione: 'Germania',    nome: 'Bundesliga',       livello: 1 },
  20: { nazione: 'Germania',    nome: '2. Bundesliga',    livello: 2 },
  16: { nazione: 'Francia',     nome: 'Ligue 1',          livello: 1 },
  17: { nazione: 'Francia',     nome: 'Ligue 2',          livello: 2 },
}
const CODICI_NAZIONE = { Italia: 'ITA', Inghilterra: 'ENG', Spagna: 'ESP', Germania: 'GER', Francia: 'FRA' }

// Ruoli FIFA → nostro vocabolario (docs/database.md)
const RUOLI = {
  GK: 'POR', CB: 'DC', RB: 'TD', RWB: 'TD', LB: 'TS', LWB: 'TS',
  CDM: 'MED', CM: 'CC', CAM: 'TRQ', RM: 'ED', RW: 'ED', LM: 'ES', LW: 'ES',
  ST: 'PC', CF: 'PC',
}

// Nomi paese: openfootball (Mondiale 2026) → nomi usati dal dataset EA
const ALIAS_PAESI = {
  'South Korea': 'Korea Republic',
  'USA': 'United States',
  'Ivory Coast': "Côte d'Ivoire",
  'DR Congo': 'Congo DR',
  'Cape Verde': 'Cabo Verde',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Curaçao': 'Curacao',
  'Czech Republic': 'Czechia',
  'Turkey': 'Türkiye',
}

// ── Piccole utilità ─────────────────────────────────────────────────────────

/** Parser CSV corretto per campi tra virgolette (gestisce virgole interne). */
function leggiCsv(testo) {
  const righe = testo.replace(/\r/g, '').split('\n').filter((r) => r.length > 0)
  const analizza = (riga) => {
    const campi = []
    let corrente = ''
    let traVirgolette = false
    for (const ch of riga) {
      if (ch === '"') traVirgolette = !traVirgolette
      else if (ch === ',' && !traVirgolette) { campi.push(corrente); corrente = '' }
      else corrente += ch
    }
    campi.push(corrente)
    return campi
  }
  const intestazione = analizza(righe[0])
  return righe.slice(1).map((riga) => {
    const campi = analizza(riga)
    const oggetto = {}
    intestazione.forEach((nome, i) => { oggetto[nome] = campi[i] ?? '' })
    return oggetto
  })
}

const intero = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }

/** Generatore pseudo-casuale deterministico (stesso seme → stessi numeri).
    Serve per gli attributi comportamentali, assenti nella fonte: ogni
    giocatore li riceve plausibili e RIPRODUCIBILI (seme = suo ID). */
function casualeConSeme(seme) {
  let stato = seme >>> 0
  return () => {
    stato = (stato + 0x6d2b79f5) >>> 0
    let t = stato
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const limita = (v) => Math.max(1, Math.min(99, Math.round(v)))

/** "K. De Bruyne" → nome "K.", cognome "De Bruyne" (per l'ordinamento). */
function dividiNome(nomeBreve) {
  const spazio = nomeBreve.indexOf(' ')
  if (spazio === -1) return { nome: '', cognome: nomeBreve }
  return { nome: nomeBreve.slice(0, spazio), cognome: nomeBreve.slice(spazio + 1) }
}

// ── 1. Lettura fonti ────────────────────────────────────────────────────────

console.log('Leggo le fonti da data/fonti/ ...')
const giocatoriFonte = leggiCsv(await readFile(fonti('FC26_20250921.csv'), 'utf8'))
const mondialeTxt = await readFile(fonti('worldcup2026.txt'), 'utf8')

// Qualificate al Mondiale 2026: righe "Group A | Mexico   South Africa ..."
const qualificate2026 = mondialeTxt
  .split('\n')
  .filter((r) => /^Group [A-L] \|/.test(r))
  .flatMap((r) => r.split('|')[1].trim().split(/\s{2,}/))
  .map((nome) => ALIAS_PAESI[nome] ?? nome)
console.log(`  Mondiale 2026: ${qualificate2026.length} nazionali qualificate`)
console.log(`  FC 26: ${giocatoriFonte.length} righe giocatore`)

// ── 2. Filtro del perimetro e club ─────────────────────────────────────────

// I club si ricavano dalle righe giocatore (la fonte non ha un file squadre):
// club_team_id → nome, lega, e rosa
const clubFonte = new Map() // club_team_id → { nome, legaId, giocatori: [] }
for (const g of giocatoriFonte) {
  const legaId = intero(g.league_id)
  if (!(legaId in LEGHE)) continue
  const idClubFonte = intero(g.club_team_id)
  if (!clubFonte.has(idClubFonte)) {
    clubFonte.set(idClubFonte, { nome: g.club_name.trim(), legaId, giocatori: [] })
  }
  clubFonte.get(idClubFonte).giocatori.push(g)
}

// ── 3. Costruzione database ────────────────────────────────────────────────

const SQL = await initSqlJs()
const db = new SQL.Database()
db.run(await readFile(join(cartellaDati, 'schema.sql'), 'utf8'))

// Nazioni e competizioni
const idNazione = {}
const idCompetizione = {}
for (const [legaId, lega] of Object.entries(LEGHE)) {
  if (!(lega.nazione in idNazione)) {
    db.run('INSERT INTO nazione (nome, codice) VALUES (?, ?)', [lega.nazione, CODICI_NAZIONE[lega.nazione]])
    idNazione[lega.nazione] = db.exec('SELECT last_insert_rowid()')[0].values[0][0]
  }
  db.run('INSERT INTO competizione (nazione_id, nome, livello) VALUES (?, ?, ?)', [
    idNazione[lega.nazione], lega.nome, lega.livello,
  ])
  idCompetizione[legaId] = db.exec('SELECT last_insert_rowid()')[0].values[0][0]
}

// Club. La fonte non ha prestigio né budget: li deriviamo dalla rosa.
// - fama: media overall dei migliori 18 (la forza percepita del club)
// - budget mercato: 8% del valore totale della rosa
// - budget stipendi: somma stipendi annuali +15% di margine
const idClub = new Map() // club_team_id fonte → id nostro club
for (const [idClubFonte, c] of clubFonte) {
  const overall = c.giocatori.map((g) => intero(g.overall) ?? 50).sort((a, b) => b - a)
  const fama = limita(overall.slice(0, 18).reduce((s, v) => s + v, 0) / Math.min(18, overall.length))
  const valoreRosa = c.giocatori.reduce((s, g) => s + (intero(g.value_eur) ?? 0), 0)
  const stipendiAnnui = c.giocatori.reduce((s, g) => s + (intero(g.wage_eur) ?? 500) * 52, 0)
  db.run('INSERT INTO club (competizione_id, nome, fama, budget_mercato, budget_stipendi) VALUES (?, ?, ?, ?, ?)', [
    idCompetizione[c.legaId], c.nome, fama, Math.round(valoreRosa * 0.08), Math.round(stipendiAnnui * 1.15),
  ])
  idClub.set(idClubFonte, db.exec('SELECT last_insert_rowid()')[0].values[0][0])
}

// Giocatori: nel perimetro se il club è nelle 10 leghe, oppure se convocati
// in una nazionale (in quel caso entrano con club_esterno)
const inserisciGiocatore = db.prepare(`
  INSERT INTO giocatore (id, club_id, club_esterno, nome, cognome, data_nascita, nazionalita,
    ruolo, ruoli_secondari, piede,
    velocita, resistenza, tecnica, passaggio, tiro, dribbling, colpo_testa,
    marcatura, contrasto, posizionamento, visione, calci_piazzati,
    riflessi, presa, uscite, rinvio,
    ambizione, attaccamento_denaro, fedelta, bisogno_giocare, professionalita,
    leadership, legame_territoriale, potenziale)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)

let importati = 0
let doppioniFonte = 0
const idVisti = new Set()
const importatiPerNazionalita = new Map() // per la selezione automatica delle nazionali
for (const g of giocatoriFonte) {
  const clubId = idClub.get(intero(g.club_team_id)) ?? null
  const inNazionale = g.nation_team_id !== ''
  if (clubId === null && !inNazionale) continue // fuori perimetro

  const id = intero(g.player_id)
  if (idVisti.has(id)) { doppioniFonte++; continue }
  idVisti.add(id)

  // Ruolo primario = primo della lista player_positions ("RW, ST" → RW)
  const posizioni = g.player_positions.split(',').map((p) => p.trim())
  const portiere = posizioni[0] === 'GK'
  const ruolo = RUOLI[posizioni[0]] ?? 'CC'
  const secondari = [...new Set(posizioni.slice(1).map((p) => RUOLI[p]).filter((r) => r && r !== ruolo))]
  const { nome, cognome } = dividiNome(g.short_name)

  // Comportamentali: non presenti nella fonte → generati con seme = ID
  // (deterministici). L'ambizione cresce col margine di miglioramento.
  const caso = casualeConSeme(id)
  const comportamentale = () => limita(50 + (caso() - 0.5) * 60)
  const ambizione = limita(comportamentale() + (intero(g.potential) - intero(g.overall)))

  inserisciGiocatore.run([
    id, clubId, clubId === null ? g.club_name.trim() || null : null,
    nome, cognome, g.dob, g.nationality_name,
    ruolo, secondari.join(',') || null, g.preferred_foot === 'Left' ? 'sinistro' : 'destro',
    // tecnici (per i portieri restano NULL quelli di movimento e viceversa)
    portiere ? intero(g.movement_sprint_speed) : intero(g.pace),
    intero(g.power_stamina),
    portiere ? null : intero(g.skill_ball_control),
    portiere ? null : intero(g.attacking_short_passing),
    portiere ? null : intero(g.shooting),
    portiere ? null : intero(g.dribbling),
    portiere ? null : intero(g.attacking_heading_accuracy),
    portiere ? null : intero(g.defending_marking_awareness),
    portiere ? null : intero(g.defending_standing_tackle),
    portiere ? null : intero(g.mentality_positioning),
    portiere ? null : intero(g.mentality_vision),
    portiere ? null : intero(g.skill_fk_accuracy),
    portiere ? intero(g.goalkeeping_reflexes) : null,
    portiere ? intero(g.goalkeeping_handling) : null,
    portiere ? intero(g.goalkeeping_positioning) : null,
    portiere ? intero(g.goalkeeping_kicking) : null,
    ambizione, comportamentale(), comportamentale(), comportamentale(),
    comportamentale(), comportamentale(), comportamentale(),
    intero(g.potential),
  ])
  importati++

  if (!importatiPerNazionalita.has(g.nationality_name)) importatiPerNazionalita.set(g.nationality_name, [])
  importatiPerNazionalita.get(g.nationality_name).push({ id, overall: intero(g.overall) ?? 50, ruolo })

  // Contratto solo per chi gioca in un club del perimetro.
  // Stipendio: la fonte è settimanale → annuale (×52). Scadenza: 30 giugno
  // dell'anno indicato dalla fonte (stagione 2025-26, nessuna traslazione).
  if (clubId !== null) {
    const scadenza = intero(g.club_contract_valid_until_year) ?? 2026
    db.run('INSERT INTO contratto (giocatore_id, club_id, stipendio, scadenza) VALUES (?, ?, ?, ?)', [
      id, clubId, (intero(g.wage_eur) ?? 500) * 52, `${scadenza}-06-30`,
    ])
  }
}
inserisciGiocatore.free()

// ── 4. Nazionali ────────────────────────────────────────────────────────────
// a) rose ufficiali presenti nella fonte (nation_team_id valorizzato:
//    il nome della nazionale è la nazionalità del giocatore)
// b) qualificate al Mondiale 2026 senza rosa ufficiale → selezione automatica
//    dei migliori per nazionalità tra i giocatori importati (flag generata=1)

const idNazionale = new Map()
for (const g of giocatoriFonte) {
  if (g.nation_team_id === '') continue
  const paese = g.nationality_name
  if (!idNazionale.has(paese)) {
    db.run('INSERT INTO nazionale (nome, mondiale_2026, generata) VALUES (?, ?, 0)', [
      paese, qualificate2026.includes(paese) ? 1 : 0,
    ])
    idNazionale.set(paese, db.exec('SELECT last_insert_rowid()')[0].values[0][0])
  }
  db.run('INSERT OR IGNORE INTO convocazione (nazionale_id, giocatore_id) VALUES (?, ?)', [
    idNazionale.get(paese), intero(g.player_id),
  ])
}

let nazionaliGenerate = 0
const senzaRosa = []
for (const paese of qualificate2026) {
  if (idNazionale.has(paese)) continue
  const candidati = (importatiPerNazionalita.get(paese) ?? []).sort((a, b) => b.overall - a.overall)
  const portieri = candidati.filter((c) => c.ruolo === 'POR').slice(0, 3)
  const movimento = candidati.filter((c) => c.ruolo !== 'POR').slice(0, 23)
  const rosa = [...portieri, ...movimento]
  if (rosa.length < 15 || portieri.length < 1) { senzaRosa.push(`${paese} (${rosa.length} disponibili)`); continue }
  db.run('INSERT INTO nazionale (nome, mondiale_2026, generata) VALUES (?, 1, 1)', [paese])
  const nid = db.exec('SELECT last_insert_rowid()')[0].values[0][0]
  for (const c of rosa) db.run('INSERT INTO convocazione (nazionale_id, giocatore_id) VALUES (?, ?)', [nid, c.id])
  nazionaliGenerate++
}

// Fama della nazionale = media del potenziale della rosa convocata
db.run(`UPDATE nazionale SET fama = (
  SELECT COALESCE(ROUND(AVG(g.potenziale)), 50) FROM convocazione c
  JOIN giocatore g ON g.id = c.giocatore_id WHERE c.nazionale_id = nazionale.id
)`)

// ── 5. Leggende (Icons e Heroes) dal canale data/leggende/*.json ───────────
// I giocatori "leggenda" non esistono in nessun dataset aperto di qualità:
// entrano da file JSON nel nostro formato (vedi data/leggende/README.md),
// con il tag `categoria` = 'icon' o 'hero' (richiesto dalle regole di gioco
// future: ogni carriera potrà includerli o escluderli dalle rose).
// Gli ID partono da 900000 per non collidere mai con i player_id di EA.

let leggendeImportate = 0
const ID_BASE_LEGGENDE = 900_000
try {
  const cartellaLeggende = join(cartellaDati, 'leggende')
  const fileJson = (await readdir(cartellaLeggende)).filter((f) => f.endsWith('.json'))
  let prossimoId = ID_BASE_LEGGENDE
  for (const nomeFile of fileJson) {
    const { categoria, giocatori } = JSON.parse(await readFile(join(cartellaLeggende, nomeFile), 'utf8'))
    if (!['icon', 'hero'].includes(categoria)) {
      throw new Error(`${nomeFile}: categoria "${categoria}" non valida (attese: icon, hero)`)
    }
    for (const g of giocatori) {
      const caso = casualeConSeme(prossimoId)
      const comportamentale = () => limita(50 + (caso() - 0.5) * 60)
      const a = g.attributi ?? {}
      db.run(
        `INSERT INTO giocatore (id, club_id, club_esterno, nome, cognome, data_nascita,
           nazionalita, ruolo, ruoli_secondari, piede, categoria,
           velocita, resistenza, tecnica, passaggio, tiro, dribbling, colpo_testa,
           marcatura, contrasto, posizionamento, visione, calci_piazzati,
           riflessi, presa, uscite, rinvio,
           ambizione, attaccamento_denaro, fedelta, bisogno_giocare, professionalita,
           leadership, legame_territoriale, potenziale)
         VALUES (?,NULL,NULL,?,?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?,?,?,?, ?,?,?,?, ?,?,?,?,?,?,?,?)`,
        [
          g.id ?? prossimoId, g.nome ?? '', g.cognome, g.data_nascita, g.nazionalita,
          g.ruolo, (g.ruoli_secondari ?? []).join(',') || null, g.piede ?? 'destro', categoria,
          a.velocita ?? null, a.resistenza ?? null, a.tecnica ?? null, a.passaggio ?? null,
          a.tiro ?? null, a.dribbling ?? null, a.colpo_testa ?? null, a.marcatura ?? null,
          a.contrasto ?? null, a.posizionamento ?? null, a.visione ?? null, a.calci_piazzati ?? null,
          a.riflessi ?? null, a.presa ?? null, a.uscite ?? null, a.rinvio ?? null,
          comportamentale(), comportamentale(), comportamentale(), comportamentale(),
          comportamentale(), comportamentale(), comportamentale(),
          g.potenziale ?? a.media ?? 80,
        ],
      )
      prossimoId++
      leggendeImportate++
    }
  }
} catch (errore) {
  if (errore.code !== 'ENOENT') throw errore // la cartella può non esistere: ok
}

// ── 6. Salvataggio e report di verifica (DoD M1) ───────────────────────────

const file = join(radiceProgetto, 'public', 'mister.sqlite')
const contenutoDb = Buffer.from(db.export())
await writeFile(file, contenutoDb)

const q = (sql) => db.exec(sql)[0]?.values ?? []
console.log('\n================ REPORT DI VERIFICA ================')
console.log(`\nDatabase salvato in public/mister.sqlite (${(contenutoDb.length / 1_000_000).toFixed(1)} MB)`)
console.log(`\nGiocatori importati: ${importati} (scartate ${doppioniFonte} righe ripetute nella fonte)`)
console.log('\nClub e giocatori per competizione:')
for (const [naz, comp, nClub, nGioc] of q(`
  SELECT n.nome, co.nome, COUNT(DISTINCT c.id), COUNT(g.id)
  FROM competizione co JOIN nazione n ON n.id = co.nazione_id
  LEFT JOIN club c ON c.competizione_id = co.id
  LEFT JOIN giocatore g ON g.club_id = c.id
  GROUP BY co.id ORDER BY n.nome, co.livello`)) {
  console.log(`  ${naz.padEnd(12)} ${comp.padEnd(17)} ${String(nClub).padStart(3)} club, ${String(nGioc).padStart(4)} giocatori`)
}
console.log('\nClub con meno di 18 giocatori (da controllare):')
const scarsi = q(`SELECT c.nome, COUNT(g.id) FROM club c LEFT JOIN giocatore g ON g.club_id = c.id
  GROUP BY c.id HAVING COUNT(g.id) < 18`)
console.log(scarsi.length ? scarsi.map(([n, c]) => `  ⚠ ${n}: ${c}`).join('\n') : '  nessuno ✓')
console.log('\nDuplicati per (nome, cognome, data di nascita):')
const duplicati = q(`SELECT nome, cognome, COUNT(*) FROM giocatore GROUP BY nome, cognome, data_nascita HAVING COUNT(*) > 1`)
console.log(duplicati.length ? duplicati.map(([n, c, k]) => `  ⚠ ${n} ${c} ×${k}`).join('\n') : '  nessuno ✓')
console.log(`\nNazionali: ${q('SELECT COUNT(*) FROM nazionale')[0][0]} totali, di cui ${q('SELECT COUNT(*) FROM nazionale WHERE mondiale_2026=1')[0][0]} al Mondiale 2026 (${nazionaliGenerate} con rosa selezionata automaticamente)`)
console.log(`Leggende (categoria icon/hero): ${leggendeImportate} importate da data/leggende/`)
if (senzaRosa.length) console.log(`Qualificate 2026 SENZA rosa (giocatori insufficienti nel perimetro):\n  ${senzaRosa.join('\n  ')}`)
console.log('\n====================================================')
