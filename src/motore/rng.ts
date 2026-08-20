// rng.ts — numeri casuali DETERMINISTICI per il motore di simulazione.
//
// Il requisito chiave del FRD §9.7: stesso seed = stessa partita, sempre.
// Math.random() non lo permette (ogni chiamata è imprevedibile), quindi
// usiamo un generatore "seminato": una formula che, partendo da un numero
// iniziale (il seme), produce sempre la stessa sequenza di numeri
// apparentemente casuali. Fondamentale per i test automatici.
//
// Algoritmi usati (standard, pubblici e ben collaudati):
// - xmur3: trasforma una stringa qualsiasi in un buon seme numerico
// - mulberry32: generatore veloce di numeri in [0, 1) a partire dal seme

/** Trasforma una stringa in un seme numerico ben distribuito (hash xmur3). */
export function semeDaStringa(testo: string): number {
  let h = 1779033703 ^ testo.length
  for (let i = 0; i < testo.length; i++) {
    h = Math.imul(h ^ testo.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

/** Un generatore di numeri casuali riproducibile. */
export interface Rng {
  /** Numero in [0, 1), come Math.random() ma riproducibile. */
  numero(): number
  /** Intero in [0, max). */
  intero(max: number): number
  /** true con la probabilità data (0-1). */
  evento(probabilita: number): boolean
  /** Un elemento a caso dall'array, pesato dai valori dati. */
  pesato<T>(elementi: T[], pesi: number[]): T
  /** Estrazione di Poisson (per i conteggi di eventi rari). */
  poisson(media: number): number
}

/** Crea il generatore a partire da un seme numerico (mulberry32). */
export function creaRng(seme: number): Rng {
  let stato = seme >>> 0
  const numero = () => {
    stato = (stato + 0x6d2b79f5) >>> 0
    let t = stato
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    numero,
    intero: (max) => Math.floor(numero() * max),
    evento: (probabilita) => numero() < probabilita,
    pesato: (elementi, pesi) => {
      const totale = pesi.reduce((s, p) => s + p, 0)
      let soglia = numero() * totale
      for (let i = 0; i < elementi.length; i++) {
        soglia -= pesi[i]
        if (soglia <= 0) return elementi[i]
      }
      return elementi[elementi.length - 1]
    },
    poisson: (media) => {
      const soglia = Math.exp(-media)
      let conteggio = -1
      let prodotto = 1
      do {
        conteggio++
        prodotto *= numero()
      } while (prodotto > soglia)
      return conteggio
    },
  }
}
