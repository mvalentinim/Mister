// coppa.ts — la coppa nazionale (M8, FRD §4.2).
//
// Formato semplice e classico: 32 squadre a eliminazione diretta
// (tutta la prima divisione + le migliori della seconda, l'utente sempre
// incluso). I turni si giocano tra una giornata di campionato e l'altra;
// in caso di pareggio decidono i rigori (estratti dal caso seminato).
// Semplificazione dichiarata: anche la partita dell'utente è simulata
// (niente Match Day in coppa, per ora); il risultato appare nel riquadro
// coppa e nel notiziario.

import type { Database } from 'sql.js'
import { creaRng, semeDaStringa } from '../motore/rng.ts'
import { simulaPartitaMotore } from '../motore/partita.ts'
import { aggiungiNotizia } from '../mercato/stato.ts'
import type { Carriera, CoppaStagione, PartitaCoppa } from './tipi.ts'
import { clubNazione, semePartita, squadraMotore } from './motore.ts'

const NOMI_TURNI = ['Sedicesimi di finale', 'Ottavi di finale', 'Quarti di finale', 'Semifinali', 'Finale']
/** Dopo quali giornate di campionato si giocano i turni. */
const GIORNATE_TURNI = [5, 10, 15, 20, 25]

/** Crea il tabellone della coppa per la stagione corrente. */
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

  // sorteggio seminato: stessa carriera, stesso tabellone
  const rng = creaRng(semeDaStringa(`coppa-${carriera.seme}-${carriera.anno}`))
  const mescolati = [...partecipanti].sort(() => rng.numero() - 0.5)

  const primoTurno: PartitaCoppa[] = []
  for (let i = 0; i < mescolati.length; i += 2) {
    primoTurno.push({
      casaId: mescolati[i].id, trasfertaId: mescolati[i + 1].id,
      golCasa: null, golTrasferta: null, vincitriceId: null,
    })
  }
  return {
    turni: NOMI_TURNI.map((nome, i) => ({
      nome,
      dopoGiornata: GIORNATE_TURNI[i],
      partite: i === 0 ? primoTurno : [],
    })),
    prossimoTurno: 0,
    vincitriceId: null,
  }
}

/** Gioca il prossimo turno di coppa se il campionato lo ha raggiunto.
    Chiamata dopo ogni giornata di campionato. */
export function giocaTurnoCoppaSeDovuto(db: Database, carriera: Carriera): void {
  const coppa = carriera.coppa
  if (!coppa || coppa.vincitriceId !== null) return
  if (coppa.prossimoTurno >= coppa.turni.length) return
  const turno = coppa.turni[coppa.prossimoTurno]
  if (carriera.giornata < turno.dopoGiornata) return

  const rng = creaRng(semeDaStringa(`coppa-turno-${carriera.seme}-${carriera.anno}-${coppa.prossimoTurno}`))
  const vincitrici: number[] = []
  for (const p of turno.partite) {
    const esito = simulaPartitaMotore(
      squadraMotore(db, carriera, p.casaId),
      squadraMotore(db, carriera, p.trasfertaId),
      `${semePartita(carriera, 100 + coppa.prossimoTurno, p.casaId, p.trasfertaId)}-coppa`,
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
        `Coppa, ${turno.nome}: ${nome(p.casaId)} ${esito.golCasa}-${esito.golTrasferta} ${nome(p.trasfertaId)}${rigori}. ` +
          (passato ? 'Si va avanti!' : 'Eliminati.'),
        passato ? 'ufficiale' : 'avviso',
      )
    }
  }

  // prepara il turno successivo (o incorona la vincitrice)
  if (vincitrici.length === 1) {
    coppa.vincitriceId = vincitrici[0]
    if (coppa.vincitriceId === carriera.clubId) {
      carriera.trofei.push({ anno: carriera.anno, nome: 'Coppa nazionale' })
      aggiungiNotizia(carriera, '🏆 LA COPPA È NOSTRA! Trionfo in finale!', 'ufficiale')
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
