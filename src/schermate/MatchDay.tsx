// MatchDay.tsx — la partita "in diretta" (M5 completa, FRD §9):
// - campo schematico con i gettoni disposti secondo il MODULO scelto e
//   POSIZIONI GUIDATE DAL MOTORE: la squadra in possesso spinge in avanti,
//   quella che difende si compatta (§9.2);
// - cronometro con velocità 1x/2x/3x/5x + pausa (§9.3);
// - telecronaca ibrida: righe fitte e tempo rallentato sulle azioni (§9.4);
// - PAGELLE LIVE della propria squadra (§9.5);
// - IN PAUSA (e all'intervallo, con pausa automatica): SOSTITUZIONI (max 3)
//   e regolazioni di mentalità e ritmo, che entrano subito nel motore (§9.3).
//
// La partita avanza con il motore "a tappe" (creaPartita): senza interventi
// è identica a quella che il campionato avrebbe simulato in blocco (stesso
// seme); con gli interventi, il risultato VISTO diventa quello UFFICIALE
// (viene passato ad avanzaGiornata al fischio finale).

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Database } from 'sql.js'
import { partitaUtenteCorrente, semePartita, squadraPerMotore } from '../carriera/motore.ts'
import type { Carriera } from '../carriera/tipi.ts'
import { creaPartita, type PartitaInCorso, type VotiLive } from '../motore/partita.ts'
import { creaRng, semeDaStringa, type Rng } from '../motore/rng.ts'
import type { EventoPartita, RisultatoPartita, SquadraMotore } from '../motore/tipi.ts'

interface Props {
  db: Database
  carriera: Carriera
  /** chiamata al fischio finale con il risultato visto (cambi inclusi) */
  onFine: (risultato: RisultatoPartita) => void
}

const specchia = ([x, y]: [number, number]): [number, number] => [105 - x, y]

/** Cognome da mostrare sotto il gettone ("K. De Bruyne" → "De Bruyne"). */
const cognome = (nome: string) => nome.slice(nome.indexOf(' ') + 1)

// ── Telecronaca procedurale (invariata da M5-anticipo) ─────────────────────

interface Passo {
  testo?: string
  evidenza?: boolean
  palla?: [number, number]
  protagonistaId?: number
  golPer?: 'casa' | 'trasferta'
}

const scegli = (rng: Rng, varianti: string[]) => varianti[rng.intero(varianti.length)]

function narrazione(e: EventoPartita, rng: Rng, casa: SquadraMotore, trasferta: SquadraMotore): Passo[] {
  const attaccante = e.squadra === 'casa'
  const squadra = attaccante ? casa : trasferta
  const nome = e.giocatoreNome
  const xArea = attaccante ? 88 : 17
  const xPorta = attaccante ? 103 : 2
  const yTiro = 24 + rng.intero(20)

  switch (e.tipo) {
    case 'gol':
      return [
        {
          testo: e.assistNome
            ? scegli(rng, [
                `${squadra.nome} in avanti: ${e.assistNome} vede l'inserimento...`,
                `Palla geniale di ${e.assistNome} che apre la difesa...`,
                `${e.assistNome} scodella in area...`,
              ])
            : scegli(rng, [
                `${nome} parte in percussione centrale!`,
                `${squadra.nome} recupera palla alta, si accende ${nome}...`,
                `Azione manovrata: la sfera arriva a ${nome}...`,
              ]),
          palla: [xArea - 8, yTiro], protagonistaId: e.giocatoreId,
        },
        {
          testo: scegli(rng, [`${nome} controlla e calcia!`, `Conclusione improvvisa di ${nome}!`, `${nome} si coordina... tiro!`]),
          palla: [xArea, yTiro], evidenza: true,
        },
        {
          testo: scegli(rng, [
            `⚽ GOOOL! ${nome}! La palla si insacca!`,
            `⚽ GOL! Niente da fare per il portiere: ${nome}!`,
            `⚽ GOL DI ${nome.toUpperCase()}! Esplode la panchina!`,
          ]),
          palla: [xPorta, 34], evidenza: true, golPer: e.squadra, protagonistaId: e.giocatoreId,
        },
      ]
    case 'occasione-parata':
      return [
        { testo: scegli(rng, ['Azione pericolosa, tiro in porta!', 'Conclusione forte dal limite!']), palla: [attaccante ? 17 : 88, yTiro], evidenza: true },
        {
          testo: scegli(rng, [`🧤 ${nome} si distende e para!`, `🧤 Gran riflesso di ${nome}, palla bloccata!`, `🧤 ${nome} dice di no! Che intervento!`]),
          palla: [attaccante ? 5 : 100, 34], protagonistaId: e.giocatoreId, evidenza: true,
        },
      ]
    case 'occasione-fuori':
      return [
        { testo: scegli(rng, [`${nome} si libera al tiro...`, `Spazio per ${nome} che prova da fuori...`]), palla: [xArea, yTiro], protagonistaId: e.giocatoreId },
        { testo: scegli(rng, ['💨 Fuori di un soffio!', '💨 Alto sopra la traversa!', '💨 Sfiora il palo!']), palla: [xPorta, yTiro < 34 ? 6 : 62], evidenza: true },
      ]
    case 'ammonizione':
      return [{ testo: `🟨 Fallo di ${nome}: ammonito.`, protagonistaId: e.giocatoreId, evidenza: true }]
    case 'espulsione':
      return [
        { testo: `Intervento durissimo di ${nome}...`, protagonistaId: e.giocatoreId },
        { testo: `🟥 ESPULSO! ${squadra.nome} resta in dieci!`, evidenza: true },
      ]
    case 'infortunio':
      return [{ testo: `🚑 ${nome} resta a terra: problema muscolare. Si può sostituire in pausa.`, protagonistaId: e.giocatoreId, evidenza: true }]
    case 'occasione-murata':
      return [{ testo: `${nome} cerca il tiro ma trova il muro della difesa.`, protagonistaId: e.giocatoreId }]
  }
}

function riempitivo(rng: Rng, casa: SquadraMotore, trasferta: SquadraMotore): string {
  const squadra = rng.evento(0.5) ? casa : trasferta
  const g = squadra.titolari[1 + rng.intero(10)]
  return scegli(rng, [
    `${squadra.nome} fa girare il pallone.`,
    `Fase di studio a centrocampo.`,
    `${g.nome} prova a cucire il gioco.`,
    `Pressing alto del ${squadra.nome}.`,
    `Lancio lungo di ${g.nome}, la difesa controlla.`,
    `Ritmi bassi in questa fase.`,
  ])
}

// ── Il componente ──────────────────────────────────────────────────────────

interface RigaCronaca {
  minuto: number
  testo: string
  evidenza: boolean
}

function MatchDay({ db, carriera, onFine }: Props) {
  // La partita a tappe: stesso seme del campionato → senza interventi è
  // identica a quella che verrebbe simulata in blocco
  const { casa, trasferta, partita, latoMio } = useMemo(() => {
    const p = partitaUtenteCorrente(carriera)!
    const casa = squadraPerMotore(db, carriera, p.casaId)
    const trasferta = squadraPerMotore(db, carriera, p.trasfertaId)
    const partita: PartitaInCorso = creaPartita(
      casa, trasferta,
      semePartita(carriera, carriera.giornata, p.casaId, p.trasfertaId),
    )
    return { casa, trasferta, partita, latoMio: (p.casaId === carriera.clubId ? 'casa' : 'trasferta') as 'casa' | 'trasferta' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // rng SOLO per la parte narrativa/visuale (non tocca il risultato)
  const rng = useMemo(() => creaRng(semeDaStringa(`${carriera.seme}-visuale-${carriera.giornata}`)), [carriera])

  const [minuto, setMinuto] = useState(0)
  const [velocita, setVelocita] = useState<1 | 2 | 3 | 5>(1)
  const [pausa, setPausa] = useState(false)
  const [punteggio, setPunteggio] = useState({ casa: 0, trasferta: 0 })
  const [cronaca, setCronaca] = useState<RigaCronaca[]>([])
  const [palla, setPalla] = useState<[number, number]>([52.5, 34])
  const [protagonista, setProtagonista] = useState<number | null>(null)
  const [possessoCasa, setPossessoCasa] = useState(true)
  const [voti, setVoti] = useState<VotiLive>([])
  const [finita, setFinita] = useState(false)
  // per far ridisegnare formazioni/panchine dopo un cambio
  const [, setVersione] = useState(0)

  // per il pannello cambi
  const [esceId, setEsceId] = useState<number | ''>('')
  const [entraId, setEntraId] = useState<number | ''>('')

  const regia = useRef({ coda: [] as Passo[] })
  const velocitaRef = useRef(velocita)
  velocitaRef.current = velocita
  const pausaRef = useRef(pausa)
  pausaRef.current = pausa

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let attivo = true

    const aggiungiRiga = (minuto: number, testo: string, evidenza = false) =>
      setCronaca((righe) => [{ minuto, testo, evidenza }, ...righe])

    function passo() {
      if (!attivo) return
      if (pausaRef.current) { timer = setTimeout(passo, 150); return }
      const s = regia.current

      // ── highlight: consumo la coda di passi, a tempo RALLENTATO ──
      if (s.coda.length > 0) {
        const p = s.coda.shift()!
        if (p.palla) setPalla(p.palla)
        if (p.protagonistaId !== undefined) setProtagonista(p.protagonistaId)
        if (p.testo) aggiungiRiga(partita.minuto, p.testo, p.evidenza ?? false)
        if (p.golPer) setPunteggio(partita.punteggio())
        timer = setTimeout(passo, 1400 / Math.min(velocitaRef.current, 2))
        return
      }
      setProtagonista(null)

      // ── fine partita ──
      if (partita.minuto >= 90) {
        const esito = partita.punteggio()
        aggiungiRiga(90, `🔔 Triplice fischio! ${casa.nome} ${esito.casa} - ${esito.trasferta} ${trasferta.nome}`, true)
        setVoti(partita.votiLive(latoMio))
        setFinita(true)
        return
      }

      // ── il motore gioca il minuto successivo ──
      const eventi = partita.avanzaMinuto()
      setMinuto(partita.minuto)
      setPossessoCasa(partita.possessoCasa)
      setVoti(partita.votiLive(latoMio))

      // intervallo: pausa automatica per sistemare la squadra (FRD §9.3)
      if (partita.minuto === 45) {
        aggiungiRiga(45, '🔔 Fine primo tempo. Puoi fare cambi e regolazioni, poi riprendi.', true)
        setPausa(true)
      }

      if (eventi.length > 0) {
        // azioni importanti: tempo rallentato e cronaca fitta
        s.coda = eventi.flatMap((e) => narrazione(e, rng, casa, trasferta))
        setVersione((v) => v + 1) // espulsioni/infortuni cambiano la vista
        timer = setTimeout(passo, 400)
        return
      }

      // gioco "normale": la palla gira nella squadra in possesso (dal motore)
      const formazione = partita.formazione(partita.possessoCasa ? 'casa' : 'trasferta')
      const posizioni = partita.possessoCasa ? casa.posizioni : trasferta.posizioni.map(specchia)
      const vivi = formazione.map((f, i) => ({ ...f, i })).filter((f) => !f.espulso && f.i > 0)
      const scelto = vivi[rng.intero(vivi.length)]
      const [x, y] = posizioni[Math.min(scelto.i, posizioni.length - 1)]
      setPalla([x + rng.intero(7) - 3, y + rng.intero(7) - 3])

      if (rng.evento(0.10)) aggiungiRiga(partita.minuto, riempitivo(rng, casa, trasferta))

      timer = setTimeout(passo, 700 / velocitaRef.current)
    }

    timer = setTimeout(passo, 500)
    return () => { attivo = false; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Render ──
  // Le posizioni riflettono il gioco: chi ha palla spinge avanti (+5 verso
  // l'attacco), chi difende si compatta (-3). Il portiere resta.
  const gettoni = (squadra: SquadraMotore, lato: 'casa' | 'trasferta', colore: string) => {
    const posizioni = lato === 'casa' ? squadra.posizioni : squadra.posizioni.map(specchia)
    const direzione = lato === 'casa' ? 1 : -1
    const inPossesso = lato === 'casa' ? possessoCasa : !possessoCasa
    return partita.formazione(lato).map(({ giocatore: g, espulso }, i) => {
      if (espulso) return null
      const [x0, y] = posizioni[Math.min(i, posizioni.length - 1)]
      const x = g.ruolo === 'POR' ? x0 : x0 + direzione * (inPossesso ? 5 : -3)
      const evidenziato = protagonista === g.id
      return (
        <g key={g.id} className="gettone">
          <circle cx={x} cy={y} r={evidenziato ? 2.6 : 1.9} fill={colore}
            stroke={evidenziato ? '#e8c547' : '#ffffff'} strokeWidth={evidenziato ? 0.7 : 0.35} />
          <text x={x} y={y + 4.6} textAnchor="middle" className="nome-gettone">{cognome(g.nome)}</text>
        </g>
      )
    })
  }

  const inCampoMiei = partita.formazione(latoMio).filter((f) => !f.espulso)
  const panchinaMia = partita.panchina(latoMio)
  const cambiRimasti = partita.sostituzioniRimaste(latoMio)

  function effettuaCambio() {
    if (esceId === '' || entraId === '') return
    if (partita.sostituisci(latoMio, Number(esceId), Number(entraId))) {
      const esce = inCampoMiei.find((f) => f.giocatore.id === esceId)?.giocatore
      const entra = panchinaMia.find((g) => g.id === entraId)
      setCronaca((righe) => [
        { minuto: partita.minuto, testo: `🔄 Cambio: entra ${entra?.nome}, esce ${esce?.nome}.`, evidenza: true },
        ...righe,
      ])
      setEsceId(''); setEntraId('')
      setVersione((v) => v + 1)
    }
  }

  return (
    <section className="schermata matchday">
      {/* Intestazione: punteggio, cronometro, controlli velocità */}
      <div className="md-intestazione">
        <h2>
          {casa.nome} <span className="md-punteggio">{punteggio.casa} - {punteggio.trasferta}</span> {trasferta.nome}
        </h2>
        <div className="md-controlli">
          <span className="md-minuto">{Math.min(minuto, 90)}'</span>
          {!finita && (
            <>
              <button className={pausa ? 'md-bottone attivo' : 'md-bottone'} onClick={() => setPausa(!pausa)}>
                {pausa ? '▶' : '⏸'}
              </button>
              {([1, 2, 3, 5] as const).map((v) => (
                <button key={v} className={velocita === v ? 'md-bottone attivo' : 'md-bottone'} onClick={() => setVelocita(v)}>
                  {v}x
                </button>
              ))}
            </>
          )}
          {finita && (
            <button className="bottone-primario" onClick={() => onFine(partita.risultatoFinale())}>
              Torna alla stagione →
            </button>
          )}
        </div>
      </div>

      {/* Pannello di pausa: cambi e regolazioni (FRD §9.3) */}
      {pausa && !finita && (
        <div className="md-pannello">
          <div className="md-cambi">
            <strong>Sostituzioni ({cambiRimasti} rimaste)</strong>
            <select value={esceId} onChange={(e) => setEsceId(Number(e.target.value))}>
              <option value="">Chi esce…</option>
              {inCampoMiei.map(({ giocatore: g }) => (
                <option key={g.id} value={g.id}>{g.nome} ({g.ruolo})</option>
              ))}
            </select>
            <select value={entraId} onChange={(e) => setEntraId(Number(e.target.value))}>
              <option value="">Chi entra…</option>
              {panchinaMia.map((g) => (
                <option key={g.id} value={g.id}>{g.nome} ({g.ruolo})</option>
              ))}
            </select>
            <button className="bottone-secondario" disabled={cambiRimasti === 0 || esceId === '' || entraId === ''} onClick={effettuaCambio}>
              Effettua cambio
            </button>
          </div>
          <div className="md-regolazioni">
            <strong>Regolazioni</strong>
            <label>
              Mentalità{' '}
              <select
                defaultValue={carriera.tattica.istruzioni.mentalita}
                onChange={(e) => partita.regola(latoMio, { mentalita: Number(e.target.value) })}
              >
                <option value={-2}>Molto difensiva</option>
                <option value={-1}>Difensiva</option>
                <option value={0}>Equilibrata</option>
                <option value={1}>Offensiva</option>
                <option value={2}>Molto offensiva</option>
              </select>
            </label>
            <label>
              Ritmo{' '}
              <select
                defaultValue={carriera.tattica.istruzioni.ritmo === 'alto' ? 1.12 : carriera.tattica.istruzioni.ritmo === 'basso' ? 0.9 : 1}
                onChange={(e) => partita.regola(latoMio, { ritmo: Number(e.target.value) })}
              >
                <option value={0.9}>Basso</option>
                <option value={1}>Medio</option>
                <option value={1.12}>Alto</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="md-corpo">
        {/* Il campo schematico */}
        <svg className="md-campo" viewBox="0 0 105 68">
          <rect x="0" y="0" width="105" height="68" rx="1.5" fill="#4a7c4e" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={i * 15} y="0" width="7.5" height="68" fill="#457548" />
          ))}
          <g stroke="#e8efe9" strokeWidth="0.45" fill="none">
            <rect x="1" y="1" width="103" height="66" />
            <line x1="52.5" y1="1" x2="52.5" y2="67" />
            <circle cx="52.5" cy="34" r="9.15" />
            <rect x="1" y="13.85" width="16.5" height="40.3" />
            <rect x="87.5" y="13.85" width="16.5" height="40.3" />
            <rect x="1" y="24.85" width="5.5" height="18.3" />
            <rect x="98.5" y="24.85" width="5.5" height="18.3" />
          </g>
          {gettoni(casa, 'casa', 'var(--accento)')}
          {gettoni(trasferta, 'trasferta', '#37424d')}
          <circle className="md-palla" cx={palla[0]} cy={palla[1]} r="1.1" fill="#ffffff" stroke="#222" strokeWidth="0.3" />
        </svg>

        <div className="md-colonna">
          {/* La telecronaca, riga più recente in alto */}
          <div className="md-telecronaca">
            {cronaca.map((r, i) => (
              <p key={cronaca.length - i} className={r.evidenza ? 'md-riga evidenza' : 'md-riga'}>
                <span className="minuto">{r.minuto}'</span> {r.testo}
              </p>
            ))}
            {cronaca.length === 0 && <p className="md-riga">Le squadre entrano in campo...</p>}
          </div>

          {/* Pagelle live della mia squadra (FRD §9.5) */}
          <div className="md-voti">
            {voti.map((v) => (
              <span key={v.id} className="pagella">
                {cognome(v.nome)} <strong>{v.voto.toFixed(1)}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {finita && (() => {
        const r = partita.risultatoFinale()
        return (
          <p className="nota">
            Possesso {r.statistiche.casa.possesso}%-{r.statistiche.trasferta.possesso}% ·
            tiri {r.statistiche.casa.tiri}-{r.statistiche.trasferta.tiri} ·
            in porta {r.statistiche.casa.tiriInPorta}-{r.statistiche.trasferta.tiriInPorta} ·
            gol attesi {r.statistiche.casa.golAttesi.toFixed(2)}-{r.statistiche.trasferta.golAttesi.toFixed(2)}
            {' '}— highlights e pagelle complete nella schermata Partite.
          </p>
        )
      })()}
    </section>
  )
}

export default MatchDay
