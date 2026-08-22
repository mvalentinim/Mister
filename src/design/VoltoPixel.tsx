// VoltoPixel.tsx — il RITRATTO composto di un giocatore, come immagine.
// Incapsula il compositore (asincrono: carica le parti la prima volta)
// in un componente semplice: finché il volto non è pronto mostra il
// riquadro carta vuoto. Upscaling SEMPRE pixelated (VOLTI-MISTER.md §1).

import { useEffect, useState } from 'react'
import type { GiocatoreRiga } from '../db/tipi.ts'
import { calcolaEta } from '../db/tipi.ts'
import { voltoDataUrl, type PersonalizzazioneVolto } from './compositore-volti.ts'

interface Props {
  giocatore: GiocatoreRiga
  /** lato in pixel CSS (il disegno resta 48×48) */
  lato?: number
  /** personalizzazioni esplicite (l'editor le passa in anteprima);
      se assenti si leggono le colonne volto_* della riga */
  extra?: PersonalizzazioneVolto
}

export function VoltoPixel({ giocatore: g, lato = 96, extra }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  // le colonne volto_* del DB (assenti nei DB non ancora aggiornati)
  const dalDb: PersonalizzazioneVolto = extra ?? {
    seme: g.volto_seme ?? null,
    pelle: g.volto_pelle ?? null,
    capelli: g.volto_capelli ?? null,
    colore: g.volto_colore ?? null,
    barba: g.volto_barba ?? null,
    barbaDx: g.volto_barba_dx ?? null,
    barbaDy: g.volto_barba_dy ?? null,
    barbaScala: g.volto_barba_scala ?? null,
    capelliDx: g.volto_capelli_dx ?? null,
    capelliDy: g.volto_capelli_dy ?? null,
    capelliScala: g.volto_capelli_scala ?? null,
  }

  useEffect(() => {
    let attivo = true
    voltoDataUrl(g.id, g.nazionalita, calcolaEta(g.data_nascita), dalDb)
      .then((u) => { if (attivo) setUrl(u) })
      .catch(() => { if (attivo) setUrl(null) })
    return () => { attivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.id, JSON.stringify(dalDb), JSON.stringify(extra ?? null)])

  return url ? (
    <img
      src={url}
      width={lato}
      height={lato}
      style={{ imageRendering: 'pixelated', display: 'block' }}
      alt=""
    />
  ) : (
    <span style={{ width: lato, height: lato, display: 'block' }} />
  )
}
