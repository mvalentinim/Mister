// partita.ts — il motore a eventi (M3, FRD §9.7).
//
// COME FUNZIONA (architettura ispirata a ESMS, vedi docs/match-engine.md):
// la partita scorre minuto per minuto; a ogni minuto può nascere un'azione
// pericolosa. Chi la crea lo decide il confronto tra i centrocampi (più il
// fattore campo); l'esito lo decidono attacco contro difesa e tiratore
// contro portiere. Ogni scelta casuale passa dal generatore seminato di
// rng.ts: STESSO SEME = STESSA PARTITA, sempre (FRD §13).
//
// Le frequenze target (gol/partita, esiti casa/pareggio/trasferta, tiri)
// vengono dalla letteratura statistica sul calcio (Dixon-Coles) e sono
// verificate dal test di calibrazione: npm run calibra.

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
  /** qualità di base di un'occasione (probabilità di gol sul tiro in porta, "alla pari") */
  qualitaBase: 0.35,
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
}

/**
 * Simula una partita completa. Il seme può essere qualsiasi stringa:
 * a parità di squadre e seme il risultato è IDENTICO in ogni dettaglio.
 */
export function simulaPartitaMotore(
  casa: SquadraMotore,
  trasferta: SquadraMotore,
  seme: string,
): RisultatoPartita {
  const rng = creaRng(semeDaStringa(seme))
  const eventi: EventoPartita[] = []
  const voti: Record<number, number> = {}
  // contributo al voto accumulato durante la partita (parte da 0)
  const prestazione: Record<number, number> = {}
  for (const g of [...casa.titolari, ...trasferta.titolari]) prestazione[g.id] = 0

  const stati: [StatoSquadra, StatoSquadra] = [
    { squadra: casa, lato: 'casa', gol: 0, tiri: 0, tiriInPorta: 0, golAttesi: 0, contesa: 0, ammoniti: new Set(), espulsi: new Set() },
    { squadra: trasferta, lato: 'trasferta', gol: 0, tiri: 0, tiriInPorta: 0, golAttesi: 0, contesa: 0, ammoniti: new Set(), espulsi: new Set() },
  ]

  /** I titolari ancora in campo (senza gli espulsi). */
  const inCampo = (s: StatoSquadra) => s.squadra.titolari.filter((g) => !s.espulsi.has(g.id))

  /** Estrae un giocatore in campo pesato per ruolo e attributo. */
  function estraiGiocatore(
    s: StatoSquadra,
    pesi: Record<string, number>,
    attributo: (g: GiocatoreMotore) => number,
  ): GiocatoreMotore {
    const campo = inCampo(s)
    return rng.pesato(campo, campo.map((g) => (pesi[g.ruolo] ?? 1) * (attributo(g) / 50 + 0.5)))
  }

  function registraEvento(minuto: number, tipo: TipoEvento, s: StatoSquadra, g: GiocatoreMotore, assistNome?: string) {
    eventi.push({ minuto, tipo, squadra: s.lato, giocatoreId: g.id, giocatoreNome: g.nome, assistNome })
  }

  // ── Il cronometro: 90 minuti ──
  for (let minuto = 1; minuto <= 90; minuto++) {
    // chi domina questo minuto (per il possesso): centrocampo + fattore campo
    const differenzaCentrocampo = stati[0].squadra.centrocampo - stati[1].squadra.centrocampo
    // giocare in 10 pesa sul centrocampo: -8 "punti" per ogni espulso
    const malusEspulsi = (stati[1].espulsi.size - stati[0].espulsi.size) * 8
    let probCasa = 0.5 + PARAMETRI.vantaggioCasa + (differenzaCentrocampo + malusEspulsi) * PARAMETRI.pesoCentrocampo
    probCasa = limita(probCasa, 0.15, 0.85)
    const dominante = rng.evento(probCasa) ? stati[0] : stati[1]
    dominante.contesa++

    // nasce un'azione pericolosa?
    if (rng.evento(PARAMETRI.azioniAlMinuto)) {
      const attacco = dominante
      const difesa = attacco === stati[0] ? stati[1] : stati[0]

      // qualità dell'occasione: attacco contro difesa, più un piccolo
      // contributo del livello assoluto dell'attacco (nelle serie minori
      // si segna meno: meno qualità = conversione più bassa)
      const differenza = attacco.squadra.attacco - difesa.squadra.difesa
      let qualita = limita(
        PARAMETRI.qualitaBase +
          differenza * PARAMETRI.pesoAttacco * PARAMETRI.qualitaBase +
          (attacco.squadra.attacco - 72) * 0.0022,
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
      const tiratore = estraiGiocatore(attacco, PESO_TIRO, (g) => g.attacco)

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
        // la gestione vera degli infortuni (durata, sostituzione) arriva in M4+
      }
    }
  }

  // ── Voti finali ──
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

  const contesaTotale = stati[0].contesa + stati[1].contesa
  const possessoCasa = Math.round((stati[0].contesa / contesaTotale) * 100)

  return {
    golCasa: stati[0].gol,
    golTrasferta: stati[1].gol,
    eventi,
    statistiche: {
      casa: {
        possesso: possessoCasa,
        tiri: stati[0].tiri,
        tiriInPorta: stati[0].tiriInPorta,
        golAttesi: Math.round(stati[0].golAttesi * 100) / 100,
      },
      trasferta: {
        possesso: 100 - possessoCasa,
        tiri: stati[1].tiri,
        tiriInPorta: stati[1].tiriInPorta,
        golAttesi: Math.round(stati[1].golAttesi * 100) / 100,
      },
    },
    voti,
  }
}
