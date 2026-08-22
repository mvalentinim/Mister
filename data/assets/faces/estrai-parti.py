# estrai-parti.py — ESTRAZIONE delle parti dai fogli a colori-chiave
# (VOLTI-MISTER.md §3.2-3.3, adattata alla pipeline v2 dei prompt).
#
# I fogli generati con i prompt v2 hanno: sfondo MAGENTA (#FF00FF),
# testa segnaposto CIANO (#00FFFF, col suo contorno scuro indesiderato)
# e capelli/barbe in rampa di grigi. Questo script, per ogni cella:
#   1. ritaglia la cella e la riporta a 48×48 (media d'area);
#   2. classifica i pixel: magenta → trasparente, ciano → trasparente;
#   3. elimina il CONTORNO della testa (pixel scuri stretti tra il ciano
#      e il magenta: dove ci sono i capelli il contorno non confina col
#      magenta, quindi resta — ed è coperto dai capelli, va bene così);
#   4. riaggancia i grigi alla RAMPA NEUTRA a 4 toni del ricolore (§4);
#   5. salva il PNG trasparente in parts/<categoria>/.
# In più salva la SILHOUETTE della testa (dalla cella "calvo") che serve
# alla griglia di verifica visiva.
#
# Uso:  python3 estrai-parti.py capelli-m
#       (legge source/capelli-m-v2.jpg|png, scrive parts/hair_m/)

import sys
from pathlib import Path

import numpy as np
from PIL import Image

QUI = Path(__file__).parent
CELLA = 48

# la rampa neutra del ricolore (VOLTI-MISTER.md §4 / PROMPTS.md)
RAMPA = np.array([[0x2E, 0x2E, 0x2E], [0x4A, 0x4A, 0x4A], [0x6E, 0x6E, 0x6E], [0x92, 0x92, 0x92]])

FOGLI = {
    'capelli-m': dict(file='capelli-m-v2', griglia=(6, 4), cartella='hair_m', prefisso='hair_m',
                      vuote=[13], salva_testa=13),
    'capelli-f': dict(file='capelli-f-v2', griglia=(4, 3), cartella='hair_f', prefisso='hair_f',
                      vuote=[], salva_testa=None),
    'barbe': dict(file='barbe-v2', griglia=(4, 3), cartella='beard', prefisso='beard',
                  vuote=[12], salva_testa=None, pulizia=False),
}


def maschere(px: np.ndarray):
    """Riconosce magenta e ciano per TINTA, a qualunque luminosità:
    i JPEG e il ridimensionamento scuriscono i bordi (es. 133,12,131 è
    ancora magenta), ma capelli e contorni restano grigi neutri."""
    r, g, b = px[..., 0].astype(int), px[..., 1].astype(int), px[..., 2].astype(int)
    magenta = (r - g > 45) & (b - g > 45)
    ciano = (g - r > 45) & (b - r > 45)
    return magenta, ciano


def dilata(maschera: np.ndarray, passi: int) -> np.ndarray:
    """Allarga una maschera di N pixel (senza scipy: shift e OR)."""
    esito = maschera.copy()
    for _ in range(passi):
        m = esito
        esito = m.copy()
        esito[1:, :] |= m[:-1, :]
        esito[:-1, :] |= m[1:, :]
        esito[:, 1:] |= m[:, :-1]
        esito[:, :-1] |= m[:, 1:]
    return esito


def estrai(nome: str) -> None:
    cfg = FOGLI[nome]
    sorgente = next(
        p for est in ('png', 'jpg', 'jpeg')
        if (p := QUI / 'source' / f"{cfg['file']}.{est}").exists()
    )
    foglio = Image.open(sorgente).convert('RGB')
    colonne, righe = cfg['griglia']
    destinazione = QUI / 'parts' / cfg['cartella']
    destinazione.mkdir(parents=True, exist_ok=True)

    lw, lh = foglio.width / colonne, foglio.height / righe
    fattore = max(1, round(lw / CELLA))  # quanti pixel veri per pixel d'arte
    numero = 0
    for riga in range(righe):
        for colonna in range(colonne):
            numero += 1
            # 1. la cella ALLA RISOLUZIONE NATIVA: l'estrazione avviene qui,
            #    dove treccine e ciuffi sottili sono ancora grigi puri
            #    (ridimensionare prima mescolerebbe capelli e colori-chiave)
            cella = foglio.crop((round(colonna * lw), round(riga * lh),
                                 round((colonna + 1) * lw), round((riga + 1) * lh)))
            nativo = np.asarray(cella).copy()

            # 2. le maschere dei colori-chiave (a risoluzione nativa)
            magenta, ciano = maschere(nativo)

            # 3. il contorno della testa: pixel NON chiave, stretti tra il
            #    ciano e il magenta (la cornice tra testa e sfondo)
            passi = 2 * fattore
            vicinoTestaN = dilata(ciano, passi)
            contorno = (~magenta) & (~ciano) & vicinoTestaN & dilata(magenta, passi)
            capelliN = (~magenta) & (~ciano) & (~contorno)

            # 3-ter. riduzione a 48×48: alfa e colore premoltiplicato con
            #        media d'area, poi soglia sull'alfa
            alfaN = np.where(capelliN, 255, 0).astype(np.uint8)
            alfa48 = np.asarray(Image.fromarray(alfaN).resize((CELLA, CELLA), Image.BOX)).astype(int)
            px = np.zeros((CELLA, CELLA, 3), int)
            for c in range(3):
                premolt = (nativo[..., c].astype(int) * alfaN // 255).astype(np.uint8)
                canale = np.asarray(Image.fromarray(premolt).resize((CELLA, CELLA), Image.BOX)).astype(int)
                px[..., c] = np.where(alfa48 > 0, canale * 255 // np.maximum(alfa48, 1), 0)
            trasparente = alfa48 < 110
            # la maschera "vicino alla testa" ridotta anch'essa a 48
            vicinoTesta = np.asarray(
                Image.fromarray(np.where(vicinoTestaN, 255, 0).astype(np.uint8))
                .resize((CELLA, CELLA), Image.BOX)) > 100

            if cfg['salva_testa'] == numero:
                # la silhouette della testa per la griglia di verifica
                ciano48 = np.asarray(
                    Image.fromarray(np.where(ciano, 255, 0).astype(np.uint8))
                    .resize((CELLA, CELLA), Image.BOX)) > 127
                testa = np.zeros((CELLA, CELLA, 4), np.uint8)
                testa[ciano48] = [224, 162, 109, 255]  # una pelle qualsiasi
                Image.fromarray(testa).save(QUI / 'parts' / 'testa-riferimento.png')

            if numero in cfg['vuote']:
                continue  # la cella "calvo"/vuota non produce una parte

            # 3-bis. via i FRAMMENTI minuscoli (residui del contorno):
            #        componenti connesse sotto i 5 pixel
            capelli = ~trasparente
            visitati = np.zeros_like(capelli)
            for y0 in range(CELLA):
                for x0 in range(CELLA):
                    if capelli[y0, x0] and not visitati[y0, x0]:
                        pila, gruppo = [(y0, x0)], []
                        visitati[y0, x0] = True
                        while pila:
                            y, x = pila.pop()
                            gruppo.append((y, x))
                            for dy in (-1, 0, 1):
                                for dx in (-1, 0, 1):
                                    ny, nx = y + dy, x + dx
                                    if 0 <= ny < CELLA and 0 <= nx < CELLA \
                                       and capelli[ny, nx] and not visitati[ny, nx]:
                                        visitati[ny, nx] = True
                                        pila.append((ny, nx))
                        # via se: minuscolo, oppure piccolo e INCOLLATO al
                        # bordo della testa (è contorno residuo, non ciocca:
                        # le ciocche vere sporgono oltre i 2px dal ciano).
                        # Le BARBE sono per natura piccole e incollate al
                        # viso: per loro la pulizia è spenta (pulizia=False).
                        if not cfg.get('pulizia', True):
                            continue
                        incollato = all(vicinoTesta[y, x] for y, x in gruppo)
                        if len(gruppo) < 5 or (len(gruppo) < 25 and incollato):
                            for y, x in gruppo:
                                trasparente[y, x] = True

            # 4. i grigi restanti si agganciano alla rampa neutra
            capelli = ~trasparente
            if capelli.sum() < 10:
                print(f'  ⚠ cella {numero}: quasi vuota ({int(capelli.sum())} px) — da controllare')
            colori = px[capelli].astype(int)
            distanze = ((colori[:, None, :] - RAMPA[None, :, :]) ** 2).sum(axis=2)
            px[capelli] = RAMPA[distanze.argmin(axis=1)]

            # 5. il PNG trasparente della parte
            esito = np.dstack([px.astype(np.uint8), np.where(trasparente, 0, 255).astype(np.uint8)])
            nome_file = f"{cfg['prefisso']}_{numero:02d}.png"
            Image.fromarray(esito).save(destinazione / nome_file)
    print(f'{nome}: estratte le parti in {destinazione}')


if __name__ == '__main__':
    estrai(sys.argv[1] if len(sys.argv) > 1 else 'capelli-m')
