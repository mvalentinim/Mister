# Tattiche e movimenti prevalenti (M4) — decisioni tecniche

*(linguaggio semplice, come da FRD §0; requisiti dal FRD §8)*

## Cosa può fare l'allenatore

Nella linguetta **Tattica** della carriera:
1. **Modulo**: 4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 3-4-3, 5-3-2. Cambiarlo
   ricostruisce il miglior undici e i movimenti di default.
2. **Undici titolare**: click su uno slot del campo → tendina con la rosa
   (ordinata per idoneità allo slot); chi è già titolare si scambia il posto.
3. **Movimenti prevalenti** (max 2 offensivi + 2 difensivi per slot, FRD
   §8.2): vocabolario chiuso per ruolo con l'**idoneità** del giocatore
   mostrata accanto (ottimo/buono/scarso/inadatto) e le **frecce sul campo**
   (oro = offensivi, grigio tratteggiato = difensivi).
4. **Istruzioni di squadra** (FRD §8.3, solo 4): mentalità, pressing,
   ampiezza, ritmo.

Ogni modifica si salva subito e vale dalla prossima partita. Le squadre IA
usano il default: 4-4-2, miglior undici, movimenti base.

## Come la tattica entra nel motore

Tutto succede in `src/motore/preparazione.ts`:

- **Reparti per posizione**: il reparto di uno slot si decide da DOVE sta
  sul campo (x < 30 difesa, < 56 centrocampo, oltre attacco), non dal nome
  del ruolo: le ali alte di un 4-3-3 contano come attacco.
- **Il numero di uomini conta**: più difensori = più copertura (peso forte),
  più punte = più attacco, centrocampo più morbido (conta la qualità).
- **Fuori ruolo**: un giocatore schierato in un reparto non suo rende ×0.92.
- **Movimenti**: effetto sui reparti × **fattore di idoneità** del giocatore
  (media degli attributi chiave: sopra ~62 rende, sotto DANNEGGIA — è la
  conseguenza voluta dal FRD: si compra sul mercato in funzione dei movimenti
  che si vogliono giocare). Tetto complessivo ±8 per reparto. I movimenti
  "da tiratore" (taglio interno, attacco della profondità, inserimento)
  portano il giocatore a concludere più spesso.
- **Istruzioni**: mentalità sposta pericolosità/copertura (±5), pressing
  scambia centrocampo e spazi concessi, ampiezza scambia attacco e
  centrocampo, ritmo modula la frequenza delle azioni della partita.

## Il test comparativo (DoD di M4)

`npm run confronta-tattiche` simula 1.200 partite per configurazione tra le
stesse due squadre cambiando UNA cosa alla volta, e verifica le direzioni:

| Confronto | Esito atteso | Ultimo esito |
|---|---|---|
| Mentalità molto offensiva vs molto difensiva | più gol fatti E subiti | ✅ 1.41>1.06 fatti, 1.58>1.36 subiti |
| Movimenti adatti vs inadatti ai giocatori | più xG e bilancio migliore | ✅ xG 1.38>1.26 |
| Modulo 5-3-2 vs 4-3-3 | meno gol subiti | ✅ 1.24<1.28 |

Anche la calibrazione generale (`npm run calibra`) resta verde dopo M4
(ritoccati `qualitaBase` 0.35→0.31 e il bonus tiratore, perché i movimenti
default hanno alzato la pericolosità media di tutte le squadre).

## Semplificazioni dichiarate

- Trascinamento dei giocatori sul campo: per ora la selezione è click +
  tendina (il drag arriverà con la rifinitura visuale).
- Cambi durante la partita e condizione fisica: M5+/M8.
- I movimenti influenzano le forze di squadra e chi conclude; la
  visualizzazione dei movimenti nel Match Day (traiettorie dei gettoni)
  arriverà con la M5 piena.
