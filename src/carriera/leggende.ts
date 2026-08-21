// leggende.ts — le LEGGENDE nel mercato come free agent (M9, richiesta
// esplicita dello sviluppatore).
//
// Se l'opzione è attiva, dalla stagione scelta le leggende (Icon e Heroes)
// entrano nel mercato ESTIVO come svincolati: niente cartellino, ma un
// ingaggio da leggenda — e a convincerle non sono i soldi, è la PROSPETTIVA
// DEL PROGETTO (vedi punteggioInteresse in src/trattativa/interesse.ts).
// Non crescono né declinano (sono fuori dal tempo), ma dopo 5 stagioni
// dall'ingresso si RITIRANO, ovunque si trovino, a prescindere dall'età.
// I ritirati finiscono nel registro `carriera.ritirati` (base per la
// gestione del post-ritiro).

import type { Database } from 'sql.js'
import { interroga } from '../db/query.ts'
import { aggiungiNotizia } from '../mercato/stato.ts'
import type { Carriera } from './tipi.ts'

/** Dopo quante stagioni dall'ingresso le leggende appendono le scarpe. */
export const STAGIONI_LEGGENDA = 5

/** Fa entrare le leggende nel mercato estivo, se l'opzione lo prevede.
    Chiamata a ogni apertura della finestra estiva (creazione carriera,
    fine stagione, rientro dalla nazionale). Idempotente. */
export function ingressoLeggendeSeDovuto(db: Database, carriera: Carriera): void {
  const lm = carriera.leggendeMercato
  if (!lm || lm.entrate || carriera.anno < lm.daAnno) return
  if (!carriera.mercato.aperto || carriera.mercato.finestra !== 'estiva') return

  // tutte le leggende NON già impegnate (es. in una squadra Legend nel
  // campionato) né già svincolate
  const occupati = new Set<number>([
    ...Object.values(carriera.rose).flat(),
    ...carriera.svincolati,
  ])
  const ids = interroga<{ id: number }>(
    db, "SELECT id FROM giocatore WHERE categoria != 'normale'",
  ).map((r) => r.id).filter((id) => !occupati.has(id))

  carriera.svincolati.push(...ids)
  lm.entrate = true
  lm.annoIngresso = carriera.anno
  lm.ids = ids
  aggiungiNotizia(
    carriera,
    `⭐ CLAMOROSO: ${ids.length} LEGGENDE del calcio si dichiarano pronte a tornare in campo! ` +
      'Sono free agent: nessun cartellino, ma vorranno un progetto vero (e un ingaggio da leggenda).',
    'avviso',
  )
}

/** Il ritiro delle leggende: dopo 5 stagioni dall'ingresso appendono le
    scarpe, ovunque siano (anche nella tua rosa). Chiamata a fine stagione,
    DOPO l'avanzamento dell'anno. */
export function ritiroLeggendeSeDovuto(db: Database, carriera: Carriera): void {
  const lm = carriera.leggendeMercato
  if (!lm?.entrate || lm.annoIngresso === null || lm.ids.length === 0) return
  if (carriera.anno < lm.annoIngresso + STAGIONI_LEGGENDA) return

  const daRitirare = new Set(lm.ids)
  const nomi = interroga<{ id: number; nome: string; cognome: string }>(
    db,
    `SELECT id, nome, cognome FROM giocatore WHERE id IN (${lm.ids.map(() => '?').join(',')})`,
    lm.ids,
  )
  const nomeDi = new Map(nomi.map((r) => [r.id, `${r.nome} ${r.cognome}`.trim()]))

  // spariscono da rose, svincolati, contratti, prestiti e promesse
  let nellaMiaRosa = 0
  for (const clubId of Object.keys(carriera.rose)) {
    const prima = carriera.rose[Number(clubId)].length
    carriera.rose[Number(clubId)] = carriera.rose[Number(clubId)].filter((id) => !daRitirare.has(id))
    if (Number(clubId) === carriera.clubId) nellaMiaRosa = prima - carriera.rose[Number(clubId)].length
  }
  carriera.svincolati = carriera.svincolati.filter((id) => !daRitirare.has(id))
  carriera.prestiti = carriera.prestiti.filter((p) => !daRitirare.has(p.giocatoreId))
  for (const id of daRitirare) delete carriera.contratti[id]
  carriera.promesse = carriera.promesse.filter(
    (p) => p.stato !== 'attiva' || !daRitirare.has(p.giocatoreId),
  )

  // nel registro dei ritirati (la gestione del post-ritiro parte da qui)
  for (const id of daRitirare) {
    carriera.ritirati.push({ giocatoreId: id, nome: nomeDi.get(id) ?? `#${id}`, anno: carriera.anno })
  }

  lm.ids = [] // ritiro completato: non si ripete
  aggiungiNotizia(
    carriera,
    `🎖 Dopo ${STAGIONI_LEGGENDA} stagioni, le LEGGENDE appendono le scarpe al chiodo` +
      (nellaMiaRosa > 0 ? ` (${nellaMiaRosa} dalla tua rosa)` : '') +
      '. Il calcio le ringrazia.',
    'avviso',
  )
}
