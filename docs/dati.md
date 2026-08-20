# Fonti dati e pipeline di importazione

*(M1 — documento vivo: si aggiorna a ogni decisione sulle fonti)*

## Obiettivo

Popolare il database con **tutte le squadre di Serie A e Serie B con rose complete** e attributi plausibili sulla scala 1-99 (DoD della milestone M1). Le fonti devono essere **aperte** (il FRD §5.3 vieta di estrarre contenuti da mod di terze parti).

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

## Strategia proposta (da confermare con lo sviluppatore)

Nessuna fonte da sola basta: la strategia è una **combinazione**.

1. **Scheletro** (club + rose + anagrafiche) da **openfootball** o da un dataset Kaggle con copertura A+B verificata.
2. **Attributi 1-99** da un dataset Kaggle di attributi, agganciando i giocatori per nome+data di nascita; per i giocatori non trovati, **generazione procedurale plausibile** (in base a ruolo, età e divisione), dichiarata nel documento.
3. **Calendari** (per M2) da football-data.org per la Serie A; per la B, calendario generato con l'algoritmo classico dei gironi (round-robin) se la fonte non lo copre.
4. Ogni passo scritto come **script in `data/`** rilanciabile con un comando, con report finale: numero squadre, giocatori per squadra, duplicati trovati (DoD di M1).

> ⚠️ **Protocollo risorse esterne (FRD §0.2):** nessun download è ancora stato fatto. Prima di importare, Claude Code presenta allo sviluppatore la fonte scelta con link e licenza, e l'import si esegue e si verifica insieme.

## Stato

- [x] Valutazione preliminare delle fonti (questo documento)
- [ ] Verifica concreta di copertura e licenze delle fonti candidate
- [ ] Scelta della combinazione definitiva con lo sviluppatore
- [ ] Script di importazione + mappatura attributi documentata campo per campo
- [ ] Verifica dei totali (squadre, giocatori, duplicati)
