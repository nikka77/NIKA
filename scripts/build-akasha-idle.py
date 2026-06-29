#!/usr/bin/env python3
# scripts/build-akasha-idle.py
# Sprites IDLE des 10 modes de Naruto (plein-corps, profil droit) → animation « repos »
# (léger balancement + pulsation d'aura pour les modes à chakra) = frame de base quand
# aucune touche n'est pressée (databook / futur jeu).
#   • idle/<slug>.webp       : boucle idle fluide (cadre databook)
#   • idle/<slug>-sheet.png  : sprite-sheet (frames) prête pour un moteur 2D
# Source : public/images/akasha/naruto/idle/src/<slug>.png
import os, math
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'public', 'images', 'akasha', 'naruto', 'idle')
SRC = os.path.join(BASE, 'src')
TILE = 240
N = 10
DUR = 110
FIT_H = 0.92
AURA = {'1-queue', 'version-2', 'chakra-kurama', 'biju-mode', 'six-chemins', 'mode-baryon'}
MODES = ['partie-i', '1-queue', 'version-2', 'partie-ii', 'mode-ermite',
         'chakra-kurama', 'biju-mode', 'six-chemins', 'hokage', 'mode-baryon']


def keybg(im, thr=64):
    im = im.convert('RGBA'); px = im.load(); w, h = im.size
    cor = [im.getpixel((1, 1)), im.getpixel((w - 2, 1)), im.getpixel((1, h - 2)), im.getpixel((w - 2, h - 2))]
    cr = sum(c[0] for c in cor) // 4; cg = sum(c[1] for c in cor) // 4; cb = sum(c[2] for c in cor) // 4
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and abs(r - cr) + abs(g - cg) + abs(b - cb) < thr:
                px[x, y] = (r, g, b, 0)
    return im


def base_tile(path):
    im = keybg(Image.open(path))
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    s = (TILE * FIT_H) / im.height
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.NEAREST)
    tile = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    tile.alpha_composite(im, ((TILE - im.width) // 2, round(TILE * 0.97) - im.height))
    return tile


def glow(im, k):
    g = im.copy(); px = g.load()
    for y in range(TILE):
        for x in range(TILE):
            r, gr, b, a = px[x, y]
            if a and 0.299 * r + 0.587 * gr + 0.114 * b > 165:
                px[x, y] = (min(255, int(r * k)), min(255, int(gr * k)), min(255, int(b * k)), a)
    return g


def main():
    done = []
    for slug in MODES:
        src = os.path.join(SRC, f'{slug}.png')
        if not os.path.exists(src):
            print(f'  ✗ {slug:14s} source manquante'); continue
        base = base_tile(src)
        aura = slug in AURA
        frames = []
        for i in range(N):
            t = i / N; ang = 2 * math.pi * t
            dy = round(2.5 * math.sin(ang))                    # balancement vertical doux
            fr = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
            layer = glow(base, 1 + 0.30 * (0.5 + 0.5 * math.sin(ang))) if aura else base
            fr.alpha_composite(layer, (0, dy))
            frames.append(fr)
        frames[0].save(os.path.join(BASE, f'{slug}.webp'), save_all=True, append_images=frames[1:], duration=DUR, loop=0, disposal=2)
        sheet = Image.new('RGBA', (TILE * N, TILE), (0, 0, 0, 0))
        for i, fr in enumerate(frames):
            sheet.paste(fr, (i * TILE, 0))
        sheet.save(os.path.join(BASE, f'{slug}-sheet.png'))
        kb = os.path.getsize(os.path.join(BASE, f'{slug}.webp')) // 1024
        done.append(slug)
        print(f'  ✓ {slug:14s} {N} frames · {kb}Ko · {"aura" if aura else "bob"}')
    print(f'\n{len(done)} idles → {BASE}')


if __name__ == '__main__':
    main()
