# Fama, fiducia, esoneri, coppa e crescita (M8 — nucleo)

*(linguaggio semplice, come da FRD §0; requisiti dal FRD §4)*

## Due contatori, due significati

- **Fama (0-100)** — la reputazione dell'allenatore nel mondo del calcio.
  Parte da 20, si vede sempre nell'intestazione. Ogni variazione è
  **spiegata** in un registro (`carriera.eventiFama`, FRD §12) mostrato nel
  riepilogo di fine stagione.
- **Fiducia (0-100)** — quanto la dirigenza del TUO club ti sopporta. Parte
  da 60; sotto la soglia (5, e dopo almeno 8 giornate) scatta l'**esonero**.

## Come si muove la fama

| Episodio | Delta |
|---|---|
| Vittoria di prestigio (avversario con forza ≥ +5) | +1 |
| Obiettivo stagionale raggiunto / fallito | +4 / −4 |
| Promozione / retrocessione | +8 / −6 |
| Coppa nazionale vinta | +6 |
| Giovane valorizzato (U23, ≥15 presenze, media voto ≥6.2; max 2) | +1 |
| Esonero | −10 |
| Promessa tradita (M7) | −4 |

## Come si muove la fiducia (a ogni giornata)

Vittoria +3 (+4 contro più forti), pareggio 0 (+1 contro più forti),
sconfitta −2 (−4 contro più deboli). Dalla 6ª giornata: ±1 secondo la
posizione rispetto all'obiettivo. A inizio stagione risale almeno a 55.

## Esonero e subentro

Fiducia ≤ 5 → esonero: fama −10, e sul tavolo arrivano subito 2-3 offerte
dei club in difficoltà della stessa divisione (metà bassa della classifica).
Si sceglie e si riparte in corsa: rosa, budget e obiettivo del nuovo club,
tattica ricostruita, fiducia 55. Le promesse fatte ai vecchi giocatori
decadono (non sono più i tuoi).

## Le fasce di offerte (fine stagione, FRD §4.3)

A fine stagione la fama sblocca offerte da club più forti del tuo
(0-3, deterministiche):

| Fascia | Soglia fama (in patria) | Soglia fama (all'estero) |
|---|---|---|
| Club di seconda divisione | sempre | 40 |
| Club medi di prima divisione | 40 | 50 |
| Club alti di prima divisione | 55 | 65 |
| Top club (primi 4 per forza) | 70 | 80 |

Le offerte arrivano da **tutta Europa** (le 10 leghe del perimetro): la
fascia di un club estero si giudica dentro il SUO campionato, con un
sovrapprezzo di fama (+10) perché all'estero la reputazione viaggia più
lenta. Accettando una panchina estera **a fine stagione** si trasloca:
nazione, nomi delle divisioni, calendario (con le giornate giuste: 34 in
Bundesliga, 46 in Championship…) e tabellone di coppa diventano quelli
nuovi. A stagione in corso (esonero) si resta nella propria divisione.

**Più fama, più telefonate**: il numero di offerte cresce con la fama
(1-2 per uno sconosciuto, fino a 4-5 per un allenatore da 90+), e tra le
offerte c'è **sempre almeno una della nazione in cui si lavora** (se un
club adatto esiste): restare nel proprio campionato è sempre possibile.

L'**obiettivo si rinegozia a ogni stagione** in base al rango del club nella
sua divisione: un club appena promosso chiede la salvezza, non un'altra
promozione. Semplificazione dichiarata: le nazionali arrivano più avanti
(M8 parte 3).

## Il contratto dell'allenatore

Il contratto è **pluriennale** (`carriera.contrattoAllenatore`, sempre
visibile nell'intestazione). Le offerte arrivano anche a contratto in
essere, ma **romperlo per accettarne una costa 3 punti di fama**
("Contratto rotto col …", nel registro). Dopo un esonero no: è il club ad
averti cacciato. Alla scadenza la dirigenza rinnova sempre (niente vicoli
ciechi): 2 anni con stipendio +10% se la fiducia è buona (≥35), 1 anno
"di prova" se sei in bilico.

## Scudetto e Coppa Europa (M8 parte 2)

- **Vincere la prima divisione** vale un trofeo in bacheca e +8 fama.
- I **primi 4** della prima divisione si qualificano alla **Coppa Europa**
  (+2 fama): 32 top club dei 5 campionati, eliminazione diretta, turni
  sfalsati rispetto alla coppa nazionale (dopo le giornate 7/13/17/22/27),
  rigori seminati. Vincerla vale un trofeo e **+10 fama**.
- La coppa europea esiste solo nelle stagioni in cui ci sei: se non sei
  qualificato non viene simulata (semplificazione dichiarata). Il posto è
  del club che l'ha conquistato: se a fine stagione cambi panchina, lo perdi.

## La coppa nazionale

32 squadre (tutta la prima divisione + le migliori della seconda, l'utente
sempre incluso), eliminazione diretta, 5 turni dopo le giornate 5/10/15/20/25,
pareggi risolti ai rigori (seminati). Tabellone deterministico. Vincerla vale
un trofeo in bacheca e +6 fama. Semplificazione dichiarata: anche la partita
dell'utente è simulata (niente Match Day in coppa, per ora).

## Crescita e declino dei giocatori (`src/carriera/crescita.ts`)

A fine stagione OGNI giocatore tracciato (tutte le rose del mondo +
svincolati) riceve un delta dagli attributi, in base a **quattro fattori**:

- **potenziale**: si cresce solo se la media attuale è sotto il potenziale
  del DB (e mai oltre);
- **età di gioco** (avanza con le stagioni): ≤21 → +1..+3; 22-24 → 0..+2;
  25-28 → quasi fermi; 29-31 → 0/−1; 32-34 → −1/−2; 35+ → −2/−3;
- **utilizzo**: ≥15 presenze nella tua squadra → +1;
- **prestazioni**: media voto ≥6.4 → +1.

Il DB statico non si tocca mai: il delta vive in `carriera.crescita`
(giocatoreId → punti) e si applica **in lettura** a tutti gli attributi
tecnici/fisici (la personalità resta fissa), ovunque: motore, rosa, tattica,
mercato, valore. Declino massimo accumulabile: −12 (il fondo però non
"risucchia in su" chi parte più in basso, vedi i rigenerati). Deterministico
(stesso seme → stessa evoluzione). Il riepilogo di fine stagione mostra i
movimenti della tua rosa.

## Ritiri per età e RIGENERATI (`src/carriera/ritiri.ts`)

A fine stagione i giocatori **normali** anziani appendono le scarpe:

- **38+**: ritiro certo; **35-37**: probabilità crescente (25% / 50% / 75%);
  uno **svincolato di 35+** smette sempre (nessuno lo vuole più).
- Il ritirato sparisce da rose, svincolati, contratti, prestiti e promesse;
  finisce nel registro `carriera.ritirati` col suo **picco** — l'APICE
  della carriera, non la media al ritiro già erosa dal declino: la media
  di fabbrica del DB più il massimo di crescita mai toccato (registro
  `carriera.crescitaMassima`). Esempio: Modrić valeva 88 all'apice, si
  ritira a 78 → il picco è 88.

Dopo **una stagione di pausa** arriva la **rinascita**: il ritirato torna
nel mercato come **free agent SEDICENNE** — stesso giocatore del DB, ma con
identità nuova (anno di nascita e **potenziale = picco della carriera
precedente**, sovrascritti in lettura via `carriera.rinati`) e abilità
riportate a livello da ragazzo (media ≈ picco − 22, minimo 35, con un delta
in `carriera.crescita`). Ambizioni, stipendio e valore si adeguano da soli:
dipendono tutti da età e media, ora quelle di un sedicenne. Da lì la
normale crescita di M8 lo fa risalire, un passo alla volta, verso il
campione che era. Si rinasce **una volta sola**; le **leggende** ritirate
non rinascono (hanno il loro ritiro dopo 5 stagioni, vedi mercato.md).

## Salvataggio

VersioneSchema **12** (v7: fiducia, crescita, coppa, registro fama, trofei,
esoneri, offerte; v8: Coppa Europa e contratto dell'allenatore; v9: la
nazionale; v10: impronta del DB; v11: leggende free agent e registro
ritirati; v12: ritiri per età e rigenerati; v13: il registro dei massimi
di crescita per il picco al ritiro). I salvataggi vecchi migrano da soli
(coppa dalla stagione successiva).

## La panchina della nazionale (M8 parte 3, FRD §4.3)

Oltre **fama 75** le federazioni chiamano (a fine stagione, sempre); le
**nazionali top** (fama DB ≥ 80: Spagna, Francia, Brasile…) rispondono solo
da **fama 88**. L'incarico è **esclusivo** (default del FRD): si lasciano i
club — rompere il contratto costa i soliti 3 punti di fama.

Il ciclo del CT è compresso in una stagione:
1. **Qualificazioni**: girone a 6 (andata e ritorno, 10 date) con sorteggio
   a teste di serie (al massimo un'altra big nel girone). Le prime 2 passano.
2. **Torneo internazionale a 16**: le qualificate + le migliori per fama,
   eliminazione diretta, rigori seminati.

Verdetti: campione **+12 fama e trofeo**; finalista +4; eliminato nel
torneo +1; qualificazione fallita **−6** (e la federazione ti saluta).
A fine ciclo si sceglie: **restare CT** (nuovo ciclo) o tornare ai club
(le offerte arrivano per fama, col mercato estivo aperto ad accoglierti).

Semplificazioni dichiarate: convocazioni fisse dal DB, tattica automatica,
partite simulate (niente Match Day in nazionale), il mondo dei club avanza
di una stagione (crescita giocatori e mercato) mentre sei CT.
