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

## Le squadre Legend (FRD §5.3)

Vivono in tabelle DEDICATE (`squadra_legend` + `rosa_legend`), fuori dalla
tabella club: non toccano carriere, mercato e coppe. Quattro squadre sono
seminate nel database (`npm run legends`): Leggende d'Italia, d'Inghilterra,
del Brasile e Stelle d'Europa — rose con reparti coperti; dove una scuola
non ha leggende in un ruolo (es. nessun portiere italiano tra le Icon), il
buco è colmato dal bacino globale, e con il wizard si può sempre rifinire.

**Il wizard** (sezione "⭐ Squadre Legend" dell'editor): nome, poi la rosa
pescando da Icon e Heroes con ricerca e filtro ruolo; contatori di reparto
sempre visibili; per salvare servono ≥16 giocatori e un portiere. Le squadre
si modificano e si eliminano; la persistenza è quella del DB personalizzato.

**Amichevole** (voce nel menu principale): qualunque squadra contro
qualunque squadra — Legend contro Legend, o contro i club di oggi. Partita
col motore vero, cronaca e pagelle; il risultato non tocca le carriere.

## Creazione da zero e import/export

- **➕ Nuovo giocatore**: nasce con attributi neutri (60) e si compila nella
  scheda. **➕ Nuovo club in…**: nasce nel campionato scelto; dalla scheda
  club si può anche SPOSTARE un club tra i campionati. Il calendario
  gestisce i numeri dispari (turno di riposo), ma meglio tenere pari le leghe.
- **JSON** (FRD §5.4): "Esporta JSON" scarica club, giocatori e squadre
  Legend in un file leggibile; "Importa JSON" li riapplica per id (upsert) e
  ricostruisce le squadre Legend elencate. È il formato di condivisione;
  il .sqlite resta il backup totale.

## Le leggende nel mercato come free agent

Opzione alla creazione della carriera: dalla stagione scelta (subito, dopo
la 1ª, la 2ª o la 3ª) tutte le leggende non impegnate entrano nel **mercato
estivo come svincolati**. Regole:

- **Niente cartellino** (sono free agent), ma un **ingaggio da leggenda**:
  lo stipendio atteso usa la curva del valore sulla media, SENZA lo sconto
  dell'età anagrafica.
- **A convincerle è la prospettiva del progetto**, non i soldi: nel cervello
  della trattativa (M7) le leggende hanno fattori dedicati — forza del club,
  palcoscenico (prima o seconda divisione), reputazione dell'allenatore,
  promessa di progetto (pesa il doppio); il denaro è solo "rispetto del
  nome" e sposta poco.
- **Niente crescita né declino** (fuori dal tempo), ma **dopo 5 stagioni
  dall'ingresso si ritirano**, ovunque si trovino (anche dalla tua rosa),
  a prescindere dall'età. I ritirati finiscono nel registro
  `carriera.ritirati` (la base per la gestione del post-ritiro).
- L'IA non le ingaggia (per ora, semplificazione dichiarata): le leggende
  aspettano il TUO progetto.

## Torneo fantasy e Legend nel campionato

- **Torneo fantasy** (schermata Amichevole): 4 o 8 squadre a scelta (Legend
  e/o club), eliminazione diretta secca, tabellone giocato in un colpo.
- **Legend nel campionato** (opzione alla creazione carriera): la squadra
  Legend scelta entra nella SECONDA divisione al posto del club più debole
  (mai il tuo), con contratti pesanti e forza calcolata dalla rosa; il club
  sostituito resta solo nel mondo del mercato. Le leggende sono **fuori dal
  tempo**: niente crescita né declino (con date di nascita storiche il
  declino le azzererebbe); il loro valore di mercato risente dell'età
  anagrafica — stranezza nota e accettata.
