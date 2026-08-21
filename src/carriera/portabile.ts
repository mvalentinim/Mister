// portabile.ts — la carriera come FILE .mister (M10, FRD §11).
//
// Il file .mister è un singolo file di testo (JSON) che contiene TUTTO
// quello che serve per riprendere una carriera su un altro browser o un
// altro computer: la carriera completa (con la sua versione di schema:
// all'import passa dalle stesse migrazioni dei salvataggi normali) e, se
// la carriera è nata con un DATABASE PERSONALIZZATO, anche il database
// stesso (in base64), così sul nuovo dispositivo non manca niente.

import type { Carriera } from './tipi.ts'
import { migra } from './salvataggio.ts'

/** L'estensione dei salvataggi portabili. */
export const ESTENSIONE_MISTER = '.mister'
const TIPO_FILE = 'mister-carriera'

/** La forma del file .mister (formato 1). */
interface FileMister {
  tipo: typeof TIPO_FILE
  formato: 1
  esportataIl: string
  carriera: Carriera
  /** il DB personalizzato della carriera (base64 del .sqlite), presente
      solo se la carriera non è nata col database originale */
  dbUtente?: string
}

/** Prepara il testo del file .mister per una carriera. `dbUtente` sono i
    byte del database personalizzato da includere (null = non serve,
    la carriera gioca col DB originale). */
export function serializzaCarriera(carriera: Carriera, dbUtente: Uint8Array | null): string {
  const file: FileMister = {
    tipo: TIPO_FILE,
    formato: 1,
    esportataIl: new Date().toISOString(),
    carriera,
  }
  if (dbUtente && carriera.dbImpronta !== 0) file.dbUtente = aBase64(dbUtente)
  return JSON.stringify(file)
}

/** Legge un file .mister: controlla che sia davvero un salvataggio MISTER,
    migra la carriera alla versione corrente e restituisce anche il DB
    personalizzato incluso (se c'è). Lancia un errore spiegato in italiano
    se il file non è valido. */
export function leggiFileMister(testo: string): { carriera: Carriera; dbUtente: Uint8Array | null } {
  let grezzo: unknown
  try {
    grezzo = JSON.parse(testo)
  } catch {
    throw new Error('Questo file non è un salvataggio MISTER (il contenuto non si legge).')
  }
  const file = grezzo as Partial<FileMister>
  if (file.tipo !== TIPO_FILE || !file.carriera || typeof file.carriera.versioneSchema !== 'number') {
    throw new Error('Questo file non è un salvataggio MISTER.')
  }
  return {
    carriera: migra(file.carriera),
    dbUtente: file.dbUtente ? daBase64(file.dbUtente) : null,
  }
}

/** Una copia della carriera come nuovo slot: id nuovo, etichetta a scelta.
    È il "salvataggio manuale": l'app salva da sola a ogni azione, la copia
    congela il momento (es. prima di una decisione rischiosa). */
export function duplicaCarriera(carriera: Carriera, etichetta?: string): Carriera {
  const copia = structuredClone(carriera)
  copia.id = `carriera-${Date.now()}`
  copia.nomeSlot = etichetta || `Copia del ${new Date().toLocaleDateString('it-IT')}`
  return copia
}

/** Il nome di file proposto per l'export. */
export function nomeFileMister(carriera: Carriera): string {
  const allenatore = carriera.allenatore.nome.replace(/[^\p{L}\p{N}]+/gu, '-')
  return `${allenatore}-stagione-${carriera.anno}${ESTENSIONE_MISTER}`
}

// ── base64 a blocchi: btoa/atob non digeriscono array enormi in un colpo ──
function aBase64(dati: Uint8Array): string {
  let stringa = ''
  for (let i = 0; i < dati.length; i += 0x8000) {
    stringa += String.fromCharCode(...dati.subarray(i, i + 0x8000))
  }
  return btoa(stringa)
}

function daBase64(testo: string): Uint8Array {
  const binario = atob(testo)
  const dati = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) dati[i] = binario.charCodeAt(i)
  return dati
}
