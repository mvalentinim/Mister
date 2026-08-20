# Il mercato (M6) — decisioni tecniche

*(linguaggio semplice, come da FRD §0; requisiti dal FRD §6.1-6.2)*

## Il cambiamento strutturale: le rose vivono nella carriera

Fino a M5 le rose erano quelle del DB statico (congelate). Da M6 la carriera
**fotografa** rose, contratti e budget alla creazione (`inizializzaMercato`)
e poi li muove coi trasferimenti: `carriera.rose` (club → id giocatori),
`carriera.contratti` (stipendio e anno di scadenza), `carriera.svincolati`,
`carriera.prestiti`, `carriera.budget`. Gli attributi restano nel DB statico
(si leggono per id). Motore, Match Day, Tattica e Rosa leggono tutti la rosa
di carriera; la cache delle squadre si invalida da sola quando una rosa cambia.

## Il mercato è mondiale

La fotografia copre **tutti i club del DB** (i 10 campionati del perimetro:
prime e seconde divisioni dei 5 grandi campionati europei, ~198 club e
~5.500 contratti), non solo la nazione in cui si gioca. Ogni club della
carriera porta `nazioneId` e `campionato`: **classifica, promozioni e
calendario filtrano per nazione** (`clubNazione` nel motore), il mercato no.
Si può quindi comprare da (e vendere a) qualunque club, e l'IA dei club fa
mercato in tutto il mondo — per tenere i tempi rapidi, ogni giorno di
mercato è un campione: 8-11 club compratori, ognuno valuta gli esuberi di
40 club scelti dal caso seminato.

La ricerca giocatori copre l'intero bacino, con filtri per campionato,
squadra (raggruppate per campionato), ruolo, nazionalità, media minima,
età massima e scadenza, e ordinamento per valore/media/scadenza/età.

I campionati esteri **non vengono simulati**: le loro rose vivono solo come
mercato (semplificazione dichiarata). I salvataggi vecchi (v5) vengono
estesi al mondo al primo accesso (`estendiMercatoAlMondo`, idempotente),
senza toccare i trasferimenti già fatti.

## Le finestre

- **Estiva** (8 giorni) all'inizio di ogni stagione; **invernale** (5 giorni)
  a metà campionato. Ogni "giorno" è un turno: l'IA opera, arrivano offerte
  e notizie. Il campionato è fermo finché la finestra non chiude
  (semplificazione dichiarata).
- Il mercato è **deterministico**: seminato con carriera+stagione+finestra+
  giorno.

## Il valore di mercato (calcolato, mai salvato — FRD §5.1)

`valoreMercato()`: curva esponenziale sulla media (gregario di B ~300k, top
~100M+), fattore età (picco 22-27, premio potenziale per i giovani), sconto
scadenza (in scadenza ×0.3), piccolo premio fama del club.

## L'IA dei club (FRD §6.1)

- **Analisi rosa**: organici minimi/massimi per reparto → ruoli **scoperti**
  ed **esuberi**; i 6 migliori sono i giocatori **chiave**.
- **Personalità economica** (deterministica per club): propensione alla
  vendita, aggressività, valorizzazione dei giovani.
- Ogni giorno 5-8 club con ruoli scoperti cercano rinforzi tra gli esuberi
  altrui e gli svincolati, nel budget; le notizie ufficiali dicono il perché
  ("serviva un rinforzo in attacco"). Trattative saltate → rumor.
- L'IA bussa anche alla porta dell'utente: offerte di **acquisto** o di
  **prestito con diritto** (più probabili per i giocatori marcati cedibili),
  da accettare o rifiutare. E l'utente può **proporre attivamente** un suo
  giocatore in vendita o in prestito ("Vendi"/"Prestito" nella rosa): se un
  club ha quel ruolo scoperto e i soldi, l'offerta arriva subito.

## La trattativa dell'utente (FRD §6.2)

Tutte e sole le 5 leve, massimo 3 round, rifiuti sempre motivati:
1. **Prezzo** — 2. **Bonus** (valgono la metà: soldi incerti) —
3. **Scadenza** (già dentro il valore: in scadenza = sconto) —
4. **Prestito** con diritto o obbligo (i titolari non partono in prestito) —
5. **Contropartite** (contano ~85% del valore se coprono un ruolo scoperto
   del venditore, altrimenti poco o rifiuto motivato).

Il club chiede di più per i giocatori chiave (fino a "incedibile" per i top-3
delle botteghe care), di meno per gli esuberi e per chi è in scadenza.
Controproposte con cifra esplicita; al 3° round si chiude comunque.

## Contratti, rinnovi, svincolati

- Rinnovo semplice (+20% stipendio, 3 anni) nel limite del monte stipendi;
  la trattativa conversazionale arriva in M7.
- A fine stagione: prestiti risolti (obbligo = riscatto; diritto = riscatto
  se il giocatore vale la metà buona della rosa ospitante), scadenze: l'IA
  rinnova i suoi top-14, gli altri si **svincolano**; gli svincolati si
  ingaggiano gratis.

## Semplificazioni dichiarate

| Semplificazione | Quando sparisce |
|---|---|
| Mercato solo tra i club della nazione della carriera | espansione futura |
| Campionato fermo a finestra aperta | rifinitura |
| Bonus non tracciati dopo la firma (sconto forfettario) | M8 |
| Il giocatore firma sempre (manca la sua volontà) | **M7** (trattativa LLM + cervello deterministico) |
| Stipendi IA non vincolati dal loro monte | rifinitura |
| Notizie solo di mercato | M8 |
