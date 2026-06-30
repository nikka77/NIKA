#!/usr/bin/env python3
# scripts/build-akasha-attack.py
# Pipeline 2D officiel Higgsfield (références/2d-animation.md) en local :
#   vidéo seedance1_5 (1 image animée = perso identique partout) → extraction frames (imageio-ffmpeg)
#   → sélection régulière (1ère+dernière gardées) → détourage du fond (color-key PIL) → spritesheet.
# Donne une VRAIE animation d'attaque image-par-image (élan → frappe → recul).
#   • <id>.webp        : animation jouée en boucle (carte)
#   • <id>-sheet.png   : sprite-sheet game-ready
# Source : public/images/akasha/arcade/naruto/vid/<id>.mp4  (vidéos seedance téléchargées)
import os, math
import numpy as np
import imageio.v2 as imageio
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'public', 'images', 'akasha', 'arcade', 'naruto')
VID = os.path.join(BASE, 'vid')
TILE = 256
FRAMES = 14          # attaque : 10-20 (doc)
FPS = 12
FLIP = {'rasengan', 'rasenshuriken'}   # key-poses orientées à gauche → on retourne à droite


def keybg(im, thr=70):
    im = im.convert('RGBA'); px = im.load(); w, h = im.size
    cor = [im.getpixel((1, 1)), im.getpixel((w - 2, 1)), im.getpixel((1, h - 2)), im.getpixel((w - 2, h - 2))]
    cr = sum(c[0] for c in cor) // 4; cg = sum(c[1] for c in cor) // 4; cb = sum(c[2] for c in cor) // 4
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and abs(r - cr) + abs(g - cg) + abs(b - cb) < thr:
                px[x, y] = (r, g, b, 0)
    return im


def process(mp4, flip):
    rdr = imageio.get_reader(mp4)
    raw = [Image.fromarray(f) for f in rdr]
    rdr.close()
    n = len(raw)
    idx = sorted(set(np.round(np.linspace(0, n - 1, FRAMES)).astype(int).tolist()))
    sel = [keybg(raw[i]) for i in idx]
    if flip:
        sel = [s.transpose(Image.FLIP_LEFT_RIGHT) for s in sel]
    # union bbox (anti-jitter) sur toutes les frames
    boxes = [s.getbbox() for s in sel if s.getbbox()]
    if boxes:
        l = min(b[0] for b in boxes); t = min(b[1] for b in boxes)
        r = max(b[2] for b in boxes); bo = max(b[3] for b in boxes)
    else:
        l, t, r, bo = 0, 0, sel[0].width, sel[0].height
    cw, ch = r - l, bo - t
    s = (TILE * 0.94) / max(cw, ch)
    frames = []
    for im in sel:
        crop = im.crop((l, t, r, bo)).resize((max(1, round(cw * s)), max(1, round(ch * s))), Image.NEAREST)
        tile = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        tile.alpha_composite(crop, ((TILE - crop.width) // 2, round(TILE * 0.96) - crop.height))  # pieds plantés
        frames.append(tile)
    return frames


def main():
    if not os.path.isdir(VID):
        print('✗ aucun dossier vid/'); return
    done = []
    for fn in sorted(os.listdir(VID)):
        if not fn.endswith('.mp4'):
            continue
        mid = fn[:-4]
        frames = process(os.path.join(VID, fn), mid in FLIP)
        frames[0].save(os.path.join(BASE, f'{mid}.webp'), save_all=True, append_images=frames[1:],
                       duration=round(1000 / FPS), loop=0, disposal=2)
        sheet = Image.new('RGBA', (TILE * len(frames), TILE), (0, 0, 0, 0))
        for i, fr in enumerate(frames):
            sheet.paste(fr, (i * TILE, 0))
        sheet.save(os.path.join(BASE, f'{mid}-sheet.png'))
        kb = os.path.getsize(os.path.join(BASE, f'{mid}.webp')) // 1024
        done.append(mid)
        print(f'  ✓ {mid:14s} {len(frames)} frames · {kb}Ko webp · flip={mid in FLIP}')
    print(f'\n{len(done)} attaques → {BASE}')


if __name__ == '__main__':
    main()
