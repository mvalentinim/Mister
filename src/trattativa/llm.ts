// llm.ts — lo strato LLM della trattativa (M7, FRD §6.3, strato 2).
//
// L'LLM è VOCE E INTERPRETE, mai arbitro: interpreta il giocatore (risponde
// nei suoi panni, in italiano) e traduce il discorso libero dell'utente in
// LEVE STRUTTURATE. I pesi delle leve e la decisione finale restano al
// cervello deterministico (interesse.ts).
//
// 🔗 RISORSA ESTERNA — chiave API Anthropic (FRD §14 riga 1):
// la chiave si crea su https://console.anthropic.com → API Keys, si incolla
// nel pannello Impostazioni della trattativa e resta SOLO nel browser
// (localStorage) — mai nel codice, mai su git. Costi: pochi centesimi per
// trattativa. Senza chiave il gioco usa il fallback offline (FRD §6.3).

import Anthropic from '@anthropic-ai/sdk'
import type { GiocatoreRiga } from '../db/tipi.ts'
import { calcolaEta } from '../db/tipi.ts'
import type { EsitoInteresse, Leva } from './interesse.ts'

const CHIAVE_STORAGE = 'mister-chiave-api'
const MODELLO_STORAGE = 'mister-modello-llm'
export const MODELLO_DEFAULT = 'claude-opus-5'
export const MODELLI_DISPONIBILI = ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5']

export function chiaveApi(): string | null {
  return localStorage.getItem(CHIAVE_STORAGE)
}
export function salvaChiaveApi(chiave: string): void {
  if (chiave.trim()) localStorage.setItem(CHIAVE_STORAGE, chiave.trim())
  else localStorage.removeItem(CHIAVE_STORAGE)
}
export function modelloLlm(): string {
  return localStorage.getItem(MODELLO_STORAGE) ?? MODELLO_DEFAULT
}
export function salvaModelloLlm(modello: string): void {
  localStorage.setItem(MODELLO_STORAGE, modello)
}

export interface BattutaDialogo {
  chi: 'allenatore' | 'giocatore'
  testo: string
}

export interface RispostaLlm {
  rispostaGiocatore: string
  leveRiconosciute: Leva[]
}

/**
 * Un turno di dialogo: l'LLM risponde nei panni del giocatore e riconosce
 * le leve nel discorso dell'allenatore. Lancia un'eccezione se la chiamata
 * fallisce: chi chiama ripiega sulla modalità offline (FRD §6.3).
 */
export async function turnoDialogo(
  giocatore: GiocatoreRiga,
  contesto: {
    clubNome: string
    clubAttualeNome: string
    interesse: EsitoInteresse
    leveGiaRiconosciute: Leva[]
  },
  storia: BattutaDialogo[],
  messaggioAllenatore: string,
): Promise<RispostaLlm> {
  const chiave = chiaveApi()
  if (!chiave) throw new Error('Chiave API non configurata')

  // dangerouslyAllowBrowser: l'app gira interamente nel browser dell'utente
  // e la chiave è la SUA (uso privato, FRD §3) — non c'è un server di mezzo
  const client = new Anthropic({ apiKey: chiave, dangerouslyAllowBrowser: true })

  const sistema = `Sei ${giocatore.nome} ${giocatore.cognome}, calciatore di ${calcolaEta(giocatore.data_nascita)} anni (${giocatore.ruolo}) del ${contesto.clubAttualeNome}, in trattativa con l'allenatore del ${contesto.clubNome}.

La tua personalità (scala 1-99): ambizione ${giocatore.ambizione}, attaccamento al denaro ${giocatore.attaccamento_denaro}, fedeltà ${giocatore.fedelta}, bisogno di giocare ${giocatore.bisogno_giocare}, professionalità ${giocatore.professionalita}, leadership ${giocatore.leadership}.

Il tuo interesse attuale per la proposta è ${contesto.interesse.punteggio}/100. I fattori che pesano di più: ${contesto.interesse.fattori.map((f) => `${f.nome} (${f.contributo > 0 ? '+' : ''}${f.contributo})`).join('; ')}.

Rispondi in prima persona, in italiano, 2-3 frasi coerenti con personalità e interesse: sopra 60 sei ben disposto, tra 40 e 60 esitante (fai emergere l'ostacolo principale), sotto 40 freddo. NON decidere tu se firmare: è il gioco a farlo.

Inoltre RICONOSCI le leve nel discorso dell'allenatore, solo se promesse in modo esplicito:
- "titolarita": promette che giocherai titolare
- "centralita": promette che sarai centrale/importante nel progetto
- "progetto": promette la promozione o un progetto sportivo ambizioso
- "fascia": promette la fascia di capitano

Rispondi SOLO con un oggetto JSON, senza altro testo:
{"risposta": "...", "leve": ["titolarita"]}
(leve: array anche vuoto, solo tra i 4 valori elencati)`

  const messaggi: Anthropic.MessageParam[] = [
    ...storia.map((b): Anthropic.MessageParam => ({
      role: b.chi === 'allenatore' ? 'user' : 'assistant',
      content: b.testo,
    })),
    { role: 'user', content: messaggioAllenatore },
  ]

  const modello = modelloLlm()
  const risposta = await client.messages.create({
    model: modello,
    max_tokens: 1000,
    // dialogo di gioco: rapido ed economico (Haiku non supporta "effort")
    ...(modello.includes('haiku') ? {} : { output_config: { effort: 'low' as const } }),
    system: sistema,
    messages: messaggi,
  })

  const testo = risposta.content
    .filter((blocco): blocco is Anthropic.TextBlock => blocco.type === 'text')
    .map((blocco) => blocco.text)
    .join('')

  // il modello risponde in JSON; se qualcosa va storto usiamo il testo grezzo
  try {
    const inizio = testo.indexOf('{')
    const fine = testo.lastIndexOf('}')
    const dati = JSON.parse(testo.slice(inizio, fine + 1)) as { risposta: string; leve: string[] }
    const valide: Leva[] = ['titolarita', 'centralita', 'progetto', 'fascia']
    return {
      rispostaGiocatore: dati.risposta,
      leveRiconosciute: (dati.leve ?? []).filter((l): l is Leva => valide.includes(l as Leva)),
    }
  } catch {
    return { rispostaGiocatore: testo, leveRiconosciute: [] }
  }
}
