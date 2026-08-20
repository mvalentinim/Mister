# Documento dei Requisiti Funzionali (FRD)
## Progetto "MISTER" — Manageriale calcistico web (titolo provvisorio)

**Versione:** 1.0 — Agosto 2026
**Uso:** privato, non commerciale
**Team:** 1 sviluppatore principiante + Claude Code
**Stato:** approvato per avvio sviluppo

---

## 0. COME USARE QUESTO DOCUMENTO CON CLAUDE CODE

> ⚠️ **ISTRUZIONI PERMANENTI PER CLAUDE CODE — leggere a ogni sessione.**
>
> 1. **Lo sviluppatore è un principiante** per questo tipo di progetto. Claude Code deve: spiegare ogni scelta tecnica in linguaggio semplice PRIMA di implementarla; procedere a piccoli passi verificabili; dopo ogni passo dire allo sviluppatore come verificare che funzioni (comando da lanciare, cosa vedere a schermo); non dare mai per scontata la conoscenza di terminale, git, npm o concetti di programmazione.
> 2. **Risorse esterne.** Ogni volta che nel documento compare il blocco `🔗 RISORSA ESTERNA`, Claude Code deve fermarsi e guidare lo sviluppatore passo passo: (a) spiegare cos'è la risorsa e perché serve; (b) fornire il link e le istruzioni esatte di download/registrazione; (c) spiegare dove salvare i file nel progetto; (d) scrivere ed eseguire insieme allo sviluppatore gli script di importazione/elaborazione; (e) verificare insieme il risultato con controlli concreti (es. "il database ora contiene N giocatori, verifichiamolo con questa query").
> 3. **Nessuna risorsa esterna va scaricata automaticamente senza spiegazione.** Lo sviluppatore deve sempre capire cosa sta entrando nel progetto.
> 4. A inizio di ogni sessione di lavoro, Claude Code deve: riepilogare a che punto è il progetto, proporre l'obiettivo della sessione, e a fine sessione aggiornare il file `DIARIO.md` con cosa è stato fatto e cosa resta.
> 5. Ogni milestone del Piano di Progetto termina con una versione **giocabile o verificabile** dallo sviluppatore.

**Elenco consolidato di tutte le risorse esterne: vedi §14.**

---

## 1. VISIONE

Un gioco manageriale calcistico per browser/desktop in cui **la gestione domina sulla simulazione interattiva**. Ispirazioni dichiarate:

- **Allenatore / Italian Football Manager II (IFM2)**: profondità gestionale, immediatezza, focus su rosa e mercato.
- **Sensible World of Soccer (SWOS)**: partita interattiva opzionale, arcade, top-down 2D.
- **SP Football Life / scena modding PES**: struttura del database giocatori e filosofia dell'editor esterno user-friendly.

Il giocatore è un **allenatore/manager** che parte dalla Serie B di una nazione a scelta e costruisce la propria carriera fino ai trofei internazionali e alle panchine delle nazionali. La valuta del gioco è la **fama dell'allenatore**.

**Principio guida n.1: user-friendliness.** Ogni schermata deve essere comprensibile senza manuale. Poche opzioni, ben spiegate, con valori di default sensati.

**Principio guida n.2: profondità solo dove conta.** Mercato, partite, tattiche e comportamento dei giocatori sono profondi. Tutto il resto è deliberatamente assente o semplificato.

---

## 2. SCOPE

### 2.1 In scope (v1)
- Carriera allenatore con sistema di fama e offerte
- Database completo: leghe reali (rollout per fasi) + squadre Legends curate
- Editor integrato del database
- Pipeline di importazione dati da fonti open
- Mercato: trattative club-club strutturate e trattativa club-giocatore conversazionale (LLM)
- Modelli comportamentali dei giocatori (morale, promesse, crescita/declino)
- Tattiche: moduli + movimenti prevalenti
- Match Day: simulazione visuale schematica con telecronaca ibrida
- Match engine interattivo opzionale stile SWOS
- Salvataggi persistenti, esportabili e portabili tra dispositivi

### 2.2 Fuori scope (v1) — NON implementare
- Staff tecnico (assistenti, preparatori, scout come figure gestibili)
- Infrastrutture: stadi, centri di allenamento, settore giovanile come struttura
- Finanze complesse (sponsor, biglietti, bilanci): esistono SOLO budget mercato e budget stipendi
- Multiplayer / online
- Grafica 3D
- Conferenze stampa, interazioni con i media oltre alle notizie di mercato generate

> Claude Code: se durante lo sviluppo emergono idee appartenenti a questa lista, annotarle in `IDEE-FUTURE.md` e NON implementarle.

---

## 3. PIATTAFORMA E STACK TECNICO

**Target primario:** browser moderno su macOS (MacBook dello sviluppatore) e Windows. Packaging desktop opzionale in milestone avanzata.

| Componente | Scelta | Motivazione |
|---|---|---|
| Linguaggio | TypeScript | Robustezza, ottimo supporto Claude Code |
| UI gestionale | React + Vite | Il 70% del gioco è interfaccia: tabelle, schermate, form |
| Match Day (vista schematica) | Canvas 2D o Pixi.js | Rendering leggero di campo, gettoni, palla |
| Match interattivo SWOS | Phaser 3 | Framework arcade 2D maturo e documentato |
| Dati statici + salvataggi | SQLite (via sql.js / wa-sqlite) + export file | Query potenti su 20.000+ giocatori, salvataggio = file |
| Trattativa conversazionale | API Anthropic (Claude) | Vedi §7.3 |
| Packaging desktop (opzionale) | Tauri | App nativa Mac con salvataggi su disco |

> Claude Code: spiegare allo sviluppatore ognuna di queste tecnologie al primo utilizzo, con un'analogia semplice e un esempio minimo funzionante.

🔗 **RISORSA ESTERNA — Chiave API Anthropic**
- Cosa: chiave API per le trattative conversazionali (§7.3).
- Dove: https://console.anthropic.com → creazione account → API Keys.
- Claude Code deve: guidare la registrazione, spiegare il concetto di chiave segreta, configurarla come variabile d'ambiente (mai nel codice, mai committata su git — creare `.env` e aggiungerlo a `.gitignore` spiegando perché), stimare i costi (pochi centesimi per trattativa) e implementare la modalità fallback offline (§7.3.5).

---

## 4. CARRIERA E FAMA

### 4.1 Avvio carriera
1. L'utente sceglie una **nazione** tra quelle disponibili nel database.
2. Crea il proprio profilo allenatore (nome, nazionalità, età; nessuna skill iniziale da distribuire: la fama iniziale è bassa e uguale per tutti).
3. La carriera inizia nella **pausa estiva**. L'utente riceve **3–5 offerte da club della seconda divisione** della nazione scelta.
4. Ogni offerta contiene: **budget mercato**, **budget stipendi**, **obiettivi stagionali** (es. salvezza, playoff, promozione), durata contratto e stipendio dell'allenatore.
5. Accettata un'offerta, si entra nel loop stagionale.

### 4.2 Loop stagionale
Mercato estivo → campionato (+ coppa nazionale) → mercato invernale → chiusura stagione → valutazione obiettivi → offerte/rinnovo → nuova stagione.

### 4.3 Sistema di fama (modulo di primo piano)
- La fama è un valore numerico visibile (es. 0–100) con **soglie che sbloccano fasce di offerte**: club di B → club medi di A → top club nazionali → top club europei → nazionali minori → nazionali top.
- La fama **cresce** con: vittorie, raggiungimento/superamento obiettivi, promozioni, trofei, vittorie contro club più famosi, valorizzazione di giovani.
- La fama **cala** con: esoneri, obiettivi falliti, retrocessioni, promesse non mantenute ai giocatori (§6.3).
- Gli **esoneri** esistono: fiducia della dirigenza visibile, influenzata da risultati vs obiettivi.
- Le **nazionali** offrono panchine solo oltre una soglia di fama alta; il ciclo nazionale (qualificazioni + torneo continentale/mondiale) può essere svolto in parallelo al club oppure a tempo pieno (decisione di design da confermare in sviluppo: default = esclusiva, più semplice).

### 4.4 Obiettivo di lungo periodo
Vincere trofei nazionali, internazionali e con le nazionali (campionato continentale, mondiale). Nessun "fine gioco" forzato: la carriera continua finché l'utente vuole.

---

## 5. DATABASE: LEGHE REALI, LEGENDS, EDITOR

### 5.1 Schema dati (progettato per scalare a "tutti i campionati")
Entità principali: **Nazione, Competizione, Stagione, Club, Giocatore, Contratto, Staff-Allenatori IA, Trasferimento, Partita, Evento-partita, Carriera-utente.**

Attributi giocatore (ispirati alla struttura PES/Football Life, semplificati):
- Anagrafica: nome, età/data nascita, nazionalità (+ status UE/extra-UE), ruoli (primario + secondari), piede.
- Tecnici (scala 1–99): portiere ha set dedicato; per gli altri ~12–16 attributi (velocità, resistenza, tecnica, passaggio, tiro, dribbling, colpo di testa, marcatura, contrasto, posizionamento, visione, calci piazzati...).
- Comportamentali (per mercato e morale, §7–8): ambizione, attaccamento al denaro, fedeltà, bisogno di giocare, professionalità, leadership, legame territoriale.
- Dinamici: forma, morale, condizione fisica, valore di mercato (calcolato), potenziale di crescita.

### 5.2 Rollout contenuti per fasi
- **Fase A (v1 giocabile):** nazione Italia completa (Serie A + Serie B + coppa) + altre 4 top league europee (Inghilterra, Spagna, Germania, Francia) con prima e seconda divisione dove i dati lo permettono + competizioni continentali per club semplificate.
- **Fase B:** ulteriori nazioni europee e sudamericane principali.
- **Fase C:** copertura ampia "stile EA" — resa possibile dalla pipeline di importazione, non da inserimento manuale.

### 5.3 Squadre Legends (contenuto curato a mano)
- 10–15 squadre iconiche storiche dei campionati europei (es. grandi squadre del passato di Italia, Spagna, Inghilterra, Olanda...), ognuna con rosa di 18–22 giocatori e attributi assegnati manualmente tramite l'editor.
- Utilizzo: amichevoli, tornei fantasy dedicati, opzione "inserisci una Legend nel campionato".
- Le Legends sono dati come tutti gli altri: stesso schema, flag `legend = true`.

🔗 **RISORSA ESTERNA — Dataset rose e campionati (fonti open)**
- Cosa: dati reali di squadre, giocatori e campionati per popolare il database.
- Fonti candidate (da verificare in fase di sviluppo, in quest'ordine):
  1. **openfootball** (github.com/openfootball) — dataset pubblici di leghe, club e rose in formato testo/JSON.
  2. **Dataset Kaggle** su giocatori (es. dataset attributi giocatori derivati da videogiochi calcistici, dataset transfermarkt-style con valori di mercato). Richiede account Kaggle gratuito.
  3. **API football-data.org** (piano gratuito) per calendari e rose aggiornate delle competizioni principali.
- Claude Code deve: valutare con lo sviluppatore la fonte migliore disponibile al momento; guidare download/registrazione; scrivere script di importazione con **mappatura campo-per-campo spiegata**; gestire la conversione degli attributi dalla scala della fonte alla scala 1–99 del gioco; verificare insieme i totali (n. squadre, n. giocatori per squadra, assenza di duplicati).
- ⚠️ Non estrarre dati da mod di terze parti (es. database SmokePatch): usarne solo la **struttura concettuale** come riferimento pubblico. I contenuti arrivano da fonti open.

### 5.4 Editor integrato (ispirato ai tool della scena modding PES)
Requisiti:
- CRUD completo su nazioni, competizioni, club e giocatori con interfaccia user-friendly (niente editing di file a mano).
- Ricerca e filtri (per lega, club, ruolo, età, attributi).
- Modifica di massa semplice (es. +2 a un attributo per selezione di giocatori).
- Creazione guidata squadre Legends (wizard: club → rosa → attributi).
- Import/export del database in JSON (per backup e condivisione).
- L'editor modifica il **database statico**, non le carriere in corso (le carriere fotografano il DB al momento della creazione).

---

## 6. MERCATO

### 6.1 Struttura generale
- Due finestre: **estiva** e **invernale**, con date reali della nazione.
- Valore di mercato dinamico del giocatore: funzione di attributi, età, forma, scadenza contratto, fama del club, rendimento stagionale.
- **Club IA con bisogni reali:** ogni club analizza la propria rosa, identifica ruoli scoperti/eccedenze e agisce di conseguenza; ha personalità economica (vendente/compratore, ricco/povero, valorizzatore di giovani...).
- **Notizie e rumor** generati proceduralmente rendono vivo il mercato (trattative altrui, colpi ufficiali).
- Agenti/procuratori: presenti ma **trasparenti** — fanno da cornice narrativa (comunicano richieste iniziali e formalizzano la chiusura), nessun gameplay proprio.

### 6.2 Trattativa CLUB ↔ CLUB (strutturata, realistica ma veloce: max 2–3 round)
Leve negoziali (tutte e sole queste):
1. **Prezzo** del cartellino
2. **Bonus** (al raggiungimento di obiettivi: presenze, gol, promozione...)
3. **Scadenza del contratto** del giocatore (influenza il prezzo: scadenza vicina = sconto)
4. **Prestito** con diritto o obbligo di riscatto
5. **Contropartite tecniche** (scambi giocatore/i + eventuale conguaglio)

Flusso: offerta → controproposta o rifiuto motivato → eventuale rilancio → chiusura entro 2–3 round. I rifiuti hanno sempre una motivazione leggibile ("incedibile", "prezzo troppo basso", "non ci interessa la contropartita").

### 6.3 Trattativa CLUB ↔ GIOCATORE (conversazionale, ibrida LLM)
**Architettura a due strati, obbligatoria:**

**Strato 1 — Cervello deterministico.** Il motore calcola un *punteggio di interesse* del giocatore verso la proposta, a partire da: profilo comportamentale (§5.1), età e fase carriera, prestigio di club e campionato, fama dell'allenatore, **minutaggio prevedibile** (il motore valuta la concorrenza nel ruolo dentro la rosa dell'utente), stipendio e durata offerti, ambizioni del progetto. Il punteggio determina gli esiti possibili. L'LLM non può far firmare un giocatore il cui punteggio resta sotto soglia.

**Strato 2 — LLM come voce e interprete.** La trattativa è un dialogo in linguaggio naturale:
- L'LLM interpreta il giocatore, con personalità e situazione come contesto.
- L'LLM traduce il discorso libero dell'utente in **leve strutturate**: promessa di titolarità, fascia di capitano, progetto sportivo ("in A in due anni"), ruolo tattico, centralità nel progetto.
- Le leve alzano (o abbassano, se maldestre) il punteggio di interesse secondo pesi definiti dal motore, non dall'LLM.

**Registro delle promesse (fondamentale):** ogni promessa riconosciuta viene salvata come impegno con condizioni verificabili. Il mancato rispetto: crolla morale e fiducia del giocatore, danneggia la fama dell'allenatore, e influenza le trattative future (i giocatori "sanno" se l'allenatore mantiene la parola).

Vincoli: massimo 2–3 round di dialogo anche qui; l'utente ha sempre visibile un riepilogo strutturato dell'offerta (stipendio, durata, bonus, promesse riconosciute).

**Modalità fallback offline:** se l'API non è disponibile o l'utente la disattiva, la trattativa usa dialoghi strutturati a scelta multipla che azionano le stesse leve. Il gioco è sempre completabile offline.

---

## 7. COMPORTAMENTO DEI GIOCATORI

- **Morale** individuale, influenzata da: minutaggio vs aspettative, risultati, rinnovi, promesse mantenute/tradite, trasferimenti richiesti o negati.
- **Forma**: andamento a breve termine legato a prestazioni e condizione fisica.
- **Crescita/declino**: curva legata a età, potenziale, minutaggio e livello della competizione. I giovani crescono giocando; oltre una soglia d'età gli attributi fisici calano prima di quelli tecnici.
- **Reazioni visibili e leggibili**: i giocatori comunicano scontento o soddisfazione tramite messaggi brevi (es. richiesta di più spazio, richiesta di cessione, felicità per la fascia). Niente colloqui complessi in v1: le interazioni profonde restano nel perimetro delle trattative (§6.3).
- Infortuni e squalifiche: presenti, con gravità e durata semplici e chiare.

---

## 8. TATTICHE: MODULI + MOVIMENTI PREVALENTI

### 8.1 Modulo base
- Scelta tra i moduli classici (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 3-4-3, 5-3-2...).
- Possibilità di trascinare i giocatori sul campo per micro-aggiustamenti di posizione.

### 8.2 Movimenti prevalenti (meccanica distintiva)
- Ogni **posizione del modulo** ha movimenti di default: **max 2 in fase offensiva, max 2 in fase difensiva**.
- L'allenatore li personalizza scegliendo da un **vocabolario chiuso per ruolo**. Esempi:
  - Esterno di centrocampo nel 3-5-2: offensivi *spinta sulla fascia* / *taglio interno da trequartista*; difensivi *ripiegamento a quinto* / *raddoppio sull'esterno*.
  - Punta: *attacco della profondità* / *incontro tra le linee*.
  - Difensore centrale: *impostazione dal basso* / *salita palla al piede*.
- Visualizzazione: **frecce sul campo tattico** sulla posizione del giocatore.
- Tutto ciò che non è coperto dai movimenti prevalenti lo decide l'IA del match engine.
- **Efficacia legata agli attributi**: ogni movimento ha attributi chiave; un giocatore inadatto lo esegue male. Conseguenza voluta: si compra sul mercato in funzione dei movimenti che si vogliono giocare.

### 8.3 Istruzioni di squadra (poche e leggibili)
Massimo 4–5 regolazioni globali: mentalità (difensiva↔offensiva), altezza del pressing, ampiezza, ritmo, e poco altro. Niente sistemi a 40 slider.

---

## 9. MATCH DAY — SIMULAZIONE VISUALE SCHEMATICA

Esperienza della partita non giocata interattivamente (modalità principale del gioco).

### 9.1 Architettura
Il **motore di simulazione** produce un flusso di eventi e posizioni; il **renderer** lo visualizza. Stessa sorgente dati per campo, telecronaca, pagelle e statistiche.

### 9.2 Vista campo schematica
- Campo 2D stilizzato dall'alto; giocatori come gettoni con numero/nome, palla visibile in movimento.
- Movimenti di palla e giocatori riflettono tattiche e movimenti prevalenti impostati.

### 9.3 Controlli di velocità
- Switch **1x / 2x / 3x / 5x** + pausa, cambiabili in qualsiasi momento.
- Possibilità di cambi e regolazioni tattiche durante la partita (in pausa o ai momenti di interruzione).

### 9.4 Telecronaca ibrida sulle azioni importanti
- Quando il motore genera un'**azione importante** (occasione da gol, gol, rigore, espulsione, infortunio grave), la vista campo lascia spazio a un **racconto testuale tipo telecronaca**: pochi scambi che descrivono l'azione fino al suo esito, positivo o negativo.
- Terminata l'azione, si torna alla vista schematica.
- La telecronaca è generata da template procedurali ricchi (non LLM in v1, per velocità e coerenza), con nomi reali dei giocatori coinvolti.

### 9.5 Rendimento visibile del singolo giocatore
- **Pagelle live** (voto in aggiornamento) per ogni giocatore durante la simulazione.
- Indicatori di coinvolgimento: chi sta partecipando alle azioni importanti.

### 9.6 Fine partita
- **Highlights testuali** rileggibili (tutte le azioni importanti in sequenza).
- **Statistiche numeriche complete**: squadra (possesso, tiri, xG semplificato...) e singoli (voti finali, gol, assist, contributi chiave).

### 9.7 Motore di simulazione (riferimenti di progettazione)
Motore a eventi proprietario e deterministico (seed riproducibile): la partita avanza per azioni generate confrontando reparti, attributi, movimenti prevalenti, tattiche, forma e morale.

🔗 **RISORSA ESTERNA — Riferimenti open per il motore di simulazione**
- **ESMS / ESMS+** (Electronic Soccer Management Simulator): motore storico open a eventi, ottimo riferimento architetturale. Cercare i repository su GitHub.
- **Bygfoot** (bygfoot.sourceforge.net / GitHub): manageriale open source completo, utile per struttura stagioni e simulazione.
- **Modello Dixon-Coles / distribuzioni di Poisson** per calibrare frequenze realistiche di gol e risultati (articoli e implementazioni open disponibili).
- Claude Code deve: scaricare/consultare questi riferimenti CON lo sviluppatore, spiegare cosa si sta imparando da ciascuno (architettura a eventi, bilanciamento probabilità), e poi progettare il motore proprietario documentandolo in `docs/match-engine.md`. Nessun codice va copiato: si studiano le idee.

---

## 10. MATCH ENGINE INTERATTIVO (STILE SWOS) — OPZIONALE

- Prima di ogni partita l'utente sceglie: **simula** (Match Day §9) o **gioca** (questa modalità).
- Arcade top-down 2D, controlli semplici (tastiera/gamepad), partite veloci.
- L'IA dei compagni e degli avversari è guidata da: attributi, tattiche e **movimenti prevalenti** — le stesse strutture del motore di simulazione.
- Tecniche: steering behaviors + macchina a stati per ruolo, in Phaser 3.

🔗 **RISORSA ESTERNA — Riferimenti per il motore interattivo**
- Documentazione ed esempi ufficiali **Phaser 3** (phaser.io) — tutorial e sample di giochi top-down.
- Remake/cloni open source di Sensible Soccer su GitHub come studio di fisica di palla e feeling arcade.
- **Google Research Football** (github.com/google-research/football) come riferimento di studio per comportamenti dei giocatori.
- Claude Code deve guidare lo studio come in §9.7: capire, non copiare.

### 10.1 Coerenza tra i due motori (requisito architetturale)
- Stesso modello tattico condiviso (attributi, moduli, movimenti prevalenti).
- Risultati **statisticamente coerenti**: giocare le partite non deve essere un exploit. Test di coerenza: simulare N stagioni nelle due modalità con IA-vs-IA e confrontare le distribuzioni di risultati.

---

## 11. SALVATAGGI E PERSISTENZA

- **Database statico** (giocatori, club, competizioni) separato dai **salvataggi carriera**.
- Salvataggio locale automatico (IndexedDB/SQLite nel browser) + **esportazione manuale della carriera come singolo file** (`.mister` = JSON/SQLite compresso).
- **Portabilità tra dispositivi**: esporta file → importa su altro dispositivo. Sincronizzazione facile appoggiandosi a cartelle cloud dell'utente (iCloud/Dropbox/Drive); nessun server proprietario in v1.
- Salvataggi robusti: versione dello schema inclusa nel file, migrazioni gestite, avviso se il DB statico attuale differisce da quello della carriera.
- Con packaging Tauri: salvataggi direttamente su file system.

---

## 12. UI/UX — PRINCIPI

- Lingua: italiano (predisposizione i18n per l'inglese).
- Navigazione a schermate chiare: Rosa, Tattica, Mercato, Calendario, Classifiche, Club, Profilo allenatore, Notizie.
- Ogni numero importante è spiegabile: tooltip "perché?" (es. perché un giocatore è scontento, perché un'offerta è stata rifiutata).
- Zero attese: la simulazione delle altre partite della giornata è istantanea o in background.
- Tabelle ordinabili e filtrabili ovunque (rosa, mercato, classifiche).

---

## 13. REQUISITI NON FUNZIONALI

- **Performance**: gestione fluida di DB con 20.000+ giocatori su un MacBook; avanzamento di una giornata < 2–3 secondi nelle fasi iniziali del progetto.
- **Offline-first**: tutto giocabile senza rete tranne la trattativa LLM (che ha fallback offline).
- **Testabilità**: il motore di simulazione è deterministico con seed → test automatici di bilanciamento.
- **Codice documentato per principiante**: commenti generosi, `docs/` aggiornata, `DIARIO.md` di progetto.
- **Versionamento**: git dal giorno uno; Claude Code insegna il flusso base (commit a ogni passo verificato).

---

## 14. ELENCO CONSOLIDATO RISORSE ESTERNE

| # | Risorsa | Serve per | Sezione | Tipo |
|---|---|---|---|---|
| 1 | Chiave API Anthropic (console.anthropic.com) | Trattative conversazionali | §3, §6.3 | Registrazione + chiave |
| 2 | openfootball (GitHub) | Dati leghe, club, rose | §5.3 | Download dataset |
| 3 | Dataset Kaggle giocatori/valori | Attributi e valori di mercato | §5.3 | Account gratuito + download |
| 4 | API football-data.org | Calendari e rose aggiornate | §5.3 | Registrazione piano free |
| 5 | ESMS / ESMS+ (GitHub) | Studio architettura motore simulazione | §9.7 | Consultazione codice |
| 6 | Bygfoot (open source) | Studio struttura manageriale | §9.7 | Consultazione codice |
| 7 | Letteratura Dixon-Coles/Poisson | Calibrazione probabilità risultati | §9.7 | Studio |
| 8 | Phaser 3 (phaser.io) | Motore interattivo SWOS-like | §10 | Libreria npm + docs |
| 9 | Cloni open di Sensible Soccer | Studio feeling arcade | §10 | Consultazione codice |
| 10 | Google Research Football | Studio comportamenti IA | §10 | Consultazione |
| 11 | Librerie di progetto (React, Vite, Pixi.js, sql.js, Tauri) | Stack applicativo | §3 | npm / installazione guidata |

> Claude Code: al primo incontro con ciascuna riga di questa tabella, applicare il protocollo del §0 punto 2 (spiega → guida → importa → verifica insieme).

---

## 15. GLOSSARIO MINIMO (per lo sviluppatore principiante)

- **FRD**: questo documento — cosa deve fare il gioco.
- **Motore a eventi**: la partita come sequenza di azioni generate una alla volta.
- **Seed deterministico**: numero che, a parità di input, riproduce la stessa partita (fondamentale per i test).
- **CRUD**: Create/Read/Update/Delete — le 4 operazioni dell'editor.
- **Fallback**: alternativa che entra in gioco quando la via principale non è disponibile.
- **Pipeline di importazione**: script che trasformano dati esterni nel formato del gioco.

---

*Fine del documento. Il Piano di Progetto a milestone è un documento separato.*
