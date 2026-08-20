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

---

## Sessione 3 — 2026-08-20 — Tema chiaro + perimetro dati approvato

**Obiettivo dichiarato:** sostituire il tema "prato" con uno sfondo chiaro su toni di grigio; recepire le decisioni dello sviluppatore sul perimetro dei dati.

**Fatto:**
- **Tema chiaro**: sfondo grigio quasi bianco, pannelli bianchi, testo grigio scuro, un solo accento verde scuro usato con parsimonia (titoli, evidenze, voce attiva). Cura visuale fine rimandata di proposito a più avanti, come indicato dallo sviluppatore.
- **Perimetro dati approvato e documentato in `docs/dati.md`**:
  1. la strategia di combinazione fonti proposta è confermata;
  2. rose dei **principali campionati europei** (top 5), non solo Serie A/B → la pipeline nasce multi-lega (si anticipa come requisito ciò che il piano collocava in M11; l'ordine di popolamento resta: prima l'Italia);
  3. rose delle **nazionali aggiornate fino al Mondiale 2026** → richiederà una piccola estensione dello schema;
  4. rose **Legends**: per i ritirati non esistono dataset aperti di attributi → restano curate a mano (M9), ma la pipeline prevede fin d'ora flag `legend` e import JSON.
- Verificato: build pulita, screenshot delle schermate col nuovo tema.

**Prossima sessione proposta:** verifica concreta di copertura e licenze delle fonti (openfootball, Kaggle, football-data.org) e primo script di importazione per l'Italia.

---

## Sessione 4 — 2026-08-20 — M1: verifica fonti e IMPORT DATI REALI

**Obiettivo dichiarato:** verificare le fonti dati e importare le rose reali del perimetro FRD §5.2 (10 leghe top europee) + nazionali.

**Verifica fonti (protocollo risorse esterne):**
- Kaggle e HuggingFace non raggiungibili direttamente da questo ambiente; football-data.org richiede registrazione e niente seconde divisioni nel piano free.
- Scelta: dataset **"FIFA 23 Players"** (origine Kaggle, mirror pubblico GitHub) — copertura verificata club per club: **tutte e 10 le leghe complete** + rose nazionali licenziate. openfootball per i gironi del Mondiale 2026.

**Fatto:**
- **Pipeline di importazione** (`npm run importa-dati`): script 01 scarica le fonti in `data/fonti/` (fuori git), script 02 costruisce `public/mister.sqlite` con report di verifica. Mappatura campo-per-campo documentata in `docs/dati.md`.
- **Schema esteso**: tabelle `nazionale` e `convocazione`; colonna `giocatore.club_esterno` per i convocati che giocano fuori perimetro.
- **Importati: 6.112 giocatori reali, 202 club, 10 competizioni, 43 nazionali** (31 qualificate al Mondiale 2026, 8 con rosa a selezione automatica dichiarata), 5.762 contratti. Zero duplicati; esclusa la squadra fittizia "AFC Richmond"; scartate 79 righe doppie della fonte.
- **App collegata al database reale** (con ripiego sui dati di esempio se il file manca); schermata Squadre riorganizzata per nazione+competizione con sezione Nazionali; scheda giocatore mostra nazionale e club esterno.
- Verificato nel browser: rose reali (es. Palermo 2022-23 con Brunori e Di Mariano; Italia con Barella e Chiesa), build e lint puliti.

**Compromessi dichiarati (in docs/dati.md):** rose stagione 2022-23 (la più recente con copertura completa in fonte aperta); età ancorate al 2026 con date di nascita sintetiche; scadenze contratti traslate +4 anni; attributi comportamentali generati proceduralmente (deterministici); convocazioni ufficiali Mondiale 2026 non ancora pubblicate in fonti aperte.

**Resta per chiudere M1 (DoD):** lo sviluppatore esegue di persona `npm run importa-dati` e verifica il report — da fare quando avrà accesso al Mac (insieme alla DoD di M0, ancora in sospeso).

**Prossima sessione proposta:** M2 — Carriera minima giocabile (flusso nuova carriera: nazione → profilo allenatore → offerte dalla seconda divisione).

---

## Sessione 5 — 2026-08-20 — M1: aggiornamento dati a FC 26 (stagione 2025-26)

**Obiettivo dichiarato:** sostituire la fonte FIFA 23 con il dataset **EA Sports FC 26** scaricato da Kaggle dallo sviluppatore e caricato nel repository (`archive.zip` su main → spostato in `data/fc26-kaggle.zip`).

**Fatto:**
- Verificato il dataset: 18.405 giocatori, snapshot 21/09/2025 → **stagione 2025-26**, con **date di nascita reali** e contratti attuali. Copertura completa delle 10 leghe confermata via `league_id` (i nomi delle leghe in FC 26 sono ambigui: Bundesliga tedesca e austriaca omonime).
- **Pipeline riscritta su FC 26**: club ricavati dalle righe giocatore (la fonte non ha un file squadre); fama = media overall dei migliori 18, budget derivati da valore rosa e stipendi. Spariti i compromessi dell'ancoraggio temporale (date sintetiche e scadenze traslate).
- Corretti i nomi paese aggiornati di EA ("Türkiye", "Czechia", "Cabo Verde") per l'aggancio alle qualificate del Mondiale 2026.
- **Importati: 5.851 giocatori 2025-26, 198 club, 40 nazionali** (29 al Mondiale 2026, 12 a selezione automatica). Unico caso di omonimia: i gemelli Murphy (verificati, persone diverse). Report pulito.
- `docs/dati.md` aggiornata (fonte, mappatura campo per campo, report).
- Verificato nel browser: rose attuali (es. Palermo con Pohjanpalo e Palumbo).

**Prossima sessione proposta:** M2 — Carriera minima giocabile.

---

## Sessione 6 — 2026-08-20 — Verifica file Icons/Heroes + tag categoria

**Obiettivo dichiarato:** verificare il file `Icons and Heroes Unlock.rar` caricato su main e predisporre l'integrazione delle leggende con un tag dedicato nel database.

**Verifica:** il RAR contiene `SquadsBaseIconsHeroes`, uno **squad file binario del gioco** (formato proprietario EA "FBCHUNKS", compresso): serve a sbloccare le leggende dentro FC 26, non è un export di dati → **non importabile**. Verificato anche che il CSV FC 26 non contiene Icons/Heroes (i nomi trovati erano omonimi, es. Luca Zidane).

**Fatto (predisposizione completa, collaudata):**
- **Tag `categoria`** su giocatore: `normale` | `icon` | `hero` con vincolo CHECK — richiesto per le regole future di inclusione/esclusione delle leggende dalle rose.
- **Canale di import `data/leggende/*.json`** con formato documentato (README nella cartella), ID da 900000 in su; collaudato end-to-end con un file di prova poi rimosso.
- **UI**: sezione "Leggende" nell'elenco squadre (visibile solo se presenti) e badge ★ICON/⚡HERO nella scheda giocatore.
- `docs/dati.md` aggiornata con la verifica e la fonte candidata per i dati veri: dataset Kaggle "Complete EA FC26 Rating Cards Database" (da scaricare come fatto per FC 26).

**Prossima sessione proposta:** M2 — Carriera minima giocabile (oppure conversione leggende se lo sviluppatore carica il dataset delle carte).

---

## Sessione 7 — 2026-08-20 — Leggende importate (105 Icons + 61 Heroes)

**Obiettivo dichiarato:** trovare una fonte utilizzabile per Icons/Heroes (il dataset Kaggle da >500 MB non è caricabile su GitHub) e importarle col tag categoria.

**Verifiche:**
- [EAFC26-DataHub](https://github.com/ismailoksuz/EAFC26-DataHub) segnalato dallo sviluppatore: usa lo **stesso** dataset FC 26 che abbiamo già (stesso schema) → niente Icons, ma utile come fonte alternativa auto-scaricabile.
- Repo `bartlomiej-niemiec/fc24-ultimate-team-players` (MIT, dati futwiz): le carte base di FC 24 hanno le **statistiche complete** (i file FC 25/26 le hanno vuote) → scelta come fonte.

**Fatto:**
- Nuovo script **`02-converti-leggende.mjs`**: filtra le carte base "Icon" e "FUT Hero", deduplica per nome, mappa gli attributi futwiz sul nostro schema e genera `data/leggende/icons.json` + `heroes.json`. Pipeline ora: 01 scarica → 02 converte leggende → 03 costruisce DB.
- **166 leggende nel database** (105 Icons + 61 Heroes) con tag `categoria`, visibili nell'app (sezione Leggende + badge ★ICON/⚡HERO).
- Limiti documentati in docs/dati.md: manca Maradona (escluso da FC 24 per disputa legale), date di nascita sintetiche, incluse le leggende femminili, attributi da carte FUT.

**Prossima sessione proposta:** M2 — Carriera minima giocabile.
