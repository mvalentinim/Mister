# VOLTI.md — Specifica del Compositore di Volti
## Figurine giocatori: ritratti pixel-art 48×48 da sprite sheet a strati

**Versione:** 1.0 · Documenti gemelli: `requisiti-funzionali-MISTER.md`, `DESIGN-MISTER.md`
**Asset sorgente:** sprite sheet generato dallo sviluppatore (in `data/assets/faces/source/`)

---

## 0. ISTRUZIONI PER CLAUDE CODE

1. Vale il protocollo del FRD §0: sviluppatore principiante, spiegare ogni passo, verifiche visive insieme.
2. Questo modulo produce **solo ritratti statici** 48×48 per le Figurine. Niente animazioni. Le animazioni di gioco (M12) usano un altro asset (sprite sheet a corpo intero, già in repo).
3. La **verifica è sempre visiva**: ogni fase della pipeline termina generando una griglia HTML di anteprime che lo sviluppatore approva prima di proseguire.
4. Tutti i parametri (pesi regionali, colori, probabilità) vivono in **file JSON editabili**, mai hardcoded: lo sviluppatore deve poterli ritoccare senza toccare codice.

---

## 1. OBIETTIVO E VINCOLI

- Un ritratto **univoco, deterministico e riproducibile** per ogni giocatore: `seed = player.id` → sempre lo stesso volto, su ogni dispositivo.
- Risoluzione nativa 48×48, upscaling solo con `image-rendering: pixelated` (mai antialiasing).
- **Maglietta standard bianca per tutti** (decisione definitiva: nessun colore club sul ritratto).
- *(Aggiornamento 2026-08-22, deciso dallo sviluppatore)*: la generazione automatica usa SOLO pelle e capigliatura maschile; le **barbe non vengono mai sorteggiate** e i **volti femminili sono accantonati** (asset estratti ma inutilizzati). Barbe, tono pelle, capigliatura e colore si personalizzano per singolo giocatore dall'**editor della figurina** (colonne `volto_*` della tabella giocatore: viaggiano col DB personalizzato), usando solo gli asset caricati.
- Coerenza con genere (set maschile/femminile) e **nazionalità** tramite stereotipi morbidi: tabelle di probabilità regionali, non mappature rigide (§6).
- Sfondo del ritratto: `--paper-2` di DESIGN.md (o trasparente, con lo sfondo dato dalla Figurina).

---

## 2. INVENTARIO E TASSONOMIA DELLE PARTI

Dallo sprite sheet sorgente (griglia di celle 48×48):

| Categoria | ID | Contenuto |
|---|---|---|
| Basi pelle | `skin_01`…`skin_08` | Teste calve complete di tratti (occhi, sopracciglia, naso, bocca): PALE, FAIR, LIGHT, TAN, MEDIUM, OLIVE, DARK, VERY_DARK |
| Capelli M | `hair_m_01`…`hair_m_24` | short spiky, buzz cut, pompadour, side part, mullet, afro, undercut ×2, long messy, crew cut, crewlocks, dreadlocks, bald, shaggy ×2, slick back, curly, caesar, mohawk ×2, ponytail, messy top, spiky ×2 |
| Capelli F | `hair_f_01`…`hair_f_12` | short bob, long straight, curly ponytail, pigtails, high bun, pixie cut, side braid, wavy, short curly, braided bun, medium wave, long |
| Barbe | `beard_01`…`beard_11` | full beard, stubble, goatee, mustache, handlebar, soul patch, chin strap, short full beard, long beard, mutton chops (+1) |
| Maglietta | `jersey_std` | Colletto/spalle di maglietta bianca standard (vedi §3.4) |

Struttura cartelle:
```
data/assets/faces/
├── source/          → sprite sheet originale + FONTI.md
├── parts/           → parti isolate PNG 48×48 trasparenti (output §3)
│   ├── skin/  ├── hair_m/  ├── hair_f/  ├── beard/  └── jersey/
├── manifest.json    → catalogo parti con metadati (§2.1)
└── regions.json     → tabelle pesi regionali (§6)
```

### 2.1 `manifest.json` (esempio di voce)
```json
{
  "id": "hair_m_06",
  "category": "hair_m",
  "label": "afro",
  "file": "parts/hair_m/hair_m_06.png",
  "recolorable": true,
  "tags": ["voluminoso"],
  "region_bias": ["africa_ovest", "africa_est", "caraibi"]
}
```
`region_bias` è opzionale: aumenta la probabilità della parte nelle regioni indicate (non la vincola).

---

## 3. PIPELINE DI PREPARAZIONE DELLE PARTI (una tantum)

> ⚠️ **Problema noto da risolvere:** nello sheet sorgente, acconciature e barbe sono disegnate SOPRA volti completi (pelle e occhi inclusi). Per il compositore servono parti ISOLATE su trasparente. Due strade, in ordine di preferenza:

### 3.1 Strada A (preferita): rigenerare le parti isolate
Lo sviluppatore rigenera con lo stesso tool AI **solo i layer capelli e barbe**, con prompt del tipo: *"same 8-bit style, 48x48 grid, HAIR ONLY layers on fully transparent background, no face, no head, no skin — hair shapes positioned as if worn on a 48x48 bald head placed identically to [reference], one hairstyle per cell"* (idem per le barbe). Le basi pelle del foglio attuale invece vanno già bene così (sono complete e calve).
Claude Code deve: preparare i prompt esatti insieme allo sviluppatore, incluse le immagini di riferimento per l'allineamento.

### 3.2 Strada B (fallback): estrazione automatica dallo sheet attuale
Se la rigenerazione non dà risultati allineati, Claude Code scrive uno script di estrazione che per ogni cella acconciatura/barba:
1. Ritaglia la cella 48×48.
2. Rimuove i pixel appartenenti alle **palette pelle** (le 8 tonalità note dalle basi + le loro ombreggiature) e ai tratti del viso (occhi/sopracciglia/bocca, identificabili per posizione e colore).
3. Conserva solo i pixel dei capelli/barba; pulizia manuale-assistita: lo script segnala le celle dubbie e genera la griglia di verifica visiva.
4. Verifica di allineamento: ogni parte estratta viene sovrapposta a TUTTE e 8 le basi pelle nella griglia HTML; lo sviluppatore approva o boccia cella per cella.
È lavoro certosino ma una tantum: le parti approvate finiscono in `parts/` e lo sheet non serve più a runtime.

### 3.3 Normalizzazione (entrambe le strade)
- Tutte le parti: PNG 48×48, trasparenza reale, nessun antialiasing (solo pixel pieni), allineate alla stessa griglia della testa base.
- Palette verificata: i colori di ogni parte devono appartenere a palette dichiarate (serve per il ricolore §4).

### 3.4 Maglietta standard
`jersey_std` la disegna Claude Code direttamente (è geometria semplice): spalle + colletto girocollo, bianco `#F2F2F2` con ombra `#C9C9C9` e contorno inchiostro, coerente con lo stile del foglio. Occupa la fascia inferiore del ritratto (~10–12px).

---

## 4. RICOLORE (moltiplicatore di varietà)

- Le parti `recolorable` (capelli e barbe) usano una **rampa neutra** di 3–4 toni. Lo script di preparazione rimappa i colori originali della parte sulla rampa neutra; a runtime la rampa viene sostituita con una delle **rampe colore** definite in `hair_colors.json`:
  `nero, castano scuro, castano, castano chiaro, biondo, biondo chiaro, rosso, grigio, bianco`.
- **La barba usa sempre la stessa rampa dei capelli** del giocatore (con possibile step "sale e pepe" per età, §5).
- Risultato: 24 acconciature × 9 colori = 216 varianti maschili di soli capelli, prima ancora di contare pelli e barbe.

---

## 5. MODELLO A STRATI E COMPOSIZIONE

Ordine di disegno (dal fondo):
```
1. sfondo (— o trasparente)
2. jersey_std
3. skin_XX        (testa completa di tratti)
4. beard_XX       (se presente, ricolorata)
5. hair_XX        (ricolorata; anche "bald" è una scelta valida = nessun layer)
```

Algoritmo deterministico:
```
rng = PRNG(seed = player.id)          // Mulberry32 o simile, MAI Math.random()
region = regione_da_nazionalita(player.nationality)   // §6
skin  = estrai_pesata(rng, regions[region].skin_weights)
hairColor = estrai_pesata(rng, regions[region].hair_color_weights)
set   = player.gender == 'F' ? hair_f : hair_m
hair  = estrai_pesata(rng, set, con region_bias dal manifest)
beard = player.gender == 'M' && rng.chance(regions[region].beard_prob)
        ? estrai(rng, beards) : null
if (player.age >= 33 && rng.chance((player.age - 32) * 0.06))
        hairColor = mixa_verso_grigio(hairColor)      // tocco di realismo
componi_e_cachea(seed → PNG/canvas)
```
- **Determinismo obbligatorio**: stesso `player.id` → stessi estratti, sempre. Test automatico dedicato.
- Cache: composizione a runtime su canvas con cache in memoria per id; opzionale pre-generazione batch dei PNG all'import del database.

---

## 6. TABELLE REGIONALI (`regions.json`)

Mappatura `nazionalità → regione` (file dati: ogni nazione del DB assegnata a una delle ~12 regioni) e per ogni regione i **pesi** (0–100, normalizzati dal codice). Valori di partenza — lo sviluppatore può ritoccarli liberamente dall'editor JSON:

| Regione | Pesi pelle (PALE→VERY_DARK) | Colori capelli prevalenti | beard_prob |
|---|---|---|---|
| `europa_nord` | 30·30·25·10·3·1·1·0 | biondo 30, b.chiaro 15, castani 40, rosso 8, nero 7 | 0.35 |
| `europa_ovest` | 15·25·30·15·8·4·2·1 | castani 55, nero 20, biondo 18, rosso 7 | 0.40 |
| `europa_sud` | 5·15·30·30·12·6·1·1 | nero 35, cast.scuro 35, castano 22, biondo 8 | 0.45 |
| `europa_est_balcani` | 15·25·30·18·7·3·1·1 | castani 50, nero 28, biondo 20, rosso 2 | 0.35 |
| `nordafrica_medioriente` | 1·4·12·25·30·20·6·2 | nero 70, cast.scuro 25, altri 5 | 0.55 |
| `africa_ovest_centro` | 0·0·1·3·8·20·38·30 | nero 92, cast.scuro 8 | 0.40 |
| `africa_est` | 0·0·1·4·12·28·35·20 | nero 90, cast.scuro 10 | 0.35 |
| `sudamerica` | 3·10·20·25·22·12·6·2 | nero 45, cast.scuro 30, castano 18, biondo 7 | 0.40 |
| `centroamerica_caraibi` | 1·4·10·18·25·22·13·7 | nero 60, cast.scuro 28, altri 12 | 0.35 |
| `nordamerica` | 10·18·22·18·13·9·6·4 | castani 45, nero 30, biondo 20, rosso 5 | 0.40 |
| `asia_est` | 8·20·35·25·9·2·1·0 | nero 88, cast.scuro 10, altri 2 | 0.15 |
| `asia_sud_oceania` | 2·6·15·25·28·15·6·3 | nero 80, cast.scuro 15, altri 5 | 0.35 |

Note:
- Sono **distribuzioni con varietà interna**, non maschere rigide: ogni regione può esprimere (quasi) tutto, con probabilità diverse. È voluto e più realistico.
- I giocatori con doppia nazionalità nel DB usano la nazionalità sportiva.
- `region_bias` del manifest (§2.1) moltiplica ×3 il peso delle acconciature indicate nella regione corrispondente.

---

## 7. INTEGRAZIONE NELLA FIGURINA

- Il componente Figurina (DESIGN.md §4.2) usa il ritratto composto al posto dell'avatar precedente; formato mini (24×24, downscale nearest-neighbor o composizione dedicata) per tattica/mercato/elenchi.
- Il ritratto NON cambia mai durante la carriera (niente invecchiamento visivo in v1 — annotare in `IDEE-FUTURE.md`).
- Editor database: pulsante "rigenera volto" che assegna un nuovo seed estetico (`face_seed` separato da `player.id`, default = id) per i casi in cui un volto non piace.

---

## 8. VERIFICA E DEFINITION OF DONE

1. **Griglia di collaudo**: pagina interna `/dev/faces` che mostra 100 volti casuali per ciascuna regione + 50 femminili; lo sviluppatore la scorre e approva.
2. **Test di determinismo**: generare 2 volte gli stessi 1.000 seed → immagini byte-identiche.
3. **Test di allineamento**: nessuna acconciatura/barba fuori registro su nessuna base pelle (verifica visiva della matrice parti×pelli).
4. **Test regionale a campione**: le rose di Norvegia, Nigeria, Giappone, Brasile e Italia devono "sembrare giuste" a colpo d'occhio, con varietà interna visibile.
5. Volti mini leggibili nelle schermate dense (tattica, elenchi).

**DoD finale:** lo sviluppatore apre la rosa di 3 squadre di nazioni diverse e riconosce il colpo d'occhio da figurine anni '90: volti tutti diversi, credibili per la nazione, maglietta bianca uniforme, zero glitch di allineamento.
