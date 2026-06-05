#!/usr/bin/env node
/**
 * NIKA Graphify — génère graphify-out/graph.json + GRAPH_REPORT.md
 * Usage : node scripts/graphify.mjs [--update]
 *
 * Sans --update : scan complet
 * Avec --update : ne relit que les fichiers modifiés depuis le dernier graph.json
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'graphify-out');
const GRAPH_FILE = path.join(OUT_DIR, 'graph.json');
const REPORT_FILE = path.join(OUT_DIR, 'GRAPH_REPORT.md');

const UPDATE_MODE = process.argv.includes('--update');

// ── Extensions et dossiers à ignorer ──────────────────────────────────────────
const IGNORE_DIRS = new Set([
  'node_modules', '.next', '.git', '.agents', 'graphify-out',
  'public', '.vercel', 'coverage',
]);
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json']);
const SKIP_JSON = new Set(['package-lock.json', 'tsconfig.tsbuildinfo']);

// ── Catégories de fichiers ─────────────────────────────────────────────────────
function categorize(rel) {
  if (rel.startsWith('app/api/'))         return 'api-route';
  if (rel.startsWith('app/') && rel.includes('/page.tsx'))    return 'page';
  if (rel.startsWith('app/') && rel.includes('/layout.tsx'))  return 'layout';
  if (rel.startsWith('app/') && rel.includes('/loading.tsx')) return 'loading';
  if (rel.startsWith('app/') && rel.includes('/error.tsx'))   return 'error';
  if (rel.startsWith('app/') && rel.endsWith('.tsx'))         return 'page-component';
  if (rel.startsWith('components/'))      return 'component';
  if (rel.startsWith('lib/supabase/'))    return 'supabase';
  if (rel.startsWith('lib/'))             return 'lib';
  if (rel.startsWith('scripts/'))         return 'script';
  if (rel.startsWith('data/'))            return 'data';
  if (rel === 'proxy.ts')                 return 'middleware';
  if (rel === 'app/layout.tsx')           return 'root-layout';
  if (rel.endsWith('.json'))              return 'config';
  return 'other';
}

// ── Domaine NIKA ───────────────────────────────────────────────────────────────
function domain(rel) {
  const domains = ['food', 'auto', 'stay', 'azur', 'rent', 'serv', 'learn', 'sec', 'news', 'niko', 'nfc', 'pro'];
  for (const d of domains) {
    if (rel.startsWith(`app/${d}/`) || rel.startsWith(`app/api/${d}/`)) return d.toUpperCase();
  }
  if (rel.startsWith('components/')) return 'SHARED';
  if (rel.startsWith('lib/'))        return 'SHARED';
  if (rel.startsWith('app/admin/'))  return 'ADMIN';
  if (rel.startsWith('data/'))       return 'DATA';
  if (rel.startsWith('scripts/'))    return 'SCRIPTS';
  return 'CORE';
}

// ── Extraction des imports ─────────────────────────────────────────────────────
function extractImports(content, filePath) {
  const imports = [];
  // static imports
  const staticRe = /^(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  let m;
  while ((m = staticRe.exec(content)) !== null) {
    imports.push(m[1]);
  }
  // dynamic imports
  const dynRe = /import\(['"]([^'"]+)['"]\)/g;
  while ((m = dynRe.exec(content)) !== null) {
    imports.push(m[1]);
  }
  return imports;
}

// ── Résolution d'un import vers un fichier du projet ──────────────────────────
function resolveImport(imp, fromFile) {
  if (!imp.startsWith('.') && !imp.startsWith('@/')) return null;

  let abs;
  if (imp.startsWith('@/')) {
    abs = path.join(ROOT, imp.slice(2));
  } else {
    abs = path.resolve(path.dirname(fromFile), imp);
  }

  // Essai avec diverses extensions
  const tries = [abs, abs + '.ts', abs + '.tsx', abs + '.js',
    path.join(abs, 'index.ts'), path.join(abs, 'index.tsx')];
  for (const t of tries) {
    if (fs.existsSync(t)) return path.relative(ROOT, t);
  }
  return null;
}

// ── Extraction des exports nommés ─────────────────────────────────────────────
function extractExports(content) {
  const exports = [];
  const re = /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|type|interface)\s+(\w+)/gm;
  let m;
  while ((m = re.exec(content)) !== null) exports.push(m[1]);
  // named re-exports
  const re2 = /^export\s+\{([^}]+)\}/gm;
  while ((m = re2.exec(content)) !== null) {
    m[1].split(',').forEach(e => {
      const name = e.trim().split(/\s+as\s+/).pop().trim();
      if (name) exports.push(name);
    });
  }
  return [...new Set(exports)];
}

// ── Extraction métadonnées spécifiques NIKA ───────────────────────────────────
function extractNikaMeta(content, rel) {
  const meta = {};

  // 'use client' directive
  if (content.startsWith("'use client'") || content.startsWith('"use client"')) {
    meta.isClient = true;
  }

  // Tables Supabase utilisées
  const supaRe = /\.from\(['"](\w+)['"]\)/g;
  const tables = new Set();
  let m;
  while ((m = supaRe.exec(content)) !== null) tables.add(m[1]);
  if (tables.size) meta.supabaseTables = [...tables];

  // Routes API (méthodes HTTP)
  if (rel.startsWith('app/api/')) {
    const methods = [];
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach(verb => {
      if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${verb}`).test(content)) methods.push(verb);
    });
    if (methods.length) meta.httpMethods = methods;
  }

  // generateStaticParams → SSG
  if (content.includes('generateStaticParams')) meta.rendering = 'SSG';
  else if (meta.isClient) meta.rendering = 'Client';
  else meta.rendering = 'SSR/Static';

  // Wow score / listings data
  if (content.includes('wow_listings')) meta.usesWowData = true;

  // Claude API
  if (content.includes('@anthropic-ai/sdk') || content.includes('anthropic')) meta.usesClaudeAPI = true;

  // Stripe
  if (content.includes('stripe')) meta.usesStripe = true;

  return meta;
}

// ── Scan récursif ──────────────────────────────────────────────────────────────
function scanDir(dir, files = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return files; }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (!SCAN_EXTS.has(ext)) continue;
      if (SKIP_JSON.has(entry.name)) continue;
      files.push(full);
    }
  }
  return files;
}

// ── Build graph ────────────────────────────────────────────────────────────────
function buildGraph(filesToScan, existingNodes = {}) {
  const nodes = { ...existingNodes };

  for (const fullPath of filesToScan) {
    const rel = path.relative(ROOT, fullPath);
    let content = '';
    try { content = fs.readFileSync(fullPath, 'utf8'); }
    catch { continue; }

    const stat = fs.statSync(fullPath);
    const cat = categorize(rel);
    const dom = domain(rel);
    const imports = cat !== 'config' ? extractImports(content, fullPath) : [];
    const exports = cat !== 'config' ? extractExports(content) : [];
    const meta = cat !== 'config' ? extractNikaMeta(content, rel) : {};
    const lines = content.split('\n').length;

    // Résolution des dépendances internes
    const deps = [];
    for (const imp of imports) {
      const resolved = resolveImport(imp, fullPath);
      if (resolved && resolved !== rel) deps.push(resolved);
    }

    nodes[rel] = {
      id: rel,
      category: cat,
      domain: dom,
      lines,
      exports,
      deps: [...new Set(deps)],
      meta,
      mtime: stat.mtimeMs,
    };
  }

  return nodes;
}

// ── Génération du rapport Markdown ────────────────────────────────────────────
function generateReport(nodes) {
  const allNodes = Object.values(nodes);
  const byDomain = {};
  const byCategory = {};

  for (const n of allNodes) {
    (byDomain[n.domain] = byDomain[n.domain] || []).push(n);
    (byCategory[n.category] = byCategory[n.category] || []).push(n);
  }

  const domainOrder = ['CORE', 'SHARED', 'DATA', 'FOOD', 'AUTO', 'STAY', 'AZUR',
    'RENT', 'SERV', 'LEARN', 'SEC', 'NEWS', 'NIKO', 'NFC', 'PRO', 'ADMIN', 'SCRIPTS'];

  let md = `# NIKA — Carte du projet (graphify)\n\n`;
  md += `> Généré le ${new Date().toLocaleString('fr-FR')} · ${allNodes.length} fichiers analysés\n\n`;

  // Stats globales
  md += `## Vue d'ensemble\n\n`;
  md += `| Métrique | Valeur |\n|---|---|\n`;
  md += `| Fichiers total | ${allNodes.length} |\n`;
  md += `| Pages | ${(byCategory['page'] || []).length} |\n`;
  md += `| Composants | ${(byCategory['component'] || []).length} |\n`;
  md += `| Routes API | ${(byCategory['api-route'] || []).length} |\n`;
  md += `| Fichiers client ('use client') | ${allNodes.filter(n => n.meta.isClient).length} |\n`;
  md += `| Fichiers SSG (generateStaticParams) | ${allNodes.filter(n => n.meta.rendering === 'SSG').length} |\n`;
  md += `| Fichiers utilisant Supabase | ${allNodes.filter(n => n.meta.supabaseTables?.length).length} |\n`;
  md += `| Fichiers utilisant Claude API | ${allNodes.filter(n => n.meta.usesClaudeAPI).length} |\n\n`;

  // Tables Supabase utilisées
  const allTables = new Set();
  allNodes.forEach(n => (n.meta.supabaseTables || []).forEach(t => allTables.add(t)));
  if (allTables.size) {
    md += `## Tables Supabase référencées\n\n`;
    md += [...allTables].sort().map(t => `- \`${t}\``).join('\n');
    md += '\n\n';
  }

  // Par domaine
  md += `## Par domaine\n\n`;
  for (const dom of domainOrder) {
    const nodes = byDomain[dom];
    if (!nodes || nodes.length === 0) continue;
    md += `### ${dom} (${nodes.length} fichiers)\n\n`;
    const sorted = nodes.sort((a, b) => a.id.localeCompare(b.id));
    for (const n of sorted) {
      const flags = [];
      if (n.meta.isClient) flags.push('client');
      if (n.meta.rendering === 'SSG') flags.push('SSG');
      if (n.meta.usesClaudeAPI) flags.push('Claude API');
      if (n.meta.usesStripe) flags.push('Stripe');
      if (n.meta.supabaseTables?.length) flags.push(`DB:${n.meta.supabaseTables.join(',')}`);
      if (n.meta.httpMethods?.length) flags.push(n.meta.httpMethods.join('|'));
      const flagStr = flags.length ? ` · \`${flags.join(' · ')}\`` : '';
      md += `- [\`${n.id}\`](../${n.id}) — ${n.lines} lignes${flagStr}\n`;
      if (n.deps.length) {
        md += `  - dépend de : ${n.deps.slice(0, 5).map(d => `\`${d}\``).join(', ')}${n.deps.length > 5 ? ` +${n.deps.length - 5}` : ''}\n`;
      }
    }
    md += '\n';
  }

  // Fichiers les plus connectés (hub files)
  md += `## Fichiers les plus importés (hubs)\n\n`;
  const importCounts = {};
  for (const n of allNodes) {
    for (const dep of n.deps) {
      importCounts[dep] = (importCounts[dep] || 0) + 1;
    }
  }
  const hubs = Object.entries(importCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [file, count] of hubs) {
    md += `- \`${file}\` — importé par **${count}** fichiers\n`;
  }
  md += '\n';

  // Routes API
  md += `## Routes API\n\n`;
  const apiRoutes = (byCategory['api-route'] || []).sort((a, b) => a.id.localeCompare(b.id));
  for (const n of apiRoutes) {
    const methods = n.meta.httpMethods?.join(', ') || '?';
    const tables = n.meta.supabaseTables?.join(', ') || '-';
    md += `- \`${n.id.replace('app/api/', '/api/')}\` — \`${methods}\` · tables: ${tables}\n`;
  }
  md += '\n';

  md += `---\n*Mis à jour avec \`node scripts/graphify.mjs\`*\n`;
  return md;
}

// ── Main ───────────────────────────────────────────────────────────────────────
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let existingNodes = {};
  let lastMtime = 0;

  if (UPDATE_MODE && fs.existsSync(GRAPH_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
      existingNodes = existing.nodes || {};
      lastMtime = existing.generatedAt || 0;
      console.log(`[graphify] Mode update — base: ${Object.keys(existingNodes).length} nœuds`);
    } catch {
      console.warn('[graphify] graph.json invalide, scan complet');
    }
  }

  console.log('[graphify] Scan du projet…');
  const allFiles = scanDir(ROOT);

  let filesToScan = allFiles;
  if (UPDATE_MODE && lastMtime > 0) {
    filesToScan = allFiles.filter(f => {
      try { return fs.statSync(f).mtimeMs > lastMtime; }
      catch { return true; }
    });
    console.log(`[graphify] Fichiers modifiés depuis dernier scan: ${filesToScan.length}`);
  }

  const nodes = buildGraph(filesToScan, existingNodes);

  // Calcul des dépendants (qui importe ce fichier)
  const importedBy = {};
  for (const [id, node] of Object.entries(nodes)) {
    for (const dep of node.deps) {
      (importedBy[dep] = importedBy[dep] || []).push(id);
    }
  }
  for (const [id, node] of Object.entries(nodes)) {
    node.importedBy = importedBy[id] || [];
  }

  const graph = {
    version: 2,
    project: 'NIKA',
    generatedAt: Date.now(),
    nodeCount: Object.keys(nodes).length,
    nodes,
  };

  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2));
  console.log(`[graphify] ✓ graph.json — ${graph.nodeCount} nœuds`);

  const report = generateReport(nodes);
  fs.writeFileSync(REPORT_FILE, report);
  console.log(`[graphify] ✓ GRAPH_REPORT.md`);

  // HTML interactif simple
  const htmlFile = path.join(OUT_DIR, 'graph.html');
  const htmlContent = generateHTML(nodes);
  fs.writeFileSync(htmlFile, htmlContent);
  console.log(`[graphify] ✓ graph.html`);

  console.log(`\n✅ Carte générée dans graphify-out/`);
  console.log(`   → GRAPH_REPORT.md  (lecture rapide)`);
  console.log(`   → graph.json       (requêtes précises)`);
  console.log(`   → graph.html       (visualisation)`);
}

// ── HTML interactif ────────────────────────────────────────────────────────────
function generateHTML(nodes) {
  const allNodes = Object.values(nodes);
  const DOMAIN_COLORS = {
    CORE: '#E07038', SHARED: '#0EA87A', DATA: '#D4A017',
    STAY: '#3B82F6', FOOD: '#EF4444', AUTO: '#8B5CF6',
    AZUR: '#06B6D4', NIKO: '#10B981', PRO: '#F59E0B',
    ADMIN: '#6B7280', SCRIPTS: '#9CA3AF', NFC: '#EC4899',
    RENT: '#84CC16', NEWS: '#F97316', SERV: '#14B8A6',
    LEARN: '#A78BFA', SEC: '#DC2626',
  };

  const tableRows = allNodes
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(n => {
      const color = DOMAIN_COLORS[n.domain] || '#888';
      const flags = [
        n.meta.isClient ? '⚡client' : '',
        n.meta.rendering === 'SSG' ? '📄SSG' : '',
        n.meta.usesClaudeAPI ? '🤖AI' : '',
        n.meta.usesStripe ? '💳' : '',
        (n.meta.supabaseTables || []).length ? '🗄️DB' : '',
      ].filter(Boolean).join(' ');
      return `<tr>
        <td><span class="domain-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${n.domain}</span></td>
        <td class="file-id">${n.id}</td>
        <td>${n.category}</td>
        <td>${n.lines}</td>
        <td>${flags}</td>
        <td>${n.deps.length}</td>
        <td>${n.importedBy.length}</td>
      </tr>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>NIKA — Carte du projet</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'SF Mono', 'Fira Code', monospace; background: #060A14; color: #C4CDD6; font-size: 12px; }
  header { padding: 1.5rem 2rem; border-bottom: 1px solid #1E2A3A; display: flex; align-items: center; gap: 1rem; }
  header h1 { font-family: sans-serif; font-size: 20px; font-weight: 900; font-style: italic; color: #E07038; }
  header span { color: #5A7080; font-size: 11px; }
  .search-bar { padding: 0.8rem 2rem; background: #080E1A; border-bottom: 1px solid #1E2A3A; }
  .search-bar input { width: 100%; max-width: 500px; padding: 6px 12px; background: #0D1826; border: 1px solid #1E2A3A; color: #C4CDD6; border-radius: 4px; font-size: 12px; font-family: inherit; }
  .search-bar input:focus { outline: none; border-color: #E07038; }
  table { width: 100%; border-collapse: collapse; }
  th { padding: 8px 12px; text-align: left; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #5A7080; border-bottom: 1px solid #1E2A3A; background: #080E1A; position: sticky; top: 0; }
  td { padding: 5px 12px; border-bottom: 1px solid #0D1826; vertical-align: middle; }
  tr:hover td { background: #0D1826; }
  .file-id { color: #7BAFD4; font-size: 11px; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .domain-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; padding: 2px 6px; border-radius: 10px; white-space: nowrap; }
  #count { color: #5A7080; font-size: 11px; padding: 6px 2rem; }
</style>
</head>
<body>
<header>
  <h1>NIKA</h1>
  <span>Carte du projet · ${allNodes.length} fichiers · ${new Date().toLocaleDateString('fr-FR')}</span>
</header>
<div class="search-bar">
  <input type="text" id="search" placeholder="Filtrer par nom, domaine, catégorie…" oninput="filterTable()">
</div>
<div id="count">${allNodes.length} fichiers</div>
<table id="table">
  <thead><tr>
    <th>Domaine</th><th>Fichier</th><th>Catégorie</th><th>Lignes</th><th>Flags</th><th>Dépend de</th><th>Importé par</th>
  </tr></thead>
  <tbody id="tbody">${tableRows}</tbody>
</table>
<script>
function filterTable() {
  const q = document.getElementById('search').value.toLowerCase();
  const rows = document.querySelectorAll('#tbody tr');
  let visible = 0;
  rows.forEach(r => {
    const show = !q || r.textContent.toLowerCase().includes(q);
    r.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  document.getElementById('count').textContent = visible + ' fichiers';
}
</script>
</body>
</html>`;
}

main();
