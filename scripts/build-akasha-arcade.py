#!/usr/bin/env python3
# scripts/build-akasha-arcade.py
# ARCADE rétro 2D — v3 « channel loop » : UNE pose nette par technique (1 seule génération
# Higgsfield = perso 100% cohérent, zéro morph, zéro bavure) + animation d'EFFET déterministe
# (chakra qui tourne + pulse + léger bob), 12 frames fluides. Plus de cuts saccadés.
#   • <id>.webp        : boucle fluide (affichage carte)
#   • <id>-sheet.png   : sprite-sheet (12 frames) pour un futur mini-jeu
#
# Source : public/images/akasha/arcade/naruto/src/<id>.png  (pose unique nette)
# Run : python3 scripts/build-akasha-arcade.py
import os, math
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'public', 'images', 'akasha', 'arcade', 'naruto')
SRC = os.path.join(BASE, 'src')
TILE = 256
N = 12
DUR = 80
FIT_H = 0.9
ANCHOR_X, ANCHOR_Y = 0.5, 0.95

# masque de l'effet (chakra) par technique → (r,g,b)->bool ; couleur des étincelles
def m_blue(r, g, b):   return b > 150 and b - r > 25
def m_white(r, g, b):  return r > 200 and g > 200 and b > 200
def m_purple(r, g, b): return b > 110 and r > 90 and g + 25 < r and g + 25 < b
MOVES = [
    ('rasengan', m_blue, (130, 205, 255)),
    ('rasenshuriken', m_white, (235, 245, 255)),
    ('bijudama', m_purple, (195, 120, 255)),
    ('multiclonage', None, None),
]


def keybg(im):
    px = im.load(); w, h = im.size
    cor = [im.getpixel((1, 1)), im.getpixel((w - 2, 1)), im.getpixel((1, h - 2)), im.getpixel((w - 2, h - 2))]
    cr = sum(c[0] for c in cor) // 4; cg = sum(c[1] for c in cor) // 4; cb = sum(c[2] for c in cor) // 4
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and abs(r - cr) + abs(g - cg) + abs(b - cb) < 60:
                px[x, y] = (r, g, b, 0)
    return im


def clean_specks(im, min_area):
    w, h = im.size; px = im.load(); seen = bytearray(w * h)
    for sy in range(h):
        for sx in range(w):
            if px[sx, sy][3] > 24 and not seen[sy * w + sx]:
                st = [(sx, sy)]; seen[sy * w + sx] = 1; comp = []
                while st:
                    x, y = st.pop(); comp.append((x, y))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny][3] > 24:
                            seen[ny * w + nx] = 1; st.append((nx, ny))
                if len(comp) < min_area:
                    for x, y in comp:
                        px[x, y] = (0, 0, 0, 0)
    return im


def base_tile(path):
    """Pose carrée (déjà composée) → détourée, pixel net, CENTRÉE (contain) dans la tuile.
    On ne rogne rien : tout le perso + l'effet restent visibles (cadrage propre)."""
    im = keybg(Image.open(path).convert('RGBA'))
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    s = (TILE * 0.96) / max(im.size)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.NEAREST)
    tile = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    tile.alpha_composite(im, ((TILE - im.width) // 2, (TILE - im.height) // 2))
    return clean_specks(tile, 300)


def effect_center(tile, mask):
    px = tile.load(); xs = ys = n = 0
    for y in range(TILE):
        for x in range(TILE):
            r, g, b, a = px[x, y]
            if a > 30 and mask(r, g, b):
                xs += x; ys += y; n += 1
    if n < 30:
        return None
    cx, cy = xs / n, ys / n
    # rayon ~ étendue
    sp = 0
    for y in range(TILE):
        for x in range(TILE):
            r, g, b, a = px[x, y]
            if a > 30 and mask(r, g, b):
                sp += (x - cx) ** 2 + (y - cy) ** 2
    rad = max(10, min(60, (sp / n) ** 0.5 * 1.1))
    return cx, cy, rad


def animate(tile, mask, col):
    oc = effect_center(tile, mask) if mask else None
    frames = []
    for i in range(N):
        t = i / N; ang = 2 * math.pi * t
        pulse = 0.5 + 0.5 * math.sin(ang)
        dy = round(1.3 * math.sin(ang))
        fr = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        # bob + pulsation des pixels d'effet (chakra qui « respire »)
        if mask:
            src = tile.copy(); sp = src.load()
            k = 1 + 0.45 * pulse
            for y in range(TILE):
                for x in range(TILE):
                    r, g, b, a = sp[x, y]
                    if a and mask(r, g, b):
                        sp[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)), a)
            fr.alpha_composite(src, (0, dy))
        else:
            fr.alpha_composite(tile, (0, dy))
        # étincelles qui tournent autour de l'orbe (vend la rotation du chakra)
        if oc:
            cx, cy, rad = oc; ov = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
            for kk in range(6):
                a2 = ang + kk * (math.pi / 3)
                x = cx + rad * math.cos(a2); y = cy + dy + rad * math.sin(a2)
                rr = 2.2 + 1.8 * (0.5 + 0.5 * math.sin(ang * 2 + kk))
                d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(*col, 210))
            fr.alpha_composite(ov)
        frames.append(fr)
    return frames


def main():
    done = []
    for mid, mask, col in MOVES:
        src = os.path.join(SRC, f'{mid}.png')
        if not os.path.exists(src):
            print(f'  ✗ {mid:14s} source manquante'); continue
        frames = animate(base_tile(src), mask, col)
        frames[0].save(os.path.join(BASE, f'{mid}.webp'), save_all=True, append_images=frames[1:], duration=DUR, loop=0, disposal=2)
        sheet = Image.new('RGBA', (TILE * N, TILE), (0, 0, 0, 0))
        for i, fr in enumerate(frames):
            sheet.paste(fr, (i * TILE, 0))
        sheet.save(os.path.join(BASE, f'{mid}-sheet.png'))
        kb = os.path.getsize(os.path.join(BASE, f'{mid}.webp')) // 1024
        done.append(mid)
        print(f'  ✓ {mid:14s} {N} frames · {kb}Ko webp · orbe={"oui" if (mask) else "non"}')
    print(f'\n{len(done)} techniques → {BASE}')


if __name__ == '__main__':
    main()
