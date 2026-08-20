# DIARIO di progetto — MISTER

Log delle sessioni di lavoro. Regola (piano §0.1): ogni sessione = un obiettivo dichiarato + questo file aggiornato + un commit git.

---

## Sessione 1 — 2026-08-20 — M0 Fondamenta (parte 1)

**Obiettivo dichiarato:** struttura del repository (§0.2 del piano) + progetto TypeScript/React/Vite + pagina iniziale "MISTER" con menu finto.

**Fatto:**
- Creato il progetto con Vite (template `react-ts`): React 19, TypeScript, Vite.
- Struttura repository: `docs/`, `data/`, `src/`, `public/`, `DIARIO.md`, `IDEE-FUTURE.md`, `README.md`.
- Pagina iniziale: titolo MISTER + menu con 3 voci (Nuova carriera / Carica carriera / Editor). I pulsanti mostrano un messaggio con la milestone in cui la funzione arriverà.
- `README.md` con: guida installazione strumenti sul Mac (Homebrew, Node.js, git), comandi per avviare l'app, flusso git base, spiegazione dello stack.
- Verificato in ambiente remoto: `npm install`, `npm run build` e `npm run lint` passano; il server di sviluppo si avvia e serve la pagina.

**Nota:** questa sessione è stata svolta da Claude Code in ambiente remoto. La parte "installazione guidata sul MacBook" di M0 è documentata nel README e va eseguita dallo sviluppatore di persona.

**Resta da fare (per chiudere M0 — è la sua Definition of Done, tocca allo sviluppatore):**
1. Installare gli strumenti sul Mac seguendo il README.
2. Clonare/aggiornare il repository e avviare l'app con `npm install` + `npm run dev`.
3. Vedere la pagina MISTER nel browser.
4. Fare una modifica banale a un testo (es. il sottotitolo in `src/App.tsx`), salvare e vederla apparire.
5. Fare un commit della modifica.

**Prossima sessione proposta:** chiusura DoD di M0 insieme allo sviluppatore, poi avvio M1 (database SQLite + valutazione fonti dati per Serie A/B, con protocollo risorse esterne).

---

## Sessione 2 — 2026-08-20 — M1 Database (parte 1)

**Obiettivo dichiarato:** schema dati (FRD §5.1) su SQLite via sql.js, dati di esempio, schermate di consultazione (squadre → rosa → scheda giocatore).

**Deroga al metodo (annotata):** lo sviluppatore non ha accesso al Mac, quindi la verifica di persona della DoD di M0 resta **in sospeso**. Si procede con M1 su richiesta dello sviluppatore; i 5 passi di verifica della sessione 1 restano da fare appena possibile.

**Fatto:**
- Installato **sql.js** (SQLite in WebAssembly): il database gira nel browser, offline-first come da FRD §13.
- **Schema** in `data/schema.sql`: tabelle nazione, competizione, club, giocatore (3 gruppi di attributi: tecnici, comportamentali, dinamici; set dedicato portieri), contratto. Decisioni spiegate in `docs/database.md`.
- **Dati di esempio dichiarati** in `data/seed-esempio.sql`: 5 club reali (Milan, Inter, Palermo, Bari, Modena) con 25 giocatori inventati — segnaposto in attesa dell'import reale.
- **Schermate di consultazione**: elenco squadre per competizione → rosa con tabella ordinabile (click sulle intestazioni) → scheda giocatore con barre attributi colorate e contratto. Navigazione con barra in alto.
- **`docs/dati.md`**: valutazione preliminare delle 3 fonti dati aperte (openfootball, Kaggle, football-data.org) con strategia di combinazione proposta. **Nessun download effettuato**: protocollo risorse esterne rispettato, la scelta si conferma con lo sviluppatore.
- Verificato: build e lint puliti; percorso menu → squadre → rosa Palermo → scheda giocatore provato nel browser (screenshot).

**Resta da fare per chiudere M1:**
1. Confermare con lo sviluppatore la strategia fonti dati (`docs/dati.md`).
2. Scrivere ed eseguire gli script di importazione (tutte le squadre di A e B, rose complete).
3. Mappatura attributi alla scala 1-99 documentata campo per campo.
4. Query di verifica: conteggi e assenza di duplicati (DoD).

**Prossima sessione proposta:** scelta fonte dati e prima importazione reale (protocollo: spiega → guida → importa → verifica insieme).
