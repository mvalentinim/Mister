// valore.ts — il VALORE DI MERCATO dinamico (M6, FRD §6.1).
//
// Il valore non è salvato nel database: si CALCOLA quando serve (FRD §5.1)
// da attributi, età, potenziale, scadenza del contratto e fama del club.
// La curva è esponenziale: pochi punti di media in più valgono molto
// (calibrata su valori plausibili: gregario di B ~300k, titolare di A ~12M,
// top player ~100M+).

import { mediaComplessiva, calcolaEta, type GiocatoreRiga } from '../db/tipi.ts'

/**
 * Valore di mercato in euro.
 * @param anniContrattoRimasti anni alla scadenza (0 = in scadenza)
 * @param famaClub fama del club di appartenenza (1-99), 50 se svincolato
 */
export function valoreMercato(
  g: GiocatoreRiga,
  anniContrattoRimasti: number,
  famaClub: number,
): number {
  const media = mediaComplessiva(g)
  const eta = calcolaEta(g.data_nascita)

  // curva base esponenziale: ~300k a media 50, ~12M a 70, ~120M a 85
  let valore = Math.exp(12.6 + 0.171 * (media - 50))

  if (g.categoria !== 'normale') {
    // le LEGGENDE (M9): il cartellino segue il NOME, non l'età anagrafica
    // (che è storica). Niente premio giovani, niente sconto veterani:
    // vale la curva pura della media — un cartellino "certamente alto".
  } else if (eta <= 21) valore *= 1.25 + Math.max(0, g.potenziale - media) * 0.02
  else if (eta <= 27) valore *= 1.15 + Math.max(0, g.potenziale - media) * 0.01
  else if (eta <= 30) valore *= 0.9
  else if (eta <= 33) valore *= 0.55
  else valore *= 0.3

  // scadenza vicina = sconto (FRD §6.2, leva n.3)
  if (anniContrattoRimasti <= 0) valore *= 0.3
  else if (anniContrattoRimasti === 1) valore *= 0.7
  else if (anniContrattoRimasti === 2) valore *= 0.9

  // un grande club alza (un po') il prezzo del cartellino
  valore *= 0.85 + famaClub / 300

  // arrotonda a cifre "da giornale": 25k sotto il milione, 100k sopra
  const passo = valore < 1_000_000 ? 25_000 : 100_000
  return Math.max(25_000, Math.round(valore / passo) * passo)
}

/** Formato leggibile: 1.2M, 350k. */
export function euro(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M €`
  return `${Math.round(v / 1_000)}k €`
}
