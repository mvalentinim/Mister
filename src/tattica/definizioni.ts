// definizioni.ts — i mattoni della tattica (M4, FRD §8):
// i moduli con le posizioni sul campo, il vocabolario chiuso dei movimenti
// prevalenti per ruolo, e le istruzioni di squadra.

// ── Moduli ─────────────────────────────────────────────────────────────────
// Ogni modulo è una lista di 11 "slot": ruolo richiesto + posizione sul
// campo (coordinate viewBox 105×68, squadra che attacca verso destra).

export interface SlotModulo {
  ruolo: string // il ruolo "naturale" dello slot (POR DC TD TS MED CC TRQ ED ES PC)
  x: number
  y: number
}

export const MODULI: Record<string, SlotModulo[]> = {
  '4-4-2': [
    { ruolo: 'POR', x: 5, y: 34 },
    { ruolo: 'TD', x: 21, y: 58 }, { ruolo: 'DC', x: 19, y: 42 },
    { ruolo: 'DC', x: 19, y: 26 }, { ruolo: 'TS', x: 21, y: 10 },
    { ruolo: 'ED', x: 44, y: 60 }, { ruolo: 'CC', x: 42, y: 42 },
    { ruolo: 'CC', x: 42, y: 26 }, { ruolo: 'ES', x: 44, y: 8 },
    { ruolo: 'PC', x: 64, y: 42 }, { ruolo: 'PC', x: 64, y: 26 },
  ],
  '4-3-3': [
    { ruolo: 'POR', x: 5, y: 34 },
    { ruolo: 'TD', x: 21, y: 58 }, { ruolo: 'DC', x: 19, y: 42 },
    { ruolo: 'DC', x: 19, y: 26 }, { ruolo: 'TS', x: 21, y: 10 },
    { ruolo: 'MED', x: 37, y: 34 }, { ruolo: 'CC', x: 45, y: 48 }, { ruolo: 'CC', x: 45, y: 20 },
    { ruolo: 'ED', x: 62, y: 58 }, { ruolo: 'PC', x: 66, y: 34 }, { ruolo: 'ES', x: 62, y: 10 },
  ],
  '3-5-2': [
    { ruolo: 'POR', x: 5, y: 34 },
    { ruolo: 'DC', x: 18, y: 50 }, { ruolo: 'DC', x: 16, y: 34 }, { ruolo: 'DC', x: 18, y: 18 },
    { ruolo: 'ED', x: 43, y: 62 }, { ruolo: 'CC', x: 44, y: 45 }, { ruolo: 'MED', x: 37, y: 34 },
    { ruolo: 'CC', x: 44, y: 23 }, { ruolo: 'ES', x: 43, y: 6 },
    { ruolo: 'PC', x: 64, y: 42 }, { ruolo: 'PC', x: 64, y: 26 },
  ],
  '4-2-3-1': [
    { ruolo: 'POR', x: 5, y: 34 },
    { ruolo: 'TD', x: 21, y: 58 }, { ruolo: 'DC', x: 19, y: 42 },
    { ruolo: 'DC', x: 19, y: 26 }, { ruolo: 'TS', x: 21, y: 10 },
    { ruolo: 'MED', x: 36, y: 42 }, { ruolo: 'MED', x: 36, y: 26 },
    { ruolo: 'ED', x: 52, y: 58 }, { ruolo: 'TRQ', x: 52, y: 34 }, { ruolo: 'ES', x: 52, y: 10 },
    { ruolo: 'PC', x: 66, y: 34 },
  ],
  '3-4-3': [
    { ruolo: 'POR', x: 5, y: 34 },
    { ruolo: 'DC', x: 18, y: 50 }, { ruolo: 'DC', x: 16, y: 34 }, { ruolo: 'DC', x: 18, y: 18 },
    { ruolo: 'ED', x: 42, y: 60 }, { ruolo: 'CC', x: 40, y: 43 },
    { ruolo: 'CC', x: 40, y: 25 }, { ruolo: 'ES', x: 42, y: 8 },
    { ruolo: 'ED', x: 62, y: 54 }, { ruolo: 'PC', x: 66, y: 34 }, { ruolo: 'ES', x: 62, y: 14 },
  ],
  '5-3-2': [
    { ruolo: 'POR', x: 5, y: 34 },
    { ruolo: 'TD', x: 24, y: 60 }, { ruolo: 'DC', x: 17, y: 46 }, { ruolo: 'DC', x: 15, y: 34 },
    { ruolo: 'DC', x: 17, y: 22 }, { ruolo: 'TS', x: 24, y: 8 },
    { ruolo: 'CC', x: 43, y: 47 }, { ruolo: 'MED', x: 39, y: 34 }, { ruolo: 'CC', x: 43, y: 21 },
    { ruolo: 'PC', x: 64, y: 42 }, { ruolo: 'PC', x: 64, y: 26 },
  ],
}

// ── Movimenti prevalenti (FRD §8.2) ────────────────────────────────────────
// Vocabolario CHIUSO per ruolo. Ogni movimento ha:
// - attributi chiave: decidono l'IDONEITÀ (un giocatore inadatto lo esegue
//   male e l'effetto diventa un malus — conseguenza voluta dal FRD);
// - effetto sui reparti (punti a idoneità piena, ~1-99 di scala reparto);
// - freccia [dx, dy] disegnata sul campo tattico (verso destra = attacco);
// - eventuale bonus da tiratore (pesa di più nella scelta di chi conclude).

export interface Movimento {
  id: string
  nome: string
  fase: 'offensiva' | 'difensiva'
  ruoli: string[]
  attributiChiave: string[] // colonne della tabella giocatore
  effetto: { attacco?: number; centrocampo?: number; difesa?: number }
  freccia: [number, number]
  tiratore?: boolean
}

export const MOVIMENTI: Movimento[] = [
  // — offensivi —
  { id: 'taglio-interno', nome: 'Taglio interno da trequartista', fase: 'offensiva',
    ruoli: ['ED', 'ES', 'TRQ'], attributiChiave: ['dribbling', 'velocita', 'tiro'],
    effetto: { attacco: 3 }, freccia: [7, 0], tiratore: true },
  { id: 'spinta-fascia', nome: 'Spinta sulla fascia', fase: 'offensiva',
    ruoli: ['TD', 'TS', 'ED', 'ES'], attributiChiave: ['velocita', 'resistenza'],
    effetto: { attacco: 2.5, difesa: -1 }, freccia: [8, 0] },
  { id: 'attacco-profondita', nome: 'Attacco della profondità', fase: 'offensiva',
    ruoli: ['PC'], attributiChiave: ['velocita', 'posizionamento'],
    effetto: { attacco: 3 }, freccia: [8, 0], tiratore: true },
  { id: 'incontro-linee', nome: 'Incontro tra le linee', fase: 'offensiva',
    ruoli: ['PC', 'TRQ'], attributiChiave: ['tecnica', 'visione', 'passaggio'],
    effetto: { centrocampo: 2.5 }, freccia: [-6, 0] },
  { id: 'inserimento', nome: 'Inserimento senza palla', fase: 'offensiva',
    ruoli: ['CC', 'MED'], attributiChiave: ['posizionamento', 'resistenza'],
    effetto: { attacco: 2 }, freccia: [7, 0], tiratore: true },
  { id: 'regia', nome: 'Regia arretrata', fase: 'offensiva',
    ruoli: ['MED', 'CC'], attributiChiave: ['passaggio', 'visione'],
    effetto: { centrocampo: 3 }, freccia: [0, 0] },
  { id: 'impostazione-bassa', nome: 'Impostazione dal basso', fase: 'offensiva',
    ruoli: ['DC'], attributiChiave: ['passaggio', 'tecnica'],
    effetto: { centrocampo: 2, difesa: -0.5 }, freccia: [5, 0] },
  { id: 'cross-dal-fondo', nome: 'Cross dal fondo', fase: 'offensiva',
    ruoli: ['ED', 'ES', 'TD', 'TS'], attributiChiave: ['calci_piazzati', 'tecnica'],
    effetto: { attacco: 2 }, freccia: [6, 0] },
  // — difensivi —
  { id: 'ripiegamento', nome: 'Ripiegamento a quinto', fase: 'difensiva',
    ruoli: ['ED', 'ES', 'CC', 'TRQ'], attributiChiave: ['resistenza', 'contrasto'],
    effetto: { difesa: 2.5 }, freccia: [-7, 0] },
  { id: 'raddoppio-esterno', nome: "Raddoppio sull'esterno", fase: 'difensiva',
    ruoli: ['TD', 'TS', 'MED', 'CC'], attributiChiave: ['contrasto', 'posizionamento'],
    effetto: { difesa: 2.5 }, freccia: [-5, 3] },
  { id: 'pressing-punta', nome: 'Pressing sul portatore', fase: 'difensiva',
    ruoli: ['PC', 'TRQ'], attributiChiave: ['resistenza', 'contrasto'],
    effetto: { centrocampo: 2 }, freccia: [4, 0] },
  { id: 'schermo', nome: 'Schermo davanti alla difesa', fase: 'difensiva',
    ruoli: ['MED', 'CC'], attributiChiave: ['posizionamento', 'marcatura'],
    effetto: { difesa: 3 }, freccia: [-6, 0] },
  { id: 'salita-palla', nome: 'Salita palla al piede', fase: 'difensiva',
    ruoli: ['DC'], attributiChiave: ['tecnica', 'velocita'],
    effetto: { centrocampo: 2, difesa: -0.5 }, freccia: [6, 0] },
  { id: 'marcatura-stretta', nome: 'Marcatura stretta', fase: 'difensiva',
    ruoli: ['DC'], attributiChiave: ['marcatura', 'contrasto'],
    effetto: { difesa: 3 }, freccia: [-4, 0] },
  { id: 'copertura-profondita', nome: 'Copertura della profondità', fase: 'difensiva',
    ruoli: ['DC', 'TD', 'TS'], attributiChiave: ['velocita', 'posizionamento'],
    effetto: { difesa: 2.5 }, freccia: [-6, 0] },
]

/** I movimenti disponibili per un ruolo, divisi per fase. */
export function movimentiPerRuolo(ruolo: string) {
  const compatibili = MOVIMENTI.filter((m) => m.ruoli.includes(ruolo))
  return {
    offensivi: compatibili.filter((m) => m.fase === 'offensiva'),
    difensivi: compatibili.filter((m) => m.fase === 'difensiva'),
  }
}

/** I movimenti di default per ruolo: il primo offensivo e il primo difensivo. */
export function movimentiDefault(ruolo: string): string[] {
  const { offensivi, difensivi } = movimentiPerRuolo(ruolo)
  return [...offensivi.slice(0, 1), ...difensivi.slice(0, 1)].map((m) => m.id)
}

// ── Istruzioni di squadra (FRD §8.3: poche e leggibili) ────────────────────

export interface Istruzioni {
  /** -2 (molto difensiva) … +2 (molto offensiva) */
  mentalita: -2 | -1 | 0 | 1 | 2
  pressing: 'basso' | 'medio' | 'alto'
  ampiezza: 'stretta' | 'media' | 'larga'
  ritmo: 'basso' | 'medio' | 'alto'
}

export const ISTRUZIONI_DEFAULT: Istruzioni = {
  mentalita: 0, pressing: 'medio', ampiezza: 'media', ritmo: 'medio',
}

/** L'assetto tattico completo di una squadra. */
export interface Tattica {
  modulo: keyof typeof MODULI
  /** id giocatore per ogni slot del modulo (stesso ordine degli slot) */
  titolari: number[]
  /** movimenti scelti per ogni slot (max 2 offensivi + 2 difensivi) */
  movimenti: string[][]
  istruzioni: Istruzioni
}
