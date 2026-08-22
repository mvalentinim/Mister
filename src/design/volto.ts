// volto.ts — il VOLTO dei giocatori generato con DiceBear (scelta dello
// sviluppatore, dopo tre bocciature dei ritratti disegnati a mano da
// Claude Code: qui serve una libreria di illustrazione vera).
//
// DiceBear genera l'avatar in locale (niente rete: va bene anche per
// l'app nativa) a partire da un SEED: usiamo l'id del giocatore, così
// stesso giocatore → stessa faccia, per sempre.
//
// Le OPZIONI SONO BLOCCATE per coerenza con lo stile "Almanacco":
// sfondo sempre carta (--paper-2) o colori del club, gamma di pelle e
// capelli limitata alla palette di stampa, stessa dimensione ovunque.
// Lo stile grafico è uno solo, scelto dallo sviluppatore tra quattro
// candidati (pixel-art, notionists, lorelei, open-peeps).

import { createAvatar } from '@dicebear/core'
import { pixelArt, notionists, lorelei, openPeeps } from '@dicebear/collection'
import type { ColoriClub } from './colori-club.ts'

export type StileVolto = 'pixel-art' | 'notionists' | 'lorelei' | 'open-peeps'

/** Lo stile in uso nel gioco (da fissare dopo la scelta dello sviluppatore). */
export const STILE_VOLTO: StileVolto = 'pixel-art'

/* la palette di stampa: pelle e capelli mai fuori gamma (senza #) */
const PELLI = ['f8d2a4', 'f0bc88', 'e0a26d', 'c28253', '98613b', '70462a']
const CAPELLI = ['241a12', '43301d', '6b4a26', 'a06c33', 'd9a850', '8d8577']
const CARTA_2 = 'eae3d2'

/** Gli SVG di DiceBear usano id interni FISSI (es. la mask del riquadro):
    con più avatar nella stessa pagina il browser risolve tutti i
    riferimenti sulla PRIMA occorrenza e i volti spariscono. Qui ogni
    id viene reso unico per giocatore. */
function conIdUnici(svg: string, uid: string): string {
  return svg
    .replaceAll(/id="([^"]+)"/g, `id="${uid}-$1"`)
    .replaceAll(/url\(#([^)]+)\)/g, `url(#${uid}-$1)`)
    .replaceAll(/href="#([^"]+)"/g, `href="#${uid}-$1"`)
}

/** L'SVG (stringa) del volto di un giocatore, nello stile chiesto.
    `colori` tinge i vestiti dell'avatar dove lo stile li prevede. */
export function voltoSvg(
  stile: StileVolto,
  giocatoreId: number,
  colori: ColoriClub,
  lato = 96,
): string {
  const seed = `mister-${giocatoreId}`
  const club = colori.primario.replace('#', '')
  const base = { seed, size: lato, backgroundColor: [CARTA_2] }
  const uid = `${stile}-${giocatoreId}`

  switch (stile) {
    case 'pixel-art':
      return conIdUnici(createAvatar(pixelArt, {
        ...base,
        skinColor: PELLI,
        hairColor: CAPELLI,
        clothingColor: [club],
        glassesProbability: 0,
        hatProbability: 0,
        accessoriesProbability: 0,
      }).toString(), uid)
    case 'notionists':
      // stile a china: è già monocromo, si blocca solo lo sfondo
      return conIdUnici(createAvatar(notionists, base).toString(), uid)
    case 'lorelei':
      return conIdUnici(createAvatar(lorelei, {
        ...base,
        skinColor: PELLI,
        hairColor: CAPELLI,
        glassesProbability: 0,
        frecklesProbability: 10,
      }).toString(), uid)
    case 'open-peeps':
      return conIdUnici(createAvatar(openPeeps, {
        ...base,
        skinColor: PELLI,
        headContrastColor: CAPELLI,
        clothingColor: [club],
        accessoriesProbability: 0,
        maskProbability: 0,
      }).toString(), uid)
  }
}
