-- schema.sql — lo schema del database statico di MISTER (FRD §5.1).
--
-- Un database SQLite è fatto di TABELLE (come fogli di calcolo) collegate
-- tra loro da riferimenti (chiavi esterne, "REFERENCES"): un giocatore
-- appartiene a un club, un club a una competizione, e così via.
--
-- In questa prima versione (M1) implementiamo le entità che servono a
-- sfogliare il database: Nazione, Competizione, Club, Giocatore, Contratto.
-- Le altre entità del FRD §5.1 (Stagione, Trasferimento, Partita,
-- Evento-partita, Carriera-utente, Staff-Allenatori IA) arriveranno con le
-- milestone che le usano (M2, M3, M6...). Motivazione in docs/database.md.

-- Le nazioni disponibili (v1: solo Italia, poi le altre con M11)
CREATE TABLE nazione (
  id     INTEGER PRIMARY KEY,   -- numero unico assegnato automaticamente
  nome   TEXT NOT NULL,         -- "Italia"
  codice TEXT NOT NULL UNIQUE   -- sigla a 3 lettere, es. "ITA"
);

-- Campionati e coppe di una nazione
CREATE TABLE competizione (
  id         INTEGER PRIMARY KEY,
  nazione_id INTEGER NOT NULL REFERENCES nazione(id),
  nome       TEXT NOT NULL,               -- "Serie A"
  livello    INTEGER NOT NULL,            -- 1 = prima divisione, 2 = seconda...
  tipo       TEXT NOT NULL DEFAULT 'campionato'  -- campionato | coppa | continentale
);

-- I club, con i due soli budget previsti dal FRD §2.2 (niente finanze complesse)
CREATE TABLE club (
  id              INTEGER PRIMARY KEY,
  competizione_id INTEGER NOT NULL REFERENCES competizione(id),
  nome            TEXT NOT NULL,
  citta           TEXT,
  fama            INTEGER NOT NULL DEFAULT 30,  -- prestigio del club, scala 1-99
  budget_mercato  INTEGER NOT NULL DEFAULT 0,   -- in euro
  budget_stipendi INTEGER NOT NULL DEFAULT 0,   -- in euro/anno
  legend          INTEGER NOT NULL DEFAULT 0    -- 1 = squadra Legends (FRD §5.3)
);

-- I giocatori, con i tre gruppi di attributi del FRD §5.1.
-- Tutti gli attributi usano la scala 1-99.
-- I portieri hanno un set dedicato (riflessi, presa, uscite, rinvio): per i
-- giocatori di movimento quelle colonne restano NULL, e viceversa molte
-- colonne tecniche restano NULL per i portieri. Una sola tabella con colonne
-- opzionali è la soluzione più semplice da interrogare (docs/database.md).
CREATE TABLE giocatore (
  id            INTEGER PRIMARY KEY,
  club_id       INTEGER REFERENCES club(id),  -- NULL = svincolato o club fuori perimetro
  club_esterno  TEXT,                         -- nome del club reale se fuori dal perimetro
                                              -- importato (es. convocato in nazionale che
                                              -- gioca in una lega non inclusa)
  nome          TEXT NOT NULL,
  cognome       TEXT NOT NULL,
  data_nascita  TEXT NOT NULL,                -- formato ISO: "2001-05-14"
  nazionalita   TEXT NOT NULL,                -- nome del paese (es. "Italy"; i18n più avanti)
  ue            INTEGER NOT NULL DEFAULT 1,   -- 1 = comunitario (status UE/extra-UE)
  ruolo         TEXT NOT NULL,                -- ruolo primario: POR DC TD TS MED CC TRQ ED ES PC
  ruoli_secondari TEXT,                       -- eventuali altri ruoli, separati da virgola
  piede         TEXT NOT NULL DEFAULT 'destro',  -- destro | sinistro | ambidestro

  -- Tag di categoria (richiesto per le regole di gioco future: includere o
  -- escludere queste categorie dalle rose sarà una scelta di ogni carriera):
  --   'normale' = giocatore in attività della stagione corrente
  --   'icon'    = leggenda storica (Icons in FC)
  --   'hero'    = eroe di culto (Heroes in FC)
  categoria     TEXT NOT NULL DEFAULT 'normale'
                CHECK (categoria IN ('normale', 'icon', 'hero')),

  -- ▸ Attributi tecnici, giocatori di movimento (12)
  velocita      INTEGER, resistenza    INTEGER, tecnica       INTEGER,
  passaggio     INTEGER, tiro          INTEGER, dribbling     INTEGER,
  colpo_testa   INTEGER, marcatura     INTEGER, contrasto     INTEGER,
  posizionamento INTEGER, visione      INTEGER, calci_piazzati INTEGER,

  -- ▸ Attributi dedicati portiere (4) — velocita e resistenza sono condivisi
  riflessi      INTEGER, presa         INTEGER, uscite        INTEGER, rinvio INTEGER,

  -- ▸ Attributi comportamentali (per mercato e morale, FRD §7-8)
  ambizione           INTEGER NOT NULL DEFAULT 50,
  attaccamento_denaro INTEGER NOT NULL DEFAULT 50,
  fedelta             INTEGER NOT NULL DEFAULT 50,
  bisogno_giocare     INTEGER NOT NULL DEFAULT 50,
  professionalita     INTEGER NOT NULL DEFAULT 50,
  leadership          INTEGER NOT NULL DEFAULT 50,
  legame_territoriale INTEGER NOT NULL DEFAULT 50,

  -- ▸ Attributi dinamici (cambiano durante la carriera)
  forma       INTEGER NOT NULL DEFAULT 50,
  morale      INTEGER NOT NULL DEFAULT 50,
  condizione  INTEGER NOT NULL DEFAULT 100,   -- 100 = perfettamente in forma fisica
  potenziale  INTEGER NOT NULL DEFAULT 50     -- margine di crescita (FRD §7)
  -- valore_mercato NON è una colonna: è CALCOLATO da attributi, età, scadenza,
  -- fama del club e rendimento (FRD §6.1). Arriva con M6.
);

-- Le squadre nazionali. Un giocatore resta tesserato nel suo club: il legame
-- con la nazionale è una "convocazione" (tabella sotto), non un contratto.
CREATE TABLE nazionale (
  id            INTEGER PRIMARY KEY,
  nome          TEXT NOT NULL UNIQUE,      -- "Italia", "Brasile"...
  fama          INTEGER NOT NULL DEFAULT 50,
  mondiale_2026 INTEGER NOT NULL DEFAULT 0, -- 1 = qualificata al Mondiale 2026
  generata      INTEGER NOT NULL DEFAULT 0  -- 1 = rosa selezionata automaticamente
                                            --     per nazionalità (non ufficiale)
);

-- Convocazione: quale giocatore fa parte di quale nazionale
CREATE TABLE convocazione (
  nazionale_id INTEGER NOT NULL REFERENCES nazionale(id),
  giocatore_id INTEGER NOT NULL REFERENCES giocatore(id),
  PRIMARY KEY (nazionale_id, giocatore_id)
);

-- Il contratto che lega un giocatore a un club
CREATE TABLE contratto (
  id           INTEGER PRIMARY KEY,
  giocatore_id INTEGER NOT NULL REFERENCES giocatore(id),
  club_id      INTEGER NOT NULL REFERENCES club(id),
  stipendio    INTEGER NOT NULL,   -- euro/anno lordi
  scadenza     TEXT NOT NULL       -- data ISO, es. "2028-06-30"
);

-- Indici: rendono veloci le ricerche più frequenti (come l'indice analitico
-- di un libro). Fondamentali quando avremo 20.000+ giocatori (FRD §13).
CREATE INDEX idx_giocatore_club ON giocatore(club_id);
CREATE INDEX idx_club_competizione ON club(competizione_id);
CREATE INDEX idx_contratto_giocatore ON contratto(giocatore_id);
