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
import { interroga, interrogaUna } from '../db/database.ts'
import { calcolaEta, mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import { eliminaDatabaseUtente, esisteDatabaseUtente, salvaDatabaseUtente } from '../db/persistenza.ts'

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
    await salvaDatabaseUtente(db)
    setVersione((v) => v + 1)
    setAvviso(`✅ ${massaAttributo} ${delta > 0 ? '+' : ''}${delta} applicato a ${ids.length} giocatori filtrati.`)
  }

  async function salvaClub() {
    if (clubAperto === '') return
    const set: string[] = []
    const parametri: (string | number)[] = []
    for (const [nome, valore] of Object.entries(clubCampi)) {
      set.push(`${nome} = ?`)
      parametri.push(nome === 'nome' ? valore : Number(valore))
    }
    if (set.length === 0) return
    db.run(`UPDATE club SET ${set.join(', ')} WHERE id = ${clubAperto}`, parametri)
    await salvaDatabaseUtente(db)
    setClubCampi({})
    setVersione((v) => v + 1)
    setAvviso('✅ Club salvato.')
  }

  async function ripristina() {
    await eliminaDatabaseUtente()
    location.reload() // l'app riparte col database originale
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
      {personalizzato && (
        <button className="bottone-secondario" onClick={() => void ripristina()}>
          ♻️ Ripristina il database originale (le modifiche si perdono)
        </button>
      )}
      {avviso && <p className="avviso">{avviso}</p>}

      {/* ── ricerca ── */}
      <h3>🔎 Cerca giocatori</h3>
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

      {/* ── i club ── */}
      <h3>🏟 Modifica un club</h3>
      <div className="riga-bottoni filtri-mercato">
        <select value={clubAperto} onChange={(e) => { setClubAperto(e.target.value === '' ? '' : Number(e.target.value)); setClubCampi({}) }}>
          <option value="">Scegli un club…</option>
          {campionati.map((k) => (
            <optgroup key={k} label={k}>
              {club.filter((c) => c.campionato === k).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {clubRiga && (
        <div className="scheda-editor">
          <div className="griglia-editor">
            <label>Nome <input value={campoClub('nome', clubRiga.nome)} onChange={(e) => setClubCampi({ ...clubCampi, nome: e.target.value })} /></label>
            <label>Fama (forza) <input type="number" min={30} max={99} value={campoClub('fama', clubRiga.fama)} onChange={(e) => setClubCampi({ ...clubCampi, fama: e.target.value })} /></label>
            <label>Budget mercato <input type="number" step={500_000} value={campoClub('budget_mercato', clubRiga.budget_mercato)} onChange={(e) => setClubCampi({ ...clubCampi, budget_mercato: e.target.value })} /></label>
            <label>Budget stipendi <input type="number" step={500_000} value={campoClub('budget_stipendi', clubRiga.budget_stipendi)} onChange={(e) => setClubCampi({ ...clubCampi, budget_stipendi: e.target.value })} /></label>
          </div>
          <button className="bottone-primario" onClick={() => void salvaClub()}>💾 Salva club</button>
        </div>
      )}
    </section>
  )
}

export default Editor
