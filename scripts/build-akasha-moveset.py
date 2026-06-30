#!/usr/bin/env python3
# scripts/build-akasha-moveset.py
# Moveset 2D Naruto JOUABLE — pipeline gratuit, in-house :
#   poses générées par le Soul Higgsfield (identité verrouillée) → ICI on normalise :
#   détourage fond blanc + suppression de l'ombre (on ne garde que la plus grande
#   composante) + remplissage des trous + recalage à ÉCHELLE COMMUNE + pieds ancrés au sol.
# Sortie : public/images/akasha/moveset/naruto/<move>.png  (256x256, transparent, cadrage homogène)
# Le mouvement (rebond, lunge, arc de saut, flash) est piloté par code dans <Moveset2D>.
import os, statistics, json
from PIL import Image

# ordre des frames dans la sprite-sheet + groupes d'animation (atlas game-ready,
# = ce que produisait AutoSprite, mais fabriqué en local depuis nos frames Soul)
SHEET_ORDER = ['idle', 'idle2', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'crouch', 'jump', 'punch_a', 'punch_b', 'kick_a', 'kick_b', 'kick_c', 'guard', 'chakra', 'taunt']
ANIMS = {
    'idle': {'frames': ['idle'], 'fps': 4, 'loop': True},
    # marche = CYCLE 6 temps (contact G · recoil G · passing G · contact D · recoil D · passing D), boucle
    'walk': {'frames': ['walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6'], 'fps': 10, 'loop': True},
    # course = CYCLE 6 temps (contact/push/vol × 2), plus rapide que la marche, penché en avant
    'run': {'frames': ['run1', 'run2', 'run3', 'run4', 'run5', 'run6'], 'fps': 14, 'loop': True},
    'crouch': {'frames': ['crouch'], 'fps': 2, 'loop': True},
    'jump': {'frames': ['jump'], 'fps': 2, 'loop': False},
    # poing = 1-2-3-2-1 (aller-retour symétrique) : repos → armé → extension → armé → repos
    'punch': {'frames': ['idle', 'punch_a', 'punch_b', 'punch_a', 'idle'], 'fps': 12, 'loop': True},
    # pied = 1-2-3-4-1 (arc asymétrique) : repos → genou armé → extension → repli avant → repos
    'kick': {'frames': ['idle', 'kick_a', 'kick_b', 'kick_c', 'idle'], 'fps': 10, 'loop': True},
    # pack de vie (poses tenues / one-shot, animées par effets côté code)
    'guard': {'frames': ['guard'], 'fps': 2, 'loop': True},
    'chakra': {'frames': ['chakra'], 'fps': 2, 'loop': True},
    'taunt': {'frames': ['taunt'], 'fps': 2, 'loop': False},
    'idle_break': {'frames': ['idle2'], 'fps': 2, 'loop': True},
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'public', 'images', 'akasha', 'moveset', 'naruto')
SRC = os.path.join(BASE, 'src')
TILE = 256
PIXEL_TILE = 84       # taille des frames pixel-art (perso ~chunky 16-bit) ; upscalé en CSS (pixelated)
PALETTE_COLORS = 28   # palette rétro COMMUNE à toutes les frames (couleurs stables = pas de scintillement)
# poses "debout" mises à la MÊME hauteur écran (on EXCLUT crouch/jump qui sont compacts)
STANDING = {'idle', 'idle2', 'guard', 'chakra', 'taunt', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'punch_a', 'punch_b', 'kick_a', 'kick_b', 'kick_c'}
# course = poses PENCHÉES → on NE normalise PAS par boîte (sinon le corps grandit sur les frames penchées) :
# échelle COMMUNE = celle de la marche (même corps, la hauteur de silhouette varie avec l'inclinaison).
RUN = {'run1', 'run2', 'run3', 'run4', 'run5', 'run6'}


def keybg(im, thr=66):
    """Rend transparent le fond UNI (couleur des coins, ex. ardoise). PAS de règle 'clair &
    peu saturé' ici : elle mangeait le HAORI BLANC du Hokage."""
    im = im.convert('RGBA'); px = im.load(); w, h = im.size
    cor = [im.getpixel((1, 1)), im.getpixel((w - 2, 1)), im.getpixel((1, h - 2)), im.getpixel((w - 2, h - 2))]
    cr = sum(c[0] for c in cor) // 4; cg = sum(c[1] for c in cor) // 4; cb = sum(c[2] for c in cor) // 4
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and abs(r - cr) + abs(g - cg) + abs(b - cb) < thr:
                px[x, y] = (r, g, b, 0)
    return im


def fill_holes(im, max_frac=0.012):
    """Rouvre uniquement les PETITS trous intérieurs (yeux, reflets) ; jamais une grande zone
    (ex. une "carte" blanche enfermée par un cadre)."""
    w, h = im.size; px = im.load()
    bg = bytearray(w * h)  # 1 = fond relié au bord
    st = []
    for x in range(w):
        for y in (0, h - 1):
            if px[x, y][3] == 0 and not bg[y * w + x]:
                bg[y * w + x] = 1; st.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if px[x, y][3] == 0 and not bg[y * w + x]:
                bg[y * w + x] = 1; st.append((x, y))
    while st:
        x, y = st.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx] and px[nx, ny][3] == 0:
                bg[ny * w + nx] = 1; st.append((nx, ny))
    maxa = w * h * max_frac
    seen = bytearray(w * h)
    for sy in range(h):
        for sx in range(w):
            if px[sx, sy][3] == 0 and not bg[sy * w + sx] and not seen[sy * w + sx]:
                stk = [(sx, sy)]; seen[sy * w + sx] = 1; comp = []
                while stk:
                    x, y = stk.pop(); comp.append((x, y))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny][3] == 0 and not bg[ny * w + nx]:
                            seen[ny * w + nx] = 1; stk.append((nx, ny))
                if len(comp) < maxa:  # petit trou → on rebouche
                    for x, y in comp:
                        r, g, b, _ = px[x, y]; px[x, y] = (r, g, b, 255)
    return im


def keep_largest(im):
    """Ne garde que la plus grande composante opaque (= le perso) → vire l'ombre/les taches."""
    w, h = im.size; px = im.load(); seen = bytearray(w * h); comps = []
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
                comps.append(comp)
    if not comps:
        return im
    big = max(comps, key=len); keep = set(big)
    for comp in comps:
        if comp is big:
            continue
        for x, y in comp:
            px[x, y] = (0, 0, 0, 0)
    return im


def detoure(path):
    im = keybg(Image.open(path))
    im = fill_holes(im)
    im = keep_largest(im)
    return im


def outline(im, col=(20, 16, 30, 255)):
    """Contour pixel 1px sombre autour de la silhouette (look 16-bit)."""
    w, h = im.size; px = im.load(); add = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] < 40:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] > 120:
                        add.append((x, y)); break
    for x, y in add:
        px[x, y] = col
    return im


def pixelize(tiles):
    """Convertit les tuiles 256 lisses en pixel-art : downscale + palette COMMUNE (couleurs
    stables entre frames) + alpha franc + contour. C'est ce qui camoufle les défauts."""
    small = {k: t.resize((PIXEL_TILE, PIXEL_TILE), Image.LANCZOS) for k, t in tiles.items()}
    # palette commune : on colle toutes les frames (via leur alpha) sur du noir, puis on quantize
    combo = Image.new('RGB', (PIXEL_TILE * len(small), PIXEL_TILE), (0, 0, 0))
    for i, s in enumerate(small.values()):
        combo.paste(s.convert('RGB'), (i * PIXEL_TILE, 0), s.split()[3])
    pal = combo.quantize(colors=PALETTE_COLORS, method=Image.MEDIANCUT)
    out = {}
    for k, s in small.items():
        rgb = s.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE).convert('RGBA')
        a = s.split()[3].point(lambda v: 255 if v >= 110 else 0)
        rgb.putalpha(a)
        out[k] = outline(rgb)
    return out


def main():
    if not os.path.isdir(SRC):
        print('✗ pas de dossier src/'); return
    raws = {}
    for fn in sorted(os.listdir(SRC)):
        if fn.endswith('.png'):
            mid = fn[:-4]
            raws[mid] = detoure(os.path.join(SRC, fn))
    if not raws:
        print('✗ aucune source'); return
    # boîtes englobantes
    bb = {k: v.getbbox() for k, v in raws.items()}
    bb = {k: b for k, b in bb.items() if b}
    heights = {k: b[3] - b[1] for k, b in bb.items()}
    # taille HOMOGÈNE : chaque pose debout → MÊME hauteur écran ; crouch/jump (compacts) →
    # échelle moyenne des poses debout (on garde leur compacité sans qu'ils paraissent géants).
    TARGET = TILE * 0.92
    st = [TARGET / heights[k] for k in heights if k in STANDING] or [TARGET / h for h in heights.values()]
    avg_scale = sum(st) / len(st)
    # crouch/jump (poses compactes, HORS STANDING) → recalés à l'ÉCHELLE DE L'IDLE (même génération/caméra),
    # PAS la moyenne : sinon des frames d'une autre échelle source (walk/chakra ~2100px vs idle ~1076px)
    # polluent la moyenne et rapetissent le saut (bug « le saut rend le perso plus petit »).
    ref_scale = (TARGET / heights['idle']) if 'idle' in heights else avg_scale
    # course : échelle COMMUNE = moyenne des échelles de la MARCHE (même corps que la marche,
    # la silhouette reste plus courte sur les poses penchées — pas de "grossissement" par boîte).
    wsc = [TARGET / heights[k] for k in heights if k.startswith('walk')]
    run_scale = (sum(wsc) / len(wsc)) if wsc else avg_scale
    # Source = VRAIS sprites 16-bit (générés par nano_banana_pro, style carte) → on garde les
    # gros pixels : recalage NEAREST + échelle commune + pieds au sol. PAS de pixelize (le
    # downscale d'images lisses rendait moche). Détourage + plus grande composante (cf. detoure()).
    tiles = {}
    done = []
    for mid, im in raws.items():
        b = bb.get(mid)
        if not b:
            continue
        s = (TARGET / heights[mid]) if mid in STANDING else run_scale if mid in RUN else ref_scale
        crop = im.crop(b)
        nw = max(1, round(crop.width * s)); nh = max(1, round(crop.height * s))
        crop = crop.resize((nw, nh), Image.NEAREST)
        tile = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
        # ANCRAGE PAR LES PIEDS (centroïde horizontal du bas du sprite) → corps planté,
        # zéro glissement quand un bras/jambe s'étend (sinon le centrage par boîte fait patiner).
        fp = crop.load(); y0 = max(0, int(nh * 0.88)); xs = 0; cnt = 0
        for yy in range(y0, nh):
            for xx in range(nw):
                if fp[xx, yy][3] > 60:
                    xs += xx; cnt += 1
        foot_cx = (xs / cnt) if cnt else nw / 2
        ax = round(TILE * 0.45 - foot_cx)
        tile.alpha_composite(crop, (ax, max(0, round(TILE * 0.97) - nh)))
        out = os.path.join(BASE, f'{mid}.png'); tile.save(out)
        tiles[mid] = tile; done.append(mid)
        print(f'  ✓ {mid:8s} h={heights[mid]:4d} → {nh:3d}px · {os.path.getsize(out) // 1024}Ko')
    print(f'\n{len(done)} sprites 16-bit recalés (hauteur cible {TARGET:.0f}px) → {BASE}')

    # ── sprite-sheet + atlas game-ready (remplace AutoSprite, en panne côté Higgsfield) ──
    present = [f for f in SHEET_ORDER if f in tiles]
    if present:
        sheet = Image.new('RGBA', (TILE * len(present), TILE), (0, 0, 0, 0))
        index = {}
        for i, f in enumerate(present):
            sheet.paste(tiles[f], (i * TILE, 0)); index[f] = i
        sheet.save(os.path.join(BASE, 'naruto-sheet.png'))
        atlas = {
            'image': 'naruto-sheet.png', 'frameWidth': TILE, 'frameHeight': TILE,
            'frames': present, 'frameIndex': index,
            'animations': {k: v for k, v in ANIMS.items() if all(fr in index for fr in v['frames'])},
        }
        with open(os.path.join(BASE, 'naruto-atlas.json'), 'w', encoding='utf-8') as fh:
            json.dump(atlas, fh, ensure_ascii=False, indent=2)
        kb = os.path.getsize(os.path.join(BASE, 'naruto-sheet.png')) // 1024
        print(f'🎮 sprite-sheet ({len(present)} frames, {kb}Ko) + atlas → naruto-sheet.png / naruto-atlas.json')


if __name__ == '__main__':
    main()
