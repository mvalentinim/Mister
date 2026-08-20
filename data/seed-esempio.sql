-- seed-esempio.sql — DATI DI ESEMPIO PROVVISORI (solo per la milestone M1).
--
-- ⚠️ ATTENZIONE: i club sono reali ma le rose sono INVENTATE (nomi di
-- fantasia, attributi plausibili ma arbitrari). Servono solo a sviluppare e
-- provare le schermate di consultazione. Verranno SOSTITUITI dall'import
-- delle rose reali di Serie A e B dalle fonti open (vedi docs/dati.md),
-- come previsto dal protocollo risorse esterne del FRD §0.

INSERT INTO nazione (id, nome, codice) VALUES (1, 'Italia', 'ITA');

INSERT INTO competizione (id, nazione_id, nome, livello, tipo) VALUES
  (1, 1, 'Serie A', 1, 'campionato'),
  (2, 1, 'Serie B', 2, 'campionato');

INSERT INTO club (id, competizione_id, nome, citta, fama, budget_mercato, budget_stipendi) VALUES
  (1, 1, 'Milan',    'Milano',  85, 60000000, 130000000),
  (2, 1, 'Inter',    'Milano',  86, 65000000, 140000000),
  (3, 2, 'Palermo',  'Palermo', 45, 8000000,  18000000),
  (4, 2, 'Bari',     'Bari',    42, 5000000,  14000000),
  (5, 2, 'Modena',   'Modena',  38, 3500000,  10000000);

-- Giocatori di movimento (12 attributi tecnici, in quest'ordine):
-- velocita, resistenza, tecnica, passaggio, tiro, dribbling, colpo_testa,
-- marcatura, contrasto, posizionamento, visione, calci_piazzati
INSERT INTO giocatore (club_id, nome, cognome, data_nascita, nazionalita, ruolo, piede,
  velocita, resistenza, tecnica, passaggio, tiro, dribbling, colpo_testa,
  marcatura, contrasto, posizionamento, visione, calci_piazzati, potenziale) VALUES
  -- Milan (esempio: fascia alta di Serie A)
  (1, 'Davide',   'Ferrando',  '1998-03-12', 'ITA', 'DC',  'destro',   72, 78, 68, 71, 45, 55, 80, 84, 83, 82, 65, 40, 78),
  (1, 'Marco',    'Alberici',  '2002-07-30', 'ITA', 'TD',  'destro',   84, 80, 72, 74, 52, 74, 60, 74, 73, 71, 68, 55, 84),
  (1, 'Jean',     'Kambou',    '1999-11-02', 'FRA', 'MED', 'destro',   74, 86, 75, 80, 58, 68, 66, 78, 82, 76, 78, 50, 80),
  (1, 'Tommaso',  'Vanoli',    '2001-01-19', 'ITA', 'TRQ', 'sinistro', 78, 72, 86, 84, 76, 85, 50, 45, 48, 70, 86, 78, 86),
  (1, 'Luis',     'Almagro',   '1997-05-08', 'ESP', 'ED',  'sinistro', 90, 76, 82, 76, 74, 88, 52, 40, 44, 72, 74, 62, 82),
  (1, 'Pietro',   'Casiraghi', '1996-09-25', 'ITA', 'PC',  'destro',   82, 74, 78, 70, 87, 76, 82, 38, 42, 86, 68, 58, 79),
  -- Inter
  (2, 'Andrea',   'Grimaldi',  '1997-02-14', 'ITA', 'DC',  'destro',   70, 80, 70, 74, 42, 50, 82, 86, 85, 84, 66, 38, 80),
  (2, 'Nikola',   'Vrbanec',   '2000-08-21', 'CRO', 'CC',  'destro',   75, 84, 80, 84, 68, 72, 62, 68, 72, 74, 82, 66, 83),
  (2, 'Matteo',   'Sartori',   '2003-04-03', 'ITA', 'ES',  'sinistro', 88, 74, 80, 74, 70, 86, 48, 42, 46, 70, 72, 60, 87),
  (2, 'Ivan',     'Radu',      '1995-12-11', 'ROU', 'PC',  'destro',   80, 76, 76, 68, 86, 72, 84, 40, 44, 87, 66, 56, 76),
  -- Palermo (fascia alta di Serie B)
  (3, 'Salvo',    'Miraglia',  '1999-06-17', 'ITA', 'DC',  'destro',   66, 74, 60, 62, 38, 46, 74, 76, 75, 72, 56, 35, 68),
  (3, 'Gabriele', 'Lo Cascio', '2001-10-29', 'ITA', 'MED', 'destro',   68, 80, 66, 70, 50, 60, 58, 68, 72, 66, 68, 46, 72),
  (3, 'Franco',   'Tedesco',   '1996-01-05', 'ITA', 'TRQ', 'sinistro', 70, 66, 76, 74, 66, 74, 44, 40, 42, 62, 76, 70, 68),
  (3, 'Cheikh',   'Ndoye',     '2002-03-22', 'SEN', 'PC',  'destro',   80, 70, 66, 58, 74, 68, 72, 34, 38, 74, 56, 48, 79),
  -- Bari
  (4, 'Vito',     'Carbonara', '1998-08-09', 'ITA', 'TS',  'sinistro', 74, 72, 62, 64, 44, 62, 56, 66, 66, 62, 58, 52, 66),
  (4, 'Emanuele', 'Petruzzi',  '2000-02-26', 'ITA', 'CC',  'destro',   66, 76, 68, 72, 56, 62, 56, 60, 64, 64, 70, 58, 71),
  (4, 'Oscar',    'Beltran',   '1997-07-15', 'ARG', 'PC',  'destro',   76, 68, 70, 60, 76, 70, 74, 36, 40, 76, 58, 54, 70),
  -- Modena
  (5, 'Lorenzo',  'Baldini',   '2003-09-01', 'ITA', 'DC',  'destro',   64, 70, 56, 58, 34, 42, 70, 70, 70, 66, 52, 32, 74),
  (5, 'Giulio',   'Ferraresi', '1999-12-30', 'ITA', 'ED',  'destro',   80, 68, 68, 62, 60, 74, 42, 36, 40, 60, 62, 56, 69),
  (5, 'Nicola',   'Sighinolfi','1995-04-18', 'ITA', 'PC',  'destro',   70, 66, 64, 56, 72, 62, 76, 34, 38, 72, 54, 60, 64);

-- Portieri (4 attributi dedicati: riflessi, presa, uscite, rinvio;
-- velocita e resistenza sono condivisi con i giocatori di movimento)
INSERT INTO giocatore (club_id, nome, cognome, data_nascita, nazionalita, ruolo, piede,
  velocita, resistenza, riflessi, presa, uscite, rinvio, potenziale) VALUES
  (1, 'Stefano',  'Marchisio', '1996-06-06', 'ITA', 'POR', 'destro', 58, 62, 85, 82, 78, 74, 80),
  (2, 'Bruno',    'Kovacevic', '1998-10-13', 'SRB', 'POR', 'destro', 56, 60, 84, 80, 76, 72, 82),
  (3, 'Rosario',  'Alaimo',    '2000-05-27', 'ITA', 'POR', 'destro', 54, 58, 72, 70, 64, 62, 74),
  (4, 'Domenico', 'Lorusso',   '1997-11-20', 'ITA', 'POR', 'destro', 52, 56, 68, 68, 62, 60, 66),
  (5, 'Alessio',  'Malagoli',  '2002-02-08', 'ITA', 'POR', 'sinistro', 55, 57, 66, 64, 58, 56, 72);

-- Un contratto per ogni giocatore (stipendi plausibili per fascia)
INSERT INTO contratto (giocatore_id, club_id, stipendio, scadenza)
SELECT g.id, g.club_id,
  -- stipendio stimato in base alla competizione del club (solo dati di esempio)
  CASE c.competizione_id WHEN 1 THEN 1500000 ELSE 250000 END,
  '2028-06-30'
FROM giocatore g JOIN club c ON c.id = g.club_id;
