// scripts/lib/r2.mjs — stockage objet Cloudflare R2 (bucket nika-media, juridiction UE).
// Pourquoi R2 : 10 Go gratuits et SORTIE GRATUITE (architecture §1) — les médias NIKA
// (AKASHA, STAY, annonces) vivent ici, plus jamais dans le dépôt ni sur Supabase Storage.
// aws4fetch signe en SigV4 (S3-compatible) — client de 6 Ko, pas le SDK AWS de 3 Mo.
import { AwsClient } from 'aws4fetch';

const client = () => new AwsClient({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
});
const base = () => `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}`;

export async function r2Ecrire(chemin, corps, contentType = 'application/octet-stream') {
  const r = await client().fetch(`${base()}/${chemin}`, {
    method: 'PUT', body: corps, headers: { 'Content-Type': contentType },
  });
  if (!r.ok) throw new Error(`R2 PUT ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return chemin;
}

export async function r2Lire(chemin) {
  const r = await client().fetch(`${base()}/${chemin}`);
  if (!r.ok) throw new Error(`R2 GET ${r.status}`);
  return r;
}

export async function r2Supprimer(chemin) {
  const r = await client().fetch(`${base()}/${chemin}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 404) throw new Error(`R2 DELETE ${r.status}`);
}
