# DESIGN.md — Direzione Artistica di MISTER
## Stile: "Almanacco" — retrò anni '90 su fondo chiaro

**Versione:** 1.0 · Documento gemello di `requisiti-funzionali-MISTER.md`
**Da leggere a ogni sessione che tocca la UI.**

---

## 0. ISTRUZIONI PERMANENTI PER CLAUDE CODE

1. Questo documento **prevale sui default**: niente estetica da template web, niente componenti standard con il loro stile predefinito, niente dashboard aziendale. Ogni schermata deve sembrare un videogame, non un sito.
2. Usare la skill di frontend design quando disponibile, con questo documento come brief vincolante.
3. **Metodo del campione di stile:** ogni evoluzione grafica si sperimenta prima sulla schermata-eroe (Scheda Giocatore, poi Match Day). Solo quando lo sviluppatore la approva, lo stile si propaga alle altre schermate tramite i design token — mai stili scritti a mano schermata per schermata.
4. Lo sviluppatore fornirà screenshot dell'app: Claude Code deve criticarli confrontandoli con questo documento e proporre correzioni concrete.
5. Tutti i valori di questo documento vivono in **design token** (CSS variables + config Tailwind) in un unico file `src/design/tokens.css`. Cambiare un token cambia tutto il gioco.

---

## 1. FILOSOFIA: "L'ALMANACCO"

Il riferimento non è il broadcast TV moderno (FC26) né il gestionale scuro (FM). È la **cultura cartacea del calcio anni '90**:

- **Album di figurine**: card giocatore come figurine — cornice spessa, colori sociali, nome in maiuscolo condensato.
- **Almanacco / guida al campionato**: tabelle fitte ma ordinate, righe alternate, numeri grandi.
- **Giornale sportivo**: titoli urlati, gerarchia tipografica fortissima, riquadri con filetti neri.
- **Videogame 16-bit su chiaro** (SWOS, Amiga): colori pieni e saturi, bordi netti, zero sfumature morbide, pixel art come accento.

**Tre leggi visive, sempre valide:**
1. **Fondo chiaro carta, mai bianco puro.** Il bianco assoluto è "sito web"; la carta è calda.
2. **Bordi netti e ombre dure.** Niente ombre sfumate (`box-shadow` morbide), niente angoli molto arrotondati, niente glassmorphism. L'ombra è piena, spostata, senza blur — come una stampa.
3. **Colore pieno, mai gradiente.** I gradienti morbidi sono vietati; ammessi solo riempimenti piatti e retini/pattern (righe, punti) in stile stampa.

---

## 2. PALETTE (design token)

### 2.1 Base carta
| Token | Hex | Uso |
|---|---|---|
| `--paper` | `#F4EFE3` | Sfondo principale (carta crema) |
| `--paper-2` | `#EAE3D2` | Pannelli, righe alternate tabelle |
| `--paper-3` | `#DDD4BE` | Bordi soft, separatori |
| `--ink` | `#1A1A1A` | Testo principale e bordi (quasi-nero inchiostro) |
| `--ink-2` | `#5A5648` | Testo secondario |

### 2.2 Accenti (saturi, da stampa)
| Token | Hex | Uso |
|---|---|---|
| `--green-pitch` | `#2E7D32` | Colore identitario del gioco: campo, conferme, CTA principali |
| `--red-card` | `#C62828` | Errori, sconfitte, cartellini, valori negativi |
| `--gold` | `#C9A227` | Trofei, fama, eventi speciali, stelle |
| `--blue-euro` | `#1854A6` | Link/azioni secondarie, coppe europee |
| `--orange-hot` | `#E65100` | Notifiche mercato, urgenze |

### 2.3 Colori dinamici del club
- Quando l'utente gestisce un club, `--club-primary` e `--club-secondary` (dal database) tingono: barra superiore, cornici delle card, dettagli della schermata rosa. **Il gioco cambia veste con la squadra: è un requisito, non un dettaglio.**
- Regola di leggibilità: i colori del club si usano su superfici delimitate (barre, cornici, badge), mai come sfondo di testi lunghi.

### 2.4 Codifica valori (attributi, voti, forma)
Scala fissa a 5 fasce, sempre coerente in tutto il gioco:
`1–45` rosso `--red-card` · `46–60` arancio `--orange-hot` · `61–74` inchiostro neutro · `75–87` verde `--green-pitch` · `88–99` oro `--gold` (con bordo).
I numeri delle fasce alte si mostrano **grandi e orgogliosi**: i numeroni sono metà dell'estetica.

---

## 3. TIPOGRAFIA (design token)

| Token | Font (Google Fonts) | Uso |
|---|---|---|
| `--font-display` | **Archivo Black** | Titoli, nomi squadre, punteggi, numeroni (voti, attributi, prezzi) |
| `--font-heading` | **Archivo Condensed** (o Oswald) | Sottotitoli, intestazioni tabelle, etichette — MAIUSCOLO con letter-spacing |
| `--font-body` | **Inter** (o IBM Plex Sans) | Testo corrente, telecronaca, dialoghi |
| `--font-pixel` | **Press Start 2P** o **Silkscreen** | SOLO accenti retrò: logo MISTER, badge, scoreboard del Match Day, easter egg. Mai per testi lunghi. |
| `--font-mono` | **IBM Plex Mono** | Dati tabellari fitti, statistiche, date |

Regole: gerarchia estrema (i titoli sono 3–4 volte il corpo, come un giornale sportivo); punteggi e voti sempre in `--font-display`; le etichette sempre MAIUSCOLE condensate.

---

## 4. COMPONENTI — LINGUAGGIO VISIVO

### 4.1 Regole globali
- **Bordo standard:** `2px solid var(--ink)`; raggio angoli max `4px` (o `0` per lo stile più duro).
- **Ombra dura:** `box-shadow: 4px 4px 0 var(--ink)` (piena, senza blur). Al hover l'elemento "si preme": ombra a `2px 2px` e translate di 2px.
- **Pattern di stampa** ammessi per riempire aree vuote: righe diagonali sottili, retino a punti, al 5–8% di opacità inchiostro.
- Vietati: gradienti morbidi, glassmorphism, ombre sfumate, angoli molto arrotondati, grigi freddi da dashboard, emoji come icone.

### 4.2 La Figurina (scheda giocatore — componente eroe)
- Card verticale con cornice spessa nei colori del club, nome in `--font-heading` maiuscolo, ruolo come badge pieno, numero di maglia gigante in `--font-display`.
- Ritratto: **avatar procedurale in pixel art** (generato da seed del giocatore: carnagione, capelli, barba) — coerente, senza licenze, perfettamente in stile. In alternativa silhouette su fondo colori club.
- Attributi come barre piene squadrate con numero grande a fianco, colorati per fascia (§2.4).
- La stessa figurina, in formato mini, è la rappresentazione del giocatore ovunque (mercato, tattica, formazioni).

### 4.3 Tabelle da almanacco
- Righe alternate `--paper`/`--paper-2`, intestazioni in `--font-heading` maiuscolo su fondo `--ink` con testo carta.
- Numeri in `--font-mono`, allineati a destra; ordinabili con indicatore a triangolo pieno.
- La classifica ha i filetti orizzontali per le zone (promozione in verde, retrocessione in rosso) come nei giornali.

### 4.4 Bottoni e navigazione
- Bottone primario: fondo `--green-pitch`, testo carta, bordo e ombra dura; premuto = ombra ridotta.
- Navigazione principale a **linguette da raccoglitore** (tab spesse con bordo, la attiva "esce" dal bordo del pannello).
- La barra superiore mostra: stemma/colori club, data di gioco, budget, fama — sempre visibili, come un HUD.

### 4.5 Match Day (seconda schermata eroe)
- Campo verde pieno con linee bianche nette, gettoni giocatori con numero, palla ben visibile: leggibilità alla SWOS.
- **Scoreboard in `--font-pixel`** in alto: squadre, punteggio, minuto — è il momento in cui il retrò esplode.
- Controlli velocità (1x/2x/3x/5x) come pulsantiera fisica a segmenti.
- La telecronaca delle azioni importanti appare come **striscia sovrapposta stile televideo/ticker**: fondo inchiostro, testo carta, un rigo alla volta.
- Pagelle live come colonnina di mini-figurine con voto in numerone colorato.

### 4.6 Trattative (dialogo LLM)
- Il dialogo con il giocatore come **intervista di giornale**: domande dell'allenatore in corsivo, risposte del giocatore in tondo, foto-avatar pixel a lato.
- Il riepilogo offerta sempre visibile come "contratto" su carta più chiara con timbri/badge per le promesse riconosciute.

---

## 5. MOTION E SUONO (il 20% che fa videogame)

- **Transizioni schermata:** rapide e decise (150–200ms), stile cambio pagina — niente dissolvenze lente.
- **Animazioni a scatti (stepped):** le barre attributi si riempiono a step, i numeri contano a scatti — effetto 16-bit, non easing morbido.
- **Eventi celebrati:** gol nel Match Day = scoreboard che lampeggia + striscia telecronaca; promozione/trofeo = schermata dedicata con `--gold`, coriandoli pixel.
- **Suono (Tone.js o file audio):** click secco sui bottoni, fischio d'inizio, boato breve sui gol, jingle su trofei e colpi di mercato. Volume regolabile, mai invadente. Anche solo 6–8 suoni trasformano la percezione.

---

## 6. REGOLE PER SCHERMATA (riassunto operativo)

| Schermata | Elementi obbligatori di stile |
|---|---|
| Home carriera | HUD superiore con colori club; notizie come ritagli di giornale |
| Rosa | Tabella almanacco + vista alternativa a griglia di figurine |
| Tattica | Campo verde pieno, mini-figurine trascinabili, frecce movimenti spesse e nette |
| Mercato | Obiettivi come figurine; rumor come ticker; trattativa club-club come "telex" |
| Match Day | §4.5 completo |
| Classifiche | Filetti zone promozione/retrocessione; forma come pallini pieni V/N/P |
| Profilo allenatore | Fama come pagina d'albo d'oro: timeline trofei in `--gold` |
| Editor | Stesso linguaggio, densità più alta ammessa |

---

## 7. PROCESSO DI ADOZIONE (per Claude Code)

1. Creare `src/design/tokens.css` con tutti i token di questo documento + config Tailwind mappata sui token.
2. Costruire la **Figurina** (§4.2) e farla approvare allo sviluppatore iterando su screenshot.
3. Ristilizzare il **Match Day** (§4.5) e farlo approvare.
4. Propagare alle altre schermate nell'ordine del §6, una per sessione, con verifica visiva dello sviluppatore.
5. Aggiungere motion (§5) e infine il suono.
6. Ogni nuova schermata futura nasce già dai token: il default del progetto ora è questo documento.

**Definition of Done della trasformazione:** uno screenshot di MISTER mostrato a un amico non deve far dire "è un sito web" ma "che gioco è questo?".
