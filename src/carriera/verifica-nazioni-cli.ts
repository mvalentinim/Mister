// verifica-nazioni-cli.ts — il collaudo multi-nazione di M11: una CARRIERA
// COMPLETA (2 stagioni, mercati inclusi) in OGNI nazione disponibile, a
// livello di motore, senza browser. Si lancia con: npm run nazioni
//
// Per ogni nazione: crea la carriera, chiude il mercato estivo, gioca
// tutte le giornate (gestendo mercato invernale ed eventuali esoneri),
// chiude la stagione e ricomincia. Alla fine controlla che i meccanismi
// abbiano lavorato: classifica piena, crescita applicata, storico delle
// medie fotografato, nessuna eccezione.

import { readFile } from 'node:fs/promises'
import initSqlJs, { type Database } from 'sql.js'
import {
  avanzaGiornata, chiudiStagione, creaCarriera, generaOfferte,
  nazioniDisponibili, stagioneFinita,
} from './motore.ts'
import { accettaOffertaPanchina } from './fama.ts'
import { giornoDiMercato } from '../mercato/ia.ts'

const STAGIONI = 2

const SQL = await initSqlJs()
const db: Database = new SQL.Database(await readFile('public/mister.sqlite'))

const nazioni = nazioniDisponibili(db)
console.log(`Nazioni disponibili: ${nazioni.map((n) => n.nome).join(', ')}\n`)

let tuttoOk = true

for (const nazione of nazioni) {
  try {
    const offerte = generaOfferte(db, nazione.id)
    const carriera = creaCarriera(
      db, { nome: 'Collaudo Nazioni', nazionalita: 'Italiana', eta: 45 }, nazione, offerte[0],
    )

    const chiudiMercato = () => {
      let guardia = 0
      while (carriera.mercato.aperto && guardia++ < 60) giornoDiMercato(db, carriera)
    }

    let esoneri = 0
    for (let stagione = 0; stagione < STAGIONI; stagione++) {
      chiudiMercato() // la finestra estiva è aperta a inizio stagione
      let guardia = 0
      while (!stagioneFinita(carriera) && guardia++ < 80) {
        // un esonero blocca tutto: si accetta la prima panchina offerta
        if (carriera.offerteSpeciali?.contesto === 'esonero') {
          accettaOffertaPanchina(db, carriera, carriera.offerteSpeciali.offerte[0])
          esoneri++
          continue
        }
        if (carriera.mercato.aperto) { chiudiMercato(); continue } // gennaio
        avanzaGiornata(db, carriera)
      }
      if (!stagioneFinita(carriera)) throw new Error('la stagione non arriva in fondo')
      chiudiStagione(db, carriera)
      // le offerte di fine stagione non interessano: si resta al club
      carriera.offerteSpeciali = null
      carriera.offertaNazionale = null
    }

    // ── le verifiche ──
    const problemi: string[] = []
    const squadre = carriera.club.filter((c) => c.livello === 2).length
    if (squadre < 8) problemi.push(`seconda divisione con ${squadre} squadre`)
    if (carriera.storico.length !== STAGIONI) problemi.push(`storico con ${carriera.storico.length} stagioni`)
    const cresciuti = Object.keys(carriera.crescita).length
    if (cresciuti < 100) problemi.push(`crescita applicata solo a ${cresciuti} giocatori`)
    const fotografati = Object.keys(carriera.storiaMedie).length
    if (fotografati < 15) problemi.push(`storico medie di soli ${fotografati} giocatori`)
    // chi è rimasto in rosa per tutta la carriera ha creazione + una
    // fotografia per stagione; dopo un esonero (cambio club) nessuno resta
    // per l'intero arco, ma le storie parziali devono comunque esserci
    const puntiAttesi = esoneri > 0 ? 2 : STAGIONI + 1
    const conStoriaLunga = Object.values(carriera.storiaMedie)
      .filter((punti) => punti.length >= puntiAttesi).length
    if (conStoriaLunga < 5) {
      problemi.push(`solo ${conStoriaLunga} giocatori con ${puntiAttesi}+ fotografie (attesi >= 5)`)
    }

    const esito = carriera.storico.map((s) => `${s.posizione}°`).join(', ')
    if (problemi.length === 0) {
      console.log(`✅ ${nazione.nome}: ${STAGIONI} stagioni complete (piazzamenti ${esito}` +
        `${esoneri ? `, ${esoneri} esoneri gestiti` : ''}) · crescita su ${cresciuti} giocatori · storico medie su ${fotografati}`)
    } else {
      tuttoOk = false
      console.log(`❌ ${nazione.nome}: ${problemi.join(' · ')}`)
    }
  } catch (errore) {
    tuttoOk = false
    console.log(`❌ ${nazione.nome}: ECCEZIONE — ${errore instanceof Error ? errore.message : String(errore)}`)
  }
}

console.log(tuttoOk
  ? '\n✅ VERIFICA MULTI-NAZIONE SUPERATA: una carriera completa gira in ogni nazione'
  : '\n❌ VERIFICA MULTI-NAZIONE FALLITA')
process.exit(tuttoOk ? 0 : 1)
