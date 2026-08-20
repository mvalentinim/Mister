// 02-costruisci-db.mjs — costruisce il database statico del gioco
// (public/mister.sqlite) a partire dalle fonti scaricate in data/fonti/.
//
// Si lancia con: node data/importa/02-costruisci-db.mjs
// (o tutto insieme: npm run importa-dati)
//
// COSA FA, IN ORDINE:
// 1. legge i CSV FIFA 23 (giocatori + squadre) e il file del Mondiale 2026
// 2. filtra il perimetro del FRD §5.2 Fase A: le 10 leghe top europee
// 3. mappa ogni campo della fonte sulle colonne del nostro schema
//    (la mappatura completa è documentata in docs/dati.md)
// 4. costruisce le nazionali (rose ufficiali FIFA 23 + selezione automatica
//    per le qualificate al Mondiale 2026 senza rosa ufficiale)
// 5. salva il database SQLite e stampa il report di verifica (DoD M1)

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'

const cartellaDati = dirname(dirname(fileURLToPath(import.meta.url))) // → data/
const radiceProgetto = dirname(cartellaDati)
const fonti = (nome) => join(cartellaDati, 'fonti', nome)

// ── Costanti di progetto ────────────────────────────────────────────────────

// Il mondo di gioco è ancorato a QUESTO anno: le età dei giocatori valgono
// "oggi" e le scadenze contrattuali della stagione FIFA 23 (2022-23) vengono
// traslate in avanti dello stesso scarto. Documentato in docs/dati.md.
const ANNO_RIFERIMENTO = 2026
const ANNO_FONTE = 2022
const SCARTO_ANNI = ANNO_RIFERIMENTO - ANNO_FONTE

// Le 10 leghe del perimetro (nomi esatti della fonte) → nostra struttura
const LEGHE = {
  'Italian Serie A (1)':             { nazione: 'Italia',      nome: 'Serie A',        livello: 1 },
  'Italian Serie B (2)':             { nazione: 'Italia',      nome: 'Serie B',        livello: 2 },
  'English Premier League (1)':      { nazione: 'Inghilterra', nome: 'Premier League', livello: 1 },
  'English League Championship (2)': { nazione: 'Inghilterra', nome: 'Championship',   livello: 2 },
  'Spain Primera Division (1)':      { nazione: 'Spagna',      nome: 'La Liga',        livello: 1 },
  'Spanish Segunda División (2)':    { nazione: 'Spagna',      nome: 'Segunda División', livello: 2 },
  'German 1. Bundesliga (1)':        { nazione: 'Germania',    nome: 'Bundesliga',     livello: 1 },
  'German 2. Bundesliga (2)':        { nazione: 'Germania',    nome: '2. Bundesliga',  livello: 2 },
  'French Ligue 1 (1)':              { nazione: 'Francia',     nome: 'Ligue 1',        livello: 1 },
  'French Ligue 2 (2)':              { nazione: 'Francia',     nome: 'Ligue 2',        livello: 2 },
}
const CODICI_NAZIONE = { Italia: 'ITA', Inghilterra: 'ENG', Spagna: 'ESP', Germania: 'GER', Francia: 'FRA' }

// Ruoli FIFA → nostro vocabolario (docs/database.md)
const RUOLI = {
  GK: 'POR', CB: 'DC', RB: 'TD', RWB: 'TD', LB: 'TS', LWB: 'TS',
  CDM: 'MED', CM: 'CC', CAM: 'TRQ', RM: 'ED', RW: 'ED', LM: 'ES', LW: 'ES',
  ST: 'PC', CF: 'PC',
}

// Nomi paese: openfootball (Mondiale 2026) → nomi usati dal dataset FIFA
const ALIAS_PAESI = {
  'South Korea': 'Korea Republic',
  'USA': 'United States',
  'Ivory Coast': "Côte d'Ivoire",
  'DR Congo': 'Congo DR',
  'Cape Verde': 'Cape Verde Islands',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Curaçao': 'Curacao',
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
const squadreFonte = leggiCsv(await readFile(fonti('teams_fifa23.csv'), 'utf8'))
const giocatoriFonte = leggiCsv(await readFile(fonti('players_fifa23.csv'), 'utf8'))
const mondialeTxt = await readFile(fonti('worldcup2026.txt'), 'utf8')

// Qualificate al Mondiale 2026: righe "Group A | Mexico   South Africa ..."
const qualificate2026 = mondialeTxt
  .split('\n')
  .filter((r) => /^Group [A-L] \|/.test(r))
  .flatMap((r) => r.split('|')[1].trim().split(/\s{2,}/))
  .map((nome) => ALIAS_PAESI[nome] ?? nome)
console.log(`  Mondiale 2026: ${qualificate2026.length} nazionali qualificate`)

// ── 2. Filtro del perimetro ────────────────────────────────────────────────

// Squadre fittizie incluse in FIFA 23 come contenuto bonus: non sono club reali
const CLUB_ESCLUSI = new Set(['AFC Richmond'])

const clubPerimetro = new Map() // nome club (fonte) → riga squadra + lega
for (const s of squadreFonte) {
  const lega = LEGHE[s.League]
  if (lega && !CLUB_ESCLUSI.has(s.Name.trim())) clubPerimetro.set(s.Name.trim(), { fonte: s, lega })
}

// ── 3. Costruzione database ────────────────────────────────────────────────

const SQL = await initSqlJs()
const db = new SQL.Database()
db.run(await readFile(join(cartellaDati, 'schema.sql'), 'utf8'))

// Nazioni e competizioni
const idNazione = {}
const idCompetizione = {}
for (const [nomeFonte, lega] of Object.entries(LEGHE)) {
  if (!(lega.nazione in idNazione)) {
    db.run('INSERT INTO nazione (nome, codice) VALUES (?, ?)', [lega.nazione, CODICI_NAZIONE[lega.nazione]])
    idNazione[lega.nazione] = db.exec('SELECT last_insert_rowid()')[0].values[0][0]
  }
  db.run('INSERT INTO competizione (nazione_id, nome, livello) VALUES (?, ?, ?)', [
    idNazione[lega.nazione], lega.nome, lega.livello,
  ])
  idCompetizione[nomeFonte] = db.exec('SELECT last_insert_rowid()')[0].values[0][0]
}

// Club: fama dal prestigio (nazionale 70% + internazionale 30%, scala 1-10 → 1-99)
const idClub = new Map()
for (const [nomeClub, { fonte, lega }] of clubPerimetro) {
  const fama = limita(intero(fonte.DomesticPrestige) * 7 + intero(fonte.IntPrestige) * 3)
  db.run('INSERT INTO club (competizione_id, nome, fama, budget_mercato, budget_stipendi) VALUES (?, ?, ?, ?, 0)', [
    idCompetizione[Object.keys(LEGHE).find((k) => LEGHE[k] === lega)], nomeClub, fama, intero(fonte.TransferBudget) ?? 0,
  ])
  idClub.set(nomeClub, db.exec('SELECT last_insert_rowid()')[0].values[0][0])
}

// Giocatori: nel perimetro se il club è nelle 10 leghe, oppure se servono a
// una rosa nazionale (in quel caso entrano con club_esterno)
const nazionaliUfficiali = new Set(
  giocatoriFonte.map((g) => g.NationalTeam).filter((n) => n && n !== '-' && n !== 'Not in team'),
)

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
const idVisti = new Set() // la fonte contiene ~119 giocatori ripetuti: teniamo la prima riga
const importatiPerNazionalita = new Map() // per la selezione automatica delle nazionali
for (const g of giocatoriFonte) {
  const nomeClub = (g.Club ?? '').trim()
  const clubId = idClub.get(nomeClub) ?? null
  const inNazionale = g.NationalTeam && nazionaliUfficiali.has(g.NationalTeam)
  if (clubId === null && !inNazionale) continue // fuori perimetro

  const id = intero(g.ID)
  if (idVisti.has(id)) { doppioniFonte++; continue }
  idVisti.add(id)
  const portiere = g.BestPosition === 'GK'
  const { nome, cognome } = dividiNome(g.Name)
  const eta = intero(g.Age) ?? 25
  const ruolo = RUOLI[g.BestPosition] ?? 'CC'
  const secondari = [...new Set((g.Positions ?? '').split(',').map((p) => RUOLI[p.trim()]).filter((r) => r && r !== ruolo))]

  // Comportamentali: non presenti nella fonte → generati con seme = ID
  // (deterministici). L'ambizione cresce col margine di miglioramento.
  const caso = casualeConSeme(id)
  const comportamentale = () => limita(50 + (caso() - 0.5) * 60)
  const ambizione = limita(comportamentale() + (intero(g.Potential) - intero(g.Overall)))

  inserisciGiocatore.run([
    id, clubId, clubId === null ? nomeClub || null : null,
    nome, cognome, `${ANNO_RIFERIMENTO - eta}-07-01`, g.Nationality,
    ruolo, secondari.join(',') || null, g.PreferredFoot === 'Left' ? 'sinistro' : 'destro',
    // tecnici (per i portieri restano NULL quelli di movimento e viceversa)
    portiere ? intero(g.SprintSpeed) : intero(g.PaceTotal),
    intero(g.Stamina),
    portiere ? null : intero(g.BallControl),
    portiere ? null : intero(g.ShortPassing),
    portiere ? null : intero(g.ShootingTotal),
    portiere ? null : intero(g.DribblingTotal),
    portiere ? null : intero(g.HeadingAccuracy),
    portiere ? null : intero(g.Marking),
    portiere ? null : intero(g.StandingTackle),
    portiere ? null : intero(g.Positioning),
    portiere ? null : intero(g.Vision),
    portiere ? null : intero(g.FKAccuracy),
    portiere ? intero(g.GKReflexes) : null,
    portiere ? intero(g.GKHandling) : null,
    portiere ? intero(g.GKPositioning) : null,
    portiere ? intero(g.GKKicking) : null,
    ambizione, comportamentale(), comportamentale(), comportamentale(),
    comportamentale(), comportamentale(), comportamentale(),
    intero(g.Potential),
  ])
  importati++

  if (!importatiPerNazionalita.has(g.Nationality)) importatiPerNazionalita.set(g.Nationality, [])
  importatiPerNazionalita.get(g.Nationality).push({ id, overall: intero(g.Overall) ?? 50, ruolo })

  // Contratto solo per chi gioca in un club del perimetro.
  // Stipendio: la fonte è settimanale → annuale (×52).
  // Scadenza: traslata di SCARTO_ANNI per ancorare il mondo al 2026.
  if (clubId !== null) {
    const scadenza = (intero(g.ContractUntil) ?? ANNO_FONTE + 2) + SCARTO_ANNI
    db.run('INSERT INTO contratto (giocatore_id, club_id, stipendio, scadenza) VALUES (?, ?, ?, ?)', [
      id, clubId, (intero(g.WageEUR) ?? 500) * 52, `${scadenza}-06-30`,
    ])
  }
}
inserisciGiocatore.free()

// Budget stipendi del club = somma degli stipendi della rosa +15% di margine
db.run(`UPDATE club SET budget_stipendi = (
  SELECT COALESCE(SUM(c.stipendio), 0) * 1.15 FROM contratto c WHERE c.club_id = club.id
)`)

// ── 4. Nazionali ────────────────────────────────────────────────────────────
// a) rose ufficiali presenti nella fonte (colonna NationalTeam)
// b) qualificate al Mondiale 2026 senza rosa ufficiale → selezione automatica
//    dei migliori per nazionalità tra i giocatori importati (flag generata=1)

const idNazionale = new Map()
for (const nomeNazionale of nazionaliUfficiali) {
  db.run('INSERT INTO nazionale (nome, mondiale_2026, generata) VALUES (?, ?, 0)', [
    nomeNazionale, qualificate2026.includes(nomeNazionale) ? 1 : 0,
  ])
  idNazionale.set(nomeNazionale, db.exec('SELECT last_insert_rowid()')[0].values[0][0])
}
for (const g of giocatoriFonte) {
  if (g.NationalTeam && idNazionale.has(g.NationalTeam)) {
    db.run('INSERT OR IGNORE INTO convocazione (nazionale_id, giocatore_id) VALUES (?, ?)', [
      idNazionale.get(g.NationalTeam), intero(g.ID),
    ])
  }
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

// Fama della nazionale = media overall della rosa (ricavata dagli attributi)
db.run(`UPDATE nazionale SET fama = (
  SELECT COALESCE(ROUND(AVG(g.potenziale)), 50) FROM convocazione c
  JOIN giocatore g ON g.id = c.giocatore_id WHERE c.nazionale_id = nazionale.id
)`)

// ── 5. Salvataggio e report di verifica (DoD M1) ───────────────────────────

const file = join(radiceProgetto, 'public', 'mister.sqlite')
await writeFile(file, Buffer.from(db.export()))

const q = (sql) => db.exec(sql)[0]?.values ?? []
console.log('\n================ REPORT DI VERIFICA ================')
console.log(`\nDatabase salvato in public/mister.sqlite (${(Buffer.from(db.export()).length / 1_000_000).toFixed(1)} MB)`)
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
if (senzaRosa.length) console.log(`Qualificate 2026 SENZA rosa (giocatori insufficienti nel perimetro):\n  ${senzaRosa.join('\n  ')}`)
console.log('\n====================================================')
