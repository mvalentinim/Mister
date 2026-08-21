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
