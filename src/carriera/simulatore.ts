// simulatore.ts — il simulatore PROVVISORIO delle partite (milestone M2).
//
// ⚠️ Volutamente ultra-semplice: serve solo a far girare la stagione.
// Sarà SOSTITUITO in M3 dal motore a eventi deterministico (FRD §9.7).
//
// Come funziona: dalla differenza di forza tra le due squadre si calcolano
// i "gol attesi" (con un vantaggio per chi gioca in casa), poi il numero di
// gol reale viene estratto da una distribuzione di Poisson — la stessa
// usata dai modelli statistici sul calcio (Dixon-Coles, che studieremo in
// M3): produce risultati dalle frequenze realistiche (tanti 1-0 e 1-1,
// pochi 4-3).

/** Estrae un numero di gol da una distribuzione di Poisson (algoritmo di Knuth). */
function estraiGol(golAttesi: number): number {
  const soglia = Math.exp(-golAttesi)
  let gol = -1
  let prodotto = 1
  do {
    gol++
    prodotto *= Math.random()
  } while (prodotto > soglia)
  return gol
}

/** Simula una partita tra due squadre date le loro forze (scala 1-99). */
export function simulaPartita(forzaCasa: number, forzaTrasferta: number): {
  golCasa: number
  golTrasferta: number
} {
  // ogni punto di forza in più vale ~3% di gol attesi in più (e viceversa)
  const differenza = forzaCasa - forzaTrasferta
  const attesiCasa = 1.4 * Math.exp(differenza * 0.03) // 1.4 = media casa
  const attesiTrasferta = 1.1 * Math.exp(-differenza * 0.03) // 1.1 = media trasferta
  return {
    golCasa: estraiGol(attesiCasa),
    golTrasferta: estraiGol(attesiTrasferta),
  }
}
