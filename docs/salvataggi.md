# Salvataggi, ciclo di vita e file .mister (M10)

Questo documento fissa le regole del ciclo di vita di una carriera:
quando si salva, come si ricomincia, se esiste un "game over", e come una
carriera viaggia tra browser e computer diversi (FRD §11).

## Il salvataggio automatico (la regola di fondo)

**MISTER salva da solo, sempre.** Ogni azione che cambia lo stato della
carriera (una partita, un giorno di mercato, una firma, una promessa…)
scrive subito in IndexedDB, il database interno del browser. Non esiste il
"tasto salva" classico, perché non esiste il rischio di perdere progressi:
chiudere la pagina è sicuro in qualunque momento.

## Gli slot: più carriere in parallelo

Ogni carriera è uno **slot indipendente** nella lista "Carica carriera":
si possono avere quante carriere si vuole, in nazioni diverse, con DB
diversi. Da lì si **elimina** (con conferma: è per sempre) e si
**duplica**.

## La copia manuale (il "salvataggio manuale")

Siccome l'automatico scrive di continuo, il salvataggio manuale ha un
significato diverso dal solito: **congelare un momento**. Il bottone
"💾 Copia di sicurezza" (nella schermata carriera) e "Duplica" (nella
lista) creano un nuovo slot con un'etichetta a scelta (📌): si continua a
giocare sull'originale e, se le cose vanno male, si riparte dalla copia.
È il modo giusto di "salvare prima di una decisione rischiosa".

## Game over e restart (approfondimento chiesto dal piano)

**Un game over forzato NON esiste**, per scelta di design (FRD §4.4):

- l'**esonero** non chiude la carriera: arrivano subito offerte dai club
  in fondo alle classifiche, si riparte più in basso;
- la **fama** può scendere, ma le offerte di fine stagione garantiscono
  sempre almeno una panchina della propria nazione;
- il **contratto** dell'allenatore viene sempre rinnovato alla scadenza
  (magari di un solo anno, se la dirigenza non è convinta).

La carriera finisce solo quando lo decide chi gioca: si **elimina** lo
slot, si **riparte da una copia**, o si apre una **nuova carriera** in un
altro slot. Il "restart" è quindi: nuova carriera (da zero) oppure
ritorno a una copia di sicurezza (da un momento congelato).

## Il file .mister (esportare e importare una carriera)

Dalla lista "Carica carriera":

- **Esporta** scarica la carriera come singolo file `.mister` — un JSON
  con `tipo`, `formato`, la carriera completa (con la sua
  `versioneSchema`) e, se la carriera gioca con un **database
  personalizzato**, il database intero incluso in base64: sul nuovo
  computer non deve mancare niente.
- **⬆ Importa da file** legge un `.mister`, fa passare la carriera dalle
  **stesse migrazioni** dei salvataggi normali (un file esportato oggi si
  aprirà anche nelle versioni future del gioco) e crea un **nuovo slot**:
  mai sovrascrivere quelli esistenti (se l'id è già occupato, la carriera
  importata ne riceve uno nuovo).

### Coerenza col database (FRD §11)

Ogni carriera ricorda l'**impronta** del DB con cui è nata
(`dbImpronta`; 0 = originale). All'import:

- carriera nata col DB **originale** → si gioca subito;
- carriera nata con un DB **personalizzato** e il file lo contiene → il
  gioco **offre di installarlo** (sostituisce l'eventuale DB
  personalizzato del browser, con conferma, e ricarica la pagina);
- se si rifiuta l'installazione (o il file non contiene il DB) → si può
  giocare lo stesso, ma la schermata carriera mostra il solito avviso di
  incoerenza: nomi e attributi potrebbero non corrispondere.

## App nativa e cloud

Il packaging **Tauri** (app macOS nativa) e la sincronizzazione tra
computer via cartella cloud sono descritti passo passo in
[tauri-e-cloud.md](tauri-e-cloud.md). Nell'app nativa l'export usa la
vera finestra "Salva con nome" del sistema (vedi `src/scarica.ts`).
