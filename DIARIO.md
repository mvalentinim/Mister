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

---

## Sessione 18 — 2026-08-20 — M8 parte 2: Coppa Europa, contratto dell'allenatore, offerte con la fama

**Obiettivo dichiarato:** competizioni continentali in forma semplificata + tre richieste esplicite: più fama → più offerte; sempre almeno un'offerta della propria nazione; contratti pluriennali dell'allenatore con costo in fama per chi li rompe.

**Fatto:**
- **Coppa Europa** (forma semplificata): i primi 4 della prima divisione si qualificano (+2 fama); l'anno dopo 32 top club dei 5 campionati, eliminazione diretta con turni sfalsati rispetto alla coppa nazionale (giornate 7/13/17/22/27), rigori seminati; vincerla vale trofeo e +10 fama. Esiste solo nelle stagioni in cui si è dentro; cambiando panchina a fine stagione il posto si perde (era del club). Il modulo coppa è stato generalizzato (un solo motore per entrambe le coppe, riquadri separati in Partite).
- **Scudetto**: vincere la prima divisione ora vale trofeo in bacheca e +8 fama (mancava!).
- **Contratto pluriennale dell'allenatore** (`contrattoAllenatore`, visibile in intestazione): le offerte arrivano anche a contratto in essere, ma romperlo costa **−3 fama** (registrato nel bilancio spiegabile); dopo un esonero nessun costo. Alla scadenza rinnovo automatico: 2 anni (+10% stipendio) con fiducia ≥ 35, 1 anno "di prova" altrimenti — mai vicoli ciechi.
- **Offerte che crescono con la fama**: da 1-2 (sconosciuto) a 4-5 (fama 90+), con la **garanzia di almeno un'offerta della nazione in cui si lavora** quando esiste un club adatto.
- Le coppe premiano la fama al momento della vittoria (spostato da fine stagione, niente doppi conteggi). Salvataggi a **versioneSchema 8** (migrazione automatica).
- **Collaudo end-to-end**: fama 60 → a fine stagione 4 offerte (Torino e Inter italiane garantite, Mallorca e Real Sociedad estere) ✓; accettato il Mallorca a contratto vivo → "Contratto rotto col Monza" −3 fama, nuovo contratto ✓; La Liga vinta → trofeo Campionato, +8 fama, qualificazione Europa +2 ✓; stagione dopo con ENTRAMBE le coppe nei riquadri: sedicesimi di coppa di Spagna passati e sedicesimi europei giocati dopo la giornata 7 (Milan-Mallorca 3-1) ✓; rinnovo automatico del contratto fino al 2029 visibile in intestazione ✓. Build, lint, tsc e calibrazione verdi.

**Resta per chiudere M8** (parte 3): le panchine delle NAZIONALI oltre soglia di fama alta, col ciclo qualificazioni/torneo — è una modalità di gioco a sé e merita la sua sessione.

---

## Sessione 19 — 2026-08-20 — M8 parte 3: la panchina della NAZIONALE — M8 CHIUSA 🎮

**Obiettivo dichiarato:** l'ultimo pezzo di M8 — le federazioni chiamano oltre soglia di fama alta, ciclo qualificazioni + torneo (FRD §4.3, default esclusiva).

**Fatto:**
- **La chiamata della federazione**: a fine stagione, con fama ≥ 75, arriva l'offerta di una nazionale (le top — Spagna, Francia, Brasile… — solo da fama 88). Riquadro dedicato nell'esito di stagione; rompere il contratto col club costa i soliti 3 punti.
- **Il ciclo del CT** (compresso in una stagione, `src/carriera/nazionale.ts`): girone di qualificazione a 6 con **sorteggio a teste di serie** (al massimo un'altra big — la prima stesura pescava 4 top nello stesso girone: corretta), 10 date andata/ritorno; le prime 2 al **torneo internazionale a 16** a eliminazione diretta coi rigori seminati. Le squadre nazionali giocano coi convocati veri del DB e la crescita di carriera applicata.
- **Vista dedicata del CT** in SchermataCarriera: classifica girone, tabellone del torneo, cronaca completa delle partite della nazionale (pannello riusato: parate di Pickford e doppiette di Saka comprese), verdetto finale con le due strade — "Resta CT" (nuovo ciclo) o tornare ai club (offerte per fama, mercato estivo riaperto).
- **Verdetti**: campione +12 fama e trofeo in bacheca; finalista +4; eliminato +1; qualificazione fallita −6 e la federazione ti scarica. Mentre sei CT il mondo dei club avanza (crescita giocatori, scadenze, svincoli).
- Salvataggi a **versioneSchema 9**. Semplificazioni dichiarate in `docs/fama-e-crescita.md` (convocazioni fisse, tattica automatica, partite simulate).
- **Collaudo**: 8 cicli completi in Node con l'Argentina → 2 titoli, 2 finali, 3 eliminazioni, 1 fallimento (distribuzione credibile); nel browser il giro intero: chiamata della federazione ✓ → CT della Spagna, girone vinto davanti all'Italia ✓ → torneo (eliminati in semifinale dall'Inghilterra) ✓ → "Resta CT", secondo ciclo da finalista ✓ → rientro alla Juventus col mercato estivo aperto e prima giornata giocata ✓. Anche il ramo del fallimento verificato (−6, niente "Resta CT"). Build, lint, tsc e calibrazione verdi.

**M8 CHIUSA** — per il piano è il traguardo 🎮 **GIOCO COMPLETO (v1)**: carriera lunga con fama, fiducia, esoneri, coppe, Europa, crescita giocatori, panchine estere e nazionali. Collaudo di persona dello sviluppatore in sospeso come sempre.

**Prossima milestone:** M9 — Editor e squadre Legends (FRD §5.4).

---

## Sessione 20 — 2026-08-21 — Piano aggiornato + M9 sessione 1: l'editor del database

**Obiettivo dichiarato:** aggiornare il piano su decisione dello sviluppatore (M12 fuori perimetro; M11 = gioco completo e finito, con UI professionale e ciclo di vita save/game over) e aprire M9 con le fondamenta dell'editor (FRD §5.4).

**Piano aggiornato** (`piano-di-progetto-MISTER.md`):
- **M12 fuori perimetro**: resta descritto come estensione opzionale futura; il gioco è completo e finito con M11.
- **M10** ora include l'**approfondimento game over / restart / save / upload**: regole del fine carriera (da confermare col design: il FRD §4.4 esclude un fine forzato), restart e slot multipli, salvataggio manuale, caricamento da file.
- **M11 ridefinita**: "Rifinitura videogame" — riprogettazione visiva di TUTTE le schermate (design system, layout immersivi, transizioni: deve sembrare un videogame del 2026, non un database), più la verifica multi-nazione (l'espansione leghe è di fatto arrivata con M6-M8) e le rifiniture finali. Traguardo: 🎮 GIOCO COMPLETO E FINITO.

**Fatto (editor, sessione 1 di M9):**
- **Persistenza** (`src/db/persistenza.ts`): al salvataggio l'intero DB modificato va in IndexedDB; all'avvio l'app carica quello (se esiste) al posto di `public/mister.sqlite`; banner sempre visibile e "Ripristina il database originale". Le carriere in corso NON cambiano (FRD §5.4: fotografano il DB alla creazione).
- **Schermata Editor** (voce di menu finalmente attiva): ricerca per nome/club/ruolo/categoria (normale/icon/hero); scheda giocatore completa (anagrafica, categoria, potenziale, club, 12 attributi tecnici, set portiere, 7 di personalità; vuoto = NULL); **modifica di massa** (±N a un attributo per tutti i filtrati, limiti 1-99); **modifica club** (nome, fama, budget).
- **Collaudo end-to-end**: tiro di Vicari 27→95 salvato e ancora lì dopo la ricarica ✓; +5 velocità ai 4 attaccanti del Monza in un colpo ✓; Monza rinominato "AC Monza 1912" e persistito ✓; filtro Icon mostra le leggende (primo: Bobby Moore) ✓; ripristino → tiro di nuovo 27 ✓. Curiosità dal collaudo: il filtro testuale di Playwright inciampava sul Südtirol cercando "Tiro" — il bug era nel test, non nel gioco. Build, lint e tsc verdi.
- Decisioni in `docs/editor.md`.

**Prossima sessione:** M9 sessione 2 — wizard "Crea squadra Legend", creazione giocatori/club da zero, prime squadre Legends.

---

## Sessione 20-bis — 2026-08-21 — Coerenza carriera ↔ DB personalizzato + export/import

**Obiettivo dichiarato (richiesta esplicita):** garantire che una carriera creata su un DB personalizzato resti coerente coi salvataggi, e aggiungere l'export del DB personalizzato.

**Fatto:**
- **Impronta del database** scritta dentro il file (`PRAGMA user_version`): 0 = originale, numero casuale assegnato dall'editor al primo salvataggio; viaggia con export/import. Il modulo db espone `improntaDbCorrente()`.
- **Le carriere memorizzano l'impronta di nascita** (`dbImpronta`, versioneSchema 10, migrazione automatica con -1 = sconosciuta). Al caricamento, se il DB attuale è diverso, la schermata carriera mostra un avviso chiaro e actionable (ripristina l'originale / reimporta il file giusto). Coerente = nessun avviso.
- **⬇️ Esporta database (.sqlite)** dall'editor (nome file con l'impronta) e **⬆️ Importa da file** (diventa il DB personalizzato, reload automatico): backup e trasferimento su altri dispositivi. File non SQLite rifiutati con messaggio; DB corrotto in IndexedDB → l'app ripiega sull'originale senza rompersi (sonda in apertura).
- "Ripristina il database originale" ora chiede conferma ricordando l'export e l'effetto sulle carriere.
- **Collaudo end-to-end del giro completo**: modifica → DB personalizzato con impronta 511077876 → carriera nata con quell'impronta (nessun avviso) → export `mister-database-511077876.sqlite` (firma SQLite verificata) → ripristino originale → la carriera AVVISA ✓ → import del file → avviso sparito e tiro modificato ancora lì ✓ → file finto rifiutato ✓. Build, lint e tsc verdi.

---

## Sessione 21 — 2026-08-21 — M9 sessione 2: squadre Legend, wizard e amichevoli

**Obiettivo dichiarato:** il cuore di M9 — le prime squadre Legend, il wizard per crearle e le amichevoli per giocarle (DoD della milestone).

**Fatto:**
- **Tabelle dedicate** (`squadra_legend` + `rosa_legend`) fuori dalla tabella club: le Legend non toccano carriere, mercato e coppe. Create al volo se mancano (compatibile coi DB personalizzati esistenti).
- **4 squadre seminate** nel database (`npm run legends`, aggiunto anche alla pipeline `importa-dati`): Leggende d'Italia, d'Inghilterra, del Brasile e Stelle d'Europa — selezione con vincoli di reparto (1 POR, ≥5 DIF, ≥5 CEN, ≥3 ATT); dove una scuola non ha leggende in un ruolo (nessun POR italiano/inglese/brasiliano tra le Icon!) il buco è colmato dal bacino globale: l'Italia gioca con Yashin in porta — rifinibile col wizard.
- **Wizard "Crea squadra Legend"** nell'editor: nome, rosa pescata da Icon/Heroes con ricerca e filtro ruolo, contatori di reparto, validazione (≥16 giocatori e un portiere), modifica/eliminazione; persistenza col DB personalizzato (impronta inclusa).
- **Amichevole** (nuova voce di menu): qualunque squadra contro qualunque squadra — Legend contro Legend o contro i club di oggi; motore vero, cronaca e pagelle; il risultato non tocca le carriere.
- **Collaudo end-to-end**: le 4 seminate nel menu ✓; Brasile-Italia 1-2 con gol di Del Piero e Jairzinho, Baggio espulso, Del Piero 7.9 ✓; col wizard creata "I Miei Eroi" (17 giocatori, 2 POR) ✓; ancora lì dopo il reload ✓; "I Miei Eroi" 1-1 con l'Inter ✓. Build, lint, tsc e calibrazione verdi.

**DoD di M9** (crea da solo una squadra Legend e affrontala in amichevole): il flusso è collaudato end-to-end; la prova "senza aiuto" dello sviluppatore resta in sospeso col solito debito da Mac.

**Resta di M9:** creazione giocatori/club da zero, import/export JSON, torneo fantasy / Legend nel campionato.

---

## Sessione 22 — 2026-08-21 — M9 COMPLETATA: creazione da zero, JSON, torneo fantasy, Legend nel campionato

**Obiettivo dichiarato:** chiudere M9 coi quattro pezzi rimasti.

**Fatto:**
- **Nuovo giocatore da zero** (nasce neutro a 60 e si compila nella scheda) e **nuovo club** nel campionato scelto; dalla scheda club ora si può anche spostare un club tra i campionati. Il calendario gestiva già i numeri dispari col turno di riposo — collaudato davvero: Serie B a 21 squadre, 42 giornate.
- **Export/Import JSON** (FRD §5.4): club, giocatori e squadre Legend in un file leggibile; l'import riapplica per id (upsert) e ricostruisce le squadre Legend. Round-trip collaudato: 6.018 giocatori, 199 club, 4 squadre.
- **Torneo fantasy** nella schermata Amichevole: 4 o 8 squadre (Legend e/o club), eliminazione diretta, tabellone in un colpo.
- **Legend nel campionato** (FRD §5.3, opzione alla creazione carriera): entra in seconda divisione al posto del club più debole (mai il tuo); il sostituito resta nel mondo del mercato (nazioneId sentinella). Le leggende sono **fuori dal tempo**: escluse da crescita/declino (date di nascita storiche).
- **Collaudo end-to-end**: "Nuovo Fenomeno" creato e cercabile ✓; "Real Collaudo" creato in Serie B ✓; JSON esportato → ripristino originale (Fenomeno sparito) → import → Fenomeno tornato ✓; torneo fantasy a 4 vinto dalle Leggende d'Italia ✓; carriera con le Leggende d'Italia in Serie B (forza 77, 15 giocatori; il sostituito, ironia, era proprio il debole Real Collaudo) → prima giornata: le Leggende in vetta con un 5-0 ✓. Build, lint, tsc, calibrazione e test tattiche verdi.

**M9 CHIUSA.** Il DoD (creare una squadra Legend senza aiuto e affrontarla in amichevole) resta da esercitare di persona col solito debito da Mac. Prossima milestone: **M10 — salvataggi portabili e ciclo di vita** (file .mister, game over/restart/slot, upload).

---

## Sessione 23 — 2026-08-21 — Le leggende nel mercato come free agent (richiesta esplicita)

**Obiettivo dichiarato:** opzione di carriera per far entrare le leggende nel mercato come SINGOLI free agent (non squadre), dalla stagione scelta, con ingaggio guidato dalla prospettiva del progetto e ritiro dopo 5 stagioni.

**Fatto:**
- **Opzione alla creazione carriera**: "Leggende nel mercato come free agent?" — No / da subito / dopo la 1ª / 2ª / 3ª stagione. Entrano alla PRIMA finestra estiva della stagione scelta (`src/carriera/leggende.ts`, agganciato a creazione, fine stagione e rientro dalla nazionale), con notiziona dedicata.
- **Free agent veri**: niente cartellino (sono svincolati), ma stipendio atteso "da leggenda" (curva del valore sulla media, senza lo sconto dell'età anagrafica: Sawa media 88 → 5,9M/anno).
- **Il progetto decide** (`punteggioInteresse`, ramo dedicato alle leggende): forza del club, palcoscenico (la B vale −10), reputazione dell'allenatore, promessa di progetto a peso doppio; il denaro è solo "rispetto del nome" (±poco). L'IA non le ingaggia (dichiarato): aspettano il TUO progetto.
- **Ritiro dopo 5 stagioni** dall'ingresso, ovunque siano (anche dalla tua rosa), a prescindere dall'età: rimossi da rose/svincolati/contratti/prestiti/promesse, notizia, e registro `carriera.ritirati` (id, nome, anno) — la base per la gestione del post-ritiro in arrivo. Salvataggi a **versioneSchema 11**.
- **Collaudo end-to-end**: opzione "dopo la 1ª stagione" → alla creazione zero svincolati ✓; nell'estate della stagione 2 entrano le 166 leggende (⭐ in lista) ✓; dialogo con Homare Sawa: fattori del progetto in chiaro, interesse 47 dalla Serie B → la firma arriva SOLO con la promessa di progetto (62) ✓; ritiro forzato a +5 stagioni: tutte via (una dalla mia rosa), 166 nel registro ritirati, notizia col conteggio ✓. Build, lint, tsc e calibrazione verdi.

---

## Sessione 23-bis — 2026-08-21 — Le leggende nel mercato IA (richiesta esplicita)

**Obiettivo dichiarato:** anche i club IA (di tutti i campionati europei) ingaggiano le leggende free agent; sotto contratto valgono un cartellino da trattare col club; a scadenza tornano free agent; niente convocazioni in nazionale.

**Fatto:**
- **Il "colpo da leggenda"** (`giornoDiMercato`): ogni giorno di finestra, 0-2 grandi club europei (forza ≥ 74: serve un progetto, come per l'utente) possono ingaggiare una leggenda free agent, con notizia dedicata. Il contratto è vero: stipendio da leggenda (atteso da svincolato ×1.15), scadenza 2-4 anni.
- **Cartellino da leggenda**: `valoreMercato` ha un ramo per le leggende — il valore segue il NOME (curva pura della media, senza premio giovani né sconto veterani: l'età anagrafica è storica). Strappare una leggenda a un club passa dalla normale trattativa a 5 leve sul cartellino, poi dal dialogo col giocatore (fattori del progetto).
- **A scadenza tornano free agent**: `fineStagioneMercato` non rinnova mai le leggende dei club IA (i giocatori normali importanti sì) — il ciclo free agent → contratto → free agent continua fino al ritiro dei 5 anni.
- **Nazionali**: verificato sul DB — zero leggende nelle convocazioni (vale per costruzione, ora dichiarato nei documenti).
- **Collaudo end-to-end**: finestra estiva → colpi IA ("Bobby Moore da svincolato alla Juventus a parametro zero", contratto 1,7M fino al 2028) ✓; Moore cercato nel mercato: cartellino 43M ✅ e trattativa col club apribile ✓; contratto portato a scadenza → di nuovo tra gli svincolati (nessun rinnovo IA) ✓. Build, lint, tsc verdi.

---

## Sessione 24 — 2026-08-21 — Ritiri per età e giocatori RIGENERATI (richiesta esplicita)

**Obiettivo dichiarato:** un giocatore normale che si ritira rientra nel mercato dopo una stagione di pausa come versione identica ma SEDICENNE, con il potenziale per ridiventare il campione che era e abilità (quindi ambizioni, stipendio, valore) proporzionate all'età nuova. Il rigenerato è un free agent con stipendio iniziale.

**Fatto:**
- **Ritiro per età dei normali** (`src/carriera/ritiri.ts`, agganciato a fine stagione nei club e nel ciclo del CT): certo a 38+, probabile dai 35 (25/50/75%), sempre per uno svincolato di 35+. Deterministico col seme. Il ritirato sparisce da rose/svincolati/contratti/prestiti/promesse e finisce nel registro `ritirati` col suo **picco** (media al ritiro, crescita inclusa). Notizia aggregata con l'evidenza dei ritirati della TUA rosa.
- **La rinascita, una stagione dopo**: identità nuova in `carriera.rinati` (anno di nascita = 16 anni, **potenziale = picco**), applicata in lettura da `applicaCrescita` come la crescita — il DB non si tocca mai. Le abilità partono da media ≈ picco − 22 (minimo 35) con un delta in `carriera.crescita`; stipendio e valore si adeguano da soli (età + media da ragazzo → `stipendioAttesoSvincolato` basso). Si rinasce UNA volta sola; le leggende non rinascono.
- **Correzione al fondo del declino** in `crescita.ts`: il tetto −12 non deve "risucchiare in su" un rigenerato che parte da −24 — ora il fondo è `min(−12, delta attuale)` e la risalita è graduale.
- Salvataggi a **versioneSchema 12** (migrazione v11→12).
- **Collaudo end-to-end** (2 script Playwright, profilo persistente): stagione 1 chiusa → 206 ritirati normali col picco, notizia, rimossi ovunque, zero rinascite immediate ✓; stagione 2 chiusa → tutti e 206 rinati: Modrić 16enne, potenziale 74 (= picco), free agent, delta −24, notizia "RIGENERATI", flag anti-doppia-rinascita ✓; stagione 3 → il delta sale di +2 (niente salto a −12) e il 17enne resta in circolazione (niente ri-ritiro dalla data del DB) ✓. Build, lint, tsc e calibrazione verdi.

**Debito personale (senza Mac):** vedere un rigenerato in gioco e provare a ingaggiarlo di persona.

---

## Sessione 24-bis — 2026-08-21 — Il picco è l'APICE della carriera (correzione richiesta)

**Obiettivo dichiarato:** il potenziale del rigenerato non è la media al momento del ritiro (già erosa dal declino), ma la media più alta MAI raggiunta in carriera — Modrić all'apice valeva 88, al ritiro 78: il rigenerato deve avere potenziale 88.

**Fatto:**
- Nuovo registro `carriera.crescitaMassima` (giocatore → il delta di crescita più alto mai toccato, solo se positivo), aggiornato dalla crescita di fine stagione. Al ritiro il **picco = media di fabbrica del DB + massimo storico**: l'apice, comunque sia andato il declino. Per chi parte già anziano nel DB (Modrić 39enne) il picco è la sua media di partenza, non quella declinata dal gioco.
- Salvataggi a **versioneSchema 13** (migrazione v12→13).
- **Collaudo end-to-end rifatto**: Modrić cala di −2 in stagione ma il picco registrato è 76 (l'apice), non 74; rinasce 16enne con potenziale 76 e delta di rinascita ESATTAMENTE −22 (= media di fabbrica − 22, la formula verificata al punto); il registro dei massimi si popola con 1.987 voci positive (i giovani cresciuti) ✓; terza stagione: risalita graduale +3, niente salto a −12, niente ri-ritiro ✓. Build, lint, tsc e calibrazione verdi.

---

## Sessione 24-ter — 2026-08-21 — Semplificazione: il potenziale del rigenerato è quello del DB

**Obiettivo dichiarato:** semplificare — il valore che conta per il rigenerato è il POTENZIALE del DB. Per i campioni over 30 il DB conserva il potenziale alto (verificato sui dati veri: Modrić 83 con valore attuale 76, Salah 91, Lewandowski 88, Messi 86); un over 30 non cresce più verso il potenziale (già così nel motore: dai 29 anni niente crescita), quindi nella carriera "vecchia" non lo raggiungerà mai — ma il rigenerato 16enne riparte con valori bassi e può crescere fino al potenziale pieno.

**Fatto:**
- **Eliminato il registro `crescitaMassima`** della 24-bis (mai rilasciato): il potenziale del rigenerato non si ricostruisce più dal picco osservato, si legge dal DB. `carriera.rinati` ora contiene solo l'anno di nascita nuovo; il potenziale visto dal gioco resta quello del DB (che è anche editabile nell'editor: alzarlo cambia il futuro del rigenerato).
- Media di partenza del sedicenne = **potenziale DB − 22** (minimo 35). Modrić: fabbrica 76, potenziale 83, si ritira a 74 → rinasce con media 61 e può salire fino a 83, oltre il 76 della carriera precedente. `picco` nel registro ritirati resta come dato informativo (media al ritiro).
- versioneSchema resta 13 (migrazione v12→13 ora è un semplice avanzamento).
- **Nuovo test CLI** (`tsx` sui moduli veri e sul DB vero): Modrić ritirato e rinato — età 16 ✓, potenziale visto dal gioco 83 ✓, delta −15 esatto ✓, media 61 = target ✓, free agent ✓. Collaudo E2E Playwright rifatto: 208 ritirati, 208 rinati, identità = solo anno di nascita ✓, crescita graduale +2 senza risucchi ✓. Build, lint, tsc e calibrazione verdi.

**In lista (2026-08-21):** curve di crescita/declino personalizzate dalla personalità del giocatore (professionalità, ambizione) — annotata tra le attività di M11 nel piano.

---

## Sessione 25 — 2026-08-21 — M10 (nucleo): file .mister, copie manuali, regole di game over/restart

**Obiettivo dichiarato:** il cuore di M10 — la carriera come singolo file portabile `.mister` (col DB personalizzato incluso quando serve), il salvataggio manuale a copie, e le regole documentate del ciclo di vita (game over/restart).

**Fatto:**
- **File `.mister`** (`src/carriera/portabile.ts`): JSON con tipo, formato, la carriera completa e — se la carriera è nata con un DB personalizzato — il database intero in base64. L'import passa dalle STESSE migrazioni dei salvataggi (un file esportato oggi si aprirà nelle versioni future) e crea sempre un nuovo slot: mai sovrascrivere (id già occupato → id nuovo).
- **Import col DB incluso**: se la carriera è nata con un DB personalizzato diverso da quello attivo e il file lo contiene, il gioco offre di installarlo (conferma + ricarica). Rifiutando si gioca comunque, con l'avviso di incoerenza già esistente.
- **Copie manuali**: "💾 Copia di sicurezza" nella schermata carriera e "Duplica" nella lista — nuovo slot con etichetta 📌 (`nomeSlot`, campo facoltativo: niente migrazione). Il salvataggio resta automatico a ogni azione; la copia congela un momento.
- **Elimina con conferma** (prima cancellava al primo click!) e lista slot arricchita (CT, DB personalizzato, etichetta).
- **Regole di design documentate** (`docs/salvataggi.md`): NIENTE game over forzato (FRD §4.4) — esonero con offerte dal fondo, offerta di casa garantita, rinnovo sempre; restart = nuova carriera o ritorno a una copia; formato .mister e coerenza DB.
- **Collaudo end-to-end**: DB personalizzato creato dall'editor → carriera con impronta 29999045 → copia di sicurezza (2 slot) → export .mister (DB incluso, 1.5MB base64) → eliminati gli slot e ripristinato il DB originale → import: carriera tornata con lo stesso id, DB installato, NESSUN avviso di incoerenza → re-import: secondo slot con id diverso ✓. Build, lint e tsc verdi (motore non toccato).

**Resta di M10:** packaging Tauri (app macOS) e guida alla sincronizzazione cloud.

---

## Sessione 26 — 2026-08-21 — M10 completata: app macOS (Tauri) e guida cloud

**Obiettivo dichiarato:** completare M10 — il packaging Tauri per l'app macOS nativa e la guida alla sincronizzazione via cloud.

**Fatto:**
- **Scaffolding Tauri v2 completo** (`src-tauri/`): configurazione (finestra 1320×900, bundle app+dmg), involucro Rust minimo con i plugin `dialog` e `fs`, permessi (capabilities) per la finestra "Salva con nome" e la scrittura nelle cartelle personali, icone generate (campo verde con la M: png, icns per macOS, ico). Script npm: `tauri:dev` e `tauri:build`.
- **Salvataggio file consapevole dell'ambiente** (`src/scarica.ts`): nel browser il solito download; dentro l'app nativa la WebView di macOS non gestisce i download, quindi si apre la vera finestra "Salva con nome" e si scrive il file col plugin fs. I tre punti di export (carriera .mister, database .sqlite, database JSON) ora passano tutti da qui.
- **Guida passo passo** (`docs/tauri-e-cloud.md`): preparare il Mac (Xcode CLT + Rust), `npm run tauri:dev`, `npm run tauri:build`, dove finisce l'app, l'avviso di macOS sulle app non firmate, dove stanno i salvataggi nativi (separati da quelli del browser!), e la sincronizzazione cloud coi file .mister ("una copia di lavoro alla volta").
- **Verifiche**: build/lint/tsc verdi; collaudo E2E .mister rieseguito dopo il refactor (tutto ok); la parte Rust è stata verificata davvero: `cargo check` completato SENZA errori nell'ambiente remoto (librerie GUI installate apposta) — compila l'involucro nativo e, con la generazione del contesto, valida anche tauri.conf.json e le capabilities. Su Mac resta solo la build vera.

**M10 CHIUSA** (con debito da Mac: `npm run tauri:dev` di persona, export con "Salva con nome" nativa, e il DoD del giro browser→altro dispositivo via .mister). Prossima milestone: **M11 — rifinitura "videogame"**.

---

## Sessione 27 — 2026-08-21 — M11 parte 1: il design system "videogame"

**Obiettivo dichiarato:** la prima parte di M11 — trasformare l'aspetto "da grande database" in quello di un videogame del 2026, restando sul tema chiaro grigio scelto all'inizio.

**Fatto:**
- **Design system in index.css**: tutti gli stili ora partono da token (scala di verdi del calcio, oro per le leggende, tre livelli di ombra, raggi e transizioni uniformi). Siccome l'app usava già classi condivise, il restyling ha investito TUTTE le schermate in un colpo solo.
- **Tipografia vera**: Inter per i testi, Outfit per i titoli — font variabili impacchettati nell'app (niente rete, funzionerà anche nell'app nativa).
- **Schermata titolo da videogame**: logo con gradiente verde-nero, bandierina tricolore sotto il sottotitolo, cerchio di centrocampo in filigrana, voci del menu con icona, banda verde laterale e ingresso animato in sequenza.
- **Componenti "da gioco"**: bottoni con gradiente/ombra/sollevamento al passaggio, linguette a pillola stile console, tabelle con angoli morbidi e intestazioni curate, riga della mia squadra con bordo-bandiera, barra di navigazione sticky con sfocatura, animazione d'ingresso per ogni schermata, fuoco da tastiera uniforme e rispetto di prefers-reduced-motion.
- **Ritocchi**: icone nel menu del titolo, versione in calce aggiornata (era ferma a "M2"!), lista salvataggi a tutta larghezza coi bottoni allineati.
- **Collaudo visivo**: screenshot Playwright di titolo, carriera, mercato, tattica, lista salvataggi e Match Day — giudicati e corretti (il difetto della lista slot è emerso proprio così). Build, lint e tsc verdi.

**Resta di M11:** la cura "di scena" di Match Day/trattativa/spogliatoio (momenti da regia), la verifica multi-nazione con ricalibrazione, le nazionalità in italiano, e le curve di crescita personali annotate in lista.

---

## Sessione 28 — 2026-08-21 — M11: arriva la direzione artistica "Almanacco" (DESIGN-MISTER.md)

**Obiettivo dichiarato:** lo sviluppatore ha bocciato lo stile della sessione 27 e ha fornito DESIGN-MISTER.md (stile "Almanacco": retrò anni '90 su carta, bordi netti, ombre dure, colori pieni da stampa). Applicare il processo del §7: token + Figurina come campione di stile, da approvare PRIMA di propagare.

**Fatto:**
- **`src/design/tokens.css`** (§7 punto 1): tutti i token del documento — carta/inchiostro (§2.1), accenti saturi (§2.2), colori dinamici del club (§2.3), scala a 5 fasce coi numeroni (§2.4), tipografia (§3: Archivo Black, Oswald, Inter, Press Start 2P, IBM Plex Mono — impacchettati, niente rete), bordo vivo/ombra dura/raggio max (§4.1), retini di stampa, bottone almanacco. Il progetto non usa Tailwind: le CSS variables sono la mappatura completa.
- **La FIGURINA** (§4.2, componente eroe in `src/design/Figurina.tsx`): cornice spessa nei colori sociali (oro per le leggende), banda del nome su inchiostro, numero di maglia gigante, medaglione della media, badge ruolo pieno d'inchiostro, barre attributi squadrate che si riempiono A SCATTI (§5), marchio MISTER in font pixel.
- **Ritratto pixel art procedurale** (`pixelart.tsx`): volto 12×14 generato dal seed del giocatore (carnagione, capigliatura, barba) con maglia nei colori e nel motivo del club (tinta unita/palato/fascia/metà). Stesso giocatore, stessa faccia, per sempre.
- **Colori sociali procedurali** (`colori-club.ts`): il DB non ha ancora le colonne dei colori — ogni club pesca una maglia stabile da una palette di 12 maglie classiche (annotato: quando i colori veri entreranno nel DB, si leggeranno da lì). Numero di maglia tipico del ruolo, deterministico.
- **Scheda Giocatore rifatta come schermata eroe**: figurina "attaccata storta" su pagina di carta col retino, pannello d'almanacco a fianco (squadra, nazionale, contratto).
- **Giro di critica su screenshot** (§0.4): trovato e corretto il badge ruolo illeggibile coi colori sociali chiari (ora sempre inchiostro). Verificati portiere, leggenda (cornice oro, ★ HERO) e fasce colore.
- Build, lint, tsc verdi. Lo stile della sessione 27 resta sulle altre schermate FINCHÉ la Figurina non è approvata: poi la propagazione lo sostituirà (metodo del campione, §0.3).

**In attesa:** l'approvazione dello sviluppatore sulla Figurina (§7 punto 2). Poi: Match Day (§4.5), quindi propagazione schermata per schermata (§6). Annotato: nessuna skill di frontend design disponibile nella sessione — il documento stesso ha fatto da brief vincolante.
