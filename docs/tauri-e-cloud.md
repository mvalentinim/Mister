# MISTER come app macOS (Tauri) e sincronizzazione cloud (M10)

MISTER resta un gioco web, ma con **Tauri** diventa anche un'app macOS
nativa: una finestra propria, l'icona nel Dock, i salvataggi sul tuo Mac.
La cartella `src-tauri/` del repository contiene già tutto il necessario;
la compilazione però **può avvenire solo su un Mac** (Apple non permette
di costruire app macOS da altri sistemi), quindi questi passi li esegui
tu, una volta sola, quando hai il computer davanti.

## 1. Preparare il Mac (una volta sola)

Apri il Terminale (⌘+spazio, scrivi "Terminale") e incolla questi comandi
uno alla volta:

```sh
# gli strumenti di sviluppo Apple (se già installati, dirà "already installed")
xcode-select --install

# Rust, il linguaggio con cui è fatto l'involucro nativo di Tauri
# (alla domanda, scegli l'installazione standard: tasto Invio)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# chiudi e riapri il Terminale, poi verifica:
cargo --version
```

Se `cargo --version` risponde con un numero di versione, sei pronto.

## 2. Provare l'app in sviluppo

Dalla cartella del progetto:

```sh
npm install        # la prima volta, o dopo un aggiornamento
npm run tauri:dev  # apre MISTER in una finestra nativa
```

La prima esecuzione compila la parte Rust e può richiedere **diversi
minuti**: è normale, le volte successive è rapida.

## 3. Costruire l'app vera e propria

```sh
npm run tauri:build
```

Alla fine trovi:

- l'app: `src-tauri/target/release/bundle/macos/MISTER.app`
  → trascinala nella cartella **Applicazioni**;
- il disco di installazione: `src-tauri/target/release/bundle/dmg/MISTER_…dmg`
  → comodo da passare a un altro Mac.

Al primo avvio macOS potrebbe avvisare che l'app non è "firmata" (la
firma richiede un account sviluppatore Apple a pagamento): tasto destro
sull'app → **Apri** → Apri. Serve solo la prima volta.

## 4. Dove stanno i salvataggi dell'app nativa

Come nel browser, l'app salva da sola in un database interno (IndexedDB
della WebView di macOS), dentro la libreria utente del Mac — al riparo da
cancellazioni accidentali della cronologia del browser. **Attenzione**:
browser e app nativa NON vedono gli stessi salvataggi (sono due "case"
diverse). Per passare una carriera dall'uno all'altra si usa il file
`.mister` (Esporta / Importa, vedi docs/salvataggi.md) — nell'app nativa
il bottone Esporta apre la vera finestra "Salva con nome" del sistema.

## 5. Sincronizzare tra più computer via cloud

La via consigliata è la più semplice: **i file .mister in una cartella
cloud** (iCloud Drive, Google Drive, Dropbox…).

1. Crea una cartella, ad es. `iCloud Drive/MISTER salvataggi`.
2. A fine sessione di gioco: **Esporta** la carriera e salva il file lì
   (sovrascrivendo il precedente, o tenendo le date nel nome come storico).
3. Sull'altro computer: **Importa da file** dalla stessa cartella e
   continua a giocare. Se la carriera usa un DB personalizzato, è già
   dentro il file: il gioco offre di installarlo.

Regola d'oro: **una sola "copia di lavoro" alla volta** — esporta quando
smetti su un computer, importa quando riprendi sull'altro. L'import non
sovrascrive mai gli slot, quindi al massimo ti ritrovi uno slot doppio da
eliminare, mai una carriera persa.

## Nota di collaudo

La parte web (export/import .mister, helper di salvataggio file) è
collaudata in automatico; la compilazione nativa su macOS non è
verificabile dall'ambiente di sviluppo remoto (serve un Mac) ed è quindi
parte del collaudo di persona: `npm run tauri:dev` deve aprire il gioco,
e il bottone Esporta deve aprire "Salva con nome".
