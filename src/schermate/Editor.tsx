// Editor.tsx — l'editor del database (M9, FRD §5.4).
//
// CRUD user-friendly sul DB statico: ricerca giocatori con filtri, scheda
// di modifica completa (anagrafica, attributi, personalità, club, categoria),
// modifica di massa su una selezione filtrata, modifica dei club.
// Ogni salvataggio scrive l'INTERO database modificato in IndexedDB
// (vedi src/db/persistenza.ts): da lì in poi il gioco usa quello.
// Le carriere GIÀ create non cambiano: fotografano il DB alla creazione.

import { useEffect, useMemo, useState } from 'react'
import type { Database } from 'sql.js'
import { assegnaImprontaSeMancante, improntaDbCorrente, interroga, interrogaUna } from '../db/database.ts'
import { calcolaEta, mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import { eliminaDatabaseUtente, esisteDatabaseUtente, salvaDatabaseUtente } from '../db/persistenza.ts'
import { eliminaSquadraLegend, rosaLegendIds, salvaSquadraLegend, squadreLegend } from '../db/legends.ts'
import { scaricaFile } from '../scarica.ts'

interface Props {
  db: Database
}

const RUOLI = ['POR', 'DC', 'TD', 'TS', 'MED', 'CC', 'TRQ', 'ED', 'ES', 'PC']

/** Gli attributi modificabili, raggruppati per la scheda. */
const ATTRIBUTI_MOVIMENTO: Array<[string, string]> = [
  ['velocita', 'Velocità'], ['resistenza', 'Resistenza'], ['tecnica', 'Tecnica'],
  ['passaggio', 'Passaggio'], ['tiro', 'Tiro'], ['dribbling', 'Dribbling'],
  ['colpo_testa', 'Colpo di testa'], ['marcatura', 'Marcatura'], ['contrasto', 'Contrasto'],
  ['posizionamento', 'Posizionamento'], ['visione', 'Visione'], ['calci_piazzati', 'Calci piazzati'],
]
const ATTRIBUTI_PORTIERE: Array<[string, string]> = [
  ['riflessi', 'Riflessi'], ['presa', 'Presa'], ['uscite', 'Uscite'], ['rinvio', 'Rinvio'],
]
const ATTRIBUTI_PERSONALITA: Array<[string, string]> = [
  ['ambizione', 'Ambizione'], ['attaccamento_denaro', 'Attacc. denaro'], ['fedelta', 'Fedeltà'],
  ['bisogno_giocare', 'Bisogno di giocare'], ['professionalita', 'Professionalità'],
  ['leadership', 'Leadership'], ['legame_territoriale', 'Legame territoriale'],
]

interface ClubOpzione { id: number; nome: string; campionato: string }

function Editor({ db }: Props) {
  const [ricerca, setRicerca] = useState('')
  const [filtroRuolo, setFiltroRuolo] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroClub, setFiltroClub] = useState<number | ''>('')
  const [apertoId, setApertoId] = useState<number | null>(null)
  const [modifiche, setModifiche] = useState<Record<string, string>>({})
  const [avviso, setAvviso] = useState<string | null>(null)
  const [personalizzato, setPersonalizzato] = useState(false)
  const [versione, setVersione] = useState(0) // forza la rilettura dopo un salvataggio
  // modifica di massa
  const [massaAttributo, setMassaAttributo] = useState('velocita')
  const [massaDelta, setMassaDelta] = useState('2')
  // modifica club
  const [clubAperto, setClubAperto] = useState<number | ''>('')
  const [clubCampi, setClubCampi] = useState<Record<string, string>>({})
  // wizard squadre Legend (undefined = chiuso, null = nuova, numero = modifica)
  const [legendAperta, setLegendAperta] = useState<number | null | undefined>(undefined)
  const [legendNome, setLegendNome] = useState('')
  const [legendRosa, setLegendRosa] = useState<number[]>([])
  const [legendCerca, setLegendCerca] = useState('')
  const [legendRuolo, setLegendRuolo] = useState('')

  useEffect(() => { void esisteDatabaseUtente().then(setPersonalizzato) }, [versione])

  // tutte le squadre, per il filtro e per il "cambia club"
  const club = useMemo<ClubOpzione[]>(
    () => interroga<ClubOpzione>(
      db,
      `SELECT c.id, c.nome, k.nome AS campionato FROM club c
       JOIN competizione k ON k.id = c.competizione_id ORDER BY k.nome, c.nome`,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, versione],
  )
  const campionati = useMemo(() => [...new Set(club.map((c) => c.campionato))], [club])

  // ── la ricerca ──
  const attiva = ricerca.length >= 2 || filtroRuolo !== '' || filtroCategoria !== '' || filtroClub !== ''
  const risultati = useMemo(() => {
    if (!attiva) return []
    const condizioni: string[] = []
    const parametri: (string | number)[] = []
    if (ricerca.length >= 2) {
      condizioni.push("(g.nome || ' ' || g.cognome) LIKE ?")
      parametri.push(`%${ricerca}%`)
    }
    if (filtroRuolo) { condizioni.push('g.ruolo = ?'); parametri.push(filtroRuolo) }
    if (filtroCategoria) { condizioni.push('g.categoria = ?'); parametri.push(filtroCategoria) }
    if (filtroClub !== '') { condizioni.push('g.club_id = ?'); parametri.push(filtroClub) }
    return interroga<GiocatoreRiga & { club_nome: string | null }>(
      db,
      `SELECT g.*, c.nome AS club_nome FROM giocatore g
       LEFT JOIN club c ON c.id = g.club_id
       WHERE ${condizioni.join(' AND ')} LIMIT 60`,
      parametri,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, attiva, ricerca, filtroRuolo, filtroCategoria, filtroClub, versione])

  const aperto = apertoId === null
    ? null
    : interrogaUna<GiocatoreRiga>(db, 'SELECT * FROM giocatore WHERE id = ?', [apertoId])

  /** Il valore mostrato nella scheda: la modifica in corso, o il DB. */
  function campo(nome: string): string {
    if (nome in modifiche) return modifiche[nome]
    const valore = (aperto as unknown as Record<string, unknown>)?.[nome]
    return valore === null || valore === undefined ? '' : String(valore)
  }

  async function salvaGiocatore() {
    if (!aperto) return
    const testuali = new Set(['nome', 'cognome', 'data_nascita', 'nazionalita', 'ruolo', 'piede', 'categoria'])
    const set: string[] = []
    const parametri: (string | number | null)[] = []
    for (const [nome, valore] of Object.entries(modifiche)) {
      if (nome === 'club_id') {
        set.push('club_id = ?')
        parametri.push(valore === '' ? null : Number(valore))
      } else if (testuali.has(nome)) {
        set.push(`${nome} = ?`)
        parametri.push(valore)
      } else {
        // attributi numerici: vuoto = NULL (es. presa per una punta)
        set.push(`${nome} = ?`)
        parametri.push(valore === '' ? null : Math.max(1, Math.min(99, Number(valore))))
      }
    }
    if (set.length === 0) { setAvviso('Nessuna modifica da salvare.'); return }
    db.run(`UPDATE giocatore SET ${set.join(', ')} WHERE id = ${aperto.id}`, parametri)
    assegnaImprontaSeMancante(db) // il DB personalizzato riceve la sua identità
    await salvaDatabaseUtente(db)
    setModifiche({})
    setVersione((v) => v + 1)
    setAvviso(`✅ ${campo('nome')} ${campo('cognome')} salvato. Le carriere già create non cambiano.`)
  }

  /** Modifica di massa: applica un delta a TUTTI i risultati filtrati. */
  async function applicaMassa() {
    if (risultati.length === 0) return
    const delta = Number(massaDelta)
    if (!Number.isFinite(delta) || delta === 0) return
    const ids = risultati.map((g) => g.id)
    db.run(
      `UPDATE giocatore
       SET ${massaAttributo} = MAX(1, MIN(99, ${massaAttributo} + ?))
       WHERE id IN (${ids.join(',')}) AND ${massaAttributo} IS NOT NULL`,
      [delta],
    )
    assegnaImprontaSeMancante(db)
    await salvaDatabaseUtente(db)
    setVersione((v) => v + 1)
    setAvviso(`✅ ${massaAttributo} ${delta > 0 ? '+' : ''}${delta} applicato a ${ids.length} giocatori filtrati.`)
  }

  async function salvaClub() {
    if (clubAperto === '') return
    const set: string[] = []
    const parametri: (string | number)[] = []
    for (const [nome, valore] of Object.entries(clubCampi)) {
      if (nome === 'campionato') {
        const compId = interrogaUna<{ id: number }>(db, 'SELECT id FROM competizione WHERE nome = ?', [valore])?.id
        if (compId) { set.push('competizione_id = ?'); parametri.push(compId) }
        continue
      }
      set.push(`${nome} = ?`)
      parametri.push(nome === 'nome' ? valore : Number(valore))
    }
    if (set.length === 0) return
    db.run(`UPDATE club SET ${set.join(', ')} WHERE id = ${clubAperto}`, parametri)
    assegnaImprontaSeMancante(db)
    await salvaDatabaseUtente(db)
    setClubCampi({})
    setVersione((v) => v + 1)
    setAvviso('✅ Club salvato.')
  }

  // ── il wizard delle squadre Legend (FRD §5.3) ──
  const squadre = useMemo(() => squadreLegend(db),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, versione])

  function apriLegend(id: number | null) {
    setLegendAperta(id)
    setLegendCerca('')
    if (id === null) { setLegendNome(''); setLegendRosa([]) }
    else {
      setLegendNome(squadre.find((s) => s.id === id)?.nome ?? '')
      setLegendRosa(rosaLegendIds(db, id))
    }
  }

  const righeLegend = useMemo(
    () => legendRosa.length === 0 ? [] : interroga<GiocatoreRiga>(
      db,
      `SELECT * FROM giocatore WHERE id IN (${legendRosa.map(() => '?').join(',')})`,
      legendRosa,
    ).sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, legendRosa],
  )

  // i candidati: leggende (icon/hero) non ancora in rosa
  const candidatiLegend = useMemo(() => {
    if (legendAperta === undefined) return []
    if (legendCerca.length < 2 && legendRuolo === '') return []
    const condizioni = ["g.categoria != 'normale'"]
    const parametri: (string | number)[] = []
    if (legendCerca.length >= 2) {
      condizioni.push("(g.nome || ' ' || g.cognome) LIKE ?")
      parametri.push(`%${legendCerca}%`)
    }
    if (legendRuolo) { condizioni.push('g.ruolo = ?'); parametri.push(legendRuolo) }
    return interroga<GiocatoreRiga>(
      db, `SELECT g.* FROM giocatore g WHERE ${condizioni.join(' AND ')} LIMIT 20`, parametri,
    ).filter((g) => !legendRosa.includes(g.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, legendAperta, legendCerca, legendRuolo, legendRosa])

  function contaReparto(ids: number[]): Record<string, number> {
    const conta: Record<string, number> = {}
    for (const g of righeLegend) {
      if (!ids.includes(g.id)) continue
      const reparto = g.ruolo === 'POR' ? 'POR'
        : ['DC', 'TD', 'TS'].includes(g.ruolo) ? 'DIF'
        : g.ruolo === 'PC' ? 'ATT' : 'CEN'
      conta[reparto] = (conta[reparto] ?? 0) + 1
    }
    return conta
  }

  const legendValida =
    legendNome.trim().length >= 2 && legendRosa.length >= 16 &&
    (contaReparto(legendRosa)['POR'] ?? 0) >= 1

  async function salvaLegend() {
    const id = salvaSquadraLegend(db, legendNome.trim(), legendRosa, legendAperta ?? undefined)
    assegnaImprontaSeMancante(db)
    await salvaDatabaseUtente(db)
    setLegendAperta(id)
    setVersione((v) => v + 1)
    setAvviso(`✅ Squadra Legend "${legendNome.trim()}" salvata: sfidala da "Amichevole" nel menu.`)
  }

  async function cancellaLegend(id: number) {
    if (!confirm('Eliminare questa squadra Legend?')) return
    eliminaSquadraLegend(db, id)
    assegnaImprontaSeMancante(db)
    await salvaDatabaseUtente(db)
    if (legendAperta === id) setLegendAperta(undefined)
    setVersione((v) => v + 1)
  }

  /** Crea un giocatore nuovo di zecca e apre la sua scheda. */
  async function nuovoGiocatore() {
    const id = Number(db.exec('SELECT MAX(id) + 1 FROM giocatore')[0].values[0][0])
    db.run(
      `INSERT INTO giocatore (id, club_id, club_esterno, nome, cognome, data_nascita,
         nazionalita, ue, ruolo, ruoli_secondari, piede, categoria,
         velocita, resistenza, tecnica, passaggio, tiro, dribbling, colpo_testa,
         marcatura, contrasto, posizionamento, visione, calci_piazzati,
         riflessi, presa, uscite, rinvio,
         ambizione, attaccamento_denaro, fedelta, bisogno_giocare, professionalita,
         leadership, legame_territoriale, forma, morale, condizione, potenziale)
       VALUES (?, NULL, NULL, 'Nuovo', 'Giocatore', '2000-01-01',
         'Italy', 1, 'CC', '', 'destro', 'normale',
         60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60,
         NULL, NULL, NULL, NULL,
         50, 50, 50, 50, 50, 50, 50, 50, 50, 100, 70)`,
      [id],
    )
    assegnaImprontaSeMancante(db)
    await salvaDatabaseUtente(db)
    setVersione((v) => v + 1)
    setApertoId(id)
    setModifiche({})
    setAvviso(`✅ Giocatore creato (id ${id}): compila la scheda e salva.`)
  }

  /** Crea un club nuovo nel campionato scelto e apre la sua scheda. */
  async function nuovoClub(campionato: string) {
    const compId = interrogaUna<{ id: number }>(db, 'SELECT id FROM competizione WHERE nome = ?', [campionato])?.id
    if (!compId) return
    const id = Number(db.exec('SELECT MAX(id) + 1 FROM club')[0].values[0][0])
    db.run(
      `INSERT INTO club (id, competizione_id, nome, citta, fama, budget_mercato, budget_stipendi, legend)
       VALUES (?, ?, 'Nuovo Club', '', 60, 5000000, 8000000, 0)`,
      [id, compId],
    )
    assegnaImprontaSeMancante(db)
    await salvaDatabaseUtente(db)
    setVersione((v) => v + 1)
    setClubAperto(id)
    setClubCampi({})
    setAvviso(`✅ Club creato in ${campionato}: rinominalo e sistemane i budget. ` +
      'Entrerà nelle NUOVE carriere di quella nazione (il calendario gestisce anche i numeri dispari).')
  }

  async function ripristina() {
    const ok = confirm(
      'Tornare al database ORIGINALE?\n\nLe modifiche dell\'editor si perdono (esportale prima, se ci tieni). ' +
      'Le carriere create sul database personalizzato restano giocabili ma mostreranno un avviso: ' +
      'nomi e attributi potrebbero non corrispondere più.',
    )
    if (!ok) return
    await eliminaDatabaseUtente()
    location.reload() // l'app riparte col database originale
  }

  /** Esporta club, giocatori e squadre Legend in JSON leggibile (FRD §5.4). */
  function esportaJson() {
    const dump = {
      formato: 'mister-db-json',
      versione: 1,
      club: interroga<Record<string, unknown>>(db, 'SELECT * FROM club'),
      giocatori: interroga<Record<string, unknown>>(db, 'SELECT * FROM giocatore'),
      squadreLegend: squadre.map((s) => ({
        nome: s.nome, descrizione: s.descrizione, giocatori: rosaLegendIds(db, s.id),
      })),
    }
    void scaricaFile('mister-database.json', JSON.stringify(dump, null, 1), 'application/json')
  }

  /** Importa un JSON esportato: aggiorna club e giocatori per id (upsert)
      e ricostruisce le squadre Legend elencate. */
  async function importaJson(file: File) {
    try {
      const dump = JSON.parse(await file.text()) as {
        formato?: string
        club?: Array<Record<string, unknown>>
        giocatori?: Array<Record<string, unknown>>
        squadreLegend?: Array<{ nome: string; giocatori: number[] }>
      }
      if (dump.formato !== 'mister-db-json') {
        setAvviso('❌ Il file non è un export JSON di MISTER.')
        return
      }
      const upsert = (tabella: string, righe: Array<Record<string, unknown>>) => {
        for (const riga of righe) {
          const colonne = Object.keys(riga)
          db.run(
            `INSERT OR REPLACE INTO ${tabella} (${colonne.join(',')}) VALUES (${colonne.map(() => '?').join(',')})`,
            colonne.map((c) => riga[c] as string | number | null),
          )
        }
      }
      if (dump.club) upsert('club', dump.club)
      if (dump.giocatori) upsert('giocatore', dump.giocatori)
      for (const squadra of dump.squadreLegend ?? []) {
        const esistente = squadre.find((s) => s.nome === squadra.nome)
        salvaSquadraLegend(db, squadra.nome, squadra.giocatori, esistente?.id)
      }
      assegnaImprontaSeMancante(db)
      await salvaDatabaseUtente(db)
      location.reload()
    } catch {
      setAvviso('❌ JSON non leggibile o non compatibile.')
    }
  }

  /** Scarica il database in uso come file .sqlite (backup/condivisione).
      L'impronta viaggia dentro il file: reimportandolo, le carriere nate
      su di lui tornano coerenti. */
  function esporta() {
    void scaricaFile(
      `mister-database-${improntaDbCorrente() || 'originale'}.sqlite`,
      db.export(),
      'application/octet-stream',
    )
  }

  /** Importa un database da file: diventa il database personalizzato. */
  async function importa(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    // controllo di sanità: i file SQLite iniziano con questa firma
    const firma = new TextDecoder().decode(bytes.slice(0, 15))
    if (firma !== 'SQLite format 3') {
      setAvviso('❌ Il file scelto non è un database SQLite di MISTER.')
      return
    }
    const { salvaBytesDatabase } = await import('../db/persistenza.ts')
    await salvaBytesDatabase(bytes)
    location.reload() // l'app riparte col database importato
  }

  const clubRiga = clubAperto === ''
    ? null
    : interrogaUna<{ nome: string; fama: number; budget_mercato: number; budget_stipendi: number }>(
        db, 'SELECT nome, fama, budget_mercato, budget_stipendi FROM club WHERE id = ?', [clubAperto])
  const campoClub = (nome: string, valore: string | number) =>
    nome in clubCampi ? clubCampi[nome] : String(valore)

  return (
    <section className="schermata editor">
      <h2>🛠 Editor del database</h2>
      <p className="nota">
        Le modifiche valgono per le NUOVE carriere (quelle in corso fotografano il
        database alla creazione, FRD §5.4).{' '}
        {personalizzato
          ? <strong>Stai usando un database personalizzato.</strong>
          : 'Il database è quello originale.'}
      </p>
      <div className="riga-bottoni">
        <button className="bottone-secondario" onClick={esporta}>
          ⬇️ Esporta database (.sqlite)
        </button>
        <label className="bottone-secondario" style={{ cursor: 'pointer' }}>
          ⬆️ Importa database da file
          <input type="file" accept=".sqlite" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void importa(f) }} />
        </label>
        <button className="bottone-secondario" onClick={esportaJson}>
          ⬇️ Esporta JSON
        </button>
        <label className="bottone-secondario" style={{ cursor: 'pointer' }}>
          ⬆️ Importa JSON
          <input type="file" accept=".json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void importaJson(f) }} />
        </label>
        {personalizzato && (
          <button className="bottone-secondario" onClick={() => void ripristina()}>
            ♻️ Ripristina il database originale
          </button>
        )}
      </div>
      {avviso && <p className="avviso">{avviso}</p>}

      {/* ── ricerca ── */}
      <h3>🔎 Cerca giocatori</h3>
      <div className="riga-bottoni">
        <button className="bottone-secondario" onClick={() => void nuovoGiocatore()}>➕ Nuovo giocatore</button>
      </div>
      <div className="riga-bottoni filtri-mercato">
        <input placeholder="Nome (min 2 lettere)…" value={ricerca}
          onChange={(e) => setRicerca(e.target.value)} className="campo-ricerca" />
        <select value={filtroClub} onChange={(e) => setFiltroClub(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">Tutti i club</option>
          {campionati.map((k) => (
            <optgroup key={k} label={k}>
              {club.filter((c) => c.campionato === k).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={filtroRuolo} onChange={(e) => setFiltroRuolo(e.target.value)}>
          <option value="">Tutti i ruoli</option>
          {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="">Tutte le categorie</option>
          <option value="normale">Normali</option>
          <option value="icon">Icon (leggende)</option>
          <option value="hero">Hero (leggende)</option>
        </select>
      </div>

      {/* ── modifica di massa sui risultati filtrati ── */}
      {risultati.length > 1 && (
        <div className="riga-bottoni filtri-mercato">
          <span className="nota">Modifica di massa sui {risultati.length} filtrati:</span>
          <select value={massaAttributo} onChange={(e) => setMassaAttributo(e.target.value)}>
            {[...ATTRIBUTI_MOVIMENTO, ...ATTRIBUTI_PORTIERE].map(([nome, etichetta]) => (
              <option key={nome} value={nome}>{etichetta}</option>
            ))}
          </select>
          <input type="number" className="campo-numero" value={massaDelta}
            onChange={(e) => setMassaDelta(e.target.value)} min={-20} max={20} />
          <button className="bottone-secondario" onClick={() => void applicaMassa()}>Applica a tutti</button>
        </div>
      )}

      {risultati.length > 0 && (
        <table className="tabella">
          <thead>
            <tr><th>Giocatore</th><th>Ruolo</th><th className="num">Età</th><th className="num">Media</th><th className="num">Pot.</th><th>Club</th><th>Cat.</th><th></th></tr>
          </thead>
          <tbody>
            {risultati.map((g) => (
              <tr key={g.id} className={g.id === apertoId ? 'riga-mia' : ''}>
                <td className="grassetto">{g.nome} {g.cognome}</td>
                <td>{g.ruolo}</td>
                <td className="num">{calcolaEta(g.data_nascita)}</td>
                <td className="num evidenza">{mediaComplessiva(g)}</td>
                <td className="num">{g.potenziale}</td>
                <td>{g.club_nome ?? '—'}</td>
                <td>{g.categoria}</td>
                <td>
                  <button className="bottone-secondario"
                    onClick={() => { setApertoId(g.id); setModifiche({}); setAvviso(null) }}>
                    Modifica
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {attiva && risultati.length === 0 && <p className="nota">Nessun giocatore trovato.</p>}

      {/* ── la scheda di modifica ── */}
      {aperto && (
        <div className="scheda-editor">
          <h3>✏️ {aperto.nome} {aperto.cognome} <span className="nota">(id {aperto.id})</span></h3>

          <h4>Anagrafica</h4>
          <div className="griglia-editor">
            <label>Nome <input value={campo('nome')} onChange={(e) => setModifiche({ ...modifiche, nome: e.target.value })} /></label>
            <label>Cognome <input value={campo('cognome')} onChange={(e) => setModifiche({ ...modifiche, cognome: e.target.value })} /></label>
            <label>Nascita <input value={campo('data_nascita')} onChange={(e) => setModifiche({ ...modifiche, data_nascita: e.target.value })} placeholder="1998-03-14" /></label>
            <label>Nazionalità <input value={campo('nazionalita')} onChange={(e) => setModifiche({ ...modifiche, nazionalita: e.target.value })} /></label>
            <label>Ruolo{' '}
              <select value={campo('ruolo')} onChange={(e) => setModifiche({ ...modifiche, ruolo: e.target.value })}>
                {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label>Piede{' '}
              <select value={campo('piede')} onChange={(e) => setModifiche({ ...modifiche, piede: e.target.value })}>
                <option value="destro">destro</option><option value="sinistro">sinistro</option><option value="ambidestro">ambidestro</option>
              </select>
            </label>
            <label>Categoria{' '}
              <select value={campo('categoria')} onChange={(e) => setModifiche({ ...modifiche, categoria: e.target.value })}>
                <option value="normale">normale</option><option value="icon">icon</option><option value="hero">hero</option>
              </select>
            </label>
            <label>Potenziale <input type="number" min={40} max={99} value={campo('potenziale')} onChange={(e) => setModifiche({ ...modifiche, potenziale: e.target.value })} /></label>
            <label>Club{' '}
              <select value={campo('club_id')} onChange={(e) => setModifiche({ ...modifiche, club_id: e.target.value })}>
                <option value="">— nessuno (leggenda/svincolato) —</option>
                {campionati.map((k) => (
                  <optgroup key={k} label={k}>
                    {club.filter((c) => c.campionato === k).map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          <h4>Attributi tecnici (1-99; vuoto = non pertinente)</h4>
          <div className="griglia-editor">
            {ATTRIBUTI_MOVIMENTO.map(([nome, etichetta]) => (
              <label key={nome}>{etichetta}{' '}
                <input type="number" min={1} max={99} value={campo(nome)}
                  onChange={(e) => setModifiche({ ...modifiche, [nome]: e.target.value })} />
              </label>
            ))}
          </div>
          <h4>Portiere</h4>
          <div className="griglia-editor">
            {ATTRIBUTI_PORTIERE.map(([nome, etichetta]) => (
              <label key={nome}>{etichetta}{' '}
                <input type="number" min={1} max={99} value={campo(nome)}
                  onChange={(e) => setModifiche({ ...modifiche, [nome]: e.target.value })} />
              </label>
            ))}
          </div>
          <h4>Personalità</h4>
          <div className="griglia-editor">
            {ATTRIBUTI_PERSONALITA.map(([nome, etichetta]) => (
              <label key={nome}>{etichetta}{' '}
                <input type="number" min={1} max={99} value={campo(nome)}
                  onChange={(e) => setModifiche({ ...modifiche, [nome]: e.target.value })} />
              </label>
            ))}
          </div>

          <div className="riga-bottoni">
            <button className="bottone-primario" onClick={() => void salvaGiocatore()}>💾 Salva giocatore</button>
            <button className="bottone-secondario" onClick={() => { setApertoId(null); setModifiche({}) }}>Chiudi</button>
          </div>
        </div>
      )}

      {/* ── le squadre Legend (wizard, FRD §5.3) ── */}
      <h3>⭐ Squadre Legend</h3>
      <p className="nota">
        Rose leggendarie pescate da Icon e Heroes: si sfidano in amichevole
        (voce "Amichevole" nel menu principale).
      </p>
      {squadre.length > 0 && (
        <table className="tabella">
          <tbody>
            {squadre.map((s) => (
              <tr key={s.id} className={s.id === legendAperta ? 'riga-mia' : ''}>
                <td className="grassetto">{s.nome}</td>
                <td className="nota">{s.descrizione}</td>
                <td className="num">{s.giocatori} giocatori</td>
                <td>
                  <button className="bottone-secondario" onClick={() => apriLegend(s.id)}>Modifica</button>{' '}
                  <button className="bottone-secondario" onClick={() => void cancellaLegend(s.id)}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="bottone-primario" onClick={() => apriLegend(null)}>➕ Nuova squadra Legend</button>

      {legendAperta !== undefined && (
        <div className="scheda-editor">
          <h3>{legendAperta === null ? 'Nuova squadra Legend' : 'Modifica squadra Legend'}</h3>
          <div className="riga-bottoni">
            <input className="campo-ricerca" placeholder="Nome della squadra (es. Invincibili '99)…"
              value={legendNome} onChange={(e) => setLegendNome(e.target.value)} />
          </div>

          {/* la rosa in costruzione */}
          <p className="nota">
            Rosa: <strong>{legendRosa.length}</strong> giocatori (servono almeno 16, con un portiere) ·{' '}
            {['POR', 'DIF', 'CEN', 'ATT'].map((r) => `${r} ${contaReparto(legendRosa)[r] ?? 0}`).join(' · ')}
          </p>
          {legendRosa.length > 0 && (
            <table className="tabella">
              <tbody>
                {righeLegend.map((g) => (
                  <tr key={g.id}>
                    <td className="grassetto">{g.nome} {g.cognome}</td>
                    <td>{g.ruolo}</td>
                    <td className="nota">{g.nazionalita}</td>
                    <td className="num evidenza">{mediaComplessiva(g)}</td>
                    <td><button className="bottone-secondario"
                      onClick={() => setLegendRosa(legendRosa.filter((id) => id !== g.id))}>Togli</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* pesca dal bacino delle leggende */}
          <div className="riga-bottoni filtri-mercato">
            <input className="campo-ricerca" placeholder="Cerca una leggenda da aggiungere…"
              value={legendCerca} onChange={(e) => setLegendCerca(e.target.value)} />
            <select value={legendRuolo} onChange={(e) => setLegendRuolo(e.target.value)}>
              <option value="">Tutti i ruoli</option>
              {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {candidatiLegend.length > 0 && (
            <table className="tabella">
              <tbody>
                {candidatiLegend.map((g) => (
                  <tr key={g.id}>
                    <td className="grassetto">{g.nome} {g.cognome}</td>
                    <td>{g.ruolo}</td>
                    <td className="nota">{g.nazionalita} · {g.categoria}</td>
                    <td className="num evidenza">{mediaComplessiva(g)}</td>
                    <td><button className="bottone-secondario"
                      onClick={() => setLegendRosa([...legendRosa, g.id])}>Aggiungi</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="riga-bottoni">
            <button className="bottone-primario" disabled={!legendValida} onClick={() => void salvaLegend()}>
              💾 Salva squadra Legend
            </button>
            <button className="bottone-secondario" onClick={() => setLegendAperta(undefined)}>Chiudi</button>
          </div>
          {!legendValida && (
            <p className="nota">Per salvare: un nome, almeno 16 giocatori e un portiere.</p>
          )}
        </div>
      )}

      {/* ── i club ── */}
      <h3>🏟 Club</h3>
      <div className="riga-bottoni filtri-mercato">
        <select value={clubAperto} onChange={(e) => { setClubAperto(e.target.value === '' ? '' : Number(e.target.value)); setClubCampi({}) }}>
          <option value="">Scegli un club da modificare…</option>
          {campionati.map((k) => (
            <optgroup key={k} label={k}>
              {club.filter((c) => c.campionato === k).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value="" onChange={(e) => { if (e.target.value) void nuovoClub(e.target.value) }}>
          <option value="">➕ Nuovo club in…</option>
          {campionati.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      {clubRiga && (
        <div className="scheda-editor">
          <div className="griglia-editor">
            <label>Nome <input value={campoClub('nome', clubRiga.nome)} onChange={(e) => setClubCampi({ ...clubCampi, nome: e.target.value })} /></label>
            <label>Fama (forza) <input type="number" min={30} max={99} value={campoClub('fama', clubRiga.fama)} onChange={(e) => setClubCampi({ ...clubCampi, fama: e.target.value })} /></label>
            <label>Budget mercato <input type="number" step={500_000} value={campoClub('budget_mercato', clubRiga.budget_mercato)} onChange={(e) => setClubCampi({ ...clubCampi, budget_mercato: e.target.value })} /></label>
            <label>Budget stipendi <input type="number" step={500_000} value={campoClub('budget_stipendi', clubRiga.budget_stipendi)} onChange={(e) => setClubCampi({ ...clubCampi, budget_stipendi: e.target.value })} /></label>
            <label>Campionato{' '}
              <select value={campoClub('campionato', club.find((c) => c.id === clubAperto)?.campionato ?? '')}
                onChange={(e) => setClubCampi({ ...clubCampi, campionato: e.target.value })}>
                {campionati.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          </div>
          <p className="nota">
            Spostare un club di campionato (o crearne uno nuovo) vale per le NUOVE
            carriere; meglio tenere pari il numero di squadre per lega (con un
            numero dispari il calendario prevede un turno di riposo).
          </p>
          <button className="bottone-primario" onClick={() => void salvaClub()}>💾 Salva club</button>
        </div>
      )}
    </section>
  )
}

export default Editor
