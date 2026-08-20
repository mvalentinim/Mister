// comportamento.ts — il comportamento dei giocatori (M7, FRD §7 e §6.3):
// statistiche stagionali, morale, VERIFICA AUTOMATICA DELLE PROMESSE e
// messaggi dallo spogliatoio. Tutto viene aggiornato dopo ogni giornata
// (chiamato da avanzaGiornata) e a fine stagione.

import type { Database } from 'sql.js'
import { mediaComplessiva } from '../db/tipi.ts'
import { giocatoriPerId, rosaClub } from '../mercato/stato.ts'
import type { Carriera, Promessa } from '../carriera/tipi.ts'

/** Quante giornate si aspettano prima di verificare una promessa. */
const FINESTRA_VERIFICA = 6
/** Presenze richieste nella finestra per mantenere la titolarità. */
const PRESENZE_TITOLARITA = 4
const PRESENZE_CENTRALITA = 3

const limita = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

function messaggio(
  carriera: Carriera,
  giocatoreNome: string,
  testo: string,
  tono: 'positivo' | 'negativo' | 'neutro',
) {
  carriera.messaggi.unshift({
    anno: carriera.anno,
    giornata: carriera.giornata,
    giocatoreNome,
    testo,
    tono,
  })
  if (carriera.messaggi.length > 30) carriera.messaggi.length = 30
}

export function moraleDi(carriera: Carriera, giocatoreId: number): number {
  return carriera.morale[giocatoreId] ?? 50
}

function cambiaMorale(carriera: Carriera, giocatoreId: number, delta: number) {
  carriera.morale[giocatoreId] = limita(moraleDi(carriera, giocatoreId) + delta, 0, 100)
}

/**
 * Da chiamare DOPO ogni giornata giocata (la cronaca è già aggiornata):
 * aggiorna statistiche e morale della rosa dell'utente e verifica le promesse.
 */
export function aggiornaComportamento(db: Database, carriera: Carriera): void {
  const cronaca = carriera.cronaca
  if (!cronaca || cronaca.giornata !== carriera.giornata) return
  const miaVittoria =
    (cronaca.casaNome === carriera.club.find((c) => c.id === carriera.clubId)?.nome
      ? cronaca.golCasa - cronaca.golTrasferta
      : cronaca.golTrasferta - cronaca.golCasa) > 0

  // ── statistiche e morale di chi ha giocato ──
  const rosaMia = rosaClub(db, carriera, carriera.clubId)
  const inCampo = new Set<number>()
  for (const pagella of cronaca.voti) {
    // le pagelle della cronaca sono della squadra dell'utente
    const riga = rosaMia.find((g) => `${g.nome} ${g.cognome}`.trim() === pagella.nome)
    if (!riga) continue
    inCampo.add(riga.id)
    const s = (carriera.statistiche[riga.id] ??= {
      presenze: 0, sommaVoti: 0, gol: 0, ultimaPresenza: 0,
    })
    s.presenze++
    s.sommaVoti += pagella.voto
    s.ultimaPresenza = carriera.giornata
    cambiaMorale(carriera, riga.id, miaVittoria ? 2 : 1) // giocare fa bene al morale
  }
  for (const e of cronaca.eventi) {
    if (e.tipo === 'gol') {
      const s = carriera.statistiche[e.giocatoreId]
      if (s) s.gol++
    }
  }

  // ── chi resta fuori a lungo si scontenta (FRD §7: minutaggio vs aspettative) ──
  const ordinata = [...rosaMia].sort((a, b) => mediaComplessiva(b) - mediaComplessiva(a))
  for (const g of rosaMia) {
    if (inCampo.has(g.id)) continue
    const s = carriera.statistiche[g.id]
    const giornateFuori = carriera.giornata - (s?.ultimaPresenza ?? 0)
    const importante = ordinata.indexOf(g) < 14 // le riserve profonde si lamentano meno
    if (giornateFuori >= 4 && importante) {
      cambiaMorale(carriera, g.id, -3)
      if (giornateFuori === 4 || giornateFuori === 8) {
        messaggio(carriera, `${g.nome} ${g.cognome}`,
          'chiede più spazio: non gioca da un mese e vuole capire il suo ruolo nel progetto.', 'negativo')
      }
      if (moraleDi(carriera, g.id) <= 25 && giornateFuori === 6) {
        messaggio(carriera, `${g.nome} ${g.cognome}`,
          'è ai ferri corti con la panchina: se non gioca, a gennaio chiederà la cessione.', 'negativo')
      }
    }
  }

  verificaPromesse(db, carriera)
}

/** Verifica le promesse attive (FRD §6.3: registro con conseguenze). */
function verificaPromesse(db: Database, carriera: Carriera): void {
  for (const promessa of carriera.promesse) {
    if (promessa.stato !== 'attiva' || promessa.annoCreazione !== carriera.anno) continue
    if (promessa.tipo === 'progetto') continue // si verifica a fine stagione
    const trascorse = carriera.giornata - promessa.giornataCreazione
    if (trascorse < FINESTRA_VERIFICA) continue

    const s = carriera.statistiche[promessa.giocatoreId]
    const presenzeNellaFinestra = (s?.presenze ?? 0) - promessa.presenzeAllaCreazione
    const richieste = promessa.tipo === 'titolarita' ? PRESENZE_TITOLARITA : PRESENZE_CENTRALITA
    const g = giocatoriPerId(db, [promessa.giocatoreId])[0]
    const nome = g ? `${g.nome} ${g.cognome}` : 'Un giocatore'

    if (presenzeNellaFinestra >= richieste) {
      promessa.stato = 'mantenuta'
      cambiaMorale(carriera, promessa.giocatoreId, +10)
      carriera.famaAllenatore = limita(carriera.famaAllenatore + 1, 0, 100)
      messaggio(carriera, nome,
        `è soddisfatto: la promessa («${promessa.descrizione}») è stata mantenuta. Fiducia totale nel mister.`, 'positivo')
    } else {
      promessa.stato = 'tradita'
      cambiaMorale(carriera, promessa.giocatoreId, -30)
      carriera.promesseTradite++
      carriera.famaAllenatore = limita(carriera.famaAllenatore - 4, 0, 100)
      messaggio(carriera, nome,
        `è FURIOSO: gli avevi promesso «${promessa.descrizione}» e ha giocato ${presenzeNellaFinestra} volte in ${FINESTRA_VERIFICA} giornate. Lo spogliatoio mormora: la tua parola vale poco.`, 'negativo')
    }
  }
}

/** Verifica di fine stagione per le promesse di progetto ("in A in due anni"). */
export function verificaPromesseFineStagione(db: Database, carriera: Carriera, promosso: boolean): void {
  for (const promessa of carriera.promesse) {
    if (promessa.stato !== 'attiva' || promessa.tipo !== 'progetto') continue
    const g = giocatoriPerId(db, [promessa.giocatoreId])[0]
    const nome = g ? `${g.nome} ${g.cognome}` : 'Un giocatore'
    if (promosso) {
      promessa.stato = 'mantenuta'
      cambiaMorale(carriera, promessa.giocatoreId, +12)
      messaggio(carriera, nome, `esulta: il progetto promesso si è realizzato, la promozione è arrivata!`, 'positivo')
    } else {
      promessa.stato = 'tradita'
      cambiaMorale(carriera, promessa.giocatoreId, -20)
      carriera.promesseTradite++
      carriera.famaAllenatore = limita(carriera.famaAllenatore - 3, 0, 100)
      messaggio(carriera, nome, `è deluso: il grande progetto che gli avevi venduto non si è visto.`, 'negativo')
    }
  }
  // a inizio stagione le statistiche ripartono
  carriera.statistiche = {}
}

/** Registra una promessa fatta in trattativa. */
export function registraPromessa(
  carriera: Carriera,
  giocatoreId: number,
  tipo: Promessa['tipo'],
): void {
  const descrizioni: Record<Promessa['tipo'], string> = {
    titolarita: 'sarai titolare',
    centralita: 'sarai centrale nel progetto',
    progetto: 'promozione a fine stagione',
  }
  carriera.promesse.push({
    id: carriera.prossimaPromessaId++,
    giocatoreId,
    tipo,
    descrizione: descrizioni[tipo],
    annoCreazione: carriera.anno,
    giornataCreazione: carriera.giornata,
    presenzeAllaCreazione: carriera.statistiche[giocatoreId]?.presenze ?? 0,
    stato: 'attiva',
  })
}
