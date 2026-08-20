# Trattativa conversazionale e comportamento giocatori (M7)

Questo documento spiega come funziona la trattativa d'ingaggio col giocatore
(il "faccia a faccia" dopo l'accordo tra i club) e il livello comportamentale
della rosa: morale, promesse e reazioni dello spogliatoio.

Riferimenti: FRD §6.3 (trattativa), §7 (comportamento), §12 (spiegabilità),
piano di progetto M7.

---

## 1. L'architettura a due strati

La regola d'oro di M7: **l'IA non decide mai, decide sempre il "cervello"
deterministico**. Ci sono due strati separati:

1. **Il cervello (`src/trattativa/interesse.ts`)** — una funzione pura e
   deterministica che calcola quanto un giocatore è interessato alla tua
   offerta: `punteggioInteresse(db, carriera, giocatore, offerta)` restituisce
   un punteggio 0–100 e la lista dei fattori che lo compongono.
2. **La voce (`src/trattativa/llm.ts`)** — opzionale: un modello Claude fa
   *parlare* il giocatore in modo naturale e *interpreta* il tuo discorso
   libero riconoscendo le promesse che hai fatto. Ma il punteggio, la firma o
   il rifiuto restano decisi dal cervello. Se l'IA non c'è (nessuna chiave,
   rete assente, errore), il gioco funziona identico in **modalità offline**
   con scelte multiple: il gioco è sempre completabile senza IA (FRD §6.3).

## 2. Il punteggio di interesse

Base 45 punti, poi ogni fattore somma o sottrae. Soglie:

| Punteggio | Esito |
|---|---|
| ≥ 60 (`SOGLIA_FIRMA`) | il giocatore accetta |
| 40–59 | trattabile: puoi ritoccare l'offerta (max 3 round) |
| < 40 (`SOGLIA_TRATTABILE`) | rifiuto netto, motivato |

I fattori (tutti visibili in gioco sotto "Perché questo interesse?"):

- **Prestigio del progetto**: salto di forza e di divisione tra il club
  attuale e il tuo, pesato dall'`ambizione` del giocatore.
- **Fama dell'allenatore**: la tua reputazione (parte da 20, cresce
  mantenendo le promesse, crolla tradendole).
- **Denaro**: rapporto tra stipendio offerto e stipendio atteso, pesato
  dall'`attaccamento_denaro`.
- **Durata del contratto**: giovani preferiscono contratti lunghi, anziani corti.
- **Minutaggio previsto**: quanti concorrenti nello stesso reparto hanno una
  media pari o superiore alla sua, pesato dal `bisogno_giocare`.
- **Le promesse (leve)**: vedi sotto.
- **Promesse tradite in passato**: se hai già tradito qualcuno, la voce gira
  (−4 per tradimento, fino a −16).

## 3. Le leve (promesse)

Quattro leve, massimo 2 per offerta:

| Leva | Effetto sull'interesse | Verifica |
|---|---|---|
| `titolarita` — "sarai titolare" | forte, cresce se ha concorrenti | ≥ 4 presenze nelle prime 6 giornate |
| `centralita` — "sarai centrale nel progetto" | media | ≥ 3 presenze nelle prime 6 giornate |
| `progetto` — "puntiamo alla promozione" | pesata dall'ambizione | a fine stagione: promosso o no |
| `fascia` — "fascia di capitano" | pesata dalla leadership | non registrata come promessa (solo colore) |

**Le promesse vincolano.** Alla firma vengono registrate nel salvataggio
(`carriera.promesse`, stato `attiva`) e verificate automaticamente:

- **mantenuta** → morale +10 al giocatore, fama allenatore +1;
- **tradita** → morale −30, `promesseTradite`+1, fama −4, messaggio furioso
  nello spogliatoio. E i futuri obiettivi di mercato lo sapranno.

## 4. La modalità offline (predefinita)

Senza chiave API: componi l'offerta (stipendio, durata) e spunti le promesse
da un elenco. Il giocatore risponde con battute-template scelte in base alla
fascia di punteggio. Stesse regole, stesso cervello.

## 5. La modalità IA (opzionale)

Con una chiave API Anthropic il giocatore parla davvero: scrivi un discorso
libero ("vieni da noi, ti faccio giocare titolare…"), l'IA interpreta il
testo, **riconosce le promesse che hai fatto a voce** (diventano leve
registrate a tutti gli effetti!) e risponde nel personaggio, usando i suoi
attributi di personalità e i fattori del cervello come contesto.

### Protocollo risorsa esterna (chiave API)

1. La chiave si crea su <https://console.anthropic.com> → *API Keys*.
2. In gioco: pannello "⚙️ Modalità dialogo" dentro la trattativa → incolla la
   chiave → Salva.
3. La chiave resta **solo nel browser** (`localStorage`, voce
   `mister-chiave-api`). **Mai nel codice, mai su git, mai inviata altrove**
   se non alle API Anthropic.
4. Costo: pochi centesimi a trattativa (poche centinaia di token per
   battuta). Modelli disponibili: `claude-opus-5` (predefinito),
   `claude-sonnet-5`, `claude-haiku-4-5` (il più economico).
5. Qualsiasi errore (chiave sbagliata, rete, limiti) → si torna alla
   modalità offline senza perdere la trattativa.

## 6. Il comportamento della rosa (`src/comportamento/comportamento.ts`)

Dopo ogni giornata `aggiornaComportamento`:

- aggiorna le **statistiche personali** (presenze, media voto, gol) leggendo
  le pagelle della tua partita;
- muove il **morale** (0–100): +2 a chi gioca e vince, +1 a chi gioca
  comunque; −3 a ogni giocatore *importante* (i primi 14 per media) che non
  gioca da 4+ giornate, con messaggio nello spogliatoio a quota 4 e 8;
- verifica le **promesse** in scadenza (finestra: 6 giornate).

Il morale non è cosmetico: entra nel motore come `forma` dei tuoi giocatori
il giorno della partita — uno spogliatoio depresso gioca peggio.

A fine stagione `verificaPromesseFineStagione` chiude le promesse di
`progetto` (promozione sì/no) e azzera le statistiche stagionali.

## 7. Lo spogliatoio in gioco

Nella linguetta **Partite**, il riquadro "📣 Spogliatoio" mostra gli ultimi
messaggi dei giocatori (lamentele, furia da promessa tradita, soddisfazione),
con la giornata in cui sono stati detti. La fama dell'allenatore è sempre
visibile nell'intestazione della carriera.

## 8. Salvataggio

Nuovi campi nella carriera (versione schema **5**, migrazione automatica dai
salvataggi vecchi): `morale`, `statistiche`, `promesse`, `prossimaPromessaId`,
`promesseTradite`, `famaAllenatore`, `messaggi`.

## 9. Collaudo

Il DoD di M7 è stato verificato con un test end-to-end (Playwright):
acquisto di un giocatore con promessa di titolarità in modalità offline,
7 giornate simulate senza mai schierarlo → promessa `tradita`, morale
65→35, fama 20→16, messaggio furioso nello spogliatoio. Il collaudo "a mano"
su dispositivo personale resta a debito (vedi DIARIO).
