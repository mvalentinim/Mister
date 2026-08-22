# PROMPTS.md — Prompt per la rigenerazione degli asset (VOLTI-MISTER.md §3.1)

> **VERSIONE 2 (2026-08-22)** — la v1 ha prodotto: scacchiera di trasparenza
> DISEGNATA (niente alfa vero), teste incluse coi capelli, teste non
> identiche tra le celle, scritta "EMPTY" nella cella vuota. La v2 usa il
> trucco dei COLORI-CHIAVE: sfondo magenta puro #FF00FF, testa segnaposto
> ciano puro #00FFFF senza contorno, capelli in rampa di grigi. Lo script
> di estrazione (§3.2) elimina magenta e ciano al pixel e ricava i layer
> isolati, usando la testa ciano anche per la verifica di allineamento.

Prompt pronti da incollare in **Gemini (Nano Banana)** per generare i layer
ISOLATI di capelli e barbe. Le basi pelle del foglio attuale vanno già bene
(sono complete e calve): NON vanno rigenerate.

## Cosa allegare a ogni prompt (fondamentale per l'allineamento)

1. **Lo sprite sheet originale** (quello con i volti completi): dà lo stile.
2. **Il ritaglio di UNA base pelle calva** (una cella 48×48, meglio se
   ingrandita 4×–8× senza sfocatura): dà la posizione esatta della testa.
   È il "manichino" su cui i capelli devono calzare.

Senza il riferimento della testa calva l'allineamento verrà quasi
certamente sbagliato: allegarlo SEMPRE.

## Regole comuni (già dentro i prompt)

- Celle 48×48 in griglia rigida, niente linee di griglia né scritte.
- **Colori-chiave** (v2): sfondo magenta puro `#FF00FF`, testa segnaposto
  ciano puro `#00FFFF` senza contorno né tratti — l'estrazione li elimina
  al pixel; la trasparenza NON va chiesta (i modelli la disegnano finta).
- Capelli/barba SOPRA la testa ciano, identica in ogni cella.
- Pixel art netta: nessun antialiasing, nessuna sfumatura morbida, nessuna ombra.
- **Rampa neutra a 4 grigi** (`#2E2E2E · #4A4A4A · #6E6E6E · #929292`):
  serve al ricolore di runtime (§4) — MAI colori veri di capelli.

## Dopo la generazione

Portare i PNG in `data/assets/faces/source/` e avvisare Claude Code:
partirà la normalizzazione (§3.3) con la griglia di verifica visiva
parte×pelle da approvare cella per cella. Se qualche cella è storta,
usare il "prompt di correzione" in fondo rigenerando solo quella.

---

## PROMPT 1 — Acconciature MASCHILI (24 celle, griglia 6×4)

```
You are generating a pixel-art sprite sheet asset for a retro football
management game. Use the two attached images as strict references: the
sprite sheet defines the art style; the single bald head cell defines the
EXACT head position, scale and proportions inside a 48x48 cell.

TASK: draw each hairstyle as if worn by the SAME identical placeholder
head, one per cell.

CHROMA-KEY RULES (critical — this replaces transparency):
- Background: fill the ENTIRE background with pure flat magenta #FF00FF.
  No transparency, no checkerboard pattern, no gradients.
- Placeholder head: draw the SAME bald head silhouette in every cell,
  filled with pure flat cyan #00FFFF, NO outline, NO shading, NO facial
  features — identical shape, size and position, copied from the
  attached bald reference.
- Hair: drawn ON TOP of the cyan head, gray ramp only.
- Exactly three color families: magenta background, cyan heads, gray
  hair. No text, no labels, no watermark, no grid lines.

FORMAT:
- One strict 6-column x 4-row grid of identical 48x48 pixel cells
  (total canvas exactly 288x192 pixels). No visible grid lines, no
  labels, no watermark.
- Crisp 1:1 pixel art, hard pixel edges only: no anti-aliasing, no
  gradients, no soft shadows.
- COLOR: use ONLY this neutral 4-tone gray ramp, flat fills:
  #2E2E2E (darkest / line accents), #4A4A4A (dark), #6E6E6E (mid),
  #929292 (light highlight). No other colors. The game recolors these
  ramps at runtime.

CONTENT — exactly one hairstyle per cell, row-major order:
1 short spiky · 2 buzz cut (very short, hugs the skull) · 3 pompadour ·
4 side part · 5 mullet · 6 afro (large and round) · 7 undercut variant A ·
8 undercut variant B · 9 long messy · 10 crew cut · 11 cornrows (braided
rows on the scalp) · 12 dreadlocks (shoulder length) · 13 cell with ONLY the cyan
placeholder head, no hair at all (this is the "bald" option) · 14 shaggy variant A ·
15 shaggy variant B · 16 slick back · 17 curly (tight curls, medium
volume) · 18 caesar (short straight fringe) · 19 mohawk variant A ·
20 mohawk variant B · 21 ponytail (tied back, tail visible at one side) ·
22 messy top (short sides, messy volume on top) · 23 spiky variant A ·
24 spiky variant B.

Every hairstyle must read clearly at 48x48 and stay inside its own cell.
```

## PROMPT 2 — Acconciature FEMMINILI (12 celle, griglia 4×3)

```
You are generating a pixel-art sprite sheet asset for a retro football
management game. Use the two attached images as strict references: the
sprite sheet defines the art style; the single bald head cell defines the
EXACT head position, scale and proportions inside a 48x48 cell.

TASK: draw each hairstyle as if worn by the SAME identical placeholder
head, one per cell.

CHROMA-KEY RULES (critical — this replaces transparency):
- Background: fill the ENTIRE background with pure flat magenta #FF00FF.
  No transparency, no checkerboard pattern, no gradients.
- Placeholder head: draw the SAME bald head silhouette in every cell,
  filled with pure flat cyan #00FFFF, NO outline, NO shading, NO facial
  features — identical shape, size and position, copied from the
  attached bald reference.
- Hair: drawn ON TOP of the cyan head, gray ramp only.
- Exactly three color families: magenta background, cyan heads, gray
  hair. No text, no labels, no watermark, no grid lines.

FORMAT:
- One strict 4-column x 3-row grid of identical 48x48 pixel cells
  (total canvas exactly 192x144 pixels). No visible grid lines, no
  labels, no watermark.
- Crisp 1:1 pixel art, hard pixel edges only: no anti-aliasing, no
  gradients, no soft shadows.
- COLOR: use ONLY this neutral 4-tone gray ramp, flat fills:
  #2E2E2E, #4A4A4A, #6E6E6E, #929292. No other colors (runtime recolor).

CONTENT — exactly one hairstyle per cell, row-major order:
1 short bob · 2 long straight · 3 curly ponytail · 4 pigtails ·
5 high bun · 6 pixie cut · 7 side braid · 8 wavy shoulder-length ·
9 short curly · 10 braided bun · 11 medium wave · 12 long (waist length,
kept inside the cell).

Every hairstyle must read clearly at 48x48 and stay inside its own cell.
```

## PROMPT 3 — BARBE (12 celle, griglia 4×3, l'ultima vuota)

```
You are generating a pixel-art sprite sheet asset for a retro football
management game. Use the two attached images as strict references: the
sprite sheet defines the art style; the single bald head cell defines the
EXACT head position, scale and proportions inside a 48x48 cell.

TASK: draw each beard/mustache as if worn by the SAME identical
placeholder head, one per cell.

CHROMA-KEY RULES (critical — this replaces transparency):
- Background: pure flat magenta #FF00FF everywhere. No transparency,
  no checkerboard, no gradients.
- Placeholder head: the SAME bald head silhouette in every cell, pure
  flat cyan #00FFFF, NO outline, NO shading, NO facial features,
  copied from the attached bald reference (same jaw position).
- Facial hair: drawn ON TOP of the cyan head, gray ramp only.
- Exactly three color families: magenta, cyan, grays. No text, no
  labels, no watermark, no grid lines.

FORMAT:
- One strict 4-column x 3-row grid of identical 48x48 pixel cells
  (total canvas exactly 192x144 pixels). No visible grid lines, no
  labels, no watermark.
- Crisp 1:1 pixel art, hard pixel edges only: no anti-aliasing, no
  gradients, no soft shadows.
- COLOR: use ONLY this neutral 4-tone gray ramp, flat fills:
  #2E2E2E, #4A4A4A, #6E6E6E, #929292. No other colors (runtime recolor).

CONTENT — exactly one style per cell, row-major order:
1 full beard · 2 stubble (sparse pixels along the jaw) · 3 goatee ·
4 mustache · 5 handlebar mustache · 6 soul patch · 7 chin strap ·
8 short full beard · 9 long beard · 10 mutton chops ·
11 circle beard (goatee + mustache connected) · 12 cell with ONLY the
cyan placeholder head, no facial hair at all.

Every style must read clearly at 48x48 and stay inside its own cell.
```

## PROMPT DI CORREZIONE (per rigenerare una sola cella storta)

```
Using the same references and the sprite sheet you just generated, redraw
ONLY cell N ("style name") as a single 48x48 transparent PNG. Keep the
exact same art style, the same neutral gray ramp (#2E2E2E, #4A4A4A,
#6E6E6E, #929292) and the same head alignment as the attached bald
reference cell. Fix: [descrivere qui il difetto: es. "the hair floats 3px
too high", "it covers the eyes", "it spills outside the cell"].
```
