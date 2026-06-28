#!/usr/bin/env python3
# scripts/fetch-akasha-naruto-images.py
# Source d'images de référence du registre AKASHA : API MediaWiki de Narutopedia
#   https://naruto.fandom.com/api.php
# Pour chaque entité rédigée (lieux, pouvoirs, dōjutsu, artefacts, clans, titres) on récupère
# l'image principale de l'article (prop=pageimages) ou, pour les clans, le blason (file search),
# on rasterise/centre les logos transparents, et on enregistre un webp optimisé local dans
#   public/images/akasha/ref/<slug>.webp
# Le build node (build-akasha-naruto.mjs) les récupère ensuite via existsSync.
#
# Run : python3 scripts/fetch-akasha-naruto-images.py
import urllib.request, urllib.parse, json, io, os, sys
from PIL import Image, ImageStat

API = 'https://naruto.fandom.com/api.php'
UA = 'NIKA-akasha/1.0 (registre LEARN; image de reference)'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'images', 'akasha', 'ref')
MAXW = 720

# slug -> spec : {'title': page} → image principale de l'article ;
#                {'file' : requête} → recherche de fichier (blasons, objets détourés).
SPECS = {
    # Lieux — paysage du village
    'konohagakure': {'title': 'Konohagakure'},
    'sunagakure': {'title': 'Sunagakure'},
    'kirigakure': {'title': 'Kirigakure'},
    'iwagakure': {'title': 'Iwagakure'},
    'kumogakure': {'title': 'Kumogakure'},
    'amegakure': {'title': 'Amegakure'},
    'otogakure': {'title': 'Otogakure'},
    # Pouvoirs — image d'action de la technique
    'rasengan': {'title': 'Rasengan'},
    'chidori': {'title': 'Chidori'},
    'amaterasu': {'title': 'Amaterasu'},
    'susanoo': {'title': 'Susanoo', 'file': 'Susanoo'},
    'edo-tensei': {'title': 'Summoning: Impure World Reincarnation', 'file': 'Impure World Reincarnation'},
    'shadow-clone': {'title': 'Shadow Clone Technique', 'file': 'Shadow Clone Technique'},
    'flying-raijin': {'title': 'Flying Thunder God Technique', 'file': 'Flying Thunder God'},
    'wood-release': {'title': 'Wood Release', 'file': 'Wood Release'},
    'tailed-beast-ball': {'title': 'Tailed Beast Ball', 'file': 'Tailed Beast Ball'},
    # Compétences — dōjutsu (l'œil). Byakugan/Rinnegan : file-search (le lead de l'article
    # pointe sur la variante Momoshiki en SVG) en préférant un rendu raster de l'œil.
    'sharingan': {'title': 'Sharingan'},
    'byakugan': {'exact': 'File:Byakugan.svg'},
    'rinnegan': {'file': 'Rinnegan'},
    # Artefacts
    'kusanagi': {'title': 'Sword of Kusanagi', 'file': 'Sword of Kusanagi'},
    'gunbai': {'title': 'Gunbai', 'file': 'Gunbai'},
    'samehada': {'title': 'Samehada', 'file': 'Samehada'},
    # Métiers
    'shinobi': {'title': 'Ninja', 'file': 'Shinobi'},
    'ninja-medical': {'title': 'Medical-nin', 'file': 'Medical-nin'},
    # Statuts — clans (blason exact en SVG, rasterisé) + titres
    'uchiha': {'exact': 'File:Uchiha Symbol.svg'},
    'senju': {'exact': 'File:Senju Symbol.svg'},
    'uzumaki': {'exact': 'File:Old Uzumaki Symbol.svg'},
    'hyuga': {'exact': 'File:Hyūga Symbol.svg'},
    'nara': {'exact': 'File:Nara Symbol old.svg'},
    'hokage': {'title': 'Hokage', 'file': 'Hokage'},
    'jinchuriki': {'title': 'Jinchūriki', 'file': 'Jinchuriki'},
    'sannin': {'title': 'Sannin', 'file': 'Sannin'},
}


def api(params):
    params = dict(params)
    params['format'] = 'json'
    url = API + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def to_raster(url):
    """Le CDN Fandom sert les .svg bruts (PIL ne les lit pas) : on force un rendu
    raster via le redimensionneur /scale-to-width-down/ qui renvoie un webp/png."""
    if not url:
        return url
    base = url.split('?', 1)
    q = ('?' + base[1]) if len(base) > 1 else ''
    head = base[0]
    if '.svg' in head.lower() and 'scale-to-width-down' not in head and '/revision/' in head:
        head = head.rstrip('/') + '/scale-to-width-down/' + str(MAXW)
    return head + q


def lead_image(title):
    d = api({'action': 'query', 'prop': 'pageimages', 'piprop': 'thumbnail',
             'pithumbsize': MAXW, 'titles': title, 'redirects': 1})
    for p in d.get('query', {}).get('pages', {}).values():
        src = p.get('thumbnail', {}).get('source')
        if src:
            return to_raster(src)
    return None


# raster d'abord (png/jpg/webp/gif) puis svg en dernier recours
_MIME_RANK = {'image/png': 0, 'image/jpeg': 0, 'image/webp': 0, 'image/gif': 1, 'image/svg+xml': 3}


def file_search(query):
    d = api({'action': 'query', 'generator': 'search', 'gsrsearch': query,
             'gsrnamespace': 6, 'gsrlimit': 8, 'prop': 'imageinfo',
             'iiprop': 'url|mime', 'iiurlwidth': MAXW})
    pages = [p for p in d.get('query', {}).get('pages', {}).values() if p.get('imageinfo')]
    pages.sort(key=lambda p: (_MIME_RANK.get(p['imageinfo'][0].get('mime'), 2), p.get('index', 999)))
    for p in pages:
        ii = p['imageinfo'][0]
        return to_raster(ii.get('thumburl') or ii.get('url'))
    return None


def file_by_title(title):
    d = api({'action': 'query', 'titles': title, 'prop': 'imageinfo',
             'iiprop': 'url', 'iiurlwidth': MAXW})
    for p in d.get('query', {}).get('pages', {}).values():
        ii = p.get('imageinfo', [])
        if ii:
            return to_raster(ii[0].get('thumburl') or ii[0].get('url'))
    return None


def resolve(spec):
    url = None
    if spec.get('exact'):
        url = file_by_title(spec['exact'])
        if url:
            return url
    if spec.get('title'):
        url = lead_image(spec['title'])
    if not url and spec.get('file'):
        url = file_search(spec['file'])
    if not url and spec.get('title'):
        url = file_search(spec['title'])
    return url


def fetch_bytes(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def process(data, slug):
    im = Image.open(io.BytesIO(data))
    has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    if has_alpha:
        im = im.convert('RGBA')
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
        w, h = im.size
        side = int(max(w, h) * 1.12) or 1
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(im, ((side - w) // 2, (side - h) // 2), im)
        im = canvas
        # Blason quasi-noir → invisible sur le fond foncé de la carte : on le repasse
        # en blanc cassé (en conservant la forme via l'alpha).
        a = im.getchannel('A')
        if ImageStat.Stat(im.convert('L'), mask=a).mean[0] < 95:
            solid = Image.new('RGBA', im.size, (236, 236, 242, 255))
            im = Image.composite(solid, Image.new('RGBA', im.size, (0, 0, 0, 0)), a)
    else:
        im = im.convert('RGB')
    w, h = im.size
    m = max(w, h)
    if m > MAXW:
        im = im.resize((round(w * MAXW / m), round(h * MAXW / m)), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, slug + '.webp')
    im.save(path, 'WEBP', quality=82, method=6)
    return path, im.size, has_alpha


def main():
    only = set(sys.argv[1:])
    done, missed = [], []
    for slug, spec in SPECS.items():
        if only and slug not in only:
            continue
        try:
            url = resolve(spec)
            if not url:
                missed.append(slug)
                print(f'  ✗ {slug:20s} aucune image')
                continue
            path, size, alpha = process(fetch_bytes(url), slug)
            kb = os.path.getsize(path) // 1024
            done.append(slug)
            tag = 'logo' if alpha else 'photo'
            print(f'  ✓ {slug:20s} {size[0]}x{size[1]} {kb:>4d}Ko {tag}')
        except Exception as e:  # noqa: BLE001
            missed.append(slug)
            print(f'  ✗ {slug:20s} {type(e).__name__}: {e}')
    print(f'\n{len(done)} images → {OUT}')
    if missed:
        print('manquants:', ', '.join(missed))


if __name__ == '__main__':
    main()
