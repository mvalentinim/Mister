// MatchDay.tsx — la partita "in diretta" (anticipo della milestone M5,
// FRD §9): campo schematico con i gettoni dei giocatori, palla che gira,
// minuti che scorrono con velocità regolabile (1x/2x/3x/5x + pausa) e
// telecronaca testuale generata accanto al campo.
//
// Sulle azioni importanti il tempo RALLENTA e la cronaca si infittisce
// (la "telecronaca ibrida" del FRD §9.4): ogni evento del motore viene
// espanso in più battute che seguono l'azione fino all'esito.
//
// Il trucco che tiene tutto insieme è il determinismo di M3: la partita
// viene pre-calcolata qui con LO STESSO seme che userà il campionato,
// quindi ciò che vedi è esattamente ciò che finirà in classifica.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Database } from 'sql.js'
import { partitaUtenteCorrente, semePartita, squadraPerMotore } from '../carriera/motore.ts'
import type { Carriera } from '../carriera/tipi.ts'
import { simulaPartitaMotore } from '../motore/partita.ts'
import { creaRng, semeDaStringa, type Rng } from '../motore/rng.ts'
import type { EventoPartita, SquadraMotore } from '../motore/tipi.ts'

interface Props {
  db: Database
  carriera: Carriera
  /** chiamata quando l'utente chiude il Match Day a partita finita */
  onFine: () => void
}

// ── Geometria del campo (viewBox 105×68, come i metri di un campo vero) ────

/** Posizioni del 4-4-2 per la squadra di casa (attacca verso destra). */
const POSIZIONI_CASA: Array<[number, number]> = [
  [5, 34], // POR
  [20, 10], [20, 26], [20, 42], [20, 58], // difesa
  [44, 8], [44, 25], [44, 43], [44, 60], // centrocampo
  [66, 24], [66, 44], // attacco
]
const specchia = ([x, y]: [number, number]): [number, number] => [105 - x, y]
const POSIZIONI_TRASFERTA = POSIZIONI_CASA.map(specchia)

/** Cognome da mostrare sotto il gettone ("K. De Bruyne" → "De Bruyne"). */
const cognome = (nome: string) => nome.slice(nome.indexOf(' ') + 1)

// ── Telecronaca procedurale ────────────────────────────────────────────────

/** Un passo della narrazione: testo + dove va la palla + effetti. */
interface Passo {
  testo?: string
  evidenza?: boolean
  palla?: [number, number]
  protagonistaId?: number
  golPer?: 'casa' | 'trasferta'
}

const scegli = (rng: Rng, varianti: string[]) => varianti[rng.intero(varianti.length)]

/** Espande un evento del motore nei passi della telecronaca (FRD §9.4). */
function narrazione(e: EventoPartita, rng: Rng, casa: SquadraMotore, trasferta: SquadraMotore): Passo[] {
  const attaccante = e.squadra === 'casa'
  const squadra = attaccante ? casa : trasferta
  const nome = e.giocatoreNome
  // le coordinate dell'azione: l'area attaccata dalla squadra dell'evento
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
          testo: scegli(rng, [
            `${nome} controlla e calcia!`,
            `Conclusione improvvisa di ${nome}!`,
            `${nome} si coordina... tiro!`,
          ]),
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
      // l'evento è registrato sul portiere che para
      return [
        { testo: scegli(rng, ['Azione pericolosa, tiro in porta!', 'Conclusione forte dal limite!']), palla: [attaccante ? 17 : 88, yTiro], evidenza: true },
        {
          testo: scegli(rng, [
            `🧤 ${nome} si distende e para!`,
            `🧤 Gran riflesso di ${nome}, palla bloccata!`,
            `🧤 ${nome} dice di no! Che intervento!`,
          ]),
          palla: [attaccante ? 5 : 100, 34], protagonistaId: e.giocatoreId, evidenza: true,
        },
      ]
    case 'occasione-fuori':
      return [
        { testo: scegli(rng, [`${nome} si libera al tiro...`, `Spazio per ${nome} che prova da fuori...`]), palla: [xArea, yTiro], protagonistaId: e.giocatoreId },
        { testo: scegli(rng, ['💨 Fuori di un soffio!', "💨 Alto sopra la traversa!", '💨 Sfiora il palo!']), palla: [xPorta, yTiro < 34 ? 6 : 62], evidenza: true },
      ]
    case 'ammonizione':
      return [{ testo: `🟨 Fallo di ${nome}: ammonito.`, protagonistaId: e.giocatoreId, evidenza: true }]
    case 'espulsione':
      return [
        { testo: `Intervento durissimo di ${nome}...`, protagonistaId: e.giocatoreId },
        { testo: `🟥 ESPULSO! ${squadra.nome} resta in dieci!`, evidenza: true },
      ]
    case 'infortunio':
      return [{ testo: `🚑 ${nome} resta a terra: problema muscolare.`, protagonistaId: e.giocatoreId, evidenza: true }]
    case 'occasione-murata':
      return [{ testo: `${nome} cerca il tiro ma trova il muro della difesa.`, protagonistaId: e.giocatoreId }]
  }
}

/** Frasi di riempimento nei minuti tranquilli. */
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
  // Pre-calcolo della partita: STESSO seme del campionato → stesso risultato
  const { casa, trasferta, esito } = useMemo(() => {
    const partita = partitaUtenteCorrente(carriera)!
    const casa = squadraPerMotore(db, carriera, partita.casaId)
    const trasferta = squadraPerMotore(db, carriera, partita.trasfertaId)
    const esito = simulaPartitaMotore(
      casa, trasferta,
      semePartita(carriera, carriera.giornata, partita.casaId, partita.trasfertaId),
    )
    return { casa, trasferta, esito }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const eventiPerMinuto = useMemo(() => {
    const mappa = new Map<number, EventoPartita[]>()
    for (const e of esito.eventi) {
      if (!mappa.has(e.minuto)) mappa.set(e.minuto, [])
      mappa.get(e.minuto)!.push(e)
    }
    return mappa
  }, [esito])

  // rng SOLO per la parte visuale/narrativa (non tocca il risultato)
  const rng = useMemo(() => creaRng(semeDaStringa(`${carriera.seme}-visuale-${carriera.giornata}`)), [carriera])

  const [minuto, setMinuto] = useState(0)
  const [velocita, setVelocita] = useState<1 | 2 | 3 | 5>(1)
  const [pausa, setPausa] = useState(false)
  const [punteggio, setPunteggio] = useState({ casa: 0, trasferta: 0 })
  const [cronaca, setCronaca] = useState<RigaCronaca[]>([])
  const [palla, setPalla] = useState<[number, number]>([52.5, 34])
  const [protagonista, setProtagonista] = useState<number | null>(null)
  const [finita, setFinita] = useState(false)

  // stato mutabile del "regista" (fuori dal ciclo di render)
  const regia = useRef({ minuto: 0, coda: [] as Passo[], possessoCasa: true })
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

      // ── modalità highlight: consumo la coda di passi, a tempo RALLENTATO ──
      if (s.coda.length > 0) {
        const p = s.coda.shift()!
        if (p.palla) setPalla(p.palla)
        if (p.protagonistaId !== undefined) setProtagonista(p.protagonistaId)
        if (p.testo) aggiungiRiga(s.minuto, p.testo, p.evidenza ?? false)
        if (p.golPer) setPunteggio((v) => ({ ...v, [p.golPer!]: v[p.golPer!] + 1 }))
        // il rallentatore: passo lento anche alle velocità alte
        timer = setTimeout(passo, 1400 / Math.min(velocitaRef.current, 2))
        return
      }
      setProtagonista(null)

      // ── fine partita ──
      if (s.minuto >= 90) {
        aggiungiRiga(90, `🔔 Triplice fischio! ${casa.nome} ${esito.golCasa} - ${esito.golTrasferta} ${trasferta.nome}`, true)
        setFinita(true)
        return
      }

      // ── minuto successivo ──
      s.minuto++
      setMinuto(s.minuto)
      if (s.minuto === 46) aggiungiRiga(45, '🔔 Fine primo tempo.', false)

      const eventi = eventiPerMinuto.get(s.minuto)
      if (eventi && eventi.length > 0) {
        // c'è un'azione importante: il tempo rallenta, la cronaca si infittisce
        s.coda = eventi.flatMap((e) => narrazione(e, rng, casa, trasferta))
        timer = setTimeout(passo, 400)
        return
      }

      // gioco "normale": la palla gira tra i giocatori della squadra in possesso
      const probCasa = 0.5 + (casa.centrocampo - trasferta.centrocampo) * 0.012
      if (rng.evento(0.35)) s.possessoCasa = rng.evento(Math.max(0.15, Math.min(0.85, probCasa)))
      const posizioni = s.possessoCasa ? POSIZIONI_CASA : POSIZIONI_TRASFERTA
      const indice = 1 + rng.intero(10) // mai il portiere, per vivacità
      const [x, y] = posizioni[Math.min(indice, posizioni.length - 1)]
      setPalla([x + rng.intero(7) - 3, y + rng.intero(7) - 3])

      if (rng.evento(0.10)) aggiungiRiga(s.minuto, riempitivo(rng, casa, trasferta))

      timer = setTimeout(passo, 700 / velocitaRef.current)
    }

    timer = setTimeout(passo, 500)
    return () => { attivo = false; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Render ──
  const gettoni = (squadra: SquadraMotore, posizioni: Array<[number, number]>, colore: string) =>
    squadra.titolari.slice(0, 11).map((g, i) => {
      const [x, y] = posizioni[Math.min(i, posizioni.length - 1)]
      const evidenziato = protagonista === g.id
      return (
        <g key={g.id} className="gettone">
          <circle cx={x} cy={y} r={evidenziato ? 2.6 : 1.9} fill={colore}
            stroke={evidenziato ? '#e8c547' : '#ffffff'} strokeWidth={evidenziato ? 0.7 : 0.35} />
          <text x={x} y={y + 4.6} textAnchor="middle" className="nome-gettone">{cognome(g.nome)}</text>
        </g>
      )
    })

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
            <button className="bottone-primario" onClick={onFine}>
              Torna alla stagione →
            </button>
          )}
        </div>
      </div>

      <div className="md-corpo">
        {/* Il campo schematico */}
        <svg className="md-campo" viewBox="0 0 105 68">
          <rect x="0" y="0" width="105" height="68" rx="1.5" fill="#4a7c4e" />
          {/* strisce del prato */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={i * 15} y="0" width="7.5" height="68" fill="#457548" />
          ))}
          {/* linee */}
          <g stroke="#e8efe9" strokeWidth="0.45" fill="none">
            <rect x="1" y="1" width="103" height="66" />
            <line x1="52.5" y1="1" x2="52.5" y2="67" />
            <circle cx="52.5" cy="34" r="9.15" />
            <rect x="1" y="13.85" width="16.5" height="40.3" />
            <rect x="87.5" y="13.85" width="16.5" height="40.3" />
            <rect x="1" y="24.85" width="5.5" height="18.3" />
            <rect x="98.5" y="24.85" width="5.5" height="18.3" />
          </g>
          {gettoni(casa, POSIZIONI_CASA, 'var(--accento)')}
          {gettoni(trasferta, POSIZIONI_TRASFERTA, '#37424d')}
          {/* la palla (si muove con una transizione fluida, vedi CSS) */}
          <circle className="md-palla" cx={palla[0]} cy={palla[1]} r="1.1" fill="#ffffff" stroke="#222" strokeWidth="0.3" />
        </svg>

        {/* La telecronaca, riga più recente in alto */}
        <div className="md-telecronaca">
          {cronaca.map((r, i) => (
            <p key={cronaca.length - i} className={r.evidenza ? 'md-riga evidenza' : 'md-riga'}>
              <span className="minuto">{r.minuto}'</span> {r.testo}
            </p>
          ))}
          {cronaca.length === 0 && <p className="md-riga">Le squadre entrano in campo...</p>}
        </div>
      </div>

      {finita && (
        <p className="nota">
          Possesso {esito.statistiche.casa.possesso}%-{esito.statistiche.trasferta.possesso}% ·
          tiri {esito.statistiche.casa.tiri}-{esito.statistiche.trasferta.tiri} ·
          in porta {esito.statistiche.casa.tiriInPorta}-{esito.statistiche.trasferta.tiriInPorta} ·
          gol attesi {esito.statistiche.casa.golAttesi.toFixed(2)}-{esito.statistiche.trasferta.golAttesi.toFixed(2)}
          {' '}— pagelle complete nella schermata Partite.
        </p>
      )}
    </section>
  )
}

export default MatchDay
