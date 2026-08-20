# Il motore di simulazione (M3) — studio e progetto

*(linguaggio semplice, come da FRD §0; riferimenti del FRD §9.7)*

## Cosa abbiamo imparato dai riferimenti

### ESMS / ESMS+ (Electronic Soccer Management Simulator)
Storico motore open per manageriali testuali (github: cercare "esms").
**Idea presa**: l'architettura a **minuti ed eventi** — la partita è un ciclo
sui 90 minuti; a ogni minuto può nascere un'azione, decisa da valori aggregati
di squadra (attacco/centrocampo/difesa) calcolati dagli 11 in campo; ogni
evento ha un protagonista estratto in base a ruolo e abilità. Anche l'idea
della cronaca testuale generata dagli eventi viene da lì.

### Bygfoot (bygfoot.sourceforge.net)
Manageriale open source completo.
**Idea presa**: la semplicità dei **valori di reparto** (una squadra si
riassume in poche forze aggregate) e la struttura stagione/carriera attorno al
motore. Conferma che un buon manageriale non ha bisogno di simulare 22 corpi
fisici: bastano probabilità ben calibrate.

### Dixon-Coles / distribuzioni di Poisson
Il modello statistico classico sul calcio (Dixon & Coles, 1997).
**Idee prese**:
1. i gol seguono una **distribuzione di Poisson** con medie che dipendono da
   forza d'attacco, forza di difesa e **fattore campo** — il nostro motore la
   riproduce "dal basso": tante azioni indipendenti con probabilità piccole;
2. i **punteggi bassi sono correlati** (i pareggi reali sono più frequenti di
   quanto direbbe la Poisson pura — il loro parametro ρ): noi otteniamo lo
   stesso effetto simulando il comportamento reale che lo causa, cioè le
   squadre che rischiano meno nel finale in parità;
3. i valori di riferimento per la calibrazione (gol/partita ~2.6-2.9,
   casa/pareggio/trasferta ~45/26/29%).

**Nessun codice è stato copiato**: abbiamo studiato le idee (FRD §9.7).

## Architettura del nostro motore (src/motore/)

```
preparazione.ts  →  dal DB agli 11 titolari (4-4-2 in M3) e alle forze
                    di reparto: attacco, centrocampo, difesa, portiere
rng.ts           →  casualità DETERMINISTICA (xmur3 + mulberry32):
                    stesso seme = stessa sequenza = stessa partita
partita.ts       →  il ciclo dei 90 minuti: possesso → azione → esito
tipi.ts          →  eventi, statistiche, voti: ciò che il motore produce
calibra-cli.ts   →  il test di calibrazione (npm run calibra)
```

Il flusso di un minuto in `partita.ts`:
1. **chi domina**: probabilità dal confronto centrocampi + fattore campo
   (+ malus per chi è in 10) → alimenta anche il possesso palla;
2. **nasce un'azione?** (~21 a partita); se sì la qualità dell'occasione
   viene da attacco vs difesa + livello assoluto dell'attacco;
3. **esito a catena**: murata dalla difesa → tiro fuori → parata → GOL,
   con il tiratore estratto per ruolo/abilità e l'assist al 65%;
4. **disciplina e infortuni**: ammonizioni (~1.9/squadra), doppi gialli,
   espulsioni dirette, infortuni;
5. **realismo dei finali**: sopra i 4 gol o con 3 di vantaggio si toglie il
   piede dal gas; in parità dopo il 75' si rischia meno (effetto ρ).

Prodotti: flusso eventi con minuto e protagonisti, statistiche (possesso,
tiri, tiri in porta, xG), marcatori con assist, **voti 4-10** per tutti.

Il **seme** di ogni partita di carriera è `semeCarriera-anno-giornata-squadre`:
rigiocare la stessa giornata della stessa carriera dà lo stesso risultato.

## Calibrazione

`npm run calibra` simula 10 stagioni complete di Serie A e Serie B (7.600
partite) e verifica: determinismo, gol/partita, % casa/pareggio/trasferta,
punti del campione e dell'ultima, gol del capocannoniere, assenza di punteggi
assurdi. I valori attesi e l'ultimo esito:

| Metrica | Atteso | Serie A | Serie B |
|---|---|---|---|
| Gol a partita | 2.40–3.00 | 2.68 ✅ | 2.94 ✅ |
| Vittorie in casa | 40–50% | 45% ✅ | 45% ✅ |
| Pareggi | 22–32% | 26% ✅ | 27% ✅ |
| Punti campione (Serie A) | 75–98 | 85 ✅ | 74 |
| Gol capocannoniere | 15–32 | 27 ✅ | 28 ✅ |
| Risultato più frequente | 1-0 / 1-1 | 1-1 ✅ | 1-1 ✅ |

Se una modifica al motore fa uscire una metrica dagli intervalli, il test
fallisce (exit code 1): i parametri da ritoccare sono tutti nell'oggetto
`PARAMETRI` in cima a `partita.ts`.

## Il motore "a tappe" (M5)

Per il Match Day interattivo il motore espone anche un'interfaccia a tappe:

```ts
const partita = creaPartita(casa, trasferta, seme)
partita.avanzaMinuto()      // gioca un minuto, restituisce i suoi eventi
partita.votiLive('casa')    // pagelle in tempo reale
partita.sostituisci(...)    // cambio (max 3): ricalcola le forze di reparto
partita.regola(...)         // mentalità e ritmo a partita in corso
partita.risultatoFinale()   // punteggio, eventi, statistiche, voti, pagelle
```

`simulaPartitaMotore` (campionato, calibrazione) è un involucro che fa gli
stessi identici passi senza interventi: i risultati non cambiano, e una
partita guardata senza toccare nulla è identica a una simulata in blocco.
Dopo una sostituzione le forze di reparto vengono ricalcolate con le stesse
regole della preparazione (`ricalcolaForze`), ri-applicando il delta di
movimenti+istruzioni registrato a inizio partita (approssimazione dichiarata).

## Cosa NON fa ancora (arriva dopo)

- forma e morale dinamiche → M8
- infortuni con durata e indisponibilità → annotato in IDEE-FUTURE
- cambi delle squadre IA durante la partita → rifinitura futura
