// scripts/lib/image-octets.mjs — LIRE LA DÉFINITION D'UNE IMAGE DANS SES OCTETS.
//
// POURQUOI. Un CDN d'images sert son carton d'erreur en HTTP 200, avec de vrais pixels dedans
// (leçon du 09/08 : quatre adresses reconstruites à la main répondaient 200 en servant un 300×171).
// Le code HTTP ne prouve donc rien ; la DÉFINITION si. On lit l'en-tête du fichier plutôt que de
// faire confiance au `Content-Type`, qu'un serveur mal réglé annonce à tort.
//
// Module de pures fonctions : aucun effet de bord, rien ne s'exécute à l'import.

/** @returns {{type:string,w:number,h:number}|null} — `null` si l'en-tête n'est pas reconnu. */
export function dimensions(buf) {
  const b = Buffer.from(buf);
  if (b.length < 24) return null;
  // PNG : signature 8 octets, puis IHDR — largeur/hauteur en big-endian aux offsets 16 et 20.
  if (b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG')
    return { type: 'png', w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  // GIF : « GIF87a »/« GIF89a » — largeur/hauteur en little-endian aux offsets 6 et 8.
  if (b.toString('latin1', 0, 3) === 'GIF')
    return { type: 'gif', w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  // WEBP : conteneur RIFF, trois variantes d'en-tête.
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    const f = b.toString('latin1', 12, 16);
    if (f === 'VP8X') return { type: 'webp', w: (b.readUIntLE(24, 3) & 0xffffff) + 1, h: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
    if (f === 'VP8L') { const n = b.readUInt32LE(21); return { type: 'webp', w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
    if (f === 'VP8 ') return { type: 'webp', w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  }
  // JPEG : parcourir les segments jusqu'au marqueur SOF (0xFFC0–0xFFCF, hors C4/C8/CC).
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
        return { type: 'jpeg', h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

/** L'identifiant de FICHIER d'une URL Fandom, débarrassé du suffixe de révision.
 *  Le `?cb=…` et le `/revision/latest/scale-to-width-down/720` varient d'une capture à l'autre
 *  POUR LE MÊME FICHIER : comparer les URLs brutes raterait la moitié des paires. */
export const idFichier = (url) => String(url).split('/revision')[0].split('?')[0];
