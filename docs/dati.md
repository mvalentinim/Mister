# Fonti dati e pipeline di importazione

*(M1 — documento vivo: si aggiorna a ogni decisione sulle fonti)*

## Obiettivo

Popolare il database con rose complete e attributi plausibili sulla scala 1-99. Le fonti devono essere **aperte** (il FRD §5.3 vieta di estrarre contenuti da mod di terze parti).

**Perimetro dati approvato dallo sviluppatore (sessione 3):**

1. **Campionati**: non solo Serie A e B, ma le rose dei **principali campionati europei** (Italia, Inghilterra, Spagna, Germania, Francia — prima e, dove i dati lo permettono, seconda divisione). La pipeline nasce quindi **multi-lega** fin dall'inizio; l'ordine di popolamento resta quello del piano (prima l'Italia, che è la DoD di M1, poi le altre — il piano prevedeva questa estensione in M11, la anticipiamo come requisito della pipeline).
2. **Nazionali**: rose delle nazionali **aggiornate fino al Mondiale 2026**. Richiede una piccola estensione dello schema (le nazionali sono squadre i cui giocatori sono "in prestito" dai club, selezionati per nazionalità). Fonti candidate: convocazioni ufficiali del Mondiale 2026 disponibili in dataset aperti (openfootball pubblica gli squad dei mondiali) + selezione automatica per nazionalità come ripiego.
3. **Giocatori leggenda**: rose delle squadre **Legends** (FRD §5.3). Per i giocatori ritirati non esistono dataset aperti di attributi: come previsto dal FRD restano **curate a mano** (attributi assegnati da noi con l'editor in M9). La pipeline però prevede fin d'ora il flag `legend` e un formato di import JSON, così le Legends preparate a mano entrano dallo stesso canale degli altri dati.

## Le tre fonti candidate (FRD §14, righe 2-4)

### 1. openfootball — github.com/openfootball
- **Cos'è:** progetto pubblico che raccoglie in file di testo leghe, club, calendari e rose di molti campionati. Si scarica liberamente, senza registrazione.
- **Pro:** libero, senza chiavi API, formato testuale leggibile, include storicamente Serie A e B.
- **Contro:** niente attributi dei giocatori (nome, ruolo, anagrafica sì; "velocità 82" no); l'aggiornamento delle rose non è garantito per tutte le stagioni.

### 2. Dataset Kaggle (attributi giocatori / valori di mercato)
- **Cos'è:** Kaggle è una piattaforma di dataset pubblici (serve un account gratuito). Esistono dataset con **attributi numerici dei giocatori** derivati da videogiochi calcistici e dataset stile transfermarkt con valori di mercato.
- **Pro:** è l'unica fonte candidata con attributi già numerici → la mappatura alla nostra scala 1-99 è quasi diretta.
- **Contro:** richiede account; la copertura della Serie B va verificata dataset per dataset; le licenze variano e vanno controllate.

### 3. API football-data.org
- **Cos'è:** servizio web con calendari, rose e risultati aggiornati; il piano gratuito richiede registrazione e ha limiti di richieste.
- **Pro:** dati aggiornati e ben strutturati (JSON); ottimo per i **calendari reali** che serviranno in M2.
- **Contro:** nel piano gratuito la Serie B non è inclusa (copre le competizioni principali); niente attributi; limiti di richieste orarie.

## Strategia approvata (sessione 3)

Nessuna fonte da sola basta: la strategia è una **combinazione**, confermata dallo sviluppatore.

1. **Scheletro** (club + rose + anagrafiche) da **openfootball** o da un dataset Kaggle con copertura verificata delle leghe nel perimetro (top 5 campionati europei, prima e seconda divisione dove possibile).
2. **Attributi 1-99** da un dataset Kaggle di attributi, agganciando i giocatori per nome+data di nascita; per i giocatori non trovati, **generazione procedurale plausibile** (in base a ruolo, età e divisione), dichiarata nel documento.
3. **Calendari** (per M2) da football-data.org per le competizioni coperte dal piano gratuito; per le altre, calendario generato con l'algoritmo classico dei gironi (round-robin).
4. **Nazionali fino al Mondiale 2026**: squad ufficiali da dataset aperti (openfootball/world-cup) agganciati ai giocatori già importati; ripiego: selezione automatica dei migliori per nazionalità.
5. **Legends**: import via JSON dal canale della pipeline, contenuti curati a mano in M9.
6. Ogni passo scritto come **script in `data/`** rilanciabile con un comando, con report finale: numero squadre, giocatori per squadra, duplicati trovati (DoD di M1).

> ⚠️ **Protocollo risorse esterne (FRD §0.2):** nessun download è ancora stato fatto. Prima di importare, Claude Code presenta allo sviluppatore la fonte scelta con link e licenza, e l'import si esegue e si verifica insieme.

## Fonti scelte e verificate (sessione 4)

La verifica concreta ha ridimensionato i piani iniziali (Kaggle e HuggingFace non
sono raggiungibili direttamente da questo ambiente; football-data.org richiede
registrazione e non copre le seconde divisioni nel piano gratuito) e ha trovato
una combinazione migliore:

1. **Dataset "FIFA 23 Players"** (origine Kaggle, autore sanjeetsinghnaik;
   usato tramite il mirror pubblico GitHub `miraehab/FIFA-23-ML-Project`):
   `players_fifa23.csv` (18.539 giocatori, attributi già in scala 1-99) +
   `teams_fifa23.csv` (leghe, prestigio, budget). **Copre per intero tutte e
   10 le leghe del perimetro** (verificato club per club) e include le rose
   delle nazionali licenziate nel gioco. Stagione di riferimento: 2022-23.
2. **openfootball/worldcup**: gironi del Mondiale 2026 → elenco delle 48
   qualificate. Le *convocazioni ufficiali* 2026 non sono ancora pubblicate
   in nessuna fonte aperta verificata.

**Nota licenza**: gli attributi derivano dal videogioco EA FIFA 23 via dataset
pubblico Kaggle — uso privato e non commerciale, come da FRD. Nessun dato
proviene da mod di terze parti. La squadra fittizia "AFC Richmond" (bonus del
gioco) viene esclusa dall'import.

## Come si esegue l'import

```bash
npm run importa-dati
```

che esegue in sequenza: `data/importa/01-scarica-fonti.mjs` (scarica le fonti
in `data/fonti/`, fuori da git) e `data/importa/02-costruisci-db.mjs`
(costruisce `public/mister.sqlite` e stampa il report di verifica).

## Mappatura campo per campo (fonte → nostro schema)

| Nostro campo | Fonte (players_fifa23.csv) | Note |
|---|---|---|
| `giocatore.id` | `ID` | l'ID della fonte garantisce l'unicità |
| `nome`, `cognome` | `Name` ("K. De Bruyne") | diviso al primo spazio: nome "K.", cognome "De Bruyne" |
| `data_nascita` | `Age` | **sintetica**: `(2026 − Age)-07-01`. Le età sono ancorate al 2026 (vedi sotto) |
| `nazionalita` | `Nationality` | nome del paese in inglese (i18n più avanti) |
| `ruolo` | `BestPosition` | mappa GK→POR, CB→DC, RB/RWB→TD, LB/LWB→TS, CDM→MED, CM→CC, CAM→TRQ, RM/RW→ED, LM/LW→ES, ST/CF→PC |
| `ruoli_secondari` | `Positions` | stessa mappa, senza il primario |
| `piede` | `PreferredFoot` | Left→sinistro, altrimenti destro |
| `velocita` | `PaceTotal` (`SprintSpeed` per i portieri) | |
| `resistenza` | `Stamina` | |
| `tecnica` | `BallControl` | |
| `passaggio` | `ShortPassing` | |
| `tiro` | `ShootingTotal` | |
| `dribbling` | `DribblingTotal` | |
| `colpo_testa` | `HeadingAccuracy` | |
| `marcatura` | `Marking` | |
| `contrasto` | `StandingTackle` | |
| `posizionamento` | `Positioning` | |
| `visione` | `Vision` | |
| `calci_piazzati` | `FKAccuracy` | |
| `riflessi`/`presa`/`uscite`/`rinvio` | `GKReflexes`/`GKHandling`/`GKPositioning`/`GKKicking` | solo portieri |
| comportamentali (7) | — assenti nella fonte — | **generati** in modo deterministico (seme = ID giocatore), 50±30; l'ambizione cresce col margine `Potential−Overall`. Provvisori: raffinabili con l'editor |
| `potenziale` | `Potential` | |
| `contratto.stipendio` | `WageEUR` | la fonte è **settimanale** → ×52 per l'annuale |
| `contratto.scadenza` | `ContractUntil` | **traslata di +4 anni** (vedi sotto) |
| `club.fama` | `DomesticPrestige`, `IntPrestige` (teams) | `dom×7 + int×3`, scala 1-10 → 1-99 |
| `club.budget_mercato` | `TransferBudget` (teams) | |
| `club.budget_stipendi` | — calcolato — | somma stipendi rosa +15% |
| `nazionale` + `convocazione` | `NationalTeam` | rose ufficiali FIFA 23 |

**Ancoraggio temporale al 2026.** La fonte fotografa la stagione 2022-23. Per
avere un mondo coerente con l'avvio delle carriere nel 2026: le età valgono
"oggi" (date di nascita sintetiche) e le scadenze contrattuali sono traslate
di +4 anni. Le rose restano quelle 2022-23: è il compromesso dichiarato finché
non esisterà una fonte aperta più recente con pari copertura.

**Nazionali e Mondiale 2026.** Le rose nazionali ufficiali della fonte (35
squadre licenziate) sono importate così come sono; le qualificate al Mondiale
2026 senza rosa ufficiale ricevono una **selezione automatica** dei migliori
giocatori di quella nazionalità presenti nel database (flag `generata = 1`,
dichiarato anche nell'interfaccia). 17 qualificate restano senza rosa perché i
loro giocatori militano fuori dalle 10 leghe importate (es. Arabia Saudita,
Giordania): si aggiungeranno quando ci sarà una fonte con le convocazioni 2026
o tramite editor.

## Risultato dell'import (report del 2026-08-20)

- **6.112 giocatori**, **202 club**, 10 competizioni, 5 nazioni
- **43 nazionali** (31 al Mondiale 2026, di cui 8 a selezione automatica), 980 convocazioni
- 5.762 contratti; nessun club sotto i 18 giocatori; nessun duplicato di ID
  (79 righe ripetute nella fonte scartate); 11 casi di omonimia (giocatori
  diversi con stesso nome breve e anno di nascita — verificati, sono persone diverse)
- Database: `public/mister.sqlite`, 1,2 MB

## Stato

- [x] Valutazione preliminare delle fonti
- [x] Strategia e perimetro approvati dallo sviluppatore
- [x] Verifica concreta di copertura (club per club) e provenienza delle fonti
- [x] Estensione schema per le nazionali (`nazionale`, `convocazione`)
- [x] Script di importazione + mappatura documentata campo per campo
- [x] Verifica dei totali (squadre, giocatori, duplicati) — report sopra
- [ ] Convocazioni ufficiali Mondiale 2026 (nessuna fonte aperta le pubblica ancora)
- [ ] Calendari reali (football-data.org, richiede registrazione — serve per M2)
