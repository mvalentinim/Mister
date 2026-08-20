// coppa.ts — le coppe a eliminazione diretta (M8, FRD §4.2):
// - la COPPA NAZIONALE: 32 squadre (tutta la prima divisione + le migliori
//   della seconda, l'utente sempre incluso);
// - la COPPA EUROPA (M8 parte 2, forma semplificata): 32 top club dei 5
//   campionati; si gioca SOLO nelle stagioni in cui ci si è qualificati
//   (primi 4 posti della prima divisione) — se non ci sei, non si simula.
// I turni si giocano tra una giornata di campionato e l'altra; in caso di
// pareggio decidono i rigori (estratti dal caso seminato).
// Semplificazione dichiarata: anche la partita dell'utente è simulata
// (niente Match Day in coppa, per ora); il risultato appare nel riquadro
// coppa e nel notiziario.

import type { Database } from 'sql.js'
import { creaRng, semeDaStringa } from '../motore/rng.ts'
import { simulaPartitaMotore } from '../motore/partita.ts'
import { aggiungiNotizia } from '../mercato/stato.ts'
import type { Carriera, ClubCarriera, CoppaStagione, PartitaCoppa } from './tipi.ts'
import { variaFama } from './fama.ts'
import { clubNazione, semePartita, squadraMotore } from './motore.ts'

const NOMI_TURNI = ['Sedicesimi di finale', 'Ottavi di finale', 'Quarti di finale', 'Semifinali', 'Finale']
/** Dopo quali giornate di campionato si giocano i turni (le due coppe sono
    sfalsate, così le settimane piene si alternano). */
const GIORNATE_NAZIONALE = [5, 10, 15, 20, 25]
const GIORNATE_EUROPA = [7, 13, 17, 22, 27]

/** Costruisce un tabellone da 32 con sorteggio seminato. */
function costruisciTabellone(
  carriera: Carriera,
  nome: string,
  partecipanti: ClubCarriera[],
  giornate: number[],
): CoppaStagione {
  const rng = creaRng(semeDaStringa(`${nome}-${carriera.seme}-${carriera.anno}`))
  const mescolati = [...partecipanti].sort(() => rng.numero() - 0.5)
  const primoTurno: PartitaCoppa[] = []
  for (let i = 0; i + 1 < mescolati.length; i += 2) {
    primoTurno.push({
      casaId: mescolati[i].id, trasfertaId: mescolati[i + 1].id,
      golCasa: null, golTrasferta: null, vincitriceId: null,
    })
  }
  return {
    nome,
    turni: NOMI_TURNI.map((nomeTurno, i) => ({
      nome: nomeTurno,
      dopoGiornata: giornate[i],
      partite: i === 0 ? primoTurno : [],
    })),
    prossimoTurno: 0,
    vincitriceId: null,
  }
}

/** Crea il tabellone della coppa nazionale per la stagione corrente. */
export function creaCoppa(carriera: Carriera): CoppaStagione {
  const club = clubNazione(carriera)
  // 32 partecipanti: tutta la prima divisione + le migliori della seconda
  const primaDivisione = club.filter((c) => c.livello === 1)
  const secondaDivisione = club
    .filter((c) => c.livello === 2)
    .sort((a, b) => b.forza - a.forza)
  const partecipanti = [...primaDivisione, ...secondaDivisione].slice(0, 32)
  // l'utente partecipa sempre: se non c'è, entra al posto dell'ultima
  if (!partecipanti.some((c) => c.id === carriera.clubId)) {
    partecipanti[partecipanti.length - 1] = club.find((c) => c.id === carriera.clubId)!
  }
  return costruisciTabellone(carriera, 'Coppa nazionale', partecipanti, GIORNATE_NAZIONALE)
}

/** Crea il tabellone della Coppa Europa: i migliori club delle prime
    divisioni dei 5 campionati (l'utente qualificato è sempre dentro). */
export function creaCoppaEuropa(carriera: Carriera): CoppaStagione {
  const primaDivisione = carriera.club.filter((c) => c.livello === 1)
  // i top 6 di ogni nazione, poi i migliori restanti fino a 32
  const perNazione = new Map<number, ClubCarriera[]>()
  for (const c of primaDivisione) {
    const chiave = c.nazioneId ?? -1
    if (!perNazione.has(chiave)) perNazione.set(chiave, [])
    perNazione.get(chiave)!.push(c)
  }
  const partecipanti: ClubCarriera[] = []
  const rimasti: ClubCarriera[] = []
  for (const lega of perNazione.values()) {
    const ordinata = [...lega].sort((a, b) => b.forza - a.forza)
    partecipanti.push(...ordinata.slice(0, 6))
    rimasti.push(...ordinata.slice(6))
  }
  rimasti.sort((a, b) => b.forza - a.forza)
  while (partecipanti.length < 32 && rimasti.length) partecipanti.push(rimasti.shift()!)
  // l'utente qualificato entra al posto del più debole
  if (!partecipanti.some((c) => c.id === carriera.clubId)) {
    partecipanti.sort((a, b) => b.forza - a.forza)
    partecipanti[partecipanti.length - 1] = carriera.club.find((c) => c.id === carriera.clubId)!
  }
  return costruisciTabellone(carriera, 'Coppa Europa', partecipanti.slice(0, 32), GIORNATE_EUROPA)
}

/** Gioca il prossimo turno di UNA coppa se il campionato lo ha raggiunto. */
function giocaTurno(db: Database, carriera: Carriera, coppa: CoppaStagione, premioFama: number): void {
  if (coppa.vincitriceId !== null || coppa.prossimoTurno >= coppa.turni.length) return
  const turno = coppa.turni[coppa.prossimoTurno]
  if (carriera.giornata < turno.dopoGiornata) return

  const rng = creaRng(semeDaStringa(`${coppa.nome}-turno-${carriera.seme}-${carriera.anno}-${coppa.prossimoTurno}`))
  const vincitrici: number[] = []
  for (const p of turno.partite) {
    const esito = simulaPartitaMotore(
      squadraMotore(db, carriera, p.casaId),
      squadraMotore(db, carriera, p.trasfertaId),
      `${semePartita(carriera, 100 + coppa.prossimoTurno, p.casaId, p.trasfertaId)}-${coppa.nome}`,
    )
    p.golCasa = esito.golCasa
    p.golTrasferta = esito.golTrasferta
    // eliminazione diretta: il pareggio si risolve ai rigori (seminati)
    p.vincitriceId =
      esito.golCasa > esito.golTrasferta ? p.casaId
      : esito.golCasa < esito.golTrasferta ? p.trasfertaId
      : rng.evento(0.5) ? p.casaId : p.trasfertaId
    vincitrici.push(p.vincitriceId)

    // la partita dell'utente finisce nel notiziario
    if (p.casaId === carriera.clubId || p.trasfertaId === carriera.clubId) {
      const nome = (id: number) => carriera.club.find((c) => c.id === id)!.nome
      const rigori = esito.golCasa === esito.golTrasferta ? ' (ai rigori)' : ''
      const passato = p.vincitriceId === carriera.clubId
      aggiungiNotizia(
        carriera,
        `${coppa.nome}, ${turno.nome}: ${nome(p.casaId)} ${esito.golCasa}-${esito.golTrasferta} ${nome(p.trasfertaId)}${rigori}. ` +
          (passato ? 'Si va avanti!' : 'Eliminati.'),
        passato ? 'ufficiale' : 'avviso',
      )
    }
  }

  // prepara il turno successivo (o incorona la vincitrice)
  if (vincitrici.length === 1) {
    coppa.vincitriceId = vincitrici[0]
    if (coppa.vincitriceId === carriera.clubId) {
      carriera.trofei.push({ anno: carriera.anno, nome: coppa.nome })
      variaFama(carriera, premioFama, `${coppa.nome} vinta`)
      aggiungiNotizia(carriera, `🏆 ${coppa.nome.toUpperCase()} NOSTRA! Trionfo in finale!`, 'ufficiale')
    }
  } else {
    const prossimo = coppa.turni[coppa.prossimoTurno + 1]
    for (let i = 0; i < vincitrici.length; i += 2) {
      prossimo.partite.push({
        casaId: vincitrici[i], trasfertaId: vincitrici[i + 1],
        golCasa: null, golTrasferta: null, vincitriceId: null,
      })
    }
  }
  coppa.prossimoTurno++
}

/** Gioca i turni dovuti di TUTTE le coppe della stagione.
    Chiamata dopo ogni giornata di campionato. */
export function giocaTurnoCoppaSeDovuto(db: Database, carriera: Carriera): void {
  if (carriera.coppa) giocaTurno(db, carriera, carriera.coppa, 6)
  if (carriera.coppaEuropa) giocaTurno(db, carriera, carriera.coppaEuropa, 10)
}
