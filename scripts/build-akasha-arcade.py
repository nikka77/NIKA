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
# timing par frame (ms) : garde courte, charge, GROS temps sur le tir, contre-coup
DUR = [220, 170, 380, 260]
MOVES = ['rasengan', 'rasenshuriken', 'multiclonage', 'bijudama']


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


def slice_strip(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    fw = w // NFRAMES
    frames = []
    for i in range(NFRAMES):
        cell = im.crop((i * fw, 0, (i + 1) * fw, h))
        # contain dans une tuile carrée (échelle uniforme → mouvement préservé entre frames)
        s = min(TILE / cell.width, TILE / cell.height)
        cell = cell.resize((max(1, round(cell.width * s)), max(1, round(cell.height * s))), Image.NEAREST)
        tile = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        tile.alpha_composite(cell, ((TILE - cell.width) // 2, (TILE - cell.height) // 2))
        frames.append(keybg(tile))
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
