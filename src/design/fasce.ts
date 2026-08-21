// fasce.ts — la CODIFICA VALORI a 5 fasce (DESIGN-MISTER.md §2.4),
// sempre coerente in tutto il gioco: 1-45 rosso, 46-60 arancio,
// 61-74 inchiostro, 75-87 verde, 88-99 oro (con bordo).
// Le classi CSS corrispondenti (fascia-N, fascia-riempimento-N)
// vivono in tokens.css.

export function fascia(valore: number): 1 | 2 | 3 | 4 | 5 {
  if (valore <= 45) return 1
  if (valore <= 60) return 2
  if (valore <= 74) return 3
  if (valore <= 87) return 4
  return 5
}

/** La stessa scala, tarata sui VOTI in pagella (0-10): la sufficienza
    è neutra, non "scarsa" — il 6 è inchiostro, dal 7 si va in verde. */
export function fasciaVoto(voto: number): 1 | 2 | 3 | 4 | 5 {
  if (voto < 5.5) return 1
  if (voto < 6) return 2
  if (voto < 7) return 3
  if (voto < 8.5) return 4
  return 5
}
