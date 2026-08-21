// nazionale.ts — la panchina della NAZIONALE (M8 parte 3, FRD §4.3).
//
// Le federazioni chiamano solo oltre una soglia di fama alta. L'incarico è
// ESCLUSIVO (default del FRD): si lasciano i club e si vive il ciclo del CT,
// compresso in una stagione: girone di qualificazione a 6 (andata e ritorno,
// 10 date) e — per le prime 2 — torneo internazionale a 16 a eliminazione
// diretta. Poi i verdetti: gloria o fallimento, e si decide se restare CT
// o tornare ai club.
//
// Semplificazioni dichiarate: convocazioni fisse dal DB (la gestione delle
// convocazioni arriverà più avanti), tattica automatica (4-4-2 col miglior
// undici), partite simulate (niente Match Day), niente mercato/morale.

import type { Database } from 'sql.js'
import { interroga } from '../db/query.ts'
import { creaRng, semeDaStringa } from '../motore/rng.ts'
import { preparaSquadra } from '../motore/preparazione.ts'
import { simulaPartitaMotore } from '../motore/partita.ts'
import type { SquadraMotore } from '../motore/tipi.ts'
import { aggiungiNotizia, fineStagioneMercato } from '../mercato/stato.ts'
import { offerteFineStagione, variaFama } from './fama.ts'
import { crescitaFineStagione } from './crescita.ts'
import { generaCalendario } from './calendario.ts'
import type { Carriera, IncaricoNazionale, TurnoCoppa } from './tipi.ts'

/** Le soglie di fama (FRD §4.3): nazionali minori, poi le top. */
export const SOGLIA_NAZIONALI = 75
export const SOGLIA_NAZIONALI_TOP = 88
/** Sopra questa fama del DB una nazionale è "top". */
const FAMA_NAZIONALE_TOP = 80

interface NazionaleRiga { id: number; nome: string; fama: number }

function elencoNazionali(db: Database): NazionaleRiga[] {
  return interroga<NazionaleRiga>(db, 'SELECT id, nome, fama FROM nazionale')
}

/** L'eventuale offerta di una federazione a fine stagione: arriva sempre,
    quando la fama supera la soglia (le top richiedono la soglia alta). */
export function offertaNazionale(db: Database, carriera: Carriera): { id: number; nome: string } | null {
  if (carriera.nazionale) return null
  const fama = carriera.famaAllenatore
  if (fama < SOGLIA_NAZIONALI) return null
  const raggiungibili = elencoNazionali(db).filter(
    (n) => n.fama < FAMA_NAZIONALE_TOP || fama >= SOGLIA_NAZIONALI_TOP,
  )
  if (raggiungibili.length === 0) return null
  // tra le migliori 8 raggiungibili, una a caso (seminata)
  const rng = creaRng(semeDaStringa(`ct-${carriera.seme}-${carriera.anno}`))
  const rosa = raggiungibili.sort((a, b) => b.fama - a.fama).slice(0, 8)
  const scelta = rosa[rng.intero(rosa.length)]
  return { id: scelta.id, nome: scelta.nome }
}

/** Costruisce girone e calendario di un nuovo ciclo da CT. */
function nuovoCiclo(db: Database, carriera: Carriera, id: number, nome: string): IncaricoNazionale {
  const tutte = elencoNazionali(db)
  const rng = creaRng(semeDaStringa(`girone-${carriera.seme}-${carriera.anno}-${id}`))
  // sorteggio con TESTE DI SERIE (come nella realtà): al massimo un'altra
  // big nel girone — 1 avversaria dalle prime 10 per fama, 4 dalle restanti
  const altre = tutte.filter((n) => n.id !== id).sort((a, b) => b.fama - a.fama)
  const big = altre.slice(0, 10).sort(() => rng.numero() - 0.5)
  const resto = altre.slice(10).sort(() => rng.numero() - 0.5)
  const avversarie = [big[0], ...resto.slice(0, 4)]
  const squadre = [id, ...avversarie.map((n) => n.id)]
  const nomi: Record<number, string> = {}
  for (const n of tutte) nomi[n.id] = n.nome
  return {
    nazionaleId: id,
    nome,
    fase: 'qualificazioni',
    esito: 'in-corso',
    squadre,
    nomi,
    calendario: generaCalendario(squadre, rng.numero).map((giornata) =>
      giornata.map((p) => ({ casaId: p.casaId, trasfertaId: p.trasfertaId, golCasa: null, golTrasferta: null })),
    ),
    data: 0,
    torneo: null,
    turnoTorneo: 0,
  }
}

/** Accetta la panchina della nazionale: incarico esclusivo, si lasciano i
    club (rompere il contratto col club costa fama, come sempre). */
export function accettaPanchinaNazionale(db: Database, carriera: Carriera): void {
  const offerta = carriera.offertaNazionale
  if (!offerta) return
  if (carriera.contrattoAllenatore && carriera.contrattoAllenatore.scadenza > carriera.anno) {
    const club = carriera.club.find((c) => c.id === carriera.clubId)
    variaFama(carriera, -3, `Contratto rotto col ${club?.nome ?? 'club'}`)
  }
  carriera.nazionale = nuovoCiclo(db, carriera, offerta.id, offerta.nome)
  carriera.offertaNazionale = null
  carriera.offerteSpeciali = null
  carriera.contrattoAllenatore = { scadenza: carriera.anno + 1, stipendio: 600_000 }
  // da CT non si giocano le coppe di club e il mercato non ti riguarda
  carriera.coppa = null
  carriera.coppaEuropa = null
  carriera.mercato.aperto = false
  carriera.mercato.finestra = null
  aggiungiNotizia(carriera, `🌍 Sei il nuovo CT: ${offerta.nome}! Il ciclo comincia.`, 'ufficiale')
}

/** La squadra di una nazionale per il motore (convocati dal DB). */
function squadraNazionale(db: Database, carriera: Carriera, nazionaleId: number): SquadraMotore {
  const ids = interroga<{ id: number }>(
    db, 'SELECT giocatore_id AS id FROM convocazione WHERE nazionale_id = ?', [nazionaleId],
  ).map((r) => r.id)
  const incarico = carriera.nazionale!
  return preparaSquadra(db, nazionaleId, incarico.nomi[nazionaleId] ?? '?', undefined, ids, carriera.crescita)
}

/** La classifica del girone di qualificazione. */
export function classificaGirone(incarico: IncaricoNazionale) {
  const righe = new Map(incarico.squadre.map((id) => [id, { id, nome: incarico.nomi[id], punti: 0, giocate: 0, dr: 0 }]))
  for (const data of incarico.calendario) {
    for (const p of data) {
      if (p.golCasa === null || p.golTrasferta === null) continue
      const casa = righe.get(p.casaId)!
      const trasferta = righe.get(p.trasfertaId)!
      casa.giocate++; trasferta.giocate++
      casa.dr += p.golCasa - p.golTrasferta
      trasferta.dr += p.golTrasferta - p.golCasa
      if (p.golCasa > p.golTrasferta) casa.punti += 3
      else if (p.golCasa < p.golTrasferta) trasferta.punti += 3
      else { casa.punti++; trasferta.punti++ }
    }
  }
  return [...righe.values()].sort((a, b) => b.punti - a.punti || b.dr - a.dr)
}

/** Registra la cronaca della partita della MIA nazionale (riusa il pannello
    cronaca della carriera). */
function registraCronaca(
  carriera: Carriera,
  etichetta: number,
  casaNome: string,
  trasfertaNome: string,
  esito: ReturnType<typeof simulaPartitaMotore>,
  latoMio: 'casa' | 'trasferta',
): void {
  carriera.cronaca = {
    giornata: etichetta,
    casaNome, trasfertaNome,
    golCasa: esito.golCasa,
    golTrasferta: esito.golTrasferta,
    eventi: esito.eventi.filter((e) => e.tipo !== 'occasione-murata'),
    statistiche: esito.statistiche,
    voti: esito.pagelle[latoMio].map((p) => ({ nome: p.nome, ruolo: p.ruolo, voto: p.voto })),
  }
}

/** Costruisce il torneo a 16: le 2 del mio girone + le migliori altre. */
function costruisciTorneo(db: Database, carriera: Carriera, qualificate: number[]): TurnoCoppa[] {
  const incarico = carriera.nazionale!
  const altre = elencoNazionali(db)
    .filter((n) => !qualificate.includes(n.id))
    .sort((a, b) => b.fama - a.fama)
    .slice(0, 16 - qualificate.length)
    .map((n) => n.id)
  const rng = creaRng(semeDaStringa(`torneo-${carriera.seme}-${carriera.anno}-${incarico.nazionaleId}`))
  const mescolate = [...qualificate, ...altre].sort(() => rng.numero() - 0.5)
  const ottavi: TurnoCoppa['partite'] = []
  for (let i = 0; i < 16; i += 2) {
    ottavi.push({
      casaId: mescolate[i], trasfertaId: mescolate[i + 1],
      golCasa: null, golTrasferta: null, vincitriceId: null,
    })
  }
  return ['Ottavi di finale', 'Quarti di finale', 'Semifinali', 'Finale'].map((nome, i) => ({
    nome, dopoGiornata: 0, partite: i === 0 ? ottavi : [],
  }))
}

/** Avanza il ciclo del CT di un passo: una data del girone, oppure un turno
    del torneo. A ciclo finito chiama i verdetti. */
export function avanzaNazionale(db: Database, carriera: Carriera): void {
  const incarico = carriera.nazionale
  if (!incarico || incarico.fase === 'conclusa') return

  if (incarico.fase === 'qualificazioni') {
    const data = incarico.calendario[incarico.data]
    for (const p of data) {
      const esito = simulaPartitaMotore(
        squadraNazionale(db, carriera, p.casaId),
        squadraNazionale(db, carriera, p.trasfertaId),
        `naz-${carriera.seme}-${carriera.anno}-${incarico.data}-${p.casaId}-${p.trasfertaId}`,
      )
      p.golCasa = esito.golCasa
      p.golTrasferta = esito.golTrasferta
      if (p.casaId === incarico.nazionaleId || p.trasfertaId === incarico.nazionaleId) {
        registraCronaca(carriera, incarico.data + 1, incarico.nomi[p.casaId], incarico.nomi[p.trasfertaId],
          esito, p.casaId === incarico.nazionaleId ? 'casa' : 'trasferta')
      }
    }
    incarico.data++
    if (incarico.data >= incarico.calendario.length) {
      // verdetti del girone: le prime 2 volano al torneo
      const classifica = classificaGirone(incarico)
      const posizione = classifica.findIndex((r) => r.id === incarico.nazionaleId) + 1
      if (posizione <= 2) {
        incarico.fase = 'torneo'
        incarico.torneo = costruisciTorneo(db, carriera, classifica.slice(0, 2).map((r) => r.id))
        aggiungiNotizia(carriera, `${incarico.nome} qualificata al torneo internazionale! (${posizione}ª nel girone)`, 'ufficiale')
      } else {
        incarico.esito = 'fallito'
        incarico.fase = 'conclusa'
        aggiungiNotizia(carriera, `${incarico.nome} FUORI: qualificazione fallita (${posizione}ª nel girone).`, 'avviso')
        chiudiCicloNazionale(db, carriera)
      }
    }
    return
  }

  // ── il torneo: un turno per volta ──
  const torneo = incarico.torneo!
  const turno = torneo[incarico.turnoTorneo]
  const rng = creaRng(semeDaStringa(`torneo-turno-${carriera.seme}-${carriera.anno}-${incarico.turnoTorneo}`))
  const vincitrici: number[] = []
  for (const p of turno.partite) {
    const esito = simulaPartitaMotore(
      squadraNazionale(db, carriera, p.casaId),
      squadraNazionale(db, carriera, p.trasfertaId),
      `torneo-${carriera.seme}-${carriera.anno}-${incarico.turnoTorneo}-${p.casaId}-${p.trasfertaId}`,
    )
    p.golCasa = esito.golCasa
    p.golTrasferta = esito.golTrasferta
    p.vincitriceId =
      esito.golCasa > esito.golTrasferta ? p.casaId
      : esito.golCasa < esito.golTrasferta ? p.trasfertaId
      : rng.evento(0.5) ? p.casaId : p.trasfertaId
    vincitrici.push(p.vincitriceId)
    if (p.casaId === incarico.nazionaleId || p.trasfertaId === incarico.nazionaleId) {
      registraCronaca(carriera, incarico.data + incarico.turnoTorneo + 1,
        incarico.nomi[p.casaId], incarico.nomi[p.trasfertaId], esito,
        p.casaId === incarico.nazionaleId ? 'casa' : 'trasferta')
      const rigori = esito.golCasa === esito.golTrasferta ? ' (ai rigori)' : ''
      aggiungiNotizia(carriera,
        `Torneo, ${turno.nome}: ${incarico.nomi[p.casaId]} ${esito.golCasa}-${esito.golTrasferta} ${incarico.nomi[p.trasfertaId]}${rigori}.`,
        p.vincitriceId === incarico.nazionaleId ? 'ufficiale' : 'avviso')
    }
  }
  const mioPassaggio = vincitrici.includes(incarico.nazionaleId)
  const finale = turno.nome === 'Finale'

  if (finale || !mioPassaggio) {
    incarico.esito = finale
      ? (mioPassaggio ? 'campione' : 'finalista')
      : 'eliminato'
    incarico.fase = 'conclusa'
    incarico.turnoTorneo++
    chiudiCicloNazionale(db, carriera)
    return
  }
  // preparo il turno dopo
  const prossimo = torneo[incarico.turnoTorneo + 1]
  for (let i = 0; i < vincitrici.length; i += 2) {
    prossimo.partite.push({
      casaId: vincitrici[i], trasfertaId: vincitrici[i + 1],
      golCasa: null, golTrasferta: null, vincitriceId: null,
    })
  }
  incarico.turnoTorneo++
}

/** true quando il passo successivo non esiste più (ciclo chiuso). */
export function cicloFinito(carriera: Carriera): boolean {
  return carriera.nazionale?.fase === 'conclusa'
}

/** I verdetti del ciclo: fama, trofei, il mondo che avanza di un anno e le
    offerte per il futuro (tornare ai club, o restare CT). */
function chiudiCicloNazionale(db: Database, carriera: Carriera): void {
  const incarico = carriera.nazionale!
  if (incarico.esito === 'campione') {
    carriera.trofei.push({ anno: carriera.anno, nome: `Torneo internazionale (${incarico.nome})` })
    variaFama(carriera, 12, `CAMPIONI DEL TORNEO con ${incarico.nome}!`)
  } else if (incarico.esito === 'finalista') {
    variaFama(carriera, 4, `Finale del torneo raggiunta con ${incarico.nome}`)
  } else if (incarico.esito === 'eliminato') {
    variaFama(carriera, 1, `Torneo giocato con ${incarico.nome}`)
  } else {
    variaFama(carriera, -6, `Qualificazione fallita con ${incarico.nome}`)
  }

  // il mondo va avanti di una stagione anche senza di te nei club
  carriera.anno++
  carriera.giornata = 0
  crescitaFineStagione(db, carriera)
  fineStagioneMercato(db, carriera)
  carriera.mercato.aperto = false // il mercato ti riguarderà quando avrai un club
  carriera.mercato.finestra = null

  // le offerte per ripartire: i club chiamano (e la federazione, se non
  // l'hai delusa, ti terrebbe volentieri: il bottone "Resta CT" è nella UI)
  carriera.offerteSpeciali = { contesto: 'fine-stagione', offerte: offerteFineStagione(carriera) }
}

/** Un nuovo ciclo con la stessa nazionale (per chi resta CT). */
export function nuovoCicloStessaNazionale(db: Database, carriera: Carriera): void {
  const incarico = carriera.nazionale!
  carriera.nazionale = nuovoCiclo(db, carriera, incarico.nazionaleId, incarico.nome)
  carriera.offerteSpeciali = null
  carriera.contrattoAllenatore = { scadenza: carriera.anno + 1, stipendio: 600_000 }
  aggiungiNotizia(carriera, `Avanti insieme: nuovo ciclo da CT con ${incarico.nome}.`, 'ufficiale')
}
