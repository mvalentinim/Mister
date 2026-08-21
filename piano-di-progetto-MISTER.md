# Piano di Progetto a Milestone
## Progetto "MISTER" — Manageriale calcistico web

**Versione:** 1.0 — Agosto 2026
**Documento gemello:** `requisiti-funzionali-MISTER.md` (FRD)
**Team:** 1 sviluppatore principiante + Claude Code

---

## 0. METODO DI LAVORO (leggere prima di iniziare)

### 0.1 Regole del progetto
1. **Una milestone alla volta, in ordine.** Non si inizia la successiva finché la "Definition of Done" (DoD) della corrente non è verificata dallo sviluppatore di persona.
2. **Ogni milestone finisce con qualcosa che si vede e si prova.** Mai settimane di codice invisibile.
3. **Sessioni brevi e chiuse.** Una sessione di lavoro = un obiettivo dichiarato all'inizio + `DIARIO.md` aggiornato alla fine + un commit git. Claude Code apre ogni sessione riepilogando lo stato e propone l'obiettivo.
4. **Le stime sono in "sessioni"** (una sessione ≈ 2–3 ore di lavoro con Claude Code). Sono indicative: la qualità batte la velocità.
5. **Priorità assoluta: arrivare giocabili presto.** Le milestone M0–M3 sono progettate per avere una carriera giocabile (anche se grezza) il prima possibile; tutto il resto arricchisce un gioco che già gira.
6. Quando una milestone coinvolge una **🔗 RISORSA ESTERNA**, Claude Code applica il protocollo del §0.2 del FRD: spiega → guida → importa → verifica insieme.

### 0.2 Struttura del repository (creata in M0)
```
mister/
├── docs/            → decisioni tecniche spiegate (match-engine.md, dati.md...)
├── data/            → database statico e script di importazione
├── src/             → codice dell'app (React + motori)
├── DIARIO.md        → log delle sessioni
├── IDEE-FUTURE.md   → idee fuori scope annotate
└── README.md        → come avviare il progetto
```

---

## M0 — FONDAMENTA (≈ 2 sessioni)
**Obiettivo:** ambiente pronto e prima pagina dell'app visibile nel browser.

Attività:
- Installazione guidata: Homebrew, Node.js, git, editor (VS Code) sul MacBook. Claude Code spiega ogni strumento.
- Creazione progetto TypeScript + React + Vite; struttura repository §0.2.
- Git inizializzato, primo commit, spiegazione del flusso base (stato → commit → storia).
- Pagina iniziale "MISTER" con menu finto (Nuova carriera / Carica / Editor).

**🔗 Risorse esterne:** librerie npm dello stack (riga 11 tabella FRD §14).

**DoD:** lo sviluppatore, da solo, sa: avviare l'app con un comando, vederla nel browser, fare una modifica banale a un testo e vederla apparire, fare un commit.

---

## M1 — DATABASE E DATI REALI: ITALIA (≈ 4–6 sessioni)
**Obiettivo:** database con Serie A e Serie B reali, sfogliabile nell'app.

Attività:
- Implementazione dello schema dati del FRD §5.1 su SQLite (sql.js/wa-sqlite). Claude Code spiega cos'è un database e come si interroga.
- **Pipeline di importazione**: valutazione fonti aperte disponibili oggi, scelta, script di import per club e rose di Serie A e B con mappatura attributi alla scala 1–99. Documentazione in `docs/dati.md`.
- Schermate di consultazione: elenco squadre, rosa con tabella ordinabile/filtrabile, scheda giocatore.

**🔗 Risorse esterne:** openfootball / Kaggle / football-data.org (righe 2–4 tabella FRD §14). Milestone ad alta densità di protocollo risorse esterne.

**DoD:** l'app mostra tutte le squadre di A e B con rose complete e attributi plausibili; lo sviluppatore ha eseguito lui stesso lo script di import e sa rilanciarlo; una query di verifica conta i giocatori e non trova duplicati.

---

## M2 — CARRIERA MINIMA GIOCABILE (≈ 4–5 sessioni)
**Obiettivo:** il primo "giro" completo: dalla scelta della nazione alla fine di una stagione. È la milestone che trasforma il progetto in un gioco.

Attività:
- Flusso nuova carriera: nazione → profilo allenatore → 3–5 offerte da club di Serie B (budget, obiettivi) → accettazione.
- Calendario reale del campionato, avanzamento a giornate.
- Risultati generati da un **simulatore provvisorio ultra-semplice** (basato sulla forza media delle rose): serve solo a far girare la stagione, sarà sostituito in M3.
- Classifica, risultati, promozioni/retrocessioni a fine stagione, passaggio alla stagione successiva (senza mercato: rose congelate).
- Salvataggio locale automatico della carriera (base, IndexedDB).

**DoD:** lo sviluppatore gioca una stagione intera di Serie B dall'inizio alla fine, vede la classifica evolvere, viene promosso o no, e ritrova la carriera riaprendo il browser.

---

## M3 — MOTORE DI SIMULAZIONE v1 (≈ 5–7 sessioni)
**Obiettivo:** sostituire il simulatore provvisorio con il motore a eventi vero (FRD §9.7).

Attività:
- Studio guidato dei riferimenti (ESMS, Bygfoot, Dixon-Coles): Claude Code spiega cosa si impara da ciascuno; progetto documentato in `docs/match-engine.md`.
- Motore a eventi deterministico con seed: azioni generate da confronto reparti + attributi + forma; produce flusso eventi, statistiche, marcatori, voti.
- Calibrazione: simulazione automatica di intere stagioni IA-vs-IA; confronto distribuzioni di gol/risultati con quelle reali; aggiustamento parametri.
- Integrazione nella carriera: cronaca testuale minima post-partita (elenco eventi) in attesa del Match Day visuale (M5).

**🔗 Risorse esterne:** ESMS, Bygfoot, Dixon-Coles (righe 5–7 tabella FRD §14).

**DoD:** i risultati di una stagione simulata sono credibili (niente 9-7, capolista con punti realistici); stesso seed = stessa partita; esiste un test automatico di calibrazione che lo sviluppatore sa lanciare e leggere.

---

## M4 — TATTICHE E MOVIMENTI PREVALENTI (≈ 4–5 sessioni)
**Obiettivo:** la schermata tattica completa e il suo effetto reale sulle partite.

Attività:
- Schermata Tattica: scelta modulo, trascinamento giocatori, istruzioni di squadra (4–5 regolazioni).
- **Movimenti prevalenti** (FRD §8.2): vocabolario per ruolo, default per modulo, personalizzazione max 2+2, frecce sul campo tattico.
- Integrazione nel motore: i movimenti e l'idoneità del giocatore (attributi chiave) modificano la generazione delle azioni.
- Gestione rosa: titolari/panchina, sostituzioni pre-partita.

**DoD:** cambiare modulo, movimenti e uomini produce differenze misurabili e spiegabili nelle partite simulate (test comparativo su N partite con tattiche opposte); le frecce riflettono i movimenti scelti.

---

## M5 — MATCH DAY VISUALE (≈ 5–7 sessioni)
**Obiettivo:** l'esperienza partita del FRD §9: campo schematico, velocità, telecronaca ibrida, pagelle live.

Attività:
- Renderer 2D (Canvas/Pixi.js): campo, gettoni giocatori, palla in movimento, guidati dal flusso di eventi/posizioni del motore.
- Controlli 1x/2x/3x/5x + pausa; cambi e regolazioni tattiche durante la partita.
- Telecronaca ibrida: su azione importante la vista passa al racconto testuale a scambi fino all'esito, poi torna al campo. Template procedurali vari e in italiano.
- Pagelle live e indicatori di coinvolgimento; a fine partita highlights testuali + statistiche complete.

**DoD:** lo sviluppatore guarda una sua partita dall'inizio alla fine, cambia velocità, fa una sostituzione all'intervallo, legge la telecronaca di un gol e a fine gara rilegge gli highlights con le pagelle.

---

## M6 — MERCATO: CLUB ↔ CLUB E IA DEI CLUB (≈ 6–8 sessioni)
**Obiettivo:** le finestre di mercato con trattative strutturate e club IA credibili (FRD §6.1–6.2).

Attività:
- Valore di mercato dinamico; budget mercato e stipendi operativi.
- Trattativa club-club in max 2–3 round con le 5 leve (prezzo, bonus, scadenza, prestiti con diritto/obbligo, contropartite); rifiuti sempre motivati.
- IA dei club: analisi rosa, ruoli scoperti, personalità economica; i club IA comprano e vendono tra loro.
- Finestre estiva/invernale nel calendario; svincolati; notizie e rumor procedurali.
- Contratti giocatore basilari (stipendio, scadenza) con rinnovo semplice — la trattativa conversazionale arriva in M7.

**DoD:** in una sessione di mercato lo sviluppatore compra un giocatore usando una contropartita tecnica e ne cede uno in prestito con diritto; a fine finestra il notiziario mostra trasferimenti IA sensati (i club hanno coperto ruoli realmente scoperti).

---

## M7 — TRATTATIVA CONVERSAZIONALE E COMPORTAMENTO GIOCATORI (≈ 5–7 sessioni)
**Obiettivo:** la firma del giocatore come dialogo (FRD §6.3) + morale e promesse (FRD §7).

Attività:
- **Cervello deterministico**: punteggio di interesse (personalità, età, prestigio, fama allenatore, minutaggio prevedibile, offerta economica).
- **Configurazione API Anthropic** con protocollo risorse esterne (chiave, .env, costi, sicurezza).
- Dialogo LLM: interpretazione del giocatore, estrazione delle leve dal discorso libero, riepilogo strutturato sempre visibile, max 2–3 round.
- **Registro delle promesse** con verifica automatica nel tempo e conseguenze su morale, fiducia e fama.
- Morale e reazioni: messaggi dei giocatori (spazio, cessione, felicità), effetti su rendimento.
- **Fallback offline** a dialoghi strutturati a scelta multipla.

**🔗 Risorse esterne:** chiave API Anthropic (riga 1 tabella FRD §14).

**DoD:** lo sviluppatore convince un giocatore promettendogli la titolarità, poi lo lascia in panchina per un mese e osserva le conseguenze (morale, richiesta di chiarimento, danno reputazionale); la stessa trattativa funziona anche in modalità offline.

---

## M8 — FAMA, OBIETTIVI, CARRIERA LUNGA (≈ 4–6 sessioni)
**Obiettivo:** chiudere il loop di carriera del FRD §4: la scalata.

Attività:
- Sistema di fama con soglie; fiducia della dirigenza; esoneri; offerte di fine stagione (e in corsa) da club di fascia superiore.
- Valutazione obiettivi contrattuali a fine stagione con effetti su fama e rinnovo.
- Crescita/declino dei giocatori tra stagioni; passaggio stagione completo (scadenze contratti, aggiornamento valori).
- Coppa nazionale; competizioni continentali per club in forma semplificata; panchine delle nazionali oltre soglia di fama alta con ciclo qualificazioni/torneo.

**DoD:** lo sviluppatore gioca 3+ stagioni consecutive: parte in B, viene promosso, riceve e valuta offerte migliori, e vede la fama sbloccare fasce nuove; un fallimento clamoroso porta all'esonero.

---

## M9 — EDITOR E SQUADRE LEGENDS (≈ 4–5 sessioni)
**Obiettivo:** l'editor del FRD §5.4 e le prime Legends.

Attività:
- Editor CRUD user-friendly: nazioni, competizioni, club, giocatori; ricerca, filtri, modifica di massa; import/export JSON.
- Wizard "Crea squadra Legend"; flag legend nel database.
- Creazione insieme delle prime 3–5 squadre Legends (le altre le farà lo sviluppatore in autonomia con l'editor: è il test definitivo di usabilità).
- Modalità d'uso: amichevoli, torneo fantasy, inserimento nel campionato.

**DoD:** lo sviluppatore crea da solo una squadra Legend completa senza aiuto e la affronta in amichevole.

---

## M10 — SALVATAGGI PORTABILI E CICLO DI VITA DELLA CARRIERA (≈ 3–4 sessioni)
**Obiettivo:** persistenza definitiva del FRD §11 + le regole del ciclo di vita del gioco.

Attività:
- **Approfondimento game over / restart / save / upload** *(aggiunto il 2026-08-21)*: progettare e implementare con chiarezza — quando (e se) esiste un "game over" (es. fama a zero e nessuna offerta? il FRD §4.4 esclude un fine forzato: da confermare col design); ricominciare una carriera (restart) e gestire più carriere in parallelo (slot); salvataggio manuale oltre all'automatico; caricamento/upload di salvataggi da file.
- Esportazione/importazione carriera come singolo file `.mister` con versione schema e migrazioni.
- Gestione differenze DB statico ↔ carriera (avvisi chiari).
- Packaging **Tauri**: app macOS nativa con salvataggi su file system; build spiegata passo passo.
- Guida sincronizzazione via cartella cloud dell'utente.

**DoD:** lo sviluppatore esporta una carriera dal browser, la importa su un altro browser/dispositivo e continua a giocare senza perdere nulla; le regole di game over/restart sono documentate e collaudate.

---

## M11 — RIFINITURA "VIDEOGAME": UI PROFESSIONALE E GIOCO FINITO (≈ 4–6 sessioni)
**Obiettivo:** *(ridefinita il 2026-08-21)* — il traguardo finale: MISTER deve **sembrare un videogame del 2026, non un grande database**. Con la chiusura di M11 il gioco è COMPLETO E FINITO.

Attività:
- **Riprogettazione visiva di tutte le schermate**: design system coerente (tipografia, colori, spaziature, componenti), layout da videogame (schermate immersive, non tabelle), transizioni e micro-animazioni, feedback visivi, icone/stemmi, cura di Match Day, mercato, trattativa e Spogliatoio come momenti "di scena".
- Verifica finale multi-nazione (l'espansione delle leghe è di fatto arrivata con M6-M8: mercato mondiale e panchine estere): regole nazionali rifinite dove serve, ricalibrazione del motore sulle 10 leghe.
- Rifiniture di coerenza (es. nomi delle nazionalità in italiano), collaudo complessivo del gioco.

**DoD:** lo sviluppatore attraversa tutte le schermate e le giudica all'altezza di un videogame moderno; una carriera completa gira in qualunque nazione senza stonature.

---

## M12 — MATCH ENGINE INTERATTIVO STILE SWOS (FUORI PERIMETRO — OPZIONALE)
*(aggiornato il 2026-08-21: su decisione dello sviluppatore, M12 esce dal perimetro del progetto. Il gioco si considera completo e finito con M11. Questa milestone resta descritta qui come possibile estensione futura, se e quando lo sviluppatore vorrà.)*

**Obiettivo:** la partita giocabile del FRD §10. Milestone volutamente ultima: arricchisce un gioco già completo.

Attività:
- Studio guidato riferimenti (Phaser 3, cloni SWOS, Google Research Football).
- Campo, fisica di palla arcade, controlli tastiera/gamepad.
- IA compagni/avversari: steering behaviors + macchina a stati, guidata da attributi, tattiche e movimenti prevalenti.
- Scelta pre-partita "Simula o Gioca"; risultato integrato nella carriera.
- **Test di coerenza statistica** tra i due motori (FRD §10.1).

**🔗 Risorse esterne:** righe 8–10 tabella FRD §14.

**DoD:** lo sviluppatore gioca una partita di campionato con la propria squadra, i compagni IA seguono i movimenti prevalenti impostati, e il test di coerenza tra motori passa.

---

## RIEPILOGO E TRAGUARDI INTERMEDI

| Milestone | Sessioni stimate | Traguardo |
|---|---|---|
| M0 Fondamenta | 2 | App visibile nel browser |
| M1 Database Italia | 4–6 | Rose reali sfogliabili |
| M2 Carriera minima | 4–5 | 🎮 **PRIMA VERSIONE GIOCABILE** |
| M3 Motore simulazione | 5–7 | Risultati credibili |
| M4 Tattiche e movimenti | 4–5 | La tattica conta |
| M5 Match Day visuale | 5–7 | 🎮 **IL GIOCO "SI VEDE"** |
| M6 Mercato club-club | 6–8 | Mercato vivo |
| M7 Trattativa LLM | 5–7 | 🎮 **L'ESPERIENZA DISTINTIVA** |
| M8 Fama e carriera lunga | 4–6 | 🎮 **GIOCO COMPLETO (v1)** |
| M9 Editor e Legends | 4–5 | Contenuti tuoi |
| M10 Salvataggi e ciclo di vita | 3–4 | Portabilità totale |
| M11 UI professionale e rifinitura | 4–6 | 🎮 **GIOCO COMPLETO E FINITO** |
| M12 Motore SWOS *(fuori perimetro, opzionale)* | 8–12 | Estensione futura |

**Totale indicativo: ~57–77 sessioni.** A un ritmo di 3 sessioni a settimana, la prima versione giocabile (M2) arriva in ~3–4 settimane e il gioco completo v1 (M8) in ~4–5 mesi. Le stime serviranno soprattutto a misurare i progressi, non come scadenze.

### Primo passo operativo
Aprire Claude Code nella cartella di lavoro e dire:
> «Leggi `requisiti-funzionali-MISTER.md` e `piano-di-progetto.md`. Sono lo sviluppatore (principiante): iniziamo la Milestone M0 seguendo il metodo del §0.»

*Fine del piano di progetto.*
