// compositore-volti.ts — il COMPOSITORE DEI VOLTI nel gioco
// (VOLTI-MISTER.md §5, porting del prototipo data/assets/faces/componi-volto.py).
//
// Ogni giocatore ha un ritratto 48×48 composto a strati dagli asset:
// maglietta bianca standard + base pelle + (barba, solo manuale) +
// capigliatura ricolorata. DETERMINISTICO: seed = id del giocatore,
// stesso generatore del motore (creaRng/semeDaStringa) e stesso ordine
// di estrazioni del prototipo Python → stessi volti, garantito.
//
// Decisioni dello sviluppatore (sessione 32): la generazione automatica
// usa SOLO pelle e capigliatura maschile (pesate per regione, §6); le
// BARBE non vengono mai sorteggiate — si aggiungono a mano per singolo
// giocatore dall'editor della figurina, insieme a pelle/capelli/colore.
// Le personalizzazioni vivono in colonne volto_* della tabella giocatore
// (viaggiano con il database personalizzato).

import { creaRng, semeDaStringa } from '../motore/rng.ts'
import manifestJson from '../../data/assets/faces/manifest.json'
import regions from '../../data/assets/faces/regions.json'

/* il manifest, tipizzato a mano (il JSON ha campi facoltativi) */
interface ParteVolto {
  id: string
  category: string
  label: string
  file: string | null
  region_bias?: string[]
  peso?: number
}
const manifest = manifestJson as { parti: ParteVolto[] }

const CELLA = 48
const RAMPA_NEUTRA = [0x2e, 0x4a, 0x6e, 0x92]

/* tutte le parti PNG, impacchettate da Vite come URL */
const PARTI_URL = import.meta.glob('../../data/assets/faces/parts/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function urlParte(percorso: string): string {
  const voce = Object.entries(PARTI_URL).find(([k]) => k.endsWith('/' + percorso))
  if (!voce) throw new Error(`parte del volto mancante: ${percorso}`)
  return voce[1]
}

/* le liste per l'editor: [id, etichetta] */
export const CAPIGLIATURE: Array<[string, string]> = manifest.parti
  .filter((p) => p.category === 'hair_m')
  .map((p) => [p.id, p.label])
export const BARBE: Array<[string, string]> = manifest.parti
  .filter((p) => p.category === 'beard')
  .map((p) => [p.id, p.label])
export const PELLI_ETICHETTE: string[] = manifest.parti
  .filter((p) => p.category === 'skin')
  .map((p) => p.label)
export const COLORI_CAPELLI: string[] = Object.keys(regions.rampe_capelli)

/** Le personalizzazioni per giocatore (colonne volto_* del DB):
    null/undefined = automatico. */
export interface PersonalizzazioneVolto {
  seme?: number | null
  pelle?: number | null // 1-8
  capelli?: string | null // id del manifest (hair_m_XX)
  colore?: string | null // nome della rampa
  barba?: string | null // id del manifest (beard_XX); assente = niente
}

/* cache delle immagini caricate e dei volti già composti */
const immagini = new Map<string, Promise<HTMLImageElement>>()
const volti = new Map<string, string>()

function caricaImmagine(url: string): Promise<HTMLImageElement> {
  let p = immagini.get(url)
  if (!p) {
    p = new Promise((risolvi, rifiuta) => {
      const img = new Image()
      img.onload = () => risolvi(img)
      img.onerror = () => rifiuta(new Error(`immagine non caricata: ${url}`))
      img.src = url
    })
    immagini.set(url, p)
  }
  return p
}

/** Sostituisce i 4 grigi neutri coi 4 toni della rampa (come il prototipo). */
function ricolora(ctx: CanvasRenderingContext2D, rampa: string[]): void {
  const dati = ctx.getImageData(0, 0, CELLA, CELLA)
  const px = dati.data
  const toni = rampa.map((c) => [
    parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16),
  ])
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue
    for (let t = 0; t < 4; t++) {
      if (Math.abs(px[i] - RAMPA_NEUTRA[t]) <= 14 && Math.abs(px[i + 1] - RAMPA_NEUTRA[t]) <= 14) {
        px[i] = toni[t][0]; px[i + 1] = toni[t][1]; px[i + 2] = toni[t][2]
        break
      }
    }
  }
  ctx.putImageData(dati, 0, 0)
}

const SCOSTAMENTO_BARBA = 4 // come nel prototipo

/** L'URL (data:) del volto 48×48 di un giocatore. Deterministico. */
export async function voltoDataUrl(
  giocatoreId: number,
  nazionalita: string,
  eta: number,
  extra?: PersonalizzazioneVolto,
): Promise<string> {
  const chiave = `${giocatoreId}|${eta}|${JSON.stringify(extra ?? {})}`
  const inCache = volti.get(chiave)
  if (inCache) return inCache

  // ── le stesse estrazioni del prototipo, nello stesso ordine ──
  const seme = extra?.seme ?? giocatoreId
  const rng = creaRng(semeDaStringa(`volto-${seme}`))
  const nazioni = regions.nazioni as Record<string, string>
  const nomeRegione = nazioni[nazionalita] ?? regions.regione_predefinita
  const regione = (regions.regioni as Record<string, {
    skin_weights: number[]; hair_color_weights: Record<string, number>; beard_prob: number
  }>)[nomeRegione]

  const pelleAuto = rng.pesato([0, 1, 2, 3, 4, 5, 6, 7], regione.skin_weights)
  const nomiColore = Object.keys(regione.hair_color_weights)
  let colore = rng.pesato(nomiColore, Object.values(regione.hair_color_weights))
  const idsCapelli = CAPIGLIATURE.map(([id]) => id)
  const pesi = idsCapelli.map((id) => {
    const voce = manifest.parti.find((p) => p.id === id)!
    const bias = (voce.region_bias ?? []).includes(nomeRegione) ? 3 : 1
    return bias * (voce.peso ?? 1)
  })
  const capelliAuto = rng.pesato(idsCapelli, pesi)
  if (eta >= 33 && rng.evento((eta - 32) * 0.06)) colore = 'grigio'

  // ── le personalizzazioni dell'editor vincono sull'automatico ──
  const pelle = extra?.pelle != null ? extra.pelle - 1 : pelleAuto
  const capelliId = extra?.capelli ?? capelliAuto
  if (extra?.colore) colore = extra.colore
  const rampa = (regions.rampe_capelli as Record<string, string[]>)[colore]

  // ── la composizione a strati su canvas ──
  const tela = document.createElement('canvas')
  tela.width = tela.height = CELLA
  const ctx = tela.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  ctx.drawImage(await caricaImmagine(urlParte(`skin/skin_${String(pelle + 1).padStart(2, '0')}.png`)), 0, 0)
  ctx.drawImage(await caricaImmagine(urlParte('jersey/jersey_std.png')), 0, 0)

  const strato = document.createElement('canvas')
  strato.width = strato.height = CELLA
  const ctxStrato = strato.getContext('2d')!
  ctxStrato.imageSmoothingEnabled = false

  if (extra?.barba) {
    ctxStrato.clearRect(0, 0, CELLA, CELLA)
    ctxStrato.drawImage(await caricaImmagine(urlParte(`beard/${extra.barba}.png`)), 0, SCOSTAMENTO_BARBA)
    ricolora(ctxStrato, rampa)
    ctx.drawImage(strato, 0, 0)
  }

  const voceCapelli = manifest.parti.find((p) => p.id === capelliId)
  if (voceCapelli?.file) { // "bald" = nessun layer
    ctxStrato.clearRect(0, 0, CELLA, CELLA)
    ctxStrato.drawImage(await caricaImmagine(urlParte(`hair_m/${capelliId}.png`)), 0, 0)
    ricolora(ctxStrato, rampa)
    ctx.drawImage(strato, 0, 0)
  }

  const url = tela.toDataURL('image/png')
  volti.set(chiave, url)
  return url
}
