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

## Stato

- [x] Valutazione preliminare delle fonti (questo documento)
- [x] Strategia e perimetro approvati dallo sviluppatore (top 5 leghe europee, nazionali fino al Mondiale 2026, canale Legends)
- [ ] Verifica concreta di copertura e licenze delle fonti candidate
- [ ] Estensione schema per le nazionali
- [ ] Script di importazione + mappatura attributi documentata campo per campo
- [ ] Verifica dei totali (squadre, giocatori, duplicati)
