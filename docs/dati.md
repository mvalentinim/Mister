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

## Fonti scelte e verificate (sessioni 4-5)

**Storia in breve.** In sessione 4 la verifica aveva selezionato il dataset
"FIFA 23 Players" (mirror GitHub, stagione 2022-23), con compromessi dichiarati
(età ancorate, contratti traslati). In sessione 5 lo sviluppatore ha scaricato
da Kaggle e caricato nel repository il dataset **EA Sports FC 26** aggiornato,
che lo sostituisce integralmente ed elimina quei compromessi.

1. **Dataset "EA Sports FC 26"** (origine Kaggle, scaricato dallo sviluppatore;
   committato come `data/fc26-kaggle.zip`, snapshot del 21/09/2025):
   18.405 giocatori della **stagione 2025-26** con attributi in scala 1-99,
   **date di nascita reali**, club, leghe, contratti e rose delle nazionali
   licenziate. **Copre per intero tutte e 10 le leghe del perimetro**
   (verificato club per club tramite `league_id`, perché i nomi delle leghe
   sono ambigui: la Bundesliga tedesca e quella austriaca si chiamano uguali).
2. **openfootball/worldcup**: gironi del Mondiale 2026 → elenco delle 48
   qualificate. Le *convocazioni ufficiali* 2026 non sono ancora pubblicate
   in nessuna fonte aperta verificata.

**Nota licenza**: gli attributi derivano dal videogioco EA Sports FC 26 via
dataset pubblico Kaggle — uso privato e non commerciale, come da FRD. Nessun
dato proviene da mod di terze parti.

## Come si esegue l'import

```bash
npm run importa-dati
```

che esegue in sequenza: `data/importa/01-scarica-fonti.mjs` (estrae il CSV
FC 26 da `data/fc26-kaggle.zip` e scarica il file del Mondiale 2026 in
`data/fonti/`, fuori da git) e `data/importa/02-costruisci-db.mjs`
(costruisce `public/mister.sqlite` e stampa il report di verifica).

## Mappatura campo per campo (fonte → nostro schema)

| Nostro campo | Fonte (FC26_20250921.csv) | Note |
|---|---|---|
| `giocatore.id` | `player_id` | l'ID della fonte garantisce l'unicità |
| `nome`, `cognome` | `short_name` ("K. De Bruyne") | diviso al primo spazio: nome "K.", cognome "De Bruyne" |
| `data_nascita` | `dob` | **data di nascita reale** |
| `nazionalita` | `nationality_name` | nome del paese in inglese (i18n più avanti) |
| `ruolo` | `player_positions` (primo della lista) | mappa GK→POR, CB→DC, RB/RWB→TD, LB/LWB→TS, CDM→MED, CM→CC, CAM→TRQ, RM/RW→ED, LM/LW→ES, ST/CF→PC |
| `ruoli_secondari` | `player_positions` (dal secondo in poi) | stessa mappa |
| `piede` | `preferred_foot` | Left→sinistro, altrimenti destro |
| `velocita` | `pace` (`movement_sprint_speed` per i portieri) | |
| `resistenza` | `power_stamina` | |
| `tecnica` | `skill_ball_control` | |
| `passaggio` | `attacking_short_passing` | |
| `tiro` | `shooting` | |
| `dribbling` | `dribbling` | |
| `colpo_testa` | `attacking_heading_accuracy` | |
| `marcatura` | `defending_marking_awareness` | |
| `contrasto` | `defending_standing_tackle` | |
| `posizionamento` | `mentality_positioning` | |
| `visione` | `mentality_vision` | |
| `calci_piazzati` | `skill_fk_accuracy` | |
| `riflessi`/`presa`/`uscite`/`rinvio` | `goalkeeping_reflexes`/`_handling`/`_positioning`/`_kicking` | solo portieri |
| comportamentali (7) | — assenti nella fonte — | **generati** in modo deterministico (seme = ID giocatore), 50±30; l'ambizione cresce col margine `potential−overall`. Provvisori: raffinabili con l'editor |
| `potenziale` | `potential` | |
| `contratto.stipendio` | `wage_eur` | la fonte è **settimanale** → ×52 per l'annuale |
| `contratto.scadenza` | `club_contract_valid_until_year` | 30 giugno dell'anno indicato, nessuna traslazione |
| `club.fama` | — calcolata — | media `overall` dei migliori 18 della rosa |
| `club.budget_mercato` | — calcolato — | 8% del valore (`value_eur`) totale della rosa |
| `club.budget_stipendi` | — calcolato — | somma stipendi annuali della rosa +15% |
| `nazionale` + `convocazione` | `nation_team_id` + `nationality_name` | rose ufficiali FC 26 |

La fonte non ha un file squadre: i club si ricavano dalle righe giocatore
(`club_team_id`, `club_name`) e fama/budget si derivano dalla rosa (formule
sopra, tutte riviste facilmente).

**Nazionali e Mondiale 2026.** Le rose nazionali ufficiali della fonte sono
importate così come sono; le qualificate al Mondiale 2026 senza rosa ufficiale
ricevono una **selezione automatica** dei migliori giocatori di quella
nazionalità presenti nel database (flag `generata = 1`, dichiarato anche
nell'interfaccia). 19 qualificate restano senza rosa perché i loro giocatori
militano fuori dalle 10 leghe importate (o mancano portieri — es. Costa
d'Avorio e Algeria hanno 23 giocatori ma nessun portiere nel perimetro): si
aggiungeranno quando ci sarà una fonte con le convocazioni 2026 o tramite
editor. Attenzione ai nomi EA aggiornati: "Türkiye", "Czechia", "Cabo Verde"
(gestiti nella tabella `ALIAS_PAESI` dello script).

## Risultato dell'import (report del 2026-08-20, fonte FC 26)

- **5.851 giocatori** (stagione 2025-26, date di nascita reali), **198 club**, 10 competizioni, 5 nazioni
- **40 nazionali** (29 al Mondiale 2026, di cui 12 a selezione automatica)
- Nessun club sotto i 18 giocatori; nessuna riga duplicata nella fonte; unico
  caso di omonimia "J. Murphy ×2" verificato: sono i gemelli Jacob e Josh
  Murphy, nati lo stesso giorno — persone diverse
- Database: `public/mister.sqlite`

## Icons e Heroes (giocatori leggenda) — verifica del file caricato

Lo sviluppatore ha caricato su GitHub `Icons and Heroes Unlock.rar` (sessione 6).
Verifica: contiene `SquadsBaseIconsHeroes`, uno **squad file binario del gioco**
(formato proprietario EA "FBCHUNKS", compresso). Serve a sbloccare le leggende
*dentro* FC 26, ma **non è un export di dati leggibile**: non importabile.
Il file resta su `main` ma non viene usato dalla pipeline.

Cosa è stato predisposto in attesa della fonte giusta:
- **tag `categoria`** sulla tabella giocatore: `normale` | `icon` | `hero`
  (con vincolo CHECK). Richiesto dalle regole di gioco future: ogni carriera
  potrà includere o escludere le leggende dalle rose.
- **canale di import** `data/leggende/*.json` (formato documentato in
  `data/leggende/README.md`), letto da `npm run importa-dati`; ID assegnati
  da 900000 in su per non collidere con i player_id di EA. Collaudato.
- **interfaccia**: sezione "Leggende" nell'elenco squadre e badge ★ICON/⚡HERO
  nella scheda giocatore.

**Fonte candidata per i dati veri**: il dataset Kaggle
["Complete EA FC26 Rating Cards Database"](https://www.kaggle.com/datasets/flynn28/complete-ea-fc26-rating-cards-database)
(carte FUT, che includono Icons e Heroes con attributi). Da scaricare e caricare
nel repository come fatto per il dataset FC 26: uno script di conversione
genererà i JSON del canale leggende.

## Stato

- [x] Valutazione preliminare delle fonti
- [x] Strategia e perimetro approvati dallo sviluppatore
- [x] Verifica concreta di copertura (club per club) e provenienza delle fonti
- [x] Estensione schema per le nazionali (`nazionale`, `convocazione`)
- [x] Script di importazione + mappatura documentata campo per campo
- [x] Verifica dei totali (squadre, giocatori, duplicati) — report sopra
- [x] Aggiornamento alla stagione 2025-26 con il dataset FC 26 fornito dallo sviluppatore
- [ ] Convocazioni ufficiali Mondiale 2026 (nessuna fonte aperta le pubblica ancora)
- [ ] Calendari reali (football-data.org, richiede registrazione — serve per M2)
