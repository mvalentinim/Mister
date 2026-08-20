# Il database di MISTER — decisioni tecniche

*(M1, sessione 1 — linguaggio semplice, come da FRD §0)*

## Cos'è e dove vive

Il database statico del gioco usa **SQLite**, tramite la libreria **sql.js**.

- **SQLite** è un database completo che sta in un singolo file: niente server, niente installazioni. Analogia: un classificatore da ufficio con tanti schedari (le *tabelle*), dove ogni scheda (la *riga*) ha campi ben definiti (le *colonne*).
- **sql.js** è SQLite compilato in **WebAssembly**, un formato che i browser eseguono quasi come un programma nativo. Così il database gira *dentro* la pagina web: perfetto per un gioco offline-first (FRD §13).
- All'avvio l'app costruisce il database in memoria eseguendo i file `data/schema.sql` (le tabelle) e `data/seed-esempio.sql` (i dati). Il linguaggio dei file è **SQL**, lo standard per interrogare i database: `SELECT * FROM club` = "dammi tutte le righe dello schedario club".

## Decisioni prese (e perché)

1. **Solo le tabelle che servono ora.** Il FRD §5.1 elenca 11 entità; in M1 ne implementiamo 5 (nazione, competizione, club, giocatore, contratto). Le altre (Stagione, Partita, Trasferimento, Carriera-utente...) nascono con le milestone che le usano: creare oggi tabelle vuote che non sappiamo ancora come useremo significherebbe quasi certamente rifarle.
2. **Una sola tabella `giocatore` per portieri e giocatori di movimento**, con colonne opzionali (i portieri hanno riflessi/presa/uscite/rinvio, gli altri i 12 attributi tecnici). Alternativa scartata: due tabelle separate — avrebbe complicato ogni ricerca ("tutti i giocatori del club X" richiederebbe due query).
3. **`valore_mercato` non è una colonna**: il FRD §6.1 lo definisce *calcolato* (da attributi, età, scadenza, fama del club, rendimento). Salvarlo nel database significherebbe avere due verità che possono divergere. Si calcola quando serve (arriva con M6).
4. **Gli ID sono numeri assegnati dal database** (`INTEGER PRIMARY KEY`): ogni riga ha il suo numero unico, e le tabelle si collegano tramite questi numeri (`club_id` nel giocatore punta all'`id` del club).
5. **Indici sulle colonne di collegamento** (`club_id`, `competizione_id`): come l'indice analitico di un libro, evitano di sfogliare tutte le pagine. Con 20.000+ giocatori (FRD §13) faranno la differenza.

## Vocabolario dei ruoli (prima versione)

`POR` portiere · `DC` difensore centrale · `TD`/`TS` terzino destro/sinistro · `MED` mediano · `CC` centrocampista centrale · `TRQ` trequartista · `ED`/`ES` esterno destro/sinistro · `PC` punta centrale.

Verrà raffinato in M4 (tattiche e movimenti prevalenti), quando i ruoli dovranno dialogare con i moduli.

## Dati attuali

I dati in `data/seed-esempio.sql` sono **di esempio**: 5 club reali (2 di A, 3 di B) con rose inventate di 5-7 giocatori. Servono solo a sviluppare le schermate. L'import dei dati reali è il prossimo passo di M1: vedi `dati.md`.
