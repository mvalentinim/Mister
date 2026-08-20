// interesse.ts — il CERVELLO DETERMINISTICO della trattativa col giocatore
// (M7, FRD §6.3, strato 1). Calcola il punteggio di interesse (0-100) del
// giocatore verso la proposta, con i fattori SPIEGABILI uno per uno.
//
// Regola fondamentale del FRD: l'LLM è solo voce e interprete — le leve
// alzano o abbassano il punteggio secondo i pesi definiti QUI, e nessun
// giocatore firma se il punteggio resta sotto soglia.

import type { Database } from 'sql.js'
import { calcolaEta, mediaComplessiva, type GiocatoreRiga } from '../db/tipi.ts'
import { clubDiGiocatore, rosaClub } from '../mercato/stato.ts'
import { REPARTO } from '../motore/preparazione.ts'
import type { Carriera } from '../carriera/tipi.ts'

export const SOGLIA_FIRMA = 60
export const SOGLIA_TRATTABILE = 40 // sotto: rifiuto netto

/** Le leve riconosciute (dalle scelte offline o dal discorso libero via LLM). */
export type Leva = 'titolarita' | 'centralita' | 'progetto' | 'fascia'

export const DESCRIZIONE_LEVA: Record<Leva, string> = {
  titolarita: 'Promessa di titolarità',
  centralita: 'Centralità nel progetto',
  progetto: 'Progetto sportivo (promozione)',
  fascia: 'Fascia di capitano',
}

export interface OffertaIngaggio {
  stipendio: number // euro/anno
  durataAnni: number // 1-4
  leve: Leva[]
}

export interface FattoreInteresse {
  nome: string
  contributo: number // punti, positivi o negativi
}

export interface EsitoInteresse {
  punteggio: number // 0-100
  fattori: FattoreInteresse[]
  /** il fattore negativo più pesante: guida la risposta del giocatore */
  ostacolo: FattoreInteresse | null
}

const limita = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/**
 * Il punteggio di interesse del giocatore verso la proposta dell'utente.
 * Fattori (FRD §6.3): profilo comportamentale, età e fase carriera,
 * prestigio di club e campionato, fama dell'allenatore, minutaggio
 * prevedibile, stipendio e durata, promesse; più la reputazione
 * dell'allenatore sulle promesse passate.
 */
export function punteggioInteresse(
  db: Database,
  carriera: Carriera,
  giocatore: GiocatoreRiga,
  offerta: OffertaIngaggio,
): EsitoInteresse {
  const fattori: FattoreInteresse[] = []
  const eta = calcolaEta(giocatore.data_nascita)
  const mioClub = carriera.club.find((c) => c.id === carriera.clubId)!
  const clubAttualeId = clubDiGiocatore(carriera, giocatore.id)
  const clubAttuale = carriera.club.find((c) => c.id === clubAttualeId)

  // base neutra
  let punteggio = 45

  // ── prestigio: il salto di club e divisione, pesato dall'ambizione ──
  const saltoForza = mioClub.forza - (clubAttuale?.forza ?? mioClub.forza - 5)
  const saltoDivisione = (clubAttuale ? clubAttuale.livello : 2) - mioClub.livello // +1 = salgo di categoria
  const pesoAmbizione = 0.5 + giocatore.ambizione / 100 // 0.5-1.5
  const prestigio = limita((saltoForza * 0.8 + saltoDivisione * 12) * pesoAmbizione, -30, 25)
  fattori.push({ nome: clubAttuale ? `Prestigio del progetto (da ${clubAttuale.nome})` : 'Prestigio del progetto', contributo: Math.round(prestigio) })

  // ── fama dell'allenatore ──
  const fama = limita((carriera.famaAllenatore - 30) * 0.25, -8, 15)
  fattori.push({ nome: 'Fama dell’allenatore', contributo: Math.round(fama) })

  // ── stipendio: il rapporto con quello attuale, pesato dall'attaccamento al denaro ──
  const stipendioAttuale = carriera.contratti[giocatore.id]?.stipendio ?? 300_000
  const rapporto = offerta.stipendio / Math.max(1, stipendioAttuale)
  const pesoDenaro = 0.6 + giocatore.attaccamento_denaro / 100 // 0.6-1.6
  const denaro = limita((rapporto - 1.05) * 22 * pesoDenaro, -30, 22)
  fattori.push({ nome: `Offerta economica (${rapporto >= 1 ? '+' : ''}${Math.round((rapporto - 1) * 100)}% sull’attuale)`, contributo: Math.round(denaro) })

  // ── durata: i giovani gradiscono progetti lunghi, i veterani la sicurezza ──
  const durata = limita((offerta.durataAnni - 2) * (eta >= 30 ? 4 : 2), -4, 8)
  fattori.push({ nome: `Durata del contratto (${offerta.durataAnni} anni)`, contributo: Math.round(durata) })

  // ── minutaggio prevedibile: quanti in rosa sono più forti di lui nel reparto ──
  const rosaMia = rosaClub(db, carriera, carriera.clubId)
  const concorrenti = rosaMia.filter(
    (g) => REPARTO[g.ruolo] === REPARTO[giocatore.ruolo] && mediaComplessiva(g) >= mediaComplessiva(giocatore),
  ).length
  const pesoSpazio = 0.5 + giocatore.bisogno_giocare / 100
  const minutaggio = limita((2 - concorrenti) * 6 * pesoSpazio, -20, 12)
  fattori.push({
    nome: concorrenti <= 1
      ? 'Minutaggio prevedibile: sarebbe titolare'
      : `Minutaggio incerto: ${concorrenti} concorrenti nel ruolo`,
    contributo: Math.round(minutaggio),
  })

  // ── età e fase carriera ──
  if (eta >= 31 && saltoDivisione < 0) {
    fattori.push({ nome: 'A fine carriera non scende di categoria volentieri', contributo: -8 })
  }
  if (eta <= 22 && concorrenti > 1) {
    fattori.push({ nome: 'È giovane: teme la panchina', contributo: -5 })
  }

  // ── le leve/promesse (pesi del motore, non dell'LLM — FRD §6.3) ──
  for (const leva of offerta.leve) {
    switch (leva) {
      case 'titolarita':
        fattori.push({ nome: 'Promessa di titolarità', contributo: Math.round(limita(6 + concorrenti * 4 * pesoSpazio, 6, 18)) })
        break
      case 'centralita':
        fattori.push({ nome: 'Centralità nel progetto', contributo: 7 })
        break
      case 'progetto':
        fattori.push({ nome: 'Progetto sportivo (promozione promessa)', contributo: Math.round(5 + giocatore.ambizione / 12) })
        break
      case 'fascia':
        fattori.push({ nome: 'Fascia di capitano', contributo: Math.round(3 + giocatore.leadership / 12) })
        break
    }
  }

  // ── la reputazione dell'allenatore sulle promesse (FRD §6.3) ──
  if (carriera.promesseTradite > 0 && offerta.leve.length > 0) {
    fattori.push({
      nome: `Le tue promesse tradite in passato (${carriera.promesseTradite}): la tua parola pesa meno`,
      contributo: -limita(carriera.promesseTradite * 4, 4, 16),
    })
  }

  for (const f of fattori) punteggio += f.contributo
  punteggio = Math.round(limita(punteggio, 0, 100))

  const negativi = fattori.filter((f) => f.contributo < 0).sort((a, b) => a.contributo - b.contributo)
  return { punteggio, fattori, ostacolo: negativi[0] ?? null }
}
