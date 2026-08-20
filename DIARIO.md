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

---

## Sessione 8 — 2026-08-20 — 🎮 M2: CARRIERA MINIMA GIOCABILE

**Obiettivo dichiarato:** il primo "giro" completo del gioco — dalla scelta della nazione alla fine di una stagione, con salvataggio persistente.

**Fatto:**
- **Flusso nuova carriera** (FRD §4.1): scelta nazione (le 5 con seconda divisione) → profilo allenatore (nome, nazionalità, età — niente skill iniziali) → 3-5 offerte da club di seconda divisione con obiettivo, durata, stipendio e budget → accettazione.
- **Stagione a giornate**: calendario girone all'italiana (andata/ritorno, algoritmo a rotazione), "Gioca giornata" e "Simula fino a fine stagione", risultati e prossimo turno, classifica completa con la propria squadra evidenziata, rosa consultabile.
- **Simulatore provvisorio** (sarà sostituito in M3): gol attesi dalla differenza di forza + vantaggio casa, estrazione con distribuzione di Poisson.
- **Fine stagione**: valutazione obiettivo, promozioni/retrocessioni (3 su / 3 giù, semplificazione dichiarata), l'altra divisione simulata in blocco, passaggio alla stagione successiva a rose congelate.
- **Salvataggio automatico in IndexedDB** a ogni avanzamento; schermata "Carica carriera" con elenco ed eliminazione salvataggi; predisposta la migrazione futura (`versioneSchema`).
- Decisioni e semplificazioni documentate in `docs/carriera.md`.
- **Collaudo end-to-end nel browser**: creata una carriera al Palermo FC (Serie B 2025-26 reale), giocata una stagione intera (11° posto, obiettivo mancato), avviata la stagione 2026-27, ricaricata la pagina e ripresa la carriera dal salvataggio. Build e lint puliti.

**DoD di M2:** dimostrata in ambiente remoto; resta la verifica di persona dello sviluppatore (come per M0/M1).

**Prossima sessione proposta:** M3 — Motore di simulazione v1 (studio riferimenti ESMS/Bygfoot/Dixon-Coles, motore a eventi deterministico con seed, calibrazione).

---

## Sessione 9 — 2026-08-20 — M3: MOTORE DI SIMULAZIONE v1

**Obiettivo dichiarato:** sostituire il simulatore provvisorio con il motore a eventi deterministico (FRD §9.7), calibrato e testato.

**Studio riferimenti (documentato in docs/match-engine.md):** ESMS (architettura a minuti/eventi, protagonisti estratti per ruolo), Bygfoot (valori di reparto aggregati), Dixon-Coles (Poisson, fattore campo, correlazione dei punteggi bassi → effetto ρ riprodotto con i comportamenti reali: prudenza nel finale in parità). Nessun codice copiato.

**Fatto:**
- **`src/motore/`**: rng deterministico (xmur3+mulberry32, stesso seme = stessa partita), preparazione squadre (miglior 4-4-2 dalla rosa vera, forze di reparto), motore a eventi sui 90 minuti (possesso → azione → murata/fuori/parata/gol, assist, ammonizioni, espulsioni, infortuni), voti 4-10, statistiche con xG.
- **Test di calibrazione `npm run calibra`**: 10 stagioni di A e B (7.600 partite) contro i riferimenti reali. **Tutto verde**: gol/partita 2.68 (A) e 2.94 (B), casa/pareggi 45%/26%, campione a 85 punti, capocannoniere a 27-28 gol, risultato più frequente 1-1, niente punteggi assurdi. Exit code 1 se una metrica esce dagli intervalli.
- **Integrazione in carriera**: ogni partita passa dal motore con gli 11 titolari veri; seme per partita = carriera+stagione+giornata+squadre; **cronaca testuale** della partita dell'utente (eventi col minuto, statistiche, pagelle complete) nella schermata Partite; salvataggi migrati automaticamente alla v2 (arrivano seme e cronaca).
- Rimosso `simulatore.ts` (il provvisorio di M2). Refactoring: query condivise in `db/query.ts` (usate anche dal CLI Node).
- Collaudo nel browser: Monza-Venezia 1-1 con cronaca di 27 eventi (gol di Adorante su assist di Kike Pérez, espulsione al 72') e statistiche coerenti (possesso 63-37, xG 2.36-1.35).

**DoD di M3:** risultati credibili ✅ (calibrazione), stesso seed = stessa partita ✅ (test automatico), test lanciabile e leggibile ✅ (`npm run calibra`). Verifica di persona dello sviluppatore in sospeso come per le milestone precedenti.

**Prossima sessione proposta:** M4 — Tattiche e movimenti prevalenti (schermata tattica, moduli, vocabolario movimenti per ruolo, effetti misurabili sul motore).

---

## Sessione 10 — 2026-08-20 — Match Day "in diretta" (anticipo di M5)

**Obiettivo dichiarato (richiesta dello sviluppatore):** vedere la partita scorrere — minuti, campo schematico con segnaposto che si muovono, telecronaca testuale generata a fianco, rallentamento e cronaca fitta sulle azioni da highlights.

**Deroga all'ordine del piano (annotata):** si anticipa in forma essenziale la vista partita di M5 prima delle tattiche di M4, su indicazione dello sviluppatore.

**Fatto:**
- **`MatchDay.tsx`**: campo SVG con gettoni nominali (4-4-2), palla che scivola tra i giocatori col possesso guidato dal confronto dei centrocampi, cronometro con velocità **1x/2x/3x/5x + pausa** (FRD §9.3).
- **Telecronaca ibrida (FRD §9.4)**: righe di riempimento procedurali nei minuti tranquilli; sugli eventi del motore il tempo **rallenta** (passi da ~1,4s anche alle velocità alte) e l'azione viene espansa in più battute — costruzione → tiro → esito — con template variati in italiano; gol con assist raccontato, parate col portiere evidenziato (anello dorato), cartellini, espulsioni, infortuni, intervallo.
- **Coerenza garantita dal determinismo di M3**: il Match Day pre-calcola la partita con lo stesso seme del campionato; al fischio finale la giornata avanza e il risultato registrato è identico a quello visto. **Verificato con collaudo automatico** (Match Day "Monza 0-1 Spezia" = cronaca registrata "Monza 0-1 Spezia").
- Schermata Partite: nuovo bottone primario "🎥 Match Day" accanto a "Simula giornata" e "Simula fino a fine stagione".
- Collaudo completo nel browser: partita intera guardata a 5x, screenshot in gioco/highlight/fine. Build e lint puliti.

**Resta per la M5 "piena":** posizioni dei giocatori guidate dal motore (ora i movimenti sono scenici), cambi e tattica durante la partita, pagelle live, eventuale renderer Canvas/Pixi.

**Prossima sessione proposta:** M4 — Tattiche e movimenti prevalenti.

---

## Sessione 11 — 2026-08-20 — M4: TATTICHE E MOVIMENTI PREVALENTI

**Obiettivo dichiarato:** la schermata tattica completa e il suo effetto reale e misurabile sulle partite (FRD §8).

**Fatto:**
- **`src/tattica/definizioni.ts`**: 6 moduli con gli slot posizionati sul campo; **vocabolario chiuso di 15 movimenti prevalenti** per ruolo (8 offensivi, 7 difensivi) con attributi chiave, effetti sui reparti e freccia; istruzioni di squadra (mentalità, pressing, ampiezza, ritmo — solo 4, FRD §8.3).
- **Schermata Tattica** nella carriera: scelta modulo, undici titolare (click sullo slot + tendina ordinata per idoneità, con scambio automatico), movimenti max 2+2 per slot con **idoneità del giocatore mostrata** (ottimo/buono/scarso/inadatto) e **frecce sul campo tattico** (oro offensive, grigie difensive), istruzioni. Salvataggio immediato.
- **Integrazione nel motore** (`preparazione.ts`): reparti decisi dalla POSIZIONE degli slot (le ali del 4-3-3 sono attacco), il numero di uomini per reparto conta (5 difensori coprono di più), fuori ruolo ×0.92, effetti dei movimenti × fattore di idoneità (sotto ~62 il movimento DANNEGGIA), tetto ±8, bonus tiratore, ritmo che modula le azioni della partita. Il Match Day ora dispone i gettoni secondo il modulo scelto.
- **Test comparativo `npm run confronta-tattiche`** (DoD): 1.200 partite per configurazione — mentalità offensiva → più gol fatti E subiti ✅; movimenti adatti → più xG e bilancio migliore ✅; 5-3-2 → meno gol subiti del 4-3-3 ✅. Il test ha scovato e fatto correggere due difetti reali (saturazione degli effetti, reparti per ruolo anziché per posizione).
- **Ricalibrazione**: i movimenti default hanno alzato la pericolosità media → `qualitaBase` 0.31 e bonus tiratore dimezzato; `npm run calibra` di nuovo tutto verde (A 2.78, B 2.98 gol/partita).
- Salvataggi migrati a versioneSchema 3 (la tattica di default si costruisce al primo accesso). Decisioni in `docs/tattica.md`.
- Collaudo browser: 3-5-2 della Sampdoria con frecce e pannello slot; partita giocata con la nuova tattica.

**DoD di M4:** differenze misurabili e spiegabili ✅ (test comparativo), frecce che riflettono i movimenti ✅. Verifica di persona dello sviluppatore in sospeso come sempre.

**Prossima sessione proposta:** completamento M5 (posizioni dal motore, cambi in partita, pagelle live) oppure M6 — Mercato.
