// partita.ts — il motore a eventi (M3 + M5, FRD §9.7).
//
// COME FUNZIONA (architettura ispirata a ESMS, vedi docs/match-engine.md):
// la partita scorre minuto per minuto; a ogni minuto può nascere un'azione
// pericolosa. Chi la crea lo decide il confronto tra i centrocampi (più il
// fattore campo); l'esito lo decidono attacco contro difesa e tiratore
// contro portiere. Ogni scelta casuale passa dal generatore seminato di
// rng.ts: STESSO SEME = STESSA PARTITA, sempre (FRD §13).
//
// Da M5 il motore è "A TAPPE" (creaPartita → avanzaMinuto ripetuto): serve
// al Match Day per i cambi e le regolazioni A PARTITA IN CORSO (FRD §9.3)
// e per le pagelle live (§9.5). La funzione in blocco simulaPartitaMotore
// è un involucro che fa gli stessi identici passi: campionato e test di
// calibrazione producono gli stessi risultati di prima, e una partita
// guardata SENZA interventi è identica a una simulata in blocco.

import { creaRng, semeDaStringa } from './rng.ts'
import type {
  EventoPartita, GiocatoreMotore, RisultatoPartita, SquadraMotore, TipoEvento,
} from './tipi.ts'

// ── Parametri del motore ────────────────────────────────────────────────────
// Tutti i numeri "magici" stanno qui: la calibrazione ritocca questi valori.
export const PARAMETRI = {
  /** probabilità che in un minuto nasca un'azione pericolosa */
  azioniAlMinuto: 0.235,
  /** vantaggio del fattore campo nel contendersi l'azione (0-1, 0.5 = neutro) */
  vantaggioCasa: 0.06,
  /** quanto pesa la differenza di centrocampo sul possesso dell'azione */
  pesoCentrocampo: 0.012,
  /** quanto pesa attacco-difesa sulla qualità dell'occasione */
  pesoAttacco: 0.018,
  /** qualità di base di un'occasione (probabilità di gol sul tiro in porta,
      "alla pari"). Ritoccata in M4: i movimenti prevalenti di default hanno
      alzato la pericolosità media di tutte le squadre. */
  qualitaBase: 0.31,
  /** probabilità che l'occasione venga murata prima del tiro */
  probMurata: 0.22,
  /** probabilità che un tiro non murato finisca nello specchio */
  probSpecchio: 0.50,
  /** quanto pesa la bravura del portiere sulla parata (per punto sopra 60) */
  pesoPortiere: 0.005,
  /** ammonizioni attese per squadra a partita */
  ammonizioniAttese: 1.9,
  /** probabilità di espulsione diretta per squadra a partita */
  probEspulsione: 0.04,
  /** probabilità di infortunio per squadra a partita */
  probInfortunio: 0.07,
}

/** Limita un numero nell'intervallo dato. */
const limita = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Pesi con cui i ruoli partecipano alle azioni offensive (chi tira). */
const PESO_TIRO: Record<string, number> = {
  PC: 8, TRQ: 4, ED: 3.5, ES: 3.5, CC: 2, MED: 1, TD: 0.7, TS: 0.7, DC: 0.5, POR: 0.01,
}

/** Pesi per l'assist (chi rifinisce). */
const PESO_ASSIST: Record<string, number> = {
  TRQ: 6, CC: 4, ED: 4, ES: 4, PC: 3, MED: 2, TD: 1.5, TS: 1.5, DC: 0.5, POR: 0.1,
}

/** Pesi per i cartellini (chi commette falli). */
const PESO_FALLO: Record<string, number> = {
  MED: 4, DC: 4, CC: 3, TD: 2.5, TS: 2.5, TRQ: 1.5, ED: 1.5, ES: 1.5, PC: 1, POR: 0.3,
}

interface StatoSquadra {
  squadra: SquadraMotore
  lato: 'casa' | 'trasferta'
  gol: number
  tiri: number
  tiriInPorta: number
  golAttesi: number
  contesa: number // "punti possesso" accumulati per la percentuale finale
  ammoniti: Set<number>
  espulsi: Set<number>
  sostituzioni: number
}

/** Le pagelle in tempo reale (FRD §9.5): voto corrente di ogni titolare. */
export type VotiLive = Array<{ id: number; nome: string; ruolo: string; voto: number }>

/** Una partita simulabile a tappe (per il Match Day). */
export interface PartitaInCorso {
  /** il minuto appena giocato (0 = non iniziata, 90 = finita) */
  minuto: number
  /** true quando il minuto era dominato dalla squadra di casa (per la vista) */
  possessoCasa: boolean
  /** gioca il minuto successivo e restituisce i suoi eventi */
  avanzaMinuto(): EventoPartita[]
  /** punteggio corrente */
  punteggio(): { casa: number; trasferta: number }
  /** pagelle live di una squadra */
  votiLive(lato: 'casa' | 'trasferta'): VotiLive
  /** chi è in campo ora (per la vista e per i cambi) */
  inCampo(lato: 'casa' | 'trasferta'): GiocatoreMotore[]
  /** la formazione slot per slot, con il flag degli espulsi (per la vista) */
  formazione(lato: 'casa' | 'trasferta'): Array<{ giocatore: GiocatoreMotore; espulso: boolean }>
  /** la panchina attuale (per i cambi) */
  panchina(lato: 'casa' | 'trasferta'): GiocatoreMotore[]
  /** quanti cambi restano */
  sostituzioniRimaste(lato: 'casa' | 'trasferta'): number
  /**
   * Sostituzione (max 3 per squadra): chi esce deve essere in campo, chi
   * entra in panchina. Ricalcola le forze di reparto. Restituisce false se
   * il cambio non è possibile (slot cambi esauriti, giocatore espulso...).
   */
  sostituisci(lato: 'casa' | 'trasferta', esceId: number, entraId: number): boolean
  /** regolazioni tattiche a partita in corso: mentalità e ritmo */
  regola(lato: 'casa' | 'trasferta', regolazioni: { mentalita?: number; ritmo?: number }): void
  /** il risultato completo (chiamare a partita finita: applica i voti finali) */
  risultatoFinale(): RisultatoPartita
}

/**
 * Crea una partita simulabile a tappe. Il seme può essere qualsiasi stringa:
 * a parità di squadre, seme e interventi, la partita è IDENTICA.
 * NOTA: le squadre vengono clonate — i cambi non toccano gli oggetti passati.
 */
export function creaPartita(casa: SquadraMotore, trasferta: SquadraMotore, seme: string): PartitaInCorso {
  const rng = creaRng(semeDaStringa(seme))
  const eventi: EventoPartita[] = []
  const prestazione: Record<number, number> = {}

  // cloni: la partita può modificare titolari e forze senza effetti esterni
  const clona = (s: SquadraMotore): SquadraMotore => ({
    ...s,
    titolari: s.titolari.map((g) => ({ ...g })),
    panchina: s.panchina.map((g) => ({ ...g })),
    posizioni: [...s.posizioni],
  })

  const stati: [StatoSquadra, StatoSquadra] = [
    { squadra: clona(casa), lato: 'casa', gol: 0, tiri: 0, tiriInPorta: 0, golAttesi: 0, contesa: 0, ammoniti: new Set(), espulsi: new Set(), sostituzioni: 0 },
    { squadra: clona(trasferta), lato: 'trasferta', gol: 0, tiri: 0, tiriInPorta: 0, golAttesi: 0, contesa: 0, ammoniti: new Set(), espulsi: new Set(), sostituzioni: 0 },
  ]
  for (const s of stati) for (const g of [...s.squadra.titolari, ...s.squadra.panchina]) prestazione[g.id] = 0

  const perLato = (lato: 'casa' | 'trasferta') => (lato === 'casa' ? stati[0] : stati[1])

  /** I titolari ancora in campo (senza gli espulsi). */
  const inCampo = (s: StatoSquadra) => s.squadra.titolari.filter((g) => !s.espulsi.has(g.id))

  /** Estrae un giocatore in campo pesato per ruolo e attributo. */
  function estraiGiocatore(
    s: StatoSquadra,
    pesi: Record<string, number>,
    attributo: (g: GiocatoreMotore) => number,
    conMovimenti = false,
  ): GiocatoreMotore {
    const campo = inCampo(s)
    return rng.pesato(
      campo,
      campo.map(
        (g) =>
          (pesi[g.ruolo] ?? 1) *
          (attributo(g) / 50 + 0.5) *
          // i movimenti offensivi ben eseguiti portano il giocatore a
          // concludere più spesso (M4)
          (conMovimenti ? g.pesoTiroExtra : 1),
      ),
    )
  }

  function registraEvento(minuto: number, tipo: TipoEvento, s: StatoSquadra, g: GiocatoreMotore, assistNome?: string) {
    eventi.push({ minuto, tipo, squadra: s.lato, giocatoreId: g.id, giocatoreNome: g.nome, assistNome })
  }

  let minuto = 0
  let possessoCasa = true

  function avanzaMinuto(): EventoPartita[] {
    if (minuto >= 90) return []
    minuto++
    const dallEvento = eventi.length

    // chi domina questo minuto (per il possesso): centrocampo + fattore campo
    const differenzaCentrocampo = stati[0].squadra.centrocampo - stati[1].squadra.centrocampo
    // giocare in 10 pesa sul centrocampo: -8 "punti" per ogni espulso
    const malusEspulsi = (stati[1].espulsi.size - stati[0].espulsi.size) * 8
    let probCasa = 0.5 + PARAMETRI.vantaggioCasa + (differenzaCentrocampo + malusEspulsi) * PARAMETRI.pesoCentrocampo
    probCasa = limita(probCasa, 0.15, 0.85)
    const dominante = rng.evento(probCasa) ? stati[0] : stati[1]
    dominante.contesa++
    possessoCasa = dominante === stati[0]

    // nasce un'azione pericolosa? (il ritmo delle due squadre la modula: M4)
    const fattoreRitmo = (stati[0].squadra.ritmo + stati[1].squadra.ritmo) / 2
    if (rng.evento(PARAMETRI.azioniAlMinuto * fattoreRitmo)) {
      const attacco = dominante
      const difesa = attacco === stati[0] ? stati[1] : stati[0]

      // qualità dell'occasione: attacco contro difesa, più un piccolo
      // contributo del livello assoluto dell'attacco (nelle serie minori
      // si segna meno: meno qualità = conversione più bassa)
      const differenza = attacco.squadra.attacco - difesa.squadra.difesa
      let qualita = limita(
        PARAMETRI.qualitaBase +
          differenza * PARAMETRI.pesoAttacco * PARAMETRI.qualitaBase +
          (attacco.squadra.attacco - 77) * 0.0035,
        0.03, 0.55,
      )
      // "garbage time": con 4 gol segnati, 3 di vantaggio o una partita già
      // piena di gol si toglie il piede dal gas (niente 8-1 o 6-5, DoD M3)
      const vantaggio = attacco.gol - difesa.gol
      if (attacco.gol >= 4 || vantaggio >= 3) qualita *= 0.5
      if (attacco.gol + difesa.gol >= 6) qualita *= 0.6
      // finale in equilibrio: sul pareggio dopo il 75' le squadre rischiano
      // meno (è il motivo per cui nel calcio vero i pareggi abbondano —
      // l'effetto che il modello Dixon-Coles corregge con il suo parametro ρ)
      if (minuto > 75 && attacco.gol === difesa.gol) qualita *= 0.7

      const tiratore = estraiGiocatore(attacco, PESO_TIRO, (g) => g.attacco, true)

      if (rng.evento(PARAMETRI.probMurata)) {
        // la difesa chiude prima del tiro
        registraEvento(minuto, 'occasione-murata', attacco, tiratore)
        const difensore = estraiGiocatore(difesa, PESO_FALLO, (g) => g.difesa)
        prestazione[difensore.id] += 0.08
      } else {
        attacco.tiri++
        const probSpecchio = PARAMETRI.probSpecchio + (tiratore.attacco - 60) * 0.002
        const probGolPortiere = limita(qualita - (difesa.squadra.portiere - 60) * PARAMETRI.pesoPortiere, 0.02, 0.9)
        // xG del tiro: probabilità complessiva che questo tiro diventi gol
        attacco.golAttesi += probSpecchio * probGolPortiere
        if (!rng.evento(probSpecchio)) {
          registraEvento(minuto, 'occasione-fuori', attacco, tiratore)
          prestazione[tiratore.id] -= 0.03
        } else {
          attacco.tiriInPorta++
          // gol o parata: la qualità dell'occasione contro il portiere
          if (rng.evento(probGolPortiere)) {
            attacco.gol++
            // assist nel 65% dei gol
            let assistNome: string | undefined
            if (rng.evento(0.65)) {
              const rifinitore = estraiGiocatore(attacco, PESO_ASSIST, (g) => g.regia)
              if (rifinitore.id !== tiratore.id) {
                assistNome = rifinitore.nome
                prestazione[rifinitore.id] += 0.6
              }
            }
            registraEvento(minuto, 'gol', attacco, tiratore, assistNome)
            prestazione[tiratore.id] += 1.0
            const portiere = inCampo(difesa).find((g) => g.ruolo === 'POR')
            if (portiere) prestazione[portiere.id] -= 0.25
          } else {
            const portiere = inCampo(difesa).find((g) => g.ruolo === 'POR')
            if (portiere) {
              registraEvento(minuto, 'occasione-parata', difesa, portiere)
              prestazione[portiere.id] += 0.12
            }
            prestazione[tiratore.id] += 0.03
          }
        }
      }
    }

    // disciplina e infortuni (probabilità per minuto = attesa / 90)
    for (const s of stati) {
      if (rng.evento(PARAMETRI.ammonizioniAttese / 90)) {
        const falloso = estraiGiocatore(s, PESO_FALLO, (g) => 100 - g.difesa / 2)
        if (s.ammoniti.has(falloso.id)) {
          // seconda ammonizione = espulsione
          s.espulsi.add(falloso.id)
          registraEvento(minuto, 'espulsione', s, falloso)
          prestazione[falloso.id] -= 1.5
        } else {
          s.ammoniti.add(falloso.id)
          registraEvento(minuto, 'ammonizione', s, falloso)
          prestazione[falloso.id] -= 0.3
        }
      }
      if (rng.evento(PARAMETRI.probEspulsione / 90)) {
        const falloso = estraiGiocatore(s, PESO_FALLO, () => 50)
        if (!s.espulsi.has(falloso.id)) {
          s.espulsi.add(falloso.id)
          registraEvento(minuto, 'espulsione', s, falloso)
          prestazione[falloso.id] -= 2
        }
      }
      if (rng.evento(PARAMETRI.probInfortunio / 90)) {
        const sfortunato = rng.pesato(inCampo(s), inCampo(s).map(() => 1))
        registraEvento(minuto, 'infortunio', s, sfortunato)
        // la gestione vera degli infortuni (durata, indisponibilità) è in
        // IDEE-FUTURE; nel Match Day l'infortunato si può sostituire
      }
    }

    return eventi.slice(dallEvento)
  }

  /** Voto corrente (senza il ritocco finale): base 6 + prestazione + forma. */
  const votoCorrente = (g: GiocatoreMotore) =>
    Math.round(limita(6 + prestazione[g.id] + (g.forma - 50) * 0.004, 4, 10) * 10) / 10

  function risultatoFinale(): RisultatoPartita {
    const voti: Record<number, number> = {}
    // base 6, più la prestazione accumulata, più un pizzico di giornata
    // (deterministico: viene dallo stesso rng), più bonus per la porta chiusa
    for (const s of stati) {
      const avversario = s === stati[0] ? stati[1] : stati[0]
      for (const g of s.squadra.titolari) {
        let voto = 6 + prestazione[g.id] + (rng.numero() - 0.5) * 0.8
        if (avversario.gol === 0 && (g.ruolo === 'POR' || g.ruolo === 'DC')) voto += 0.4
        voto += (g.forma - 50) * 0.004
        voti[g.id] = Math.round(limita(voto, 4, 10) * 10) / 10
      }
    }

    const contesaTotale = stati[0].contesa + stati[1].contesa || 1
    const possessoCasaPct = Math.round((stati[0].contesa / contesaTotale) * 100)
    const statistiche = (s: StatoSquadra, possesso: number) => ({
      possesso,
      tiri: s.tiri,
      tiriInPorta: s.tiriInPorta,
      golAttesi: Math.round(s.golAttesi * 100) / 100,
    })

    return {
      golCasa: stati[0].gol,
      golTrasferta: stati[1].gol,
      eventi,
      statistiche: {
        casa: statistiche(stati[0], possessoCasaPct),
        trasferta: statistiche(stati[1], 100 - possessoCasaPct),
      },
      voti,
      pagelle: {
        casa: stati[0].squadra.titolari.map((g) => ({ id: g.id, nome: g.nome, ruolo: g.ruolo, voto: voti[g.id] })),
        trasferta: stati[1].squadra.titolari.map((g) => ({ id: g.id, nome: g.nome, ruolo: g.ruolo, voto: voti[g.id] })),
      },
    }
  }

  return {
    get minuto() { return minuto },
    get possessoCasa() { return possessoCasa },
    avanzaMinuto,
    punteggio: () => ({ casa: stati[0].gol, trasferta: stati[1].gol }),
    votiLive: (lato) => perLato(lato).squadra.titolari.map((g) => ({
      id: g.id, nome: g.nome, ruolo: g.ruolo, voto: votoCorrente(g),
    })),
    inCampo: (lato) => inCampo(perLato(lato)),
    formazione: (lato) => perLato(lato).squadra.titolari.map((g) => ({
      giocatore: g, espulso: perLato(lato).espulsi.has(g.id),
    })),
    panchina: (lato) => perLato(lato).squadra.panchina,
    sostituzioniRimaste: (lato) => 3 - perLato(lato).sostituzioni,
    sostituisci: (lato, esceId, entraId) => {
      const s = perLato(lato)
      if (s.sostituzioni >= 3) return false
      const indice = s.squadra.titolari.findIndex((g) => g.id === esceId)
      const entra = s.squadra.panchina.find((g) => g.id === entraId)
      if (indice < 0 || !entra || s.espulsi.has(esceId)) return false
      const esce = s.squadra.titolari[indice]
      s.squadra.titolari[indice] = entra
      s.squadra.panchina = s.squadra.panchina.filter((g) => g.id !== entraId)
      s.squadra.panchina.push(esce) // esce, ma resta nei voti (ha giocato)
      s.sostituzioni++
      ricalcolaForze(s.squadra)
      return true
    },
    regola: (lato, regolazioni) => {
      const squadra = perLato(lato).squadra
      if (regolazioni.mentalita !== undefined) {
        // rimuove l'effetto della mentalità attuale e applica la nuova
        const delta = regolazioni.mentalita - squadra.mentalita
        squadra.attacco += delta * 2.5
        squadra.difesa -= delta * 2.5
        squadra.mentalita = regolazioni.mentalita
      }
      if (regolazioni.ritmo !== undefined) squadra.ritmo = regolazioni.ritmo
    },
    risultatoFinale,
  }
}

/**
 * Ricalcola le forze di reparto dopo una sostituzione, con le stesse regole
 * della preparazione (reparto dello slot per posizione, peso numerico) e
 * ri-applicando il delta tattico registrato (movimenti + istruzioni).
 * È un'approssimazione dichiarata: i movimenti del sostituito restano nel
 * delta di squadra (docs/tattica.md).
 */
export function ricalcolaForze(squadra: SquadraMotore): void {
  const media = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0)
  const indici = (reparto: 'DIF' | 'CEN' | 'ATT') =>
    squadra.repartiSlot.map((r, i) => (r === reparto ? i : -1)).filter((i) => i >= 0 && i < squadra.titolari.length)
  const dif = indici('DIF')
  const cen = indici('CEN')
  const att = indici('ATT')
  const peso = (quanti: number, riferimento: number, forza: number) => 1 + forza * (quanti - riferimento)

  squadra.attacco =
    (media(att.map((i) => squadra.titolari[i].attacco)) * 0.7 +
      media(cen.map((i) => squadra.titolari[i].attacco)) * 0.3) *
      peso(att.length, 2, 0.055) +
    squadra.deltaTattici.attacco
  squadra.centrocampo =
    (media(cen.map((i) => squadra.titolari[i].regia)) * 0.7 +
      media(squadra.titolari.map((g) => g.regia)) * 0.3) *
      peso(cen.length, 4, 0.035) +
    squadra.deltaTattici.centrocampo
  squadra.difesa =
    (media(dif.map((i) => squadra.titolari[i].difesa)) * 0.7 +
      media(cen.map((i) => squadra.titolari[i].difesa)) * 0.3) *
      peso(dif.length, 4, 0.08) +
    squadra.deltaTattici.difesa
  const indicePortiere = squadra.repartiSlot.findIndex((r) => r === 'POR')
  squadra.portiere = squadra.titolari[indicePortiere]?.portiere ?? squadra.portiere
}

/**
 * Simula una partita completa in un colpo solo (campionato, calibrazione).
 * Fa gli stessi identici passi della versione a tappe, senza interventi.
 */
export function simulaPartitaMotore(
  casa: SquadraMotore,
  trasferta: SquadraMotore,
  seme: string,
): RisultatoPartita {
  const partita = creaPartita(casa, trasferta, seme)
  while (partita.minuto < 90) partita.avanzaMinuto()
  return partita.risultatoFinale()
}
