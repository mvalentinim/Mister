# La carriera (M2) — decisioni tecniche

*(linguaggio semplice, come da FRD §0)*

## Architettura

La carriera è un **oggetto autonomo** che fotografa il database statico al
momento della creazione (FRD §5.4): dentro ci sono i club delle due divisioni
della nazione scelta (con la loro forza), il calendario e tutti i risultati.
Modificare il database statico non tocca le carriere in corso.

- `src/carriera/tipi.ts` — la forma dei dati (carriera, offerte, partite...)
- `src/carriera/calendario.ts` — girone all'italiana con l'algoritmo classico
  "a rotazione": andata e ritorno, funziona con qualsiasi numero di squadre
  (Serie B 20 → 38 giornate, Championship 24 → 46).
- `src/carriera/simulatore.ts` — simulatore **provvisorio** (vedi sotto).
- `src/carriera/motore.ts` — offerte, avanzamento, classifica, fine stagione.
- `src/carriera/salvataggio.ts` — persistenza in **IndexedDB** (il database
  interno del browser: i dati restano sul disco anche chiudendo tutto).
  Salvataggio automatico a ogni avanzamento. Il file `.mister` esportabile
  arriva in M10.

## Il simulatore provvisorio

Dalla differenza di forza tra i club (la "fama" del DB: media overall dei
migliori 18) si calcolano i gol attesi, con vantaggio casa (1.4 vs 1.1 gol di
base); i gol reali escono da una **distribuzione di Poisson**, la stessa dei
modelli statistici sul calcio. Produce risultati con frequenze plausibili
(tanti 1-0 e 1-1, rari i 4-3). Verrà **sostituito in M3** dal motore a eventi
deterministico: per questo non è ancora riproducibile con un seed.

## Semplificazioni dichiarate di M2

| Semplificazione | Quando sparisce |
|---|---|
| Promozioni/retrocessioni: 3 su e 3 giù, senza playoff | regole nazionali parametrizzate (M11) |
| Nessuna retrocessione sotto la seconda divisione (niente terze serie nel DB) | eventuale espansione contenuti |
| L'altra divisione è simulata in blocco a fine stagione | M3+ (simulazione di tutte le leghe) |
| Rose congelate tra le stagioni | mercato (M6), crescita/declino (M8) |
| Niente coppa nazionale | M8 |
| Fama dell'allenatore non ancora calcolata (obiettivo solo valutato) | M8 |
| Calendario generato, non quello reale | fonte calendari (docs/dati.md) |

## Flusso utente

Menu → **Nuova carriera** → nazione (le 5 con seconda divisione) → profilo
allenatore → 3-5 offerte da club di seconda divisione (obiettivo, contratto,
budget) → accettazione → stagione a giornate (Partite / Classifica / Rosa) →
verdetti di fine stagione → stagione successiva. **Carica carriera** riprende
qualsiasi salvataggio, anche dopo aver chiuso il browser.
