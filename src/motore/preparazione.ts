// preparazione.ts — dal database alla squadra pronta per il motore:
// sceglie gli 11 titolari e calcola le forze di reparto.
//
// In M3 il modulo è fisso (4-4-2) e la formazione è "il miglior undici":
// la schermata tattica con moduli e movimenti prevalenti arriva in M4.

import type { Database } from 'sql.js'
import { interroga } from '../db/query.ts'
import type { GiocatoreRiga } from '../db/tipi.ts'
import { mediaComplessiva } from '../db/tipi.ts'
import type { GiocatoreMotore, SquadraMotore } from './tipi.ts'

// Il 4-4-2 di M3: quanti giocatori servono per reparto
const MODULO = { POR: 1, DIF: 4, CEN: 4, ATT: 2 }

const REPARTO: Record<string, keyof typeof MODULO> = {
  POR: 'POR', DC: 'DIF', TD: 'DIF', TS: 'DIF',
  MED: 'CEN', CC: 'CEN', TRQ: 'CEN', ED: 'CEN', ES: 'CEN',
  PC: 'ATT',
}

/** Media dei valori non nulli (0 se nessuno). */
const media = (valori: Array<number | null>) => {
  const presenti = valori.filter((v): v is number => v !== null)
  return presenti.length ? presenti.reduce((s, v) => s + v, 0) / presenti.length : 0
}

/** Converte una riga del database in un giocatore per il motore. */
function preparaGiocatore(g: GiocatoreRiga): GiocatoreMotore {
  return {
    id: g.id,
    nome: `${g.nome} ${g.cognome}`.trim(),
    ruolo: g.ruolo,
    attacco: media([g.tiro, g.dribbling, g.posizionamento, g.velocita]),
    regia: media([g.passaggio, g.visione, g.tecnica]),
    difesa: media([g.marcatura, g.contrasto, g.posizionamento]),
    portiere: g.ruolo === 'POR' ? media([g.riflessi, g.presa, g.uscite]) : 0,
    forma: g.forma,
  }
}

/**
 * Sceglie gli 11 titolari di un club: per ogni reparto i migliori per media
 * complessiva; se un reparto è corto si adatta pescando dai vicini.
 */
export function preparaSquadra(db: Database, clubId: number, nomeClub: string): SquadraMotore {
  const rosa = interroga<GiocatoreRiga>(db, 'SELECT * FROM giocatore WHERE club_id = ?', [clubId])
  // ordina per media complessiva decrescente, una lista per reparto
  const perReparto: Record<keyof typeof MODULO, GiocatoreRiga[]> = { POR: [], DIF: [], CEN: [], ATT: [] }
  for (const g of [...rosa].sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a))) {
    perReparto[REPARTO[g.ruolo] ?? 'CEN'].push(g)
  }

  const titolari: GiocatoreRiga[] = []
  const scelti = new Set<number>()
  for (const reparto of ['POR', 'DIF', 'CEN', 'ATT'] as const) {
    let presi = 0
    // prima i giocatori del reparto giusto...
    for (const g of perReparto[reparto]) {
      if (presi >= MODULO[reparto]) break
      titolari.push(g); scelti.add(g.id); presi++
    }
    // ...poi, se mancano, i migliori rimasti di qualunque ruolo (adattati)
    if (presi < MODULO[reparto]) {
      for (const g of [...rosa].sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a))) {
        if (presi >= MODULO[reparto]) break
        if (!scelti.has(g.id)) { titolari.push(g); scelti.add(g.id); presi++ }
      }
    }
  }

  const giocatori = titolari.map(preparaGiocatore)
  const difensori = giocatori.filter((g) => REPARTO[g.ruolo] === 'DIF')
  const centrocampisti = giocatori.filter((g) => REPARTO[g.ruolo] === 'CEN')
  const attaccanti = giocatori.filter((g) => REPARTO[g.ruolo] === 'ATT')
  const portiere = giocatori.find((g) => g.ruolo === 'POR')

  return {
    clubId,
    nome: nomeClub,
    titolari: giocatori,
    // le forze di reparto: l'attacco conta anche la spinta dei centrocampisti,
    // la difesa conta anche il filtro del centrocampo (pesi 70/30)
    attacco: media(attaccanti.map((g) => g.attacco)) * 0.7 + media(centrocampisti.map((g) => g.attacco)) * 0.3,
    centrocampo: media(centrocampisti.map((g) => g.regia)) * 0.7 + media(giocatori.map((g) => g.regia)) * 0.3,
    difesa: media(difensori.map((g) => g.difesa)) * 0.7 + media(centrocampisti.map((g) => g.difesa)) * 0.3,
    portiere: portiere?.portiere ?? 40,
  }
}
