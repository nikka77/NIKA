#!/usr/bin/env python3
# scripts/build-akasha-arcade.py
# ARCADE rétro 2D — v2 : à partir d'une STRIP de 4 poses (généré en une seule image Higgsfield,
# donc perso parfaitement cohérent : garde → charge → tir → contre-coup), produit :
#   • <id>.webp        : animation bouclée (vraies poses d'attaque, timing punchy) pour la carte
#   • <id>-sheet.png   : sprite-sheet normalisée (4 frames carrées) prête pour un mini-jeu
# Le fond plat est détouré (color-key des coins). Scanlines/CRT ajoutés en CSS (sprites purs).
#
# Source attendue : public/images/akasha/arcade/naruto/src/<id>-strip.png  (4 cases en ligne)
# Run : python3 scripts/build-akasha-arcade.py
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'public', 'images', 'akasha', 'arcade', 'naruto')
SRC = os.path.join(BASE, 'src')
TILE = 256
NFRAMES = 4
# timing par frame (ms) : garde tenue (respiration/reset pour une boucle propre), charge
# rapide, GROS temps sur le tir, contre-coup.
DUR = [460, 150, 430, 240]
MOVES = ['rasengan', 'rasenshuriken', 'multiclonage', 'bijudama']


# Ancrage : les pieds sont plantés à ce point sur chaque tuile (X décalé à gauche pour
# laisser la place à l'attaque qui part vers la droite ; base un peu au-dessus du bas).
ANCHOR_X = 0.40
ANCHOR_Y = 0.94
FIT_H = 0.86  # le perso occupe ~86% de la hauteur de tuile


def keybg(im):
    """Détoure le fond plat : color-key sur la couleur moyenne des coins."""
    px = im.load()
    w, h = im.size
    cor = [im.getpixel((1, 1)), im.getpixel((w - 2, 1)), im.getpixel((1, h - 2)), im.getpixel((w - 2, h - 2))]
    cor = [c for c in cor if c[3] > 0] or [(58, 67, 88, 255)]
    cr = sum(c[0] for c in cor) // len(cor)
    cg = sum(c[1] for c in cor) // len(cor)
    cb = sum(c[2] for c in cor) // len(cor)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and abs(r - cr) + abs(g - cg) + abs(b - cb) < 60:
                px[x, y] = (r, g, b, 0)
    return im


def feet(cell):
    """(centre X des pieds, base Y) à partir des 8% inférieurs du contenu détouré."""
    bb = cell.getbbox()
    if not bb:
        return cell.width // 2, cell.height - 1, 0
    l, t, r, b = bb
    px = cell.load()
    xs = [x for y in range(max(t, b - max(4, int((b - t) * 0.08))), b) for x in range(l, r) if px[x, y][3] > 0]
    fc = (min(xs) + max(xs)) // 2 if xs else (l + r) // 2
    return fc, b, (b - t)


def slice_strip(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    fw = w // NFRAMES
    cells = [keybg(im.crop((i * fw, 0, (i + 1) * fw, h))) for i in range(NFRAMES)]
    meta = [feet(c) for c in cells]
    maxh = max((m[2] for m in meta), default=h) or h
    s = (TILE * FIT_H) / maxh                          # échelle UNIFORME → tailles cohérentes
    ax, ay = round(TILE * ANCHOR_X), round(TILE * ANCHOR_Y)
    frames = []
    for cell, (fc, fb, _) in zip(cells, meta):
        sc = cell.resize((max(1, round(cell.width * s)), max(1, round(cell.height * s))), Image.NEAREST)
        tile = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        tile.alpha_composite(sc, (ax - round(fc * s), ay - round(fb * s)))  # pieds plantés à (ax, ay)
        frames.append(tile)
    return frames


def main():
    done = []
    for mid in MOVES:
        src = os.path.join(SRC, f'{mid}-strip.png')
        if not os.path.exists(src):
            print(f'  ✗ {mid:14s} strip manquante ({src})')
            continue
        frames = slice_strip(src)
        frames[0].save(os.path.join(BASE, f'{mid}.webp'), save_all=True, append_images=frames[1:],
                       duration=DUR[:len(frames)], loop=0, disposal=2)
        sheet = Image.new('RGBA', (TILE * len(frames), TILE), (0, 0, 0, 0))
        for i, fr in enumerate(frames):
            sheet.paste(fr, (i * TILE, 0))
        sheet.save(os.path.join(BASE, f'{mid}-sheet.png'))
        kb = os.path.getsize(os.path.join(BASE, f'{mid}.webp')) // 1024
        done.append(mid)
        print(f'  ✓ {mid:14s} {len(frames)} poses · {kb}Ko webp · sheet {TILE * len(frames)}x{TILE}')
    print(f'\n{len(done)} techniques → {BASE}')


if __name__ == '__main__':
    main()
