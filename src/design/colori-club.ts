// colori-club.ts — i COLORI SOCIALI dei club (DESIGN-MISTER.md §2.3).
//
// Il database non ha (ancora) le colonne dei colori sociali: finché non
// ci saranno, ogni club riceve una maglia PROCEDURALE ma stabile — una
// coppia primario/secondario pescata da una palette di maglie classiche,
// scelta dall'id del club: stesso club, stessi colori, per sempre.
// Quando i colori veri entreranno nel DB, basterà leggerli qui.

import { creaRng, semeDaStringa } from '../motore/rng.ts'

export interface ColoriClub {
  primario: string
  secondario: string
  /** il motivo della maglia dell'avatar: tinta unita, palato, fascia… */
  motivo: 'unita' | 'palato' | 'fascia' | 'meta'
}

/* maglie da almanacco: combinazioni piene e sature, mai pastello */
const MAGLIE: Array<[string, string]> = [
  ['#1854a6', '#1a1a1a'], // nerazzurra
  ['#c62828', '#1a1a1a'], // rossonera
  ['#1a1a1a', '#f4efe3'], // bianconera
  ['#8e2c3b', '#c9a227'], // giallorossa
  ['#1e5aa8', '#7fb2e5'], // azzurra
  ['#6a1b7a', '#f4efe3'], // viola
  ['#7a3e2d', '#c9a227'], // granata
  ['#2e7d32', '#f4efe3'], // verde
  ['#c62828', '#f4efe3'], // rossa
  ['#e65100', '#1a1a1a'], // arancione
  ['#153e6b', '#c62828'], // blu-rossa
  ['#1a1a1a', '#c9a227'], // nero-oro
]

const MOTIVI: ColoriClub['motivo'][] = ['unita', 'palato', 'fascia', 'meta']

/** I colori sociali (procedurali ma stabili) di un club. */
export function coloriClub(clubId: number | null): ColoriClub {
  if (clubId === null) {
    // svincolati e leggende senza club: la veste neutra del gioco
    return { primario: '#2e7d32', secondario: '#1a1a1a', motivo: 'unita' }
  }
  const rng = creaRng(semeDaStringa(`maglia-${clubId}`))
  const [primario, secondario] = MAGLIE[rng.intero(MAGLIE.length)]
  return { primario, secondario, motivo: MOTIVI[rng.intero(MOTIVI.length)] }
}

/** Il numero di maglia (procedurale ma stabile): tipico del ruolo. */
export function numeroMaglia(giocatoreId: number, ruolo: string): number {
  const rng = creaRng(semeDaStringa(`maglia-numero-${giocatoreId}`))
  const TIPICI: Record<string, number[]> = {
    POR: [1, 12, 22],
    DC: [2, 3, 5, 6, 13], TS: [3, 13, 21], TD: [2, 12, 24],
    CC: [4, 8, 16, 18], CD: [4, 6, 14], ED: [7, 17, 27], ES: [11, 20, 22],
    TQ: [10, 14, 21],
    PC: [9, 10, 11, 19], SP: [10, 11, 21],
  }
  const scelte = TIPICI[ruolo] ?? [7, 8, 15, 23]
  return scelte[rng.intero(scelte.length)]
}
