// calendario.ts — genera il calendario del campionato (girone all'italiana).
//
// Usiamo l'algoritmo classico "a rotazione" (round-robin): una squadra resta
// fissa e le altre ruotano di un posto a ogni giornata; ogni squadra incontra
// tutte le altre una volta all'andata e una al ritorno (campi invertiti).
// I calendari reali arriveranno da una fonte dati in una milestone futura
// (vedi docs/dati.md): per il gioco la struttura è identica.

import type { Partita } from './tipi.ts'

/** Mescola una copia dell'array (algoritmo di Fisher-Yates). */
function mescola<T>(array: T[]): T[] {
  const copia = [...array]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Genera tutte le giornate (andata + ritorno) per i club dati. */
export function generaCalendario(clubIds: number[]): Partita[][] {
  const squadre = mescola(clubIds)
  // con un numero dispari di squadre si aggiunge un "riposo" fittizio
  if (squadre.length % 2 === 1) squadre.push(-1)
  const n = squadre.length

  const andata: Partita[][] = []
  for (let giornata = 0; giornata < n - 1; giornata++) {
    const partite: Partita[] = []
    for (let i = 0; i < n / 2; i++) {
      // la prima squadra è fissa, le altre ruotano: questi indici realizzano
      // la rotazione senza spostare davvero gli elementi
      const a = i === 0 ? squadre[0] : squadre[((giornata + i - 1) % (n - 1)) + 1]
      const b = squadre[((giornata + (n - 1) - i - 1) % (n - 1)) + 1]
      if (a === -1 || b === -1) continue // il "riposo" non gioca
      // alterna il campo per non far giocare sempre in casa la squadra fissa
      const [casaId, trasfertaId] = giornata % 2 === 0 ? [a, b] : [b, a]
      partite.push({ casaId, trasfertaId, golCasa: null, golTrasferta: null })
    }
    andata.push(partite)
  }

  // ritorno: stesse partite a campi invertiti
  const ritorno = andata.map((giornata) =>
    giornata.map((p) => ({
      casaId: p.trasfertaId,
      trasfertaId: p.casaId,
      golCasa: null,
      golTrasferta: null,
    })),
  )

  return [...andata, ...ritorno]
}
