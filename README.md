# MISTER — Manageriale calcistico

Gioco manageriale calcistico per browser: carriera da allenatore, mercato profondo, trattative conversazionali e partite simulate. Progetto privato, non commerciale.

- **Cosa deve fare il gioco:** `requisiti-funzionali-MISTER.md` (FRD)
- **Come lo costruiamo, passo per passo:** `piano-di-progetto-MISTER.md`
- **Log delle sessioni di lavoro:** `DIARIO.md`

## Struttura del repository

```
mister/
├── docs/            → decisioni tecniche spiegate (match-engine.md, dati.md...)
├── data/            → database statico e script di importazione
├── src/             → codice dell'app (React + motori)
├── public/          → file statici serviti così come sono (es. favicon)
├── DIARIO.md        → log delle sessioni
├── IDEE-FUTURE.md   → idee fuori scope annotate
└── README.md        → questo file
```

## Prima installazione (una volta sola, sul Mac)

Servono tre strumenti. Aprire l'app **Terminale** (Cmd+Spazio → "Terminale") e procedere in ordine:

1. **Homebrew** — il "negozio" da cui installare gli altri strumenti da riga di comando:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   Al termine seguire le eventuali 2 righe che lo script chiede di incollare (aggiungono `brew` al PATH).

2. **Node.js** — l'ambiente che esegue JavaScript fuori dal browser; include `npm`, il gestore di pacchetti con cui si installano le librerie:
   ```bash
   brew install node
   ```
   Verifica: `node --version` deve stampare v22 o superiore.

3. **git** — su macOS spesso c'è già. Verifica con `git --version`; se manca, `brew install git`.

Consigliato anche **Visual Studio Code** (editor): https://code.visualstudio.com

## Avviare l'app

Dalla cartella del progetto, nel Terminale:

```bash
npm install    # solo la prima volta (o quando cambiano le librerie): scarica le dipendenze in node_modules/
npm run dev    # avvia il server di sviluppo
```

Poi aprire nel browser l'indirizzo che appare (di solito **http://localhost:5173**). Deve comparire la schermata titolo "MISTER" con il menu.

Il server di sviluppo ha il **ricaricamento automatico**: modificando un file in `src/` e salvando, il browser si aggiorna da solo. Per fermarlo: `Ctrl+C` nel Terminale.

### Altri comandi utili

```bash
npm run build    # controlla i tipi TypeScript e produce la versione ottimizzata in dist/
npm run lint     # cerca errori comuni nel codice
```

## Il flusso git in breve

git è la "macchina del tempo" del progetto: fotografa lo stato dei file a ogni commit.

```bash
git status                      # 1. cosa è cambiato rispetto all'ultima foto?
git add -A                      # 2. metti le modifiche "in valigia" (staging)
git commit -m "cosa ho fatto"   # 3. scatta la foto con una descrizione
git log --oneline               # la storia delle foto, una per riga
```

Regola del progetto: **un commit a ogni passo verificato** (vedi §0 del piano).

## Stack tecnico (perché questi strumenti)

| Strumento | Cos'è, in breve |
|---|---|
| **TypeScript** | JavaScript + tipi: il computer controlla gli errori prima di eseguire. Come un correttore di bozze per il codice. |
| **React** | Libreria per costruire interfacce a componenti riutilizzabili. Il 70% di MISTER è interfaccia. |
| **Vite** | Il "motorino" di sviluppo: avvia l'app in locale, ricarica al volo, impacchetta per la pubblicazione. |

Le altre tecnologie (SQLite, Pixi.js, Phaser, Tauri, API Anthropic) arriveranno nelle milestone dedicate e verranno spiegate al primo utilizzo.
