// motore.ts — la logica della carriera (milestone M2): offerte iniziali,
// creazione, avanzamento a giornate, classifica, fine stagione con
// promozioni/retrocessioni e passaggio alla stagione successiva.
//
// Semplificazioni dichiarate di M2 (verranno raffinate nelle milestone dopo):
// - promozioni/retrocessioni: 3 su e 3 giù, senza playoff;
// - nessuno scende SOTTO la seconda divisione (non abbiamo le terze serie);
// - il campionato dell'altra divisione viene simulato in blocco a fine
//   stagione (serve solo a decidere chi sale e chi scende);
// - rose congelate tra le stagioni (il mercato arriva in M6).
//
// Da M3 le partite passano dal MOTORE A EVENTI deterministico
// (src/motore/): stessa carriera e stessa giornata → stessa partita.

import type { Database } from 'sql.js'
import { interroga } from '../db/query.ts'
import { improntaDbCorrente } from '../db/database.ts'
import { preparaSquadra, tatticaDefault } from '../motore/preparazione.ts'
import { estendiMercatoAlMondo, fineStagioneMercato, inizializzaMercato, aggiungiNotizia } from '../mercato/stato.ts'
import { creaCoppa, creaCoppaEuropa, giocaTurnoCoppaSeDovuto } from './coppa.ts'
import { aggiornaFiducia, controllaEsonero, famaFineStagione, obiettivoDelClub, offerteFineStagione, variaFama } from './fama.ts'
import { crescitaFineStagione, type NotaCrescita } from './crescita.ts'
import { avanzaNazionale, offertaNazionale } from './nazionale.ts'
import { rosaLegendIds, squadreLegend } from '../db/legends.ts'
import { ingressoLeggendeSeDovuto, ritiroLeggendeSeDovuto } from './leggende.ts'
import { rinasciteFineStagione, ritiriFineStagione } from './ritiri.ts'
import { giocatoriPerId } from '../mercato/stato.ts'
import { mediaComplessiva } from '../db/tipi.ts'
import { GIORNI_FINESTRA_INVERNALE } from '../mercato/stato.ts'
import { aggiornaComportamento, verificaPromesseFineStagione } from '../comportamento/comportamento.ts'
import { simulaPartitaMotore } from '../motore/partita.ts'
import type { SquadraMotore } from '../motore/tipi.ts'
import { generaCalendario } from './calendario.ts'
import type {
  Carriera, ClubCarriera, Obiettivo, Offerta, ProfiloAllenatore, RigaClassifica,
} from './tipi.ts'

// Cache delle squadre preparate per il motore. Da M6 le rose vivono nella
// CARRIERA (i trasferimenti le muovono): la cache si invalida da sola
// quando la rosa di un club cambia (chiave = elenco degli id).
// La squadra dell'UTENTE si ricostruisce sempre: la sua tattica (M4)
// può cambiare in ogni momento.
const cacheSquadre = new Map<number, { chiave: string; squadra: SquadraMotore }>()

export function squadraMotore(db: Database, carriera: Carriera, clubId: number): SquadraMotore {
  const club = carriera.club.find((c) => c.id === clubId)!
  const ids = carriera.rose?.[clubId]
  if (clubId === carriera.clubId) {
    const squadra = preparaSquadra(db, clubId, club.nome, carriera.tattica, ids, carriera.crescita)
    // il MORALE della rosa dell'utente diventa la "forma" nel motore (M7,
    // FRD §7: effetti sul rendimento — oggi pesa sui voti, domani di più)
    for (const g of [...squadra.titolari, ...squadra.panchina]) {
      g.forma = carriera.morale?.[g.id] ?? 50
    }
    return squadra
  }
  // l'anno entra nella chiave: la crescita dei giocatori (M8) cambia a ogni
  // stagione e la squadra in cache va ricostruita coi nuovi attributi
  const chiave = `${carriera.anno}:${ids ? ids.join(',') : 'statico'}`
  const inCache = cacheSquadre.get(clubId)
  if (inCache && inCache.chiave === chiave) return inCache.squadra
  const squadra = preparaSquadra(db, clubId, club.nome, undefined, ids, carriera.crescita)
  cacheSquadre.set(clubId, { chiave, squadra })
  return squadra
}

/** Il seme di una singola partita: carriera + stagione + giornata + squadre.
    Stessa carriera e stessa giornata → stessa partita (FRD §9.7). È esportato
    perché il Match Day visuale pre-calcola la stessa identica partita. */
export function semePartita(carriera: Carriera, giornata: number, casaId: number, trasfertaId: number): string {
  return `${carriera.seme}-${carriera.anno}-${giornata}-${casaId}-${trasfertaId}`
}

/** La partita della squadra dell'utente nella prossima giornata (null a stagione finita). */
export function partitaUtenteCorrente(carriera: Carriera) {
  if (carriera.giornata >= carriera.calendario.length) return null
  return (
    carriera.calendario[carriera.giornata].find(
      (p) => p.casaId === carriera.clubId || p.trasfertaId === carriera.clubId,
    ) ?? null
  )
}

/** Prepara (con cache) la squadra di un club per il motore — usato dal Match Day. */
export function squadraPerMotore(db: Database, carriera: Carriera, clubId: number): SquadraMotore {
  return squadraMotore(db, carriera, clubId)
}

export const ANNO_INIZIO_CARRIERA = 2025 // il DB fotografa la stagione 2025-26

/** Le nazioni in cui si può iniziare (quelle con una seconda divisione). */
export function nazioniDisponibili(db: Database): Array<{ id: number; nome: string }> {
  return interroga(
    db,
    `SELECT DISTINCT n.id, n.nome FROM nazione n
     JOIN competizione c ON c.nazione_id = n.id AND c.livello = 2
     ORDER BY n.nome`,
  )
}

/** Fotografa i club delle due divisioni di una nazione (per la carriera). */
function fotografaClub(db: Database, nazioneId: number): ClubCarriera[] {
  return interroga<ClubCarriera>(
    db,
    `SELECT c.id, c.nome, c.fama AS forza, co.livello,
            co.nazione_id AS nazioneId, co.nome AS campionato,
            c.budget_mercato AS budgetMercato, c.budget_mercato AS budgetMercatoIniziale
     FROM club c JOIN competizione co ON co.id = c.competizione_id
     WHERE co.nazione_id = ? AND co.livello IN (1, 2)`,
    [nazioneId],
  )
}

/** L'obiettivo che un club chiede, in base al suo rango di forza nella lega. */
function obiettivoPerRango(rango: number, totale: number): Obiettivo {
  if (rango < 4) return 'promozione'
  if (rango < Math.min(10, totale / 2)) return 'alta-classifica'
  return 'salvezza'
}

/** Genera 3-5 offerte da club della seconda divisione della nazione scelta. */
export function generaOfferte(db: Database, nazioneId: number): Offerta[] {
  const club = interroga<{ id: number; nome: string; fama: number; budget_mercato: number; budget_stipendi: number }>(
    db,
    `SELECT c.id, c.nome, c.fama, c.budget_mercato, c.budget_stipendi
     FROM club c JOIN competizione co ON co.id = c.competizione_id
     WHERE co.nazione_id = ? AND co.livello = 2
     ORDER BY c.fama DESC`,
    [nazioneId],
  )
  // un allenatore esordiente riceve più offerte dalla metà bassa: peschiamo
  // 4 club a caso con probabilità maggiore verso il fondo della classifica
  const quante = 3 + Math.floor(Math.random() * 3) // 3, 4 o 5
  const indiciScelti = new Set<number>()
  while (indiciScelti.size < Math.min(quante, club.length)) {
    // elevando a 0.6 un numero casuale si "spinge" la scelta verso il fondo
    const indice = Math.floor((1 - Math.random() ** 0.6) * club.length)
    indiciScelti.add(Math.min(indice, club.length - 1))
  }
  return [...indiciScelti].sort((a, b) => a - b).map((indice) => {
    const c = club[indice]
    return {
      clubId: c.id,
      clubNome: c.nome,
      fama: c.fama,
      budgetMercato: c.budget_mercato,
      budgetStipendi: c.budget_stipendi,
      // stipendio proporzionale alla fama del club (min 80k)
      stipendioAllenatore: Math.max(80_000, Math.round(c.fama * 4_000)),
      durataAnni: indice < 4 ? 1 : 2, // i club ambiziosi danno meno tempo
      obiettivo: obiettivoPerRango(indice, club.length),
    }
  })
}

/** Crea la carriera dopo l'accettazione di un'offerta.
    `legendSquadraId` (opzionale, FRD §5.3): una squadra Legend entra nella
    seconda divisione al posto del club più debole. */
export function creaCarriera(
  db: Database,
  allenatore: ProfiloAllenatore,
  nazione: { id: number; nome: string },
  offerta: Offerta,
  legendSquadraId?: number,
  leggendeDaAnno?: number, // M9: le leggende free agent entrano da questa stagione
): Carriera {
  const nomi = interroga<{ livello: 1 | 2; nome: string }>(
    db,
    'SELECT livello, nome FROM competizione WHERE nazione_id = ? AND livello IN (1,2)',
    [nazione.id],
  )
  const club = fotografaClub(db, nazione.id)

  // ── la Legend nel campionato (M9, FRD §5.3) ──
  // Sostituisce il club più DEBOLE della seconda divisione (mai quello
  // dell'utente): il sostituito "fa spazio" e resta solo nel mondo del
  // mercato. La rosa leggendaria viene fotografata più sotto.
  let legend: { clubCarriera: ClubCarriera; rosaIds: number[]; sostituitoId: number } | null = null
  if (legendSquadraId !== undefined) {
    const squadra = squadreLegend(db).find((s) => s.id === legendSquadraId)
    const rosaIds = rosaLegendIds(db, legendSquadraId)
    if (squadra && rosaIds.length >= 11) {
      const deboli = club
        .filter((c) => c.livello === 2 && c.id !== offerta.clubId)
        .sort((a, b) => a.forza - b.forza)
      const sostituito = deboli[0]
      const righe = giocatoriPerId(db, rosaIds)
      const medie = righe.map((g) => mediaComplessiva(g)).sort((a, b) => b - a)
      const forza = Math.round(medie.slice(0, 14).reduce((s, v) => s + v, 0) / Math.min(14, medie.length))
      const clubCarriera: ClubCarriera = {
        id: 500_000 + squadra.id, // id sintetico: non collide coi club del DB
        nome: squadra.nome,
        forza,
        livello: 2,
        nazioneId: nazione.id,
        campionato: nomi.find((n) => n.livello === 2)?.nome ?? 'Seconda divisione',
        budgetMercato: 10_000_000,
        budgetMercatoIniziale: 10_000_000,
      }
      club[club.findIndex((c) => c.id === sostituito.id)] = clubCarriera
      legend = { clubCarriera, rosaIds, sostituitoId: sostituito.id }
    }
  }
  const mieiCompagniDiLega = club.filter((c) => c.livello === 2).map((c) => c.id)
  const rosaMia = interroga<import('../db/tipi.ts').GiocatoreRiga>(
    db, 'SELECT * FROM giocatore WHERE club_id = ?', [offerta.clubId],
  )
  const carriera: Carriera = {
    id: `carriera-${Date.now()}`,
    versioneSchema: 13,
    rinati: {}, // i rigenerati post-ritiro (sessione 24)
    crescitaMassima: {}, // i massimi di crescita, per il picco al ritiro
    dbImpronta: improntaDbCorrente(), // il DB con cui nasce la carriera
    leggendeMercato: leggendeDaAnno === undefined
      ? null
      : { daAnno: leggendeDaAnno, entrate: false, annoIngresso: null, ids: [] },
    ritirati: [],
    // ── M8: fama completa, fiducia, coppa, crescita ──
    fiducia: 60,
    crescita: {},
    coppa: null, // creata subito sotto, dopo la fotografia dei club
    eventiFama: [],
    trofei: [],
    coppaEuropa: null, // la Coppa Europa si conquista sul campo
    qualificatoEuropa: false,
    nazionale: null,
    offertaNazionale: null,
    contrattoAllenatore: { scadenza: ANNO_INIZIO_CARRIERA + offerta.durataAnni, stipendio: offerta.stipendioAllenatore },
    esoneri: 0,
    offerteSpeciali: null,
    morale: {},
    statistiche: {},
    promesse: [],
    prossimaPromessaId: 1,
    promesseTradite: 0,
    famaAllenatore: 20, // bassa e uguale per tutti (FRD §4.1); cresce in M8
    messaggi: [],
    seme: Math.floor(Math.random() * 2_147_483_647), // fissato alla creazione
    cronaca: null,
    tattica: tatticaDefault(rosaMia),
    // il mercato (rose, contratti, budget) viene fotografato subito sotto
    rose: {},
    contratti: {},
    svincolati: [],
    prestiti: [],
    budget: { mercato: 0, stipendi: 0 },
    mercato: {
      aperto: false, finestra: null, giorniRimasti: 0,
      prossimaOffertaId: 1, offerteRicevute: [], notizie: [], cedibili: [],
    },
    allenatore,
    nazione,
    competizioni: {
      1: nomi.find((n) => n.livello === 1)?.nome ?? 'Prima divisione',
      2: nomi.find((n) => n.livello === 2)?.nome ?? 'Seconda divisione',
    },
    clubId: offerta.clubId,
    obiettivo: offerta.obiettivo,
    annoInizio: ANNO_INIZIO_CARRIERA,
    anno: ANNO_INIZIO_CARRIERA,
    club,
    calendario: generaCalendario(mieiCompagniDiLega),
    giornata: 0,
    storico: [],
    aggiornataIl: new Date().toISOString(),
  }
  // fotografa rose, contratti e budget e apre la finestra estiva (M6);
  // poi estende il mercato a tutti i campionati del DB
  inizializzaMercato(db, carriera)
  estendiMercatoAlMondo(db, carriera)
  if (legend) {
    // la rosa leggendaria entra nella carriera con contratti pesanti
    carriera.rose[legend.clubCarriera.id] = legend.rosaIds
    for (const id of legend.rosaIds) {
      carriera.contratti[id] = { stipendio: 1_500_000, scadenza: carriera.anno + 3 }
    }
    // il club sostituito resta nel mondo del mercato ma fuori dal campionato
    const sostituito = carriera.club.find((c) => c.id === legend!.sostituitoId)
    if (sostituito) sostituito.nazioneId = -1
    aggiungiNotizia(carriera, `⭐ ${legend.clubCarriera.nome} è stata ammessa al campionato al posto del ${sostituito?.nome ?? 'club più debole'}!`, 'avviso')
  }
  carriera.budget.mercato = offerta.budgetMercato
  carriera.budget.stipendi = Math.max(carriera.budget.stipendi, offerta.budgetStipendi)
  carriera.coppa = creaCoppa(carriera) // la coppa nazionale (M8)
  ingressoLeggendeSeDovuto(db, carriera) // "da subito" = già in questo mercato estivo (M9)
  return carriera
}

/** La divisione in cui gioca l'utente in questa stagione. */
export function livelloUtente(carriera: Carriera): 1 | 2 {
  return carriera.club.find((c) => c.id === carriera.clubId)!.livello
}

/** I club del campionato dell'utente (le due divisioni della sua nazione).
    Da quando il mercato è mondiale `carriera.club` contiene TUTTI i club:
    classifica, promozioni e calendario devono restare nella nazione.
    (Il confronto con undefined copre i salvataggi non ancora estesi.) */
export function clubNazione(carriera: Carriera) {
  return carriera.club.filter(
    (c) => c.nazioneId === undefined || c.nazioneId === carriera.nazione.id,
  )
}

/** Gioca la prossima giornata: ogni partita passa dal motore a eventi.
    Per la partita dell'utente si conserva la cronaca completa.
    Se `risultatoUtente` è fornito (Match Day appena guardato, M5), la
    partita dell'utente usa QUEL risultato — che include gli effetti dei
    cambi e delle regolazioni fatte in diretta. */
export function avanzaGiornata(
  db: Database,
  carriera: Carriera,
  risultatoUtente?: import('../motore/tipi.ts').RisultatoPartita,
): void {
  // da CT (M8 parte 3) il "gioca" avanza il ciclo della nazionale
  if (carriera.nazionale) {
    avanzaNazionale(db, carriera)
    return
  }
  if (carriera.giornata >= carriera.calendario.length) return
  for (const partita of carriera.calendario[carriera.giornata]) {
    const partitaMia = partita.casaId === carriera.clubId || partita.trasfertaId === carriera.clubId
    const casa = squadraMotore(db, carriera, partita.casaId)
    const trasferta = squadraMotore(db, carriera, partita.trasfertaId)
    const esito =
      partitaMia && risultatoUtente
        ? risultatoUtente
        : simulaPartitaMotore(
            casa, trasferta,
            semePartita(carriera, carriera.giornata, partita.casaId, partita.trasfertaId),
          )
    partita.golCasa = esito.golCasa
    partita.golTrasferta = esito.golTrasferta

    // la partita dell'utente merita la cronaca completa (FRD §9)
    if (partitaMia) {
      const latoMio = partita.casaId === carriera.clubId ? 'casa' : 'trasferta'
      carriera.cronaca = {
        giornata: carriera.giornata + 1,
        casaNome: casa.nome,
        trasfertaNome: trasferta.nome,
        golCasa: esito.golCasa,
        golTrasferta: esito.golTrasferta,
        eventi: esito.eventi.filter((e) => e.tipo !== 'occasione-murata'), // cronaca asciutta
        statistiche: esito.statistiche,
        voti: esito.pagelle[latoMio].map((p) => ({ nome: p.nome, ruolo: p.ruolo, voto: p.voto })),
      }
    }
  }
  carriera.giornata++

  // statistiche, morale, promesse e spogliatoio (M7, FRD §7)
  aggiornaComportamento(db, carriera)

  // fiducia della dirigenza, coppa nazionale ed eventuale esonero (M8)
  const classificaOggi = calcolaClassifica(carriera)
  aggiornaFiducia(carriera, classificaOggi)
  giocaTurnoCoppaSeDovuto(db, carriera)
  controllaEsonero(carriera, classificaOggi)

  // a metà campionato si apre la finestra invernale (M6, FRD §6.1)
  if (carriera.giornata === Math.floor(carriera.calendario.length / 2)) {
    carriera.mercato.aperto = true
    carriera.mercato.finestra = 'invernale'
    carriera.mercato.giorniRimasti = GIORNI_FINESTRA_INVERNALE
    aggiungiNotizia(carriera, 'Si apre la finestra di mercato invernale!', 'avviso')
  }
}

/** true quando tutte le giornate sono state giocate. */
export function stagioneFinita(carriera: Carriera): boolean {
  return carriera.giornata >= carriera.calendario.length
}

/** Calcola la classifica dalle partite giocate (3 punti a vittoria). */
export function calcolaClassifica(carriera: Carriera): RigaClassifica[] {
  const righe = new Map<number, RigaClassifica>()
  const livello = livelloUtente(carriera)
  for (const c of clubNazione(carriera).filter((c) => c.livello === livello)) {
    righe.set(c.id, {
      clubId: c.id, nome: c.nome, punti: 0, giocate: 0,
      vinte: 0, pareggiate: 0, perse: 0, golFatti: 0, golSubiti: 0,
    })
  }
  for (const giornata of carriera.calendario) {
    for (const p of giornata) {
      if (p.golCasa === null || p.golTrasferta === null) continue
      const casa = righe.get(p.casaId)!
      const trasferta = righe.get(p.trasfertaId)!
      casa.giocate++; trasferta.giocate++
      casa.golFatti += p.golCasa; casa.golSubiti += p.golTrasferta
      trasferta.golFatti += p.golTrasferta; trasferta.golSubiti += p.golCasa
      if (p.golCasa > p.golTrasferta) { casa.vinte++; casa.punti += 3; trasferta.perse++ }
      else if (p.golCasa < p.golTrasferta) { trasferta.vinte++; trasferta.punti += 3; casa.perse++ }
      else { casa.pareggiate++; trasferta.pareggiate++; casa.punti++; trasferta.punti++ }
    }
  }
  // ordinamento: punti, differenza reti, gol fatti
  return [...righe.values()].sort(
    (a, b) =>
      b.punti - a.punti ||
      (b.golFatti - b.golSubiti) - (a.golFatti - a.golSubiti) ||
      b.golFatti - a.golFatti,
  )
}

/** Simula in blocco l'ALTRA divisione (per decidere promozioni/retrocessioni). */
function classificaAltraDivisione(db: Database, carriera: Carriera): number[] {
  const altroLivello = livelloUtente(carriera) === 2 ? 1 : 2
  const squadre = clubNazione(carriera).filter((c) => c.livello === altroLivello)
  const punti = new Map<number, [number, number]>(squadre.map((c) => [c.id, [0, 0]])) // punti, diff reti
  const giornate = generaCalendario(squadre.map((c) => c.id))
  for (let g = 0; g < giornate.length; g++) {
    for (const p of giornate[g]) {
      const esito = simulaPartitaMotore(
        squadraMotore(db, carriera, p.casaId),
        squadraMotore(db, carriera, p.trasfertaId),
        `${semePartita(carriera, g, p.casaId, p.trasfertaId)}-altra`,
      )
      const casa = punti.get(p.casaId)!
      const trasferta = punti.get(p.trasfertaId)!
      casa[1] += esito.golCasa - esito.golTrasferta
      trasferta[1] += esito.golTrasferta - esito.golCasa
      if (esito.golCasa > esito.golTrasferta) casa[0] += 3
      else if (esito.golCasa < esito.golTrasferta) trasferta[0] += 3
      else { casa[0]++; trasferta[0]++ }
    }
  }
  return [...punti.entries()]
    .sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1])
    .map(([id]) => id)
}

const PROMOSSE = 3 // semplificazione M2: 3 su, 3 giù, niente playoff

/**
 * Chiude la stagione: valuta l'obiettivo, applica promozioni/retrocessioni
 * tra le due divisioni e prepara la stagione successiva (rose congelate).
 * Restituisce il riepilogo per la schermata di fine stagione.
 */
export function chiudiStagione(db: Database, carriera: Carriera) {
  const classifica = calcolaClassifica(carriera)
  const posizione = classifica.findIndex((r) => r.clubId === carriera.clubId) + 1
  const totale = classifica.length
  const livello = livelloUtente(carriera)

  const obiettivoRaggiunto =
    carriera.obiettivo === 'promozione' ? posizione <= PROMOSSE
    : carriera.obiettivo === 'alta-classifica' ? posizione <= 8
    : posizione <= totale - PROMOSSE

  // chi si muove tra le divisioni: prime 3 della seconda divisione su,
  // ultime 3 della prima divisione giù. Una delle due classifiche è quella
  // dell'utente, l'altra viene simulata in blocco.
  const mia = classifica.map((r) => r.clubId)
  const altra = classificaAltraDivisione(db, carriera)
  const [classificaA, classificaB] = livello === 1 ? [mia, altra] : [altra, mia]
  const promosseDallaB = classificaB.slice(0, PROMOSSE)
  const retrocesseDallaA = classificaA.slice(-PROMOSSE)

  for (const c of carriera.club) {
    if (promosseDallaB.includes(c.id)) c.livello = 1
    else if (retrocesseDallaA.includes(c.id)) c.livello = 2
  }

  const promosso = livello === 2 && promosseDallaB.includes(carriera.clubId)
  const retrocesso = livello === 1 && retrocesseDallaA.includes(carriera.clubId)

  carriera.storico.push({
    anno: carriera.anno,
    competizione: carriera.competizioni[livello],
    posizione,
    punti: classifica[posizione - 1].punti,
    obiettivo: carriera.obiettivo,
    obiettivoRaggiunto,
    promosso,
    retrocesso,
  })

  // ── M8: bilancio di fama e crescita dei giocatori ──
  // Entrambi PRIMA dell'azzeramento delle statistiche (che li alimentano).
  const famaPrima = carriera.famaAllenatore
  famaFineStagione(db, carriera, { posizione, obiettivoRaggiunto, promosso, retrocesso })

  // ── M8 parte 2: scudetto e qualificazione europea ──
  if (livello === 1 && posizione === 1) {
    carriera.trofei.push({ anno: carriera.anno, nome: `Campionato (${carriera.competizioni[1]})` })
    variaFama(carriera, 8, 'CAMPIONI! Titolo nazionale vinto')
  }
  // i primi 4 della prima divisione giocano la Coppa Europa l'anno dopo
  carriera.qualificatoEuropa = livello === 1 && posizione <= 4
  if (carriera.qualificatoEuropa) variaFama(carriera, 2, 'Qualificazione alla Coppa Europa')
  const crescita = crescitaFineStagione(db, carriera)

  // le promesse "di progetto" si verificano coi verdetti (M7, FRD §6.3)
  verificaPromesseFineStagione(db, carriera, promosso)

  // nuova stagione: stesso club, nuovo calendario
  carriera.anno++
  carriera.giornata = 0
  carriera.cronaca = null
  carriera.fiducia = Math.max(carriera.fiducia, 55) // la dirigenza riparte fiduciosa
  // prestiti, scadenze, svincoli e riapertura del mercato estivo (M6)
  fineStagioneMercato(db, carriera)
  const nuovoLivello = livelloUtente(carriera) // ricalcolato dopo i movimenti
  carriera.calendario = generaCalendario(
    clubNazione(carriera).filter((c) => c.livello === nuovoLivello).map((c) => c.id),
  )
  carriera.coppa = creaCoppa(carriera) // nuovo tabellone di coppa (M8)
  // le leggende free agent: ritiro dopo 5 stagioni e/o ingresso (M9)
  ritiroLeggendeSeDovuto(db, carriera)
  ingressoLeggendeSeDovuto(db, carriera)
  // i giocatori normali anziani si ritirano; i ritirati dell'anno scorso
  // RINASCONO sedicenni nel mercato (sessione 24)
  ritiriFineStagione(db, carriera)
  rinasciteFineStagione(db, carriera)
  // la Coppa Europa esiste solo se ci si è qualificati (M8 parte 2)
  carriera.coppaEuropa = carriera.qualificatoEuropa ? creaCoppaEuropa(carriera) : null

  // ── il contratto dell'allenatore (M8 parte 2): rinnovo alla scadenza ──
  // La dirigenza rinnova sempre (niente vicoli ciechi), ma la durata dice
  // quanto crede in te: 2 anni se la fiducia è buona, 1 se sei in bilico.
  if (carriera.contrattoAllenatore.scadenza <= carriera.anno) {
    const anni = carriera.fiducia >= 35 ? 2 : 1
    carriera.contrattoAllenatore = {
      scadenza: carriera.anno + anni,
      stipendio: Math.round(carriera.contrattoAllenatore.stipendio * (carriera.fiducia >= 35 ? 1.1 : 1)),
    }
    aggiungiNotizia(
      carriera,
      anni === 2
        ? `La dirigenza rinnova il tuo contratto fino al ${carriera.anno + anni}.`
        : `Rinnovo di UN solo anno: la dirigenza non è convinta di te.`,
      anni === 2 ? 'ufficiale' : 'avviso',
    )
  }

  // l'obiettivo si rinegozia a ogni stagione (M8): un club appena promosso
  // chiede la salvezza, non un'altra promozione
  carriera.obiettivo = obiettivoDelClub(carriera, carriera.club.find((c) => c.id === carriera.clubId)!)

  // le offerte di fascia superiore, sbloccate dalla fama (FRD §4.3)
  const offerte = offerteFineStagione(carriera)
  if (offerte.length > 0) carriera.offerteSpeciali = { contesto: 'fine-stagione', offerte }

  // con la fama alta può bussare una federazione (M8 parte 3)
  carriera.offertaNazionale = offertaNazionale(db, carriera)

  // gli eventi di fama della stagione appena chiusa, per il riepilogo
  const eventiFama = carriera.eventiFama.filter((e) => e.anno === carriera.anno - 1)

  return {
    posizione, totale, obiettivoRaggiunto, promosso, retrocesso,
    eventiFama, famaPrima, famaDopo: carriera.famaAllenatore,
    crescita: crescita as NotaCrescita[],
    coppaVinta: carriera.trofei.some((t) => t.anno === carriera.anno - 1),
    qualificatoEuropa: carriera.qualificatoEuropa,
    offertaNazionale: carriera.offertaNazionale,
  }
}
