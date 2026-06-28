#!/usr/bin/env python3
# scripts/build-akasha-arcade.py
# ARCADE rétro 2D — transforme les sprites sources (Higgsfield i2i 16-bit) en :
#   • <id>.webp        : animation bouclée (idle « charge » : bob + pulsation de l'aura) pour la carte
#   • <id>-sheet.png   : sprite-sheet horizontale (frames côte à côte) prête pour un futur mini-jeu
# Les sprites restent PURS (pas de scanlines baked) — le panneau ArcadeMoves ajoute la CRT en CSS.
#
# Source attendue : public/images/akasha/arcade/naruto/src/<id>.png
# Run : python3 scripts/build-akasha-arcade.py
import os, math
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'public', 'images', 'akasha', 'arcade', 'naruto')
SRC = os.path.join(BASE, 'src')
TILE = 160
FRAMES = 8

# id -> mode d'animation : 'idle' (aura qui pulse + léger bob) ou 'reveal' (apparition fondue, clones)
MOVES = [('rasengan', 'idle'), ('rasenshuriken', 'idle'), ('bijudama', 'idle'), ('multiclonage', 'reveal')]


def pixelate(path):
    """Charge la source, détoure le fond plat (color-key) et la réduit en pixel-art net (TILE)."""
    im = Image.open(path).convert('RGBA')
    im = im.resize((TILE, TILE), Image.NEAREST)
    px = im.load()
    cor = [im.getpixel((1, 1)), im.getpixel((TILE - 2, 1)), im.getpixel((1, TILE - 2)), im.getpixel((TILE - 2, TILE - 2))]
    cr = sum(c[0] for c in cor) // 4
    cg = sum(c[1] for c in cor) // 4
    cb = sum(c[2] for c in cor) // 4
    for y in range(TILE):
        for x in range(TILE):
            r, g, b, a = px[x, y]
            if abs(r - cr) + abs(g - cg) + abs(b - cb) < 64:
                px[x, y] = (r, g, b, 0)
    return im


def glow_frame(base, pulse):
    """Renforce les pixels lumineux (aura/chakra) selon `pulse` (0..1)."""
    g = base.copy()
    gp = g.load()
    for y in range(TILE):
        for x in range(TILE):
            r, gr, b, a = gp[x, y]
            if a == 0:
                continue
            lum = 0.299 * r + 0.587 * gr + 0.114 * b
            if lum > 150:
                k = 1 + 0.45 * pulse
                gp[x, y] = (min(255, int(r * k)), min(255, int(gr * k)), min(255, int(b * k)), a)
    return g


def build_idle(base):
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        pulse = 0.5 + 0.5 * math.sin(2 * math.pi * t)
        dy = round(2 * math.sin(2 * math.pi * t))
        fr = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        fr.alpha_composite(glow_frame(base, pulse), (0, dy))
        frames.append(fr)
    return frames


def build_reveal(base):
    seq = [0.0, 0.45, 1.0, 1.0, 1.0, 1.0, 0.55, 0.12]  # alpha → clones qui apparaissent / disparaissent
    frames = []
    for al in seq:
        fr = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        layer = base.copy()
        layer.putalpha(layer.getchannel('A').point(lambda v: int(v * al)))
        fr.alpha_composite(layer)
        frames.append(fr)
    return frames


def main():
    done = []
    for mid, mode in MOVES:
        src = os.path.join(SRC, f'{mid}.png')
        if not os.path.exists(src):
            print(f'  ✗ {mid} : source manquante ({src})')
            continue
        base = pixelate(src)
        frames = build_reveal(base) if mode == 'reveal' else build_idle(base)
        # webp animé
        frames[0].save(os.path.join(BASE, f'{mid}.webp'), save_all=True, append_images=frames[1:],
                       duration=110, loop=0, disposal=2)
        # sprite-sheet horizontale (game-ready)
        sheet = Image.new('RGBA', (TILE * len(frames), TILE), (0, 0, 0, 0))
        for i, fr in enumerate(frames):
            sheet.paste(fr, (i * TILE, 0))
        sheet.save(os.path.join(BASE, f'{mid}-sheet.png'))
        kb = os.path.getsize(os.path.join(BASE, f'{mid}.webp')) // 1024
        done.append(mid)
        print(f'  ✓ {mid:14s} {len(frames)} frames · {kb}Ko webp · sheet {TILE * len(frames)}x{TILE}')
    print(f'\n{len(done)} techniques → {BASE}')


if __name__ == '__main__':
    main()
