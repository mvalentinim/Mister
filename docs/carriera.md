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

## Il Match Day "in diretta" (M5 completa)

La vista partita del FRD §9, al completo:

- **campo schematico** (SVG) con i gettoni disposti secondo il **modulo
  scelto** (M4) e **posizioni guidate dal motore**: la squadra in possesso
  spinge in avanti, quella che difende si compatta; gli espulsi spariscono
  dal campo, i subentrati appaiono (§9.2);
- **cronometro** con velocità 1x/2x/3x/5x + pausa (§9.3);
- **telecronaca ibrida** (§9.4): righe di riempimento nei momenti
  tranquilli; sulle azioni importanti il tempo rallenta e il racconto si
  infittisce in più battute fino all'esito, con template variati in italiano;
- **pagelle live** della propria squadra, aggiornate minuto per minuto e
  reattive agli eventi (§9.5);
- **in pausa (e all'intervallo, con pausa automatica): sostituzioni (max 3)
  e regolazioni di mentalità e ritmo**, che entrano SUBITO nel motore (§9.3);
- a fine partita: statistiche complete; highlights e pagelle rileggibili
  nella schermata Partite (§9.6).

Come funziona sotto: il motore è "a tappe" (`creaPartita` → `avanzaMinuto`,
vedi docs/match-engine.md). Senza interventi la partita è identica a quella
che il campionato avrebbe simulato in blocco (stesso seme); se intervieni,
**il risultato visto diventa quello ufficiale** — al fischio finale viene
passato ad `avanzaGiornata`, che simula normalmente le altre partite.
Coerenza verificata da collaudo automatico.

Semplificazioni dichiarate: i cambi li fa solo l'utente (i club IA giocano
senza sostituzioni); dopo un cambio l'effetto dei movimenti prevalenti resta
quello calcolato a inizio partita (docs/tattica.md); renderer Canvas/Pixi
solo se servirà più fluidità.

## Flusso utente

Menu → **Nuova carriera** → nazione (le 5 con seconda divisione) → profilo
allenatore → 3-5 offerte da club di seconda divisione (obiettivo, contratto,
budget) → accettazione → stagione a giornate (Partite / Classifica / Rosa) →
verdetti di fine stagione → stagione successiva. **Carica carriera** riprende
qualsiasi salvataggio, anche dopo aver chiuso il browser.
