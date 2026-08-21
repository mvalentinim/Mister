// 04-squadre-legend.mjs — semina le prime squadre Legend (M9, FRD §5.3).
//
// Crea (se mancano) le tabelle delle squadre Legend dentro public/mister.sqlite
// e costruisce 4 squadre curate pescando dal bacino di Icon e Heroes
// importato in M1. È idempotente: le squadre seminate vengono ricostruite,
// quelle create dall'utente con l'editor NON si toccano.
//
// Le squadre Legend vivono in tabelle DEDICATE (squadra_legend + rosa_legend)
// e NON nella tabella club: così restano fuori da carriere, mercato e coppe
// finché non si sceglie di usarle (amichevoli; l'inserimento nel campionato
// arriverà più avanti).

import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync } from 'node:fs'

const PERCORSO = new URL('../../public/mister.sqlite', import.meta.url)

const SQL = await initSqlJs()
const db = new SQL.Database(readFileSync(PERCORSO))

db.run(`
  CREATE TABLE IF NOT EXISTS squadra_legend (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    descrizione TEXT
  );
  CREATE TABLE IF NOT EXISTS rosa_legend (
    squadra_id INTEGER NOT NULL REFERENCES squadra_legend(id) ON DELETE CASCADE,
    giocatore_id INTEGER NOT NULL REFERENCES giocatore(id),
    PRIMARY KEY (squadra_id, giocatore_id)
  );
`)

// il bacino: tutte le leggende con i dati che servono alla selezione
const leggende = []
const stmt = db.prepare(`
  SELECT id, nome, cognome, nazionalita, ruolo,
         velocita, resistenza, tecnica, passaggio, tiro, dribbling,
         marcatura, contrasto, posizionamento, riflessi, presa, uscite
  FROM giocatore WHERE categoria != 'normale'
`)
while (stmt.step()) leggende.push(stmt.getAsObject())
stmt.free()

// una media "spannometrica" per ordinare (quella vera è in src/db/tipi.ts)
const media = (g) =>
  g.ruolo === 'POR'
    ? ((g.riflessi ?? 50) + (g.presa ?? 50) + (g.uscite ?? 50)) / 3
    : ((g.velocita ?? 50) + (g.tecnica ?? 50) + (g.passaggio ?? 50) + (g.tiro ?? 50) +
       (g.marcatura ?? 50) + (g.posizionamento ?? 50)) / 6

const REPARTO = {
  POR: 'POR', DC: 'DIF', TD: 'DIF', TS: 'DIF',
  MED: 'CEN', CC: 'CEN', TRQ: 'CEN', ED: 'CEN', ES: 'CEN', PC: 'ATT',
}

/** Sceglie una rosa di ~18 con i reparti coperti (1 POR, ≥5 DIF, ≥5 CEN, ≥3 ATT).
    `filtro` seleziona il bacino della squadra; i buchi (es. portiere) si
    colmano coi migliori rimasti fuori, di qualunque scuola. */
function componiRosa(filtro, giaPresi) {
  const bacino = leggende
    .filter((g) => !giaPresi.has(g.id))
    .sort((a, b) => media(b) - media(a))
  const propri = bacino.filter(filtro)
  const rosa = []
  const minimi = { POR: 1, DIF: 5, CEN: 5, ATT: 3 }
  const conta = { POR: 0, DIF: 0, CEN: 0, ATT: 0 }

  const aggiungi = (g) => { rosa.push(g); conta[REPARTO[g.ruolo]]++; giaPresi.add(g.id) }
  // 1. copri i minimi con i propri...
  for (const reparto of Object.keys(minimi)) {
    for (const g of propri) {
      if (conta[reparto] >= minimi[reparto]) break
      if (REPARTO[g.ruolo] === reparto && !rosa.includes(g)) aggiungi(g)
    }
    // 2. ...e i buchi coi migliori del bacino globale (es. il portiere)
    for (const g of bacino) {
      if (conta[reparto] >= minimi[reparto]) break
      if (REPARTO[g.ruolo] === reparto && !rosa.includes(g)) aggiungi(g)
    }
  }
  // 3. completa fino a 18 coi migliori propri rimasti
  for (const g of propri) {
    if (rosa.length >= 18) break
    if (!rosa.includes(g)) aggiungi(g)
  }
  return rosa
}

const SQUADRE = [
  {
    nome: 'Leggende d’Italia',
    descrizione: 'Il meglio della scuola italiana: Baggio, Maldini, Pirlo…',
    filtro: (g) => g.nazionalita === 'Italy',
  },
  {
    nome: 'Leggende d’Inghilterra',
    descrizione: 'Moore, Charlton, Shearer, Beckham e la tradizione inglese.',
    filtro: (g) => g.nazionalita === 'England',
  },
  {
    nome: 'Leggende del Brasile',
    descrizione: 'Pelé, Garrincha, Ronaldo, Ronaldinho: il calcio bailado.',
    filtro: (g) => g.nazionalita === 'Brazil',
  },
  {
    nome: 'Stelle d’Europa',
    descrizione: 'Zidane, Cruyff, van Basten e i fuoriclasse del continente.',
    filtro: (g) => ['France', 'Netherlands', 'Germany', 'Spain', 'Portugal'].includes(g.nazionalita),
  },
]

for (const squadra of SQUADRE) {
  // ricostruisce SOLO le squadre seminate (idempotente)
  const esiste = db.exec('SELECT id FROM squadra_legend WHERE nome = ?', [squadra.nome])
  if (esiste.length) {
    const id = esiste[0].values[0][0]
    db.run('DELETE FROM rosa_legend WHERE squadra_id = ?', [id])
    db.run('DELETE FROM squadra_legend WHERE id = ?', [id])
  }
}
const giaPresi = new Set()
for (const squadra of SQUADRE) {
  db.run('INSERT INTO squadra_legend (nome, descrizione) VALUES (?, ?)', [squadra.nome, squadra.descrizione])
  const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0]
  const rosa = componiRosa(squadra.filtro, giaPresi)
  for (const g of rosa) db.run('INSERT INTO rosa_legend VALUES (?, ?)', [id, g.id])
  const por = rosa.filter((g) => g.ruolo === 'POR').length
  console.log(`✅ ${squadra.nome}: ${rosa.length} giocatori (POR: ${por}) — ` +
    rosa.slice(0, 6).map((g) => g.cognome).join(', ') + '…')
}

writeFileSync(PERCORSO, Buffer.from(db.export()))
console.log('Database aggiornato con le squadre Legend.')
