// ritiri.ts — il ritiro per età dei giocatori NORMALI e la loro RINASCITA
// (richiesta esplicita dello sviluppatore, sessione 24).
//
// La regola: a fine stagione i giocatori normali troppo avanti con l'età
// appendono le scarpe. Dopo UNA stagione di pausa il ritirato "rinasce":
// torna nel mercato come free agent, versione identica di sé stesso ma
// SEDICENNE. Il POTENZIALE è quello del DB, che per i campioni anziani
// resta alto (Modrić: potenziale 83 anche se al ritiro valeva 76): il
// rigenerato riparte con abilità da ragazzo e può crescere fino a
// diventare il campione "sulla carta", anche se la carriera precedente —
// iniziata da over 30, quando non si cresce più — non gliel'ha permesso.
// Ambizioni, stipendio e valore si adeguano da soli: dipendono tutti da
// età e media, che ora sono quelle di un ragazzo (vedi valoreMercato e
// stipendioAtteso). Da lì in poi ci pensa la crescita di M8.
// Si rinasce UNA volta sola. Le leggende ritirate NON rinascono.

import type { Database } from 'sql.js'
import { interroga } from '../db/query.ts'
import { mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import { creaRng, semeDaStringa } from '../motore/rng.ts'
import { aggiungiNotizia } from '../mercato/stato.ts'
import { applicaCrescita } from './crescita.ts'
import type { Carriera } from './tipi.ts'

/** A quest'età il ritiro è certo. */
export const ETA_RITIRO_CERTO = 38
/** Da quest'età il ritiro diventa possibile (probabilità crescente). */
export const ETA_RITIRO_POSSIBILE = 35
/** L'età con cui il rigenerato torna in campo. */
export const ETA_RINASCITA = 16
/** Quanto sotto il POTENZIALE partono le abilità del sedicenne. */
const DIVARIO_SEDICENNE = 22
/** La media di partenza non scende comunque sotto questo valore. */
const MEDIA_MINIMA_RINATO = 35

/** L'età "di gioco" DOPO l'avanzamento dell'anno (queste funzioni vanno
    chiamate a stagione chiusa, quando carriera.anno è già quello nuovo). */
function etaAFineStagione(carriera: Carriera, dataNascita: string): number {
  const annoNascita = parseInt(dataNascita, 10)
  if (Number.isNaN(annoNascita)) return 0
  return carriera.anno - annoNascita
}

/** A fine stagione i giocatori NORMALI anziani si ritirano: certi a 38+,
    possibili dai 35 (probabilità che cresce con l'età; uno svincolato di
    35+ smette sempre, nessuno lo vuole più). Deterministico col seme.
    Registra il `picco` (la media al momento del ritiro) a titolo
    informativo: il potenziale del rigenerato è quello del DB.
    Da chiamare DOPO carriera.anno++. */
export function ritiriFineStagione(db: Database, carriera: Carriera): void {
  if (!carriera.ritirati || !carriera.rinati) return // salvataggio non ancora migrato
  const rng = creaRng(semeDaStringa(`ritiri-${carriera.seme}-${carriera.anno}`))
  const svincolatiSet = new Set(carriera.svincolati)

  // tutti i giocatori tracciati dalla carriera (rose del mondo + svincolati)
  const tuttiIds = [...Object.values(carriera.rose).flat(), ...carriera.svincolati]
  const ritirati: Array<{ id: number; nome: string; picco: number }> = []
  // a blocchi di 500: SQLite accetta al massimo 999 segnaposto per query
  for (let i = 0; i < tuttiIds.length; i += 500) {
    const blocco = tuttiIds.slice(i, i + 500)
    const grezze = interroga<GiocatoreRiga>(
      db,
      `SELECT * FROM giocatore WHERE id IN (${blocco.map(() => '?').join(',')})`,
      blocco,
    )
    // applicaCrescita: per i rinati sovrascrive anche l'età (un rigenerato
    // è un ragazzo, non deve ri-ritirarsi con la data di nascita del DB)
    for (const g of applicaCrescita(carriera, grezze)) {
      if (g.categoria !== 'normale') continue // le leggende hanno il loro ritiro
      const eta = etaAFineStagione(carriera, g.data_nascita)
      if (eta < ETA_RITIRO_POSSIBILE) continue
      const smette =
        eta >= ETA_RITIRO_CERTO ||
        svincolatiSet.has(g.id) || // svincolato e anziano: fine corsa
        rng.evento(0.25 * (eta - (ETA_RITIRO_POSSIBILE - 1))) // 35: 25%, 36: 50%, 37: 75%
      if (!smette) continue
      ritirati.push({ id: g.id, nome: `${g.nome} ${g.cognome}`.trim(), picco: mediaComplessiva(g) })
    }
  }
  if (ritirati.length === 0) return

  // spariscono da rose, svincolati, contratti, prestiti e promesse
  const daRitirare = new Set(ritirati.map((r) => r.id))
  let nomiMiei: string[] = []
  for (const clubId of Object.keys(carriera.rose)) {
    if (Number(clubId) === carriera.clubId) {
      nomiMiei = ritirati
        .filter((r) => carriera.rose[Number(clubId)].includes(r.id))
        .map((r) => r.nome)
    }
    carriera.rose[Number(clubId)] = carriera.rose[Number(clubId)].filter((id) => !daRitirare.has(id))
  }
  carriera.svincolati = carriera.svincolati.filter((id) => !daRitirare.has(id))
  carriera.prestiti = carriera.prestiti.filter((p) => !daRitirare.has(p.giocatoreId))
  for (const id of daRitirare) delete carriera.contratti[id]
  carriera.promesse = carriera.promesse.filter(
    (p) => p.stato !== 'attiva' || !daRitirare.has(p.giocatoreId),
  )

  // nel registro: `picco` e categoria servono alla rinascita. Chi era GIÀ
  // un rigenerato chiude qui (si rinasce una volta sola: rinato = true).
  for (const r of ritirati) {
    carriera.ritirati.push({
      giocatoreId: r.id,
      nome: r.nome,
      anno: carriera.anno,
      picco: r.picco,
      categoria: 'normale',
      rinato: carriera.rinati[r.id] !== undefined || undefined,
    })
  }

  aggiungiNotizia(
    carriera,
    `👋 Fine di un'era: ${ritirati.length} giocatori si ritirano dal calcio giocato` +
      (nomiMiei.length > 0 ? ` — tra loro ${nomiMiei.join(', ')} della TUA rosa` : '') +
      '.',
    'avviso',
  )
}

/** La RINASCITA: dopo una stagione di pausa, il ritirato normale torna nel
    mercato come free agent sedicenne. L'identità nuova (solo l'anno di
    nascita) vive in `carriera.rinati` e viene applicata in lettura da
    applicaCrescita; il POTENZIALE resta quello del DB, e le abilità
    vengono riportate a livello da ragazzo (potenziale − 22) con un delta
    in `carriera.crescita`. Da chiamare a fine stagione, DOPO
    carriera.anno++ e dopo ritiriFineStagione. */
export function rinasciteFineStagione(db: Database, carriera: Carriera): void {
  if (!carriera.ritirati || !carriera.rinati) return
  const pronti = carriera.ritirati.filter(
    (r) =>
      r.categoria === 'normale' && // le leggende non rinascono
      r.rinato !== true &&
      carriera.anno >= r.anno + 1, // una stagione intera di pausa
  )
  if (pronti.length === 0) return

  const nomi: string[] = []
  for (const r of pronti) {
    // la media "di fabbrica" del DB (SENZA crescita): il delta di rinascita
    // si calcola da lì, perché sostituisce il registro accumulato
    const [riga] = interroga<GiocatoreRiga>(
      db, 'SELECT * FROM giocatore WHERE id = ?', [r.giocatoreId],
    )
    if (!riga) continue
    const mediaBase = mediaComplessiva(riga)
    // le abilità del sedicenne partono sotto il POTENZIALE del DB — che per
    // i campioni anziani resta alto (Modrić: 83), quindi il rigenerato può
    // crescere fino a diventare il campione che il DB "promette"
    const target = Math.max(MEDIA_MINIMA_RINATO, riga.potenziale - DIVARIO_SEDICENNE)

    // identità nuova: sedicenne (il potenziale resta quello del DB)
    carriera.rinati[r.giocatoreId] = { annoNascita: carriera.anno - ETA_RINASCITA }
    // il delta porta la media al target (può essere ben sotto il vecchio
    // DECLINO_MASSIMO: la crescita lo sa e lo rispetta)
    carriera.crescita[r.giocatoreId] = target - mediaBase
    // free agent: torna tra gli svincolati (lo stipendio atteso sarà quello
    // basso di un ragazzo, lo calcola stipendioAttesoSvincolato da età+media)
    carriera.svincolati.push(r.giocatoreId)
    r.rinato = true
    nomi.push(r.nome)
  }
  if (nomi.length === 0) return

  aggiungiNotizia(
    carriera,
    `🌱 RIGENERATI: ${nomi.slice(0, 3).join(', ')}${nomi.length > 3 ? ` e altri ${nomi.length - 3}` : ''}` +
      ' — dopo un anno di pausa tornano nel mercato da free agent… a 16 anni,' +
      ' con tutto il talento di una volta da riconquistare.',
    'avviso',
  )
}
