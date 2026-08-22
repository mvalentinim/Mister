# componi-volto.py — il COMPOSITORE DEI VOLTI (VOLTI-MISTER.md §5).
#
# Prototipo di riferimento in Python: la stessa logica verrà portata nel
# gioco (TypeScript). Per garantire che il porting dia GLI STESSI volti,
# il generatore casuale qui è la copia esatta di src/motore/rng.ts
# (xmur3 + mulberry32, aritmetica a 32 bit): stesso seed → stessi estratti
# in tutte e due le lingue.
#
# Strati (dal fondo): maglietta bianca standard → base pelle → barba →
# capelli (ricolorati con le rampe di regions.json). Deterministico:
# seed = id del giocatore. Pesi regionali dalla nazionalità (§6).

import json
from pathlib import Path

import numpy as np
from PIL import Image

QUI = Path(__file__).parent
CELLA = 48
REGIONS = json.load(open(QUI / 'regions.json'))
MANIFEST = json.load(open(QUI / 'manifest.json'))

RAMPA_NEUTRA = [0x2E, 0x4A, 0x6E, 0x92]  # riconosciuta dal canale rosso
# il foglio delle barbe assumeva una testa con la bocca più in alto delle
# basi riscalate: le barbe scendono di questi pixel alla composizione
SCOSTAMENTO_BARBA = 4

# ── il generatore casuale: COPIA ESATTA di src/motore/rng.ts ──────────

def _imul(a: int, b: int) -> int:
    """Math.imul di JavaScript: moltiplicazione a 32 bit con segno."""
    r = (a & 0xFFFFFFFF) * (b & 0xFFFFFFFF) & 0xFFFFFFFF
    return r - 0x100000000 if r >= 0x80000000 else r


def seme_da_stringa(testo: str) -> int:
    h = 1779033703 ^ len(testo)
    for carattere in testo:
        h = _imul(h ^ ord(carattere), 3432918353)
        h = ((h << 13) | ((h & 0xFFFFFFFF) >> 19)) & 0xFFFFFFFF
        h = h - 0x100000000 if h >= 0x80000000 else h
    h = _imul(h ^ ((h & 0xFFFFFFFF) >> 16), 2246822507)
    h = _imul(h ^ ((h & 0xFFFFFFFF) >> 13), 3266489909)
    h = h ^ ((h & 0xFFFFFFFF) >> 16)
    return h & 0xFFFFFFFF


class Rng:
    def __init__(self, seme: int):
        self.stato = seme & 0xFFFFFFFF

    def numero(self) -> float:
        self.stato = (self.stato + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.stato
        t = _imul(t ^ ((t & 0xFFFFFFFF) >> 15), t | 1) & 0xFFFFFFFF
        t ^= (t + _imul(t ^ ((t & 0xFFFFFFFF) >> 7), t | 61)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    def intero(self, massimo: int) -> int:
        return int(self.numero() * massimo)

    def evento(self, probabilita: float) -> bool:
        return self.numero() < probabilita

    def pesato(self, elementi, pesi):
        totale = sum(pesi)
        soglia = self.numero() * totale
        for elemento, peso in zip(elementi, pesi):
            soglia -= peso
            if soglia <= 0:
                return elemento
        return elementi[-1]


# ── le parti, caricate una volta ──────────────────────────────────────

def _carica(percorso: Path) -> np.ndarray:
    return np.asarray(Image.open(percorso).convert('RGBA')).copy()


PELLI = [_carica(QUI / f'parts/skin/skin_{i:02d}.png') for i in range(1, 9)]
CAPELLI_M = {v['id']: (_carica(QUI / v['file']) if v['file'] else None)
             for v in MANIFEST['parti'] if v['category'] == 'hair_m'}
CAPELLI_F = {v['id']: _carica(QUI / v['file']) for v in MANIFEST['parti'] if v['category'] == 'hair_f'}
BARBE = {v['id']: _carica(QUI / v['file']) for v in MANIFEST['parti'] if v['category'] == 'beard'}
BIAS = {v['id']: v.get('region_bias', []) for v in MANIFEST['parti']}

# la maglietta bianca standard (§3.4): geometria, disegnata qui
MAGLIETTA = np.zeros((CELLA, CELLA, 4), np.uint8)
for y in range(38, CELLA):
    mezza = 11 + round((y - 38) * 1.3)  # le spalle si allargano scendendo
    for x in range(CELLA):
        dentro = abs(x - 23.5) <= mezza
        # il colletto girocollo: una conca ellittica attorno al collo
        conca = ((x - 23.5) / 7.5) ** 2 + ((y - 37) / 4.5) ** 2 < 1
        if dentro and not conca:
            MAGLIETTA[y, x] = (242, 242, 242, 255)
# l'ombra sotto il colletto e il bordo inchiostro tutto attorno
for y in range(38, CELLA):
    riga = np.where(MAGLIETTA[y, :, 3] > 0)[0]
    if not len(riga):
        continue
    MAGLIETTA[y, riga.min()] = (26, 26, 26, 255)
    MAGLIETTA[y, riga.max()] = (26, 26, 26, 255)
for x in range(CELLA):
    colonna = np.where(MAGLIETTA[:, x, 3] > 0)[0]
    if len(colonna):
        y0 = colonna.min()
        MAGLIETTA[y0, x] = (26, 26, 26, 255)
        if y0 + 1 < CELLA and MAGLIETTA[y0 + 1, x, 3] > 0:
            MAGLIETTA[y0 + 1, x] = (201, 201, 201, 255)  # l'ombra del bordo

def _ricolora(parte: np.ndarray, rampa: list[str]) -> np.ndarray:
    """Sostituisce i 4 grigi neutri coi 4 toni della rampa (scuro→chiaro)."""
    esito = parte.copy()
    colori = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in rampa]
    for neutro, nuovo in zip(RAMPA_NEUTRA, colori):
        maschera = (esito[..., 3] > 0) & (np.abs(esito[..., 0].astype(int) - neutro) <= 14) \
                   & (np.abs(esito[..., 1].astype(int) - neutro) <= 14)
        esito[maschera, 0], esito[maschera, 1], esito[maschera, 2] = nuovo
    return esito


def _sovrapponi(tela: np.ndarray, strato: np.ndarray) -> None:
    sopra = strato[..., 3] > 0
    tela[sopra] = strato[sopra]


def componi(giocatore_id: int, nazionalita: str, eta: int = 25,
            genere: str = 'M') -> np.ndarray:
    """Il volto 48×48 (RGBA) di un giocatore: deterministico dall'id."""
    rng = Rng(seme_da_stringa(f'volto-{giocatore_id}'))
    regione_nome = REGIONS['nazioni'].get(nazionalita, REGIONS['regione_predefinita'])
    regione = REGIONS['regioni'][regione_nome]

    # 1. pelle e colore capelli, pesati per regione (§6)
    pelle = rng.pesato(list(range(8)), regione['skin_weights'])
    nomi_colore = list(regione['hair_color_weights'].keys())
    colore = rng.pesato(nomi_colore, list(regione['hair_color_weights'].values()))

    # 2. acconciatura (col region_bias ×3 del manifest)
    serie = CAPELLI_F if genere == 'F' else CAPELLI_M
    ids = list(serie.keys())
    PESO = {v['id']: v.get('peso', 1.0) for v in MANIFEST['parti']}
    pesi = [(3.0 if regione_nome in BIAS.get(i, []) else 1.0) * PESO.get(i, 1.0) for i in ids]
    capelli_id = rng.pesato(ids, pesi)

    # 3. barba (solo M, con la probabilità regionale)
    barba_id = None
    if genere == 'M' and rng.evento(regione['beard_prob']):
        barba_id = list(BARBE.keys())[rng.intero(len(BARBE))]

    # 4. la brizzolatura dell'età (§5)
    if eta >= 33 and rng.evento((eta - 32) * 0.06):
        colore = 'grigio'

    rampa = REGIONS['rampe_capelli'][colore]

    # 5. composizione a strati
    tela = np.zeros((CELLA, CELLA, 4), np.uint8)
    _sovrapponi(tela, PELLI[pelle])
    _sovrapponi(tela, MAGLIETTA)
    if barba_id:
        barba = _ricolora(BARBE[barba_id], rampa)
        barba = np.roll(barba, SCOSTAMENTO_BARBA, axis=0)
        barba[:SCOSTAMENTO_BARBA] = 0  # niente risalita dal fondo
        _sovrapponi(tela, barba)
    parte_capelli = serie[capelli_id]
    if parte_capelli is not None:  # "bald" = nessun layer
        _sovrapponi(tela, _ricolora(parte_capelli, rampa))
    return tela


if __name__ == '__main__':
    # prova rapida: un volto qualsiasi
    Image.fromarray(componi(12345, 'Italy', 28)).save('/tmp/volto-prova.png')
    print('volto di prova scritto in /tmp/volto-prova.png')
