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

---

## Sessione 12 — 2026-08-20 — 🎮 M5 COMPLETA: Match Day interattivo

**Obiettivo dichiarato:** completare la M5 — posizioni guidate dal motore, cambi e regolazioni a partita in corso, pagelle live (FRD §9).

**Fatto:**
- **Motore "a tappe"** (`creaPartita` → `avanzaMinuto`): la partita avanza minuto per minuto con uno stato modificabile — è ciò che rende possibili i cambi in diretta. `simulaPartitaMotore` è ora un involucro che fa gli stessi passi: campionato e calibrazione identici (verificato: `npm run calibra` verde e ora **deterministico** anche nel calendario).
- **Sostituzioni (max 3) e regolazioni** di mentalità e ritmo **in pausa e all'intervallo** (pausa automatica al 45'): entrano subito nel motore; le forze di reparto si ricalcolano dopo ogni cambio (`ricalcolaForze`, approssimazione dichiarata sui movimenti del sostituito).
- **Il risultato visto è quello ufficiale**: al fischio finale il Match Day passa il risultato (cambi inclusi) ad `avanzaGiornata`, che simula solo le altre partite. Senza interventi, la partita resta identica a quella simulata in blocco (stesso seme).
- **Posizioni guidate dal motore**: la squadra in possesso (deciso dal motore, non più scenico) spinge avanti, chi difende si compatta; espulsi spariscono dal campo, subentrati appaiono.
- **Pagelle live** (§9.5) sotto la telecronaca, aggiornate ogni minuto e reattive agli eventi (il giallo abbassa il voto in diretta).
- Pagelle con nomi nel risultato del motore (`pagelle`), usate anche dalla cronaca post-partita.
- **Collaudo end-to-end**: pausa al 20', cambio effettuato ("entra D'Alessandro, esce Antonini"), mentalità a molto offensiva, pausa automatica all'intervallo, fine partita Catanzaro 2-1 Reggiana = risultato registrato in campionato. Build, lint, calibrazione e test tattiche tutti verdi.

**DoD di M5:** partita guardata dall'inizio alla fine con cambio di velocità ✅, sostituzione all'intervallo ✅, telecronaca dei gol ✅, highlights e pagelle rileggibili a fine gara ✅ (schermata Partite). Verifica di persona dello sviluppatore in sospeso come sempre.

**Prossima sessione proposta:** M6 — Mercato (trattative club-club, IA dei club, finestre).

---

## Sessione 13 — 2026-08-20 — M6: MERCATO (club↔club e IA dei club)

**Obiettivo dichiarato:** finestre di mercato con trattative strutturate a 5 leve e club IA credibili (FRD §6.1-6.2).

**Fatto:**
- **Le rose vivono nella carriera**: fotografia di rose, contratti e budget alla creazione (`inizializzaMercato`); i trasferimenti le muovono; motore/Match Day/Tattica/Rosa leggono la rosa di carriera; cache squadre auto-invalidante. Salvataggi migrati a versioneSchema 4.
- **Valore di mercato calcolato** (mai salvato, FRD §5.1): curva esponenziale su media, età (picco 22-27, premio giovani), sconto scadenza, fama club.
- **IA dei club**: analisi rosa (ruoli scoperti, esuberi, giocatori chiave), personalità economica deterministica (propensione vendita, aggressività, valorizza giovani); ogni giorno di mercato 5-8 club comprano dove sono scoperti — le notizie ufficiali motivano ("serviva un rinforzo in attacco"); rumor per le trattative saltate; offerte all'utente (acquisto o prestito con diritto, più probabili per i cedibili).
- **Trattativa a 5 leve** (max 3 round, rifiuti motivati): prezzo, bonus (valgono metà), scadenza (dentro il valore), prestito diritto/obbligo (titolari esclusi), contropartite (pesano se coprono un ruolo scoperto del venditore, altrimenti rifiuto motivato); "incedibile" per i top-3 delle botteghe care; controproposte con cifra.
- **Finestre**: estiva 8 giorni a inizio stagione, invernale 5 a metà; campionato fermo a finestra aperta (semplificazione dichiarata); mercato deterministico (seminato).
- **Contratti**: rinnovo semplice nel monte stipendi; fine stagione con risoluzione prestiti, rinnovi IA e **svincolati** ingaggiabili gratis.
- **Schermata Mercato**: stato finestra e budget, avanzamento giorni, offerte ricevute, ricerca con trattativa, rosa con rinnovi/cedibili, svincolati, notiziario.
- **Collaudo end-to-end**: campionato bloccato a mercato aperto ✓; trasferimenti IA motivati dai ruoli scoperti ✓; acquisto con contropartita riuscito ("Sarr è tuo", con Baldé come contropartita) ✓; offerta ricevuta di prestito con diritto (Cesena per Forson) visibile e accettabile ✓; chiusura finestra e campionato sbloccato ✓. Build e lint puliti; calibrazione non toccata.
- Decisioni e semplificazioni in `docs/mercato.md` (la volontà del giocatore arriva in M7).

**Prossima sessione proposta:** M7 — Trattativa conversazionale (cervello deterministico + LLM) e comportamento giocatori.

---

## Sessione 14 — 2026-08-20 — M6 completata

**Obiettivo dichiarato:** chiudere i pezzi rimasti di M6 e collaudare il giro di stagione completo col mercato.

**Fatto:**
- **Cessione attiva**: bottoni "Vendi" e "Prestito" nella rosa del mercato — l'utente propone un giocatore ai club IA; se un club ha quel ruolo scoperto e il budget, l'offerta arriva subito tra le ricevute (con rifiuto spiegato in caso contrario). La DoD "cede in prestito con diritto" è ora sempre esercitabile.
- **Pulizia tattica**: cedere un titolare libera il suo slot (il motore ripiega sul miglior sostituto, la schermata Tattica mostra lo slot vuoto).
- **Riscatto prestiti rifinito**: contratto nuovo per il club che riscatta, budget dell'ospitante scalato.
- Notiziario allargato (40 notizie visibili, 80 conservate): le risoluzioni dei prestiti non spariscono sotto gli svincoli di fine stagione.
- **Collaudo del giro completo**: prestito con diritto ceduto (Ceccaroni al Pisa per 1,7M) ✓, finestra invernale aperta a metà stagione ✓, stagione conclusa, nuova stagione con mercato estivo aperto ✓, 24 svincoli a fine stagione ✓. Build, lint e calibrazione verdi.

**M6 CHIUSA.** Prossima: M7 — Trattativa conversazionale (cervello deterministico + LLM con fallback offline) e comportamento giocatori.

---

## Sessione 15 — 2026-08-20 — M7: trattativa conversazionale e comportamento giocatori

**Obiettivo dichiarato:** la volontà del giocatore nel mercato (cervello deterministico + voce LLM opzionale con fallback offline) e il livello comportamentale della rosa: morale, promesse, spogliatoio (FRD §6.3, §7).

**Fatto:**
- **Cervello deterministico** (`src/trattativa/interesse.ts`): `punteggioInteresse` 0–100 con fattori spiegabili (prestigio del progetto, fama allenatore, denaro vs stipendio atteso, durata, minutaggio previsto contando i concorrenti di reparto, leve, promesse tradite in passato). Soglie: ≥60 firma, <40 rifiuto netto, in mezzo trattabile per max 3 round. **L'IA non decide mai**: firma e rifiuto escono solo da qui.
- **Il dialogo d'ingaggio** (`DialogoIngaggio.tsx`): dopo l'accordo tra i club (o per gli svincolati) devi convincere il giocatore. Riepilogo strutturato sempre visibile con termometro dell'interesse e "Perché questo interesse?" (FRD §12). Due modalità: **offline** (promesse a scelta multipla, battute-template — il gioco è sempre completabile) e **IA** (discorso libero: Claude interpreta il testo, riconosce le promesse fatte a voce e risponde nel personaggio usando gli attributi di personalità).
- **Protocollo risorsa esterna per la chiave API**: si incolla nel pannello ⚙️ della trattativa, vive solo nel `localStorage` del browser (`mister-chiave-api`), mai nel codice né su git; ogni errore LLM fa scattare il fallback offline senza perdere la trattativa. SDK ufficiale `@anthropic-ai/sdk`; modelli claude-opus-5 (default), claude-sonnet-5, claude-haiku-4-5.
- **Le promesse vincolano** (`src/comportamento/comportamento.ts`): registrate alla firma, verificate automaticamente — titolarità: ≥4 presenze in 6 giornate; centralità: ≥3; progetto: promozione a fine stagione. Mantenuta: morale +10, fama +1. Tradita: morale −30, fama −4, contatore `promesseTradite` che pesa sulle trattative future, messaggio furioso nello spogliatoio.
- **Morale e statistiche**: dopo ogni giornata si aggiornano presenze/voti/gol dalle pagelle; morale +2/+1 a chi gioca, −3 agli importanti (top-14 per media) dimenticati in panchina da 4+ giornate, che si lamentano nello **spogliatoio** (riquadro nella linguetta Partite). Il morale entra nel motore come `forma` dei tuoi giocatori: uno spogliatoio depresso gioca peggio. Fama allenatore sempre visibile nell'intestazione.
- Salvataggi a **versioneSchema 5** (migrazione automatica); carriera nuova parte con fama 20.
- **Collaudo end-to-end (Playwright)**: acquisto di Vicari dal Bari con promessa di titolarità in modalità offline (interesse 69/100, promessa registrata `attiva`, morale d'arrivo 65) → 7 giornate simulate senza mai schierarlo → promessa `tradita`, morale 65→35, fama 20→16, messaggio "è FURIOSO" nello spogliatoio, lamentele anche degli altri panchinari importanti ✓. Prima stesura del collaudo bocciata correttamente dal gioco: stipendio offerto da 2M sforava il monte stipendi e la firma veniva rifiutata — il vincolo funziona. Build, lint e calibrazione verdi.
- Decisioni e protocollo chiave API in `docs/trattativa.md`.

**DoD di M7:** convincere un giocatore promettendo la titolarità, lasciarlo in panchina un mese e osservarne le conseguenze ✅ (test end-to-end). La stessa trattativa completabile offline ✅ (è la modalità predefinita del collaudo). Verifica di persona dello sviluppatore (e prova della modalità IA con una chiave reale) in sospeso come sempre.

**Prossima sessione proposta:** M8 — carriera lunga: obiettivi e fama completa, esoneri e offerte migliori, coppa nazionale, crescita/declino dei giocatori (potenziale, età, utilizzo, prestazioni).

---

## Sessione 16 — 2026-08-20 — Ricerca giocatori avanzata nel mercato

**Obiettivo dichiarato (richiesta esplicita):** prima di M8, potenziare la ricerca del mercato — per squadra, ruolo e nazionalità, con filtri e ordinamento per valore generale (media), anno di scadenza del contratto ed età.

**Fatto:**
- **Nuova barra dei filtri** nella sezione "Cerca un rinforzo": nome (come prima), **squadra** (tutte le squadre delle due divisioni, in ordine alfabetico), **ruolo**, **nazionalità** (elenco costruito dalle rose reali della carriera).
- **Filtri numerici**: media minima, età massima, scadenza del contratto entro un certo anno (i primi 4 anni).
- **Ordinamento a scelta**: valore di mercato (come prima, predefinito), media (valore generale), scadenza contratto, età — con bottone per invertire il verso; al cambio di criterio il verso torna a quello naturale (valore/media dal più alto, scadenza/età dal più basso).
- La ricerca parte con **almeno un criterio attivo** (non serve più digitare un nome per forza: si può filtrare solo per nazionalità o squadra); risultati fino a 30 con avviso "primi X di Y" quando sono troncati; colonna Nazionalità aggiunta alla tabella.
- Nota emersa dal collaudo: le **nazionalità sono in inglese** ("France", "Italy") perché così sono nel DB di origine — la traduzione è rimandata (eventuale mappa in un lavoro di rifinitura).
- **Collaudo end-to-end (Playwright)**: filtro squadra (solo Palermo FC ✓), + ruolo PC ✓, nazionalità da sola (30 francesi ✓), età max 21 ordinata crescente ✓, inversione del verso ✓, scadenza entro il 2026 ✓, media ≥70 ordinata decrescente ✓, trattativa apribile dai risultati filtrati ✓. Build e lint verdi.

**Prossima sessione proposta:** M8 — carriera lunga (obiettivi, fama completa, esoneri, coppa, crescita/declino giocatori).

---

## Sessione 16-bis — 2026-08-20 — Il mercato diventa MONDIALE

**Obiettivo dichiarato (richiesta esplicita):** il mercato deve essere aperto su tutto il DB dei giocatori, anche nei campionati diversi da quello in cui si gioca.

**Fatto:**
- **La carriera fotografa il mondo intero**: `carriera.club` contiene ora tutti i ~198 club del perimetro (10 campionati) con ~5.500 contratti; ogni club porta `nazioneId` e `campionato`. Salvataggi a **versioneSchema 6**: i vecchi vengono estesi al primo accesso (`estendiMercatoAlMondo`, idempotente, non tocca i trasferimenti già fatti — verificato con test dedicato).
- **Il campionato resta nazionale**: classifica, promozioni/retrocessioni e calendario filtrano per nazione (`clubNazione` nel motore); i campionati esteri non si simulano (semplificazione dichiarata in `docs/mercato.md`).
- **IA di mercato mondiale ma a campione** (per i tempi): 8-11 club compratori al giorno, ognuno valuta gli esuberi di 40 club estratti dal caso seminato; stesso campione (40) per i club interessati alle cessioni dell'utente. Ora nel notiziario compaiono anche PSG e Barcellona che fanno acquisti.
- **Ricerca sul bacino mondiale**: nuovo filtro Campionato, squadre raggruppate per campionato nel menu; il bacino (~6.000 giocatori) è memoizzato e si rinfresca solo dopo un'operazione; ordinamento pre-calcolato per riga (niente ricalcoli nel sort).
- **Collaudo end-to-end**: 198 club e 5.563 contratti fotografati ✓; "Haaland" trovato al Manchester City ✓; filtro Premier League con Rodri/Mac Allister in testa per media ✓; rosa del Real Madrid trattabile (accordo tra club raggiunto con un club estero) ✓; classifica ancora a 20 squadre italiane dopo una giornata ✓. Build, lint, tsc e calibrazione verdi.

**Prossima sessione proposta:** M8.

---

## Sessione 17 — 2026-08-20 — M8 (nucleo): fama completa, fiducia, esoneri, coppa, crescita giocatori

**Obiettivo dichiarato:** il loop di carriera del FRD §4 — fama con soglie e fasce di offerte, fiducia della dirigenza con esoneri e subentri, valutazione obiettivi, coppa nazionale, crescita/declino dei giocatori.

**Fatto:**
- **Fama completa e spiegabile**: ogni variazione (vittorie di prestigio, obiettivi, promozioni, coppa, giovani valorizzati, esoneri, promesse tradite) finisce in un registro (`eventiFama`) mostrato nel riepilogo di fine stagione (FRD §12). Soglie che sbloccano fasce di offerte: 40 (medi di A), 55 (alti di A), 70 (top club).
- **Fiducia della dirigenza** (0-100, visibile in intestazione): segue risultati e posizione rispetto all'obiettivo; sotto 5 scatta l'**esonero** con fama −10 e 2-3 offerte immediate dai club in difficoltà della stessa divisione — si sceglie e si riparte **in corsa** (subentro: rosa, budget, obiettivo e tattica del nuovo club; le promesse ai vecchi giocatori decadono).
- **L'obiettivo si rinegozia a ogni stagione** dal rango del club nella divisione. Bug reale trovato dal collaudo: dopo una promozione l'obiettivo restava "promozione" anche in A → esonero ingiusto. Corretto.
- **Offerte di fine stagione**: 0-3 club di fascia superiore (deterministiche), nel riepilogo con "Resta al club" sempre possibile.
- **Coppa nazionale**: 32 squadre a eliminazione diretta, 5 turni intrecciati al campionato (dopo le giornate 5/10/15/20/25), rigori seminati, riquadro dedicato nella linguetta Partite, trofeo in bacheca e +6 fama. Semplificazione dichiarata: partite di coppa simulate (niente Match Day in coppa per ora).
- **Crescita/declino dei giocatori** (richiesta esplicita confermata prima di M7): a fine stagione TUTTI i giocatori tracciati (~5-6.000) ricevono un delta da potenziale + età di gioco + utilizzo + prestazioni; il delta vive nella carriera (`crescita`) e si applica in lettura ovunque (motore, rosa, tattica, mercato, valore) — il DB statico non si tocca mai. Deterministico. Riepilogo dei movimenti della propria rosa a fine stagione.
- Salvataggi a **versioneSchema 7** (migrazione automatica); cache delle squadre motore invalidata per stagione (la crescita cambia gli attributi).
- **Taratura**: prima stesura della fiducia troppo severa (3 esoneri in 3 stagioni nel collaudo) → penalità sconfitta ridotte, premi vittoria alzati, fiducia iniziale 60 → 1 esonero (meritato: Sampdoria 17ª con obiettivo promozione) su 3 stagioni.
- **Collaudo end-to-end del DoD**: 3+ stagioni consecutive partendo dalla B ✓; promozione con fama in crescita (Monza 2°, fama 20→33, in un run) ✓; fallimento clamoroso → esonero e subentro in corsa ✓; crescita registrata per ~4.800 giocatori ✓; coppa giocata ogni stagione ✓; con fama alta (75) le offerte di fine stagione arrivano da Milan e Fiorentina (fasce sbloccate) ✓; offerta accettata e cambio panchina a fine stagione ✓. Build, lint, tsc, calibrazione e test tattiche tutti verdi.
- Decisioni e tabelle in `docs/fama-e-crescita.md`.

**DoD di M8 (parte nucleo):** 3+ stagioni con offerte migliori e fasce sbloccate ✅ (collaudo automatico); esonero su fallimento ✅. Verifica di persona dello sviluppatore in sospeso come sempre.

**Resta per chiudere M8** (prossima sessione): competizioni continentali semplificate e panchine delle nazionali oltre soglia di fama (ciclo qualificazioni/torneo).

---

## Sessione 17-bis — 2026-08-20 — Panchine estere (richiesta esplicita)

**Obiettivo dichiarato:** l'allenatore riceve offerte anche da club di altri campionati europei e può trasferirsi in un'altra nazione.

**Fatto:**
- **Offerte da tutta Europa a fine stagione**: i candidati vengono da tutte le 10 leghe del perimetro (che è già solo europeo). La fascia di un club estero si giudica nel SUO campionato (rango e mediana della sua prima divisione) con un sovrapprezzo di +10 fama — all'estero la reputazione viaggia più lenta. La B di casa resta sempre raggiungibile; la B estera chiede fama ≥ 40.
- **Trasloco completo accettando** (solo a fine stagione): cambiano nazione, nomi delle divisioni, calendario (giornate corrette per taglia di lega: 34 in Bundesliga, 46 in Championship…) e tabellone di coppa; notizia dedicata. Dopo un esonero, invece, si resta nella propria divisione (a metà campionato il trasloco non avrebbe senso).
- Le offerte mostrano il campionato di provenienza in tutte e tre le schermate (esonero, fine stagione, riquadro in Partite).
- **Collaudo end-to-end**: carriera con fama alta → a fine stagione offerte da RB Leipzig (Bundesliga), Bournemouth (Premier League) e Marsiglia (Ligue 1) ✓; accettato il Lipsia → nazione Germania, Bundesliga/2. Bundesliga, calendario a 34 giornate, coppa tedesca a 32 squadre, prima giornata giocata con classifica a 18 ✓. Verificato anche che tutte le 10 leghe hanno squadre pari (calendario sempre generabile). Build, lint, tsc e calibrazione verdi.
