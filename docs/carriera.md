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

## Il motore delle partite (da M3)

Il simulatore provvisorio di M2 è stato **sostituito dal motore a eventi
deterministico** (`src/motore/`, progetto completo in `docs/match-engine.md`):
ogni partita è simulata con gli 11 titolari veri, produce eventi, statistiche,
marcatori e voti, ed è **riproducibile** (il seme della carriera + stagione +
giornata + squadre determina la partita). La partita della squadra dell'utente
genera la **cronaca testuale** mostrata nella schermata Partite; il Match Day
visuale arriva in M5. Il motore è calibrato sulle distribuzioni reali:
`npm run calibra` per verificarlo.

## Semplificazioni dichiarate di M2

| Semplificazione | Quando sparisce |
|---|---|
| Promozioni/retrocessioni: 3 su e 3 giù, senza playoff | regole nazionali parametrizzate (M11) |
| Nessuna retrocessione sotto la seconda divisione (niente terze serie nel DB) | eventuale espansione contenuti |
| L'altra divisione è simulata in blocco a fine stagione | simulazione parallela di tutte le leghe (M5+) |
| Rose congelate tra le stagioni | mercato (M6), crescita/declino (M8) |
| Niente coppa nazionale | M8 |
| Fama dell'allenatore non ancora calcolata (obiettivo solo valutato) | M8 |
| Calendario generato, non quello reale | fonte calendari (docs/dati.md) |

## Il Match Day "in diretta" (anticipo di M5)

Su richiesta dello sviluppatore, la vista partita del FRD §9 è stata
anticipata (in forma essenziale) rispetto all'ordine del piano:

- **campo schematico** (SVG) con i gettoni nominali delle due squadre in
  4-4-2 e la palla che scivola tra i giocatori della squadra in possesso;
- **cronometro** con velocità 1x/2x/3x/5x + pausa (FRD §9.3);
- **telecronaca testuale** generata a fianco del campo minuto per minuto:
  frasi di riempimento nei momenti tranquilli e, sulle azioni importanti,
  **il tempo rallenta** e il racconto si infittisce in più battute fino
  all'esito (la "telecronaca ibrida" del FRD §9.4), con template procedurali
  variati in italiano;
- a fine partita: statistiche complete; le pagelle restano nella schermata
  Partite.

Grazie al determinismo del motore (M3), la partita mostrata è pre-calcolata
con lo stesso seme del campionato: ciò che vedi è ciò che va in classifica
(coerenza verificata da collaudo automatico). Restano per la M5 "piena":
posizioni dei giocatori guidate dal motore (ora i movimenti sono scenici),
cambi e regolazioni durante la partita, pagelle live, renderer Canvas/Pixi
se servirà più fluidità.

## Flusso utente

Menu → **Nuova carriera** → nazione (le 5 con seconda divisione) → profilo
allenatore → 3-5 offerte da club di seconda divisione (obiettivo, contratto,
budget) → accettazione → stagione a giornate (Partite / Classifica / Rosa) →
verdetti di fine stagione → stagione successiva. **Carica carriera** riprende
qualsiasi salvataggio, anche dopo aver chiuso il browser.
