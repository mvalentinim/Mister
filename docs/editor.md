# L'editor del database (M9, FRD §5.4)

## Come funziona la persistenza

Il browser non può riscrivere `public/mister.sqlite`. Quando salvi una
modifica, l'editor esporta **l'intero database modificato** e lo mette in
IndexedDB (`mister-db-utente`): da quel momento l'app carica QUELLO
all'avvio, al posto dell'originale. Un banner lo dice sempre chiaramente, e
"♻️ Ripristina il database originale" cancella la copia personalizzata.

Regola del FRD §5.4: l'editor modifica il DB statico, **mai le carriere in
corso** — le carriere fotografano il database alla creazione. Le modifiche
valgono quindi per le carriere NUOVE.

## Coerenza carriera ↔ database (l'impronta)

Le rose sono fotografate nella carriera, ma nomi e attributi si leggono dal
database vivo: se il DB cambia sotto una carriera, i dati non corrispondono
più. Per questo ogni database ha un'**impronta** scritta DENTRO il file
(`PRAGMA user_version`): 0 = originale; l'editor assegna un numero casuale
al primo salvataggio. L'impronta **viaggia con l'export/import**.

- Ogni carriera memorizza l'impronta del DB con cui è nata (`dbImpronta`).
- Se al caricamento il DB attuale è diverso, la schermata carriera mostra un
  **avviso chiaro** (si gioca comunque) con la via d'uscita: ripristinare
  l'originale o reimportare il file giusto.
- **⬇️ Esporta database (.sqlite)**: scarica il DB in uso (il nome del file
  contiene l'impronta). **⬆️ Importa database da file**: lo ricarica —
  anche su un altro browser/dispositivo — e le carriere nate su di lui
  tornano coerenti. I file non validi vengono rifiutati; un DB corrotto in
  IndexedDB fa ripiegare l'app sull'originale senza rompersi.
- "Ripristina" ora chiede conferma ricordando di esportare prima.

## Cosa si può fare (sessione 1)

- **Ricerca giocatori** per nome, club (raggruppati per campionato), ruolo e
  categoria (normale / icon / hero — le leggende importate in M1).
- **Scheda giocatore completa**: anagrafica (nome, nascita, nazionalità,
  ruolo, piede), categoria, potenziale, club di appartenenza (o nessuno),
  attributi tecnici 1-99, set portiere, personalità. Campo vuoto = attributo
  non pertinente (NULL).
- **Modifica di massa**: un delta (±) su un attributo per TUTTI i giocatori
  filtrati, con limiti 1-99 rispettati.
- **Modifica club**: nome, fama (forza), budget mercato e stipendi.

## Cosa arriva nelle prossime sessioni di M9

- Wizard "Crea squadra Legend" (club → rosa dalle leggende → attributi) e le
  prime 3-5 squadre Legends.
- Creazione di nuovi giocatori e club da zero.
- Import/export del database in JSON (backup e condivisione).
- Modalità d'uso delle Legends: amichevoli, torneo fantasy, inserimento nel
  campionato.
