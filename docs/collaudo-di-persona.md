# MISTER — Collaudo di persona (DoD M0-M11)

Questa è la lista completa dei test da fare **di persona sul Mac**: copre il
debito di collaudo accumulato in tutte le milestone e il DoD finale di M11
(*"lo sviluppatore attraversa tutte le schermate e le giudica all'altezza di
un videogame moderno; una carriera completa gira in qualunque nazione senza
stonature"*).

**Come usarla:** segui l'ordine (è pensato come una partita vera), spunta le
caselle `[x]` man mano, e annota ogni stonatura direttamente qui sotto la
voce (anche solo "brutto", "lento", "non si capisce"). Alla prossima sessione
leggo il file e sistemiamo tutto. Non serve finire in un giorno.

---

## 0. Preparazione (5 minuti)

- [ ] `git pull` sul branch di sviluppo, poi `npm install`
- [ ] I test automatici passano anche sul Mac:
  - [ ] `npm run calibra` → `✅ CALIBRAZIONE SUPERATA`
  - [ ] `npm run curve` → `✅ MODELLO CURVE OK`
  - [ ] `npm run nazioni` → `✅ VERIFICA MULTI-NAZIONE SUPERATA` (dura qualche minuto)
  - [ ] `npm run build` → nessun errore
- [ ] `npm run dev` → il gioco si apre nel browser
- [ ] **Audio ON**: casse o cuffie accese (per la sezione 9)

> Consiglio: collauda in una finestra normale E in una stretta (~800px) per
> vedere se qualcosa si rompe da ridimensionata.

---

## 1. Schermata titolo — il primo colpo d'occhio

- [ ] Il logo MISTER in font pixel verde con ombra dura ti convince
- [ ] Le voci del menu entrano una dopo l'altra a scatti; al passaggio del
      mouse si "premono" (si spostano di 2px verso l'ombra)
- [ ] In basso: `audio: medio` — cliccalo 4 volte: cicla
      medio → alto → spento → basso e **ogni click fa "tic"** (tranne su spento)
- [ ] Ricarica la pagina: il livello audio scelto è ricordato
- [ ] **Giudizio §7**: uno screenshot di questa schermata a un amico farebbe
      dire "che gioco è?" e non "è un sito web"?

## 2. Database (dal menu — qui si vede tutto, niente segreti)

- [ ] Elenco squadre: tabelle da almanacco (header inchiostro, righe
      alternate, numeri monospazio), club raggruppati per nazione/campionato
- [ ] Nazionali con ★ per le qualificate al Mondiale 2026
- [ ] Leggende (Icons ★ / Heroes ☆) in fondo
- [ ] Apri una rosa (es. Inter): interruttore **Elenco / Album figurine**
  - [ ] Elenco: colonne ordinabili (clicca Età, Media…), nazionalità in ITALIANO
  - [ ] Album: la griglia di figurine mini coi VOLTI — i visi ti sembrano
        vari e credibili? (guarda 3-4 squadre di paesi diversi: Norvegia,
        Nigeria, Giappone, Brasile — il "colpo d'occhio" regionale c'è?)
- [ ] Apri una scheda giocatore: la FIGURINA (cornice nei colori del club,
      numero maglia, medaglione media, barre a scatti, POT visibile) è dritta
      e ben proporzionata
- [ ] Apri la scheda di una leggenda: cornice ORO

## 3. Editor del database (M9 + volti)

- [ ] Cerca un giocatore (min 2 lettere), apri la scheda, cambia un attributo,
      **Salva giocatore** → avviso verde; ricarica la pagina e ricontrolla:
      la modifica è rimasta (DB personalizzato in IndexedDB)
- [ ] **Pannello Figurina**: cambia pelle / capigliatura / colore / barba →
      l'anteprima si aggiorna subito
  - [ ] Le frecce ◀▶▲▼ spostano la barba/capigliatura di 1px, −/+ la
        scala del 10%, ↺ azzera
  - [ ] "Rigenera volto" estrae un viso nuovo; salva e ricontrolla che resti
- [ ] Modifica di massa su una selezione filtrata (es. +2 velocità ai portieri
      dell'Inter) → funziona e avvisa
- [ ] Crea un NUOVO giocatore e un NUOVO club → compaiono nel database
- [ ] **Squadre Legend**: creane/modificane una (min 16 giocatori, 1 portiere)
- [ ] Esporta database (.sqlite) → scarica; **Ripristina originale** →
      reimporta il file esportato → le tue modifiche tornano
- [ ] Esporta/Importa JSON → idem
- [ ] **Amichevole** dal menu: squadra Legend contro un club, la partita gira;
      prova anche il torneo fantasy a 4/8

## 4. Nuova carriera — il wizard

- [ ] Le 5 nazioni ci sono (Francia, Germania, Inghilterra, Italia, Spagna)
- [ ] Profilo: nome corto rifiutato (min 2 lettere), età con lo slider
- [ ] Le offerte dei club di seconda divisione: obiettivo, contratto,
      stipendio, budget leggibili
- [ ] Opzioni: leggende free agent (con ritardo) e squadra Legend nel
      campionato — attivale in ALMENO una carriera di prova
- [ ] Accetta un'offerta → si apre la stagione

## 5. La carriera — schermata stagione

- [ ] **HUD in alto**: barra d'inchiostro con la casacca nei colori del TUO
      club, stagione, giornata, fama, fiducia, contratto, obiettivo
- [ ] Le linguette da raccoglitore (Partite/Classifica/Mercato/Tattica/Rosa):
      l'attiva "esce" verde
- [ ] **Copia di sicurezza** dall'HUD → la ritrovi in "Carica carriera"
- [ ] Il mercato estivo è aperto: la linguetta dice "Mercato — aperto"

## 6. Mercato (M6+M7) — fai DAVVERO qualche operazione

- [ ] Il **ticker ULTIM'ORA** arancione scorre con le notizie
- [ ] Ricerca con filtri (campionato, squadra, ruolo, nazionalità in italiano,
      media, età, scadenza, ordinamenti)
- [ ] Clicca il NOME di un giocatore trovato → scheda con figurina:
  - [ ] **POT ??** (nascosto!) e SOLO la curva verde "carriera reale",
        con la dicitura "potenziale e previsione: riservati"
- [ ] **Compra un giocatore**: trattativa a 5 leve (prezzo, bonus, prestito,
      riscatto/obbligo, contropartita), max 3 round, rifiuti motivati
  - [ ] All'accordo parte il dialogo d'ingaggio (offline a scelte multiple);
        se hai la chiave API salvata, prova anche la modalità IA
  - [ ] Alla firma: notizia UFFICIALE, **suono "din-din"**, e da quel momento
        la sua scheda mostra POT e curva prevista (ora è tuo!)
- [ ] Vendi/presta un tuo giocatore; segna un cedibile; rinnova un contratto
      in scadenza (riga evidenziata con `!`)
- [ ] Accetta un'offerta ricevuta da un club IA → suono e notizia
- [ ] Ingaggia uno svincolato
- [ ] "Fino a chiusura" → il campionato si sblocca

## 7. Tattica (M4)

- [ ] Campo verde pieno, moduli, mentalità/pressing/ampiezza/ritmo
- [ ] Clicca uno slot: pannello con i candidati e l'idoneità colorata
      (ottima/buona/scarsa/pessima); i movimenti prevalenti si impostano
- [ ] Cambia modulo → la disposizione sul campo segue
- [ ] Ripristina default → torna tutto

## 8. Match Day (M5) — la schermata Hero, prova TUTTO

- [ ] **Fischio d'inizio** all'avvio
- [ ] Scoreboard pixel: casacche dei colori giusti, gol gialli, cronometro
      verde; sul gol **lampeggia** e senti il **boato** (mormorio cupo se
      segnano loro)
- [ ] I gettoni hanno il numero di maglia dentro; nomi ospiti sopra/casa
      sotto (mai accavallati); la squadra in possesso "spinge" avanti
- [ ] Ticker televideo sopra il campo, oro sugli eventi clou
- [ ] Telecronaca fitta sulle azioni, pagelle live coi voti colorati per fascia
- [ ] Cartellino → **fischio**; a fine primo tempo pausa automatica + fischio
- [ ] **In pausa**: fai un CAMBIO (entra in campo davvero) e cambia
      mentalità/ritmo → la partita ne risente
- [ ] Velocità 1x/2x/3x/5x
- [ ] Al 90': **triplice fischio**, statistiche finali, "Torna alla stagione"
      → il risultato del Match Day è quello ufficiale in classifica

## 9. Suoni (§5) — spunta quando li hai SENTITI

- [ ] Tic sui bottoni (ovunque)
- [ ] Fischio d'inizio / intervallo / cartellini
- [ ] Triplice fischio finale
- [ ] Boato gol nostro / mormorio gol subito
- [ ] Din-din del mercato (firma o offerta accettata)
- [ ] Jingle dorato (trofeo/promozione — arriverà a fine stagione)
- [ ] Ronzio negativo (retrocessione/esonero — se capita)
- [ ] Con audio "spento" TUTTO tace; il volume "mai invadente" ti pare giusto?

## 10. Stagione intera e verdetti (M8)

- [ ] Simula giornate (singole e "fino a fine stagione"); la corsa si ferma
      da sola al mercato di gennaio
- [ ] **Classifica**: filetti verdi sulle prime 3 (promozione, in 2ª divisione)
      o rossi sulle ultime 3 (in 1ª), la tua riga evidenziata, didascalia
- [ ] Coppa nazionale: i turni si giocano dopo le giornate giuste
- [ ] Spogliatoio: i messaggi dei giocatori (morale, promesse) hanno senso
- [ ] **Fine stagione**: riepilogo con posizione, obiettivo, bilancio fama
      spiegato, crescita della rosa (chi sale/chi scende)
- [ ] Se promosso/coppa vinta: **jingle dorato** + albo d'oro nella
      linguetta Partite (anni in oro)
- [ ] Offerte di club migliori se la fama sale; "Resta al club" funziona
- [ ] La stagione nuova riparte: calendario nuovo, mercato estivo aperto

## 11. La curva di crescita (M11 — il grafico nuovo)

- [ ] Dalla **Rosa** clicca un giocatore GIOVANE della tua squadra:
  - [ ] Figurina con POT visibile + grafico: curva PREVISTA tratteggiata
        (sale verso il filetto oro POT, picco, declino) e curva REALE verde
        fino all'età di oggi
- [ ] Un VETERANO (34+): parabola completa già disegnata, declino tratteggiato
- [ ] **Dopo 2-3 stagioni**: riapri lo stesso giovane — la curva verde si è
      allungata di un punto a stagione e può stare sopra o sotto la prevista
      (gioca titolare un giovane e tienilo d'occhio: cresce più in fretta?)
- [ ] Un giocatore COMPRATO: la sua storia parte dalla firma
- [ ] Le curve ti sembrano leggibili e "da videogame"? (colori, spessori,
      finestra 16-40 anni)

## 12. Carriera lunga (2-4 stagioni, anche simulando veloce)

- [ ] Esonero (se capita o te lo procuri perdendo apposta): schermata offerte,
      accetti e riparti col nuovo club (HUD coi colori nuovi)
- [ ] Chiamata della federazione con fama alta: il ciclo CT (qualificazioni,
      torneo, verdetto) gira e si torna ai club
- [ ] Coppa Europa l'anno dopo un piazzamento nei primi 4
- [ ] **Ritiri e RIGENERATI**: dopo qualche stagione un anziano si ritira e
      rinasce sedicenne — controlla nella sua scheda che il potenziale sia
      quello del DB e che la curva lo faccia risalire verso il suo tetto
- [ ] Leggende free agent (se attivate): entrano nell'anno promesso e le
      convince il progetto, non i soldi

## 13. Salvataggi e portabilità (M10 — serve il secondo dispositivo/browser)

- [ ] Il salvataggio automatico c'è sempre (chiudi il browser a metà
      stagione, riapri: sei dove eri)
- [ ] Duplica una carriera con un nome; caricala: è il momento fotografato
- [ ] **Esporta .mister** → apri il gioco in UN ALTRO browser (o sul
      secondo computer) → **Importa**: la carriera riprende identica
- [ ] Se la carriera usa un DB personalizzato: l'import offre di installarlo
      e al termine tutto combacia (niente avviso di incoerenza)
- [ ] L'avviso di incoerenza compare invece quando DEVE (carriera nata con un
      DB diverso da quello attivo)
- [ ] Elimina una carriera di prova: chiede conferma e sparisce

## 14. Multi-nazione di persona (DoD M11)

- [ ] Avvia una carriera breve in una nazione NON ancora provata a mano
      (consiglio: Spagna o Francia) e giocaci 3-4 giornate + un Match Day:
      nomi, squadre, coppe e mercato senza stonature

## 15. Giudizio finale (il DoD vero di M11)

- [ ] Attraversa TUTTE le schermate una dopo l'altra e per ognuna chiediti:
      "sembra un videogame del 2026 o un sito web?" — annota qui quelle che
      stonano e PERCHÉ (anche a sensazione)
- [ ] I volti/figurine ti piacciono abbastanza da tenerli così?
- [ ] I suoni: da tenere, ritoccare o togliere?
- [ ] C'è qualcosa che un giocatore nuovo NON capirebbe senza spiegazioni?

---

## Appunti liberi (scrivi qui, poi li leggo io)

- …

---

## Facoltativo: l'app nativa (Tauri)

Solo se vuoi provare l'app desktop (serve Rust installato, vedi
`docs/tauri-e-cloud.md`):

- [ ] `npm run tauri dev` → il gioco in finestra nativa
- [ ] Esporta un file .mister dall'app nativa: usa la finestra di salvataggio
      di sistema
