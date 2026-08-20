# DIARIO di progetto — MISTER

Log delle sessioni di lavoro. Regola (piano §0.1): ogni sessione = un obiettivo dichiarato + questo file aggiornato + un commit git.

---

## Sessione 1 — 2026-08-20 — M0 Fondamenta (parte 1)

**Obiettivo dichiarato:** struttura del repository (§0.2 del piano) + progetto TypeScript/React/Vite + pagina iniziale "MISTER" con menu finto.

**Fatto:**
- Creato il progetto con Vite (template `react-ts`): React 19, TypeScript, Vite.
- Struttura repository: `docs/`, `data/`, `src/`, `public/`, `DIARIO.md`, `IDEE-FUTURE.md`, `README.md`.
- Pagina iniziale: titolo MISTER + menu con 3 voci (Nuova carriera / Carica carriera / Editor). I pulsanti mostrano un messaggio con la milestone in cui la funzione arriverà.
- `README.md` con: guida installazione strumenti sul Mac (Homebrew, Node.js, git), comandi per avviare l'app, flusso git base, spiegazione dello stack.
- Verificato in ambiente remoto: `npm install`, `npm run build` e `npm run lint` passano; il server di sviluppo si avvia e serve la pagina.

**Nota:** questa sessione è stata svolta da Claude Code in ambiente remoto. La parte "installazione guidata sul MacBook" di M0 è documentata nel README e va eseguita dallo sviluppatore di persona.

**Resta da fare (per chiudere M0 — è la sua Definition of Done, tocca allo sviluppatore):**
1. Installare gli strumenti sul Mac seguendo il README.
2. Clonare/aggiornare il repository e avviare l'app con `npm install` + `npm run dev`.
3. Vedere la pagina MISTER nel browser.
4. Fare una modifica banale a un testo (es. il sottotitolo in `src/App.tsx`), salvare e vederla apparire.
5. Fare un commit della modifica.

**Prossima sessione proposta:** chiusura DoD di M0 insieme allo sviluppatore, poi avvio M1 (database SQLite + valutazione fonti dati per Serie A/B, con protocollo risorse esterne).
