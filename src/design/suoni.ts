// suoni.ts — il SUONO di MISTER (DESIGN-MISTER.md §5).
//
// Otto effetti in stile retrò, SINTETIZZATI con la Web Audio API del
// browser: niente file audio e niente librerie, quindi zero rete e zero
// peso — funzionano anche nell'app nativa (Tauri) e offline.
//   click         — il click secco dei bottoni (agganciato a TUTTI i bottoni)
//   fischio       — il fischio dell'arbitro (inizio, intervallo, cartellini)
//   fischioFinale — il triplice fischio
//   gol           — il boato breve per un gol nostro
//   golSubito     — il mormorio cupo per un gol subito
//   trofeo        — il jingle dorato (coppe, promozioni)
//   mercato       — il "din-din" da telex per i colpi di mercato
//   errore        — il ronzio negativo (retrocessioni, esoneri)
//
// Volume regolabile a 4 livelli (spento/basso/medio/alto), salvato in
// localStorage. "Mai invadente": tutti gli inviluppi sono corti e il
// master resta comunque sotto il 50%.

export type NomeSuono =
  | 'click' | 'fischio' | 'fischioFinale' | 'gol' | 'golSubito'
  | 'trofeo' | 'mercato' | 'errore'

const CHIAVE_VOLUME = 'mister-audio' // livello 0-3
export const NOMI_LIVELLI = ['spento', 'basso', 'medio', 'alto'] as const
const GUADAGNI = [0, 0.15, 0.3, 0.5]

let livello = ((): number => {
  try {
    const testo = localStorage.getItem(CHIAVE_VOLUME)
    if (testo === null) return 2 // primo avvio: medio
    const v = Number(testo)
    return Number.isInteger(v) && v >= 0 && v <= 3 ? v : 2
  } catch { return 2 }
})()

let ctx: AudioContext | null = null
let master: GainNode | null = null
let rumore: AudioBuffer | null = null // rumore bianco per boato e fischi

/** Il contesto audio, creato pigramente (i browser lo vogliono dopo un
    gesto dell'utente: qui arriva sempre in risposta a un click). */
function contesto(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = GUADAGNI[livello]
    master.connect(ctx.destination)
    // 2 secondi di rumore bianco, riusato da boato e fischi
    rumore = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const dati = rumore.getChannelData(0)
    for (let i = 0; i < dati.length; i++) dati[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function livelloAudio(): number { return livello }

/** Passa al livello di volume successivo (alto → spento → basso → …). */
export function cicloVolume(): number {
  livello = (livello + 1) % 4
  try { localStorage.setItem(CHIAVE_VOLUME, String(livello)) } catch { /* privato */ }
  if (master && ctx) master.gain.setTargetAtTime(GUADAGNI[livello], ctx.currentTime, 0.02)
  return livello
}

/* ── i mattoni della sintesi ── */

/** Un oscillatore con inviluppo: da (freq0, t0) scivola a freq1, con
    attacco rapido e rilascio esponenziale. */
function nota(
  c: AudioContext, forma: OscillatorType, freq0: number, freq1: number,
  t0: number, durata: number, picco: number,
) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = forma
  osc.frequency.setValueAtTime(freq0, t0)
  if (freq1 !== freq0) osc.frequency.exponentialRampToValueAtTime(freq1, t0 + durata)
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(picco, t0 + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + durata)
  osc.connect(gain).connect(master!)
  osc.start(t0)
  osc.stop(t0 + durata + 0.02)
}

/** Il fischietto dell'arbitro: nota acuta con il "trillo" della pallina
    (modulazione veloce della frequenza) e un filo di soffio. */
function fischietto(c: AudioContext, t0: number, durata: number) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.value = 2350
  const trillo = c.createOscillator()
  const profondita = c.createGain()
  trillo.frequency.value = 38
  profondita.gain.value = 220
  trillo.connect(profondita).connect(osc.frequency)
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(0.16, t0 + 0.015)
  gain.gain.setValueAtTime(0.16, t0 + durata - 0.03)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + durata)
  osc.connect(gain).connect(master!)
  osc.start(t0); trillo.start(t0)
  osc.stop(t0 + durata + 0.02); trillo.stop(t0 + durata + 0.02)
}

/** Il pubblico: rumore bianco filtrato con un inviluppo che gonfia e
    sgonfia — un boato se acuto e forte, un mormorio se cupo e piano. */
function folla(c: AudioContext, t0: number, durata: number, frequenza: number, picco: number) {
  const sorgente = c.createBufferSource()
  sorgente.buffer = rumore
  const filtro = c.createBiquadFilter()
  filtro.type = 'bandpass'
  filtro.frequency.value = frequenza
  filtro.Q.value = 0.7
  const gain = c.createGain()
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(picco, t0 + durata * 0.25)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + durata)
  sorgente.connect(filtro).connect(gain).connect(master!)
  sorgente.start(t0)
  sorgente.stop(t0 + durata + 0.05)
}

/* ── gli otto effetti ── */

export function suona(nome: NomeSuono): void {
  if (livello === 0) return
  const c = contesto()
  if (!c || !master) return
  const t = c.currentTime

  switch (nome) {
    case 'click':
      // un tic secco, da tasto fisico
      nota(c, 'square', 1100, 700, t, 0.045, 0.12)
      break

    case 'fischio':
      fischietto(c, t, 0.3)
      break

    case 'fischioFinale':
      // il triplice fischio: corto, corto, luuungo
      fischietto(c, t, 0.18)
      fischietto(c, t + 0.26, 0.18)
      fischietto(c, t + 0.52, 0.55)
      break

    case 'gol':
      // il boato: la folla che esplode + uno slancio ascendente
      folla(c, t, 1.1, 1500, 0.5)
      nota(c, 'triangle', 300, 700, t + 0.05, 0.3, 0.1)
      break

    case 'golSubito':
      // il mormorio deluso: cupo, breve, che si spegne scendendo
      folla(c, t, 0.8, 500, 0.3)
      nota(c, 'triangle', 400, 200, t + 0.05, 0.35, 0.07)
      break

    case 'trofeo': {
      // il jingle dorato: arpeggio maggiore a 8 bit che sale
      const giri = [523.25, 659.25, 783.99, 1046.5] // do-mi-sol-do
      giri.forEach((f, i) => nota(c, 'square', f, f, t + i * 0.11, 0.22, 0.1))
      nota(c, 'square', 1046.5, 1046.5, t + 4 * 0.11, 0.5, 0.12) // il do finale tenuto
      break
    }

    case 'mercato':
      // il "din-din" del telex: due note limpide, come un'agenzia di stampa
      nota(c, 'sine', 1318.5, 1318.5, t, 0.16, 0.2)
      nota(c, 'sine', 1760, 1760, t + 0.14, 0.3, 0.2)
      break

    case 'errore':
      // il ronzio negativo: due gradini discendenti
      nota(c, 'sawtooth', 220, 220, t, 0.14, 0.12)
      nota(c, 'sawtooth', 155, 110, t + 0.16, 0.3, 0.12)
      break
  }
}

/** Aggancia il click a TUTTI i bottoni del gioco con un solo ascoltatore
    (delega sul documento). Il primo gesto sblocca anche il contesto audio.
    Da chiamare una volta all'avvio dell'app. */
export function attivaClickGlobale(): void {
  document.addEventListener('click', (evento) => {
    const bersaglio = evento.target as HTMLElement | null
    const bottone = bersaglio?.closest?.('button')
    if (bottone && !bottone.disabled) suona('click')
  }, { capture: true })
}
