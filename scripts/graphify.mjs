#!/usr/bin/env node
/**
 * NIKA Graphify v2 — inspired by github.com/safishamsi/graphify
 *
 * Usage:
 *   node scripts/graphify.mjs              # scan complet
 *   node scripts/graphify.mjs --update     # incrémental (cache SHA256)
 *   node scripts/graphify.mjs --watch      # watch mode (rebuild on change)
 *   node scripts/graphify.mjs --query "supabase auth"
 *   node scripts/graphify.mjs --path lib/store.ts app/niko/page.tsx
 *   node scripts/graphify.mjs --affected lib/supabase/client.ts
 *   node scripts/graphify.mjs --cycles     # détecte les imports circulaires
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'graphify-out');
const GRAPH_FILE = path.join(OUT_DIR, 'graph.json');
const CACHE_FILE = path.join(OUT_DIR, '.cache.json');
const REPORT_FILE = path.join(OUT_DIR, 'GRAPH_REPORT.md');
const MERMAID_FILE = path.join(OUT_DIR, 'architecture.md');

const ARGS = process.argv.slice(2);
const MODE_UPDATE   = ARGS.includes('--update');
const MODE_WATCH    = ARGS.includes('--watch');
const MODE_CYCLES   = ARGS.includes('--cycles');
const QUERY_IDX     = ARGS.indexOf('--query');
const PATH_IDX      = ARGS.indexOf('--path');
const AFFECTED_IDX  = ARGS.indexOf('--affected');
const QUERY_TERM    = QUERY_IDX  !== -1 ? ARGS[QUERY_IDX + 1]  : null;
const PATH_FROM     = PATH_IDX   !== -1 ? ARGS[PATH_IDX + 1]   : null;
const PATH_TO       = PATH_IDX   !== -1 ? ARGS[PATH_IDX + 2]   : null;
const AFFECTED_FILE = AFFECTED_IDX !== -1 ? ARGS[AFFECTED_IDX + 1] : null;

// ── Config ─────────────────────────────────────────────────────────────────────
const IGNORE_DIRS = new Set([
  'node_modules', '.next', '.git', '.agents', 'graphify-out',
  'public', '.vercel', 'coverage', 'dist', 'build', 'out',
]);
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json']);
const SKIP_FILES = new Set([
  'package-lock.json', 'tsconfig.tsbuildinfo', 'next-env.d.ts',
]);

// ── Catégories ─────────────────────────────────────────────────────────────────
function categorize(rel) {
  if (rel.startsWith('app/api/'))                         return 'api-route';
  if (rel.includes('/page.tsx') || rel.includes('/page.ts')) return 'page';
  if (rel.includes('/layout.tsx'))                        return 'layout';
  if (rel.includes('/loading.tsx'))                       return 'loading';
  if (rel.includes('/error.tsx'))                         return 'error';
  if (rel.startsWith('app/') && rel.endsWith('.tsx'))     return 'page-component';
  if (rel.startsWith('components/'))                      return 'component';
  if (rel.startsWith('lib/supabase/'))                    return 'supabase';
  if (rel.startsWith('lib/'))                             return 'lib';
  if (rel.startsWith('scripts/'))                         return 'script';
  if (rel.startsWith('data/'))                            return 'data';
  if (rel === 'proxy.ts')                                 return 'middleware';
  if (rel.endsWith('.json'))                              return 'config';
  return 'other';
}

function domain(rel) {
  const domains = ['food','auto','stay','azur','rent','serv','learn','sec','news','niko','nfc','pro'];
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

// ── SHA256 cache ───────────────────────────────────────────────────────────────
function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
  catch { return {}; }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ── graphifyignore ─────────────────────────────────────────────────────────────
function loadIgnore() {
  const ignoreFile = path.join(ROOT, '.graphifyignore');
  if (!fs.existsSync(ignoreFile)) return [];
  return fs.readFileSync(ignoreFile, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

function isIgnored(rel, patterns) {
  return patterns.some(p => rel.startsWith(p) || rel.includes(p));
}

// ── Extraction ─────────────────────────────────────────────────────────────────
function extractImports(content, filePath) {
  const imports = [];
  const re1 = /^(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  const re2 = /import\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re1.exec(content)) !== null) imports.push(m[1]);
  while ((m = re2.exec(content)) !== null) imports.push(m[1]);
  return imports;
}

function resolveImport(imp, fromFile) {
  if (!imp.startsWith('.') && !imp.startsWith('@/')) return null;
  let abs = imp.startsWith('@/')
    ? path.join(ROOT, imp.slice(2))
    : path.resolve(path.dirname(fromFile), imp);
  const tries = [abs, abs+'.ts', abs+'.tsx', abs+'.js',
    path.join(abs,'index.ts'), path.join(abs,'index.tsx')];
  for (const t of tries) {
    if (fs.existsSync(t)) return path.relative(ROOT, t);
  }
  return null;
}

function extractExports(content) {
  const out = new Set();
  const re1 = /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|type|interface)\s+(\w+)/gm;
  const re2 = /^export\s+\{([^}]+)\}/gm;
  let m;
  while ((m = re1.exec(content)) !== null) out.add(m[1]);
  while ((m = re2.exec(content)) !== null) {
    m[1].split(',').forEach(e => {
      const n = e.trim().split(/\s+as\s+/).pop().trim();
      if (n) out.add(n);
    });
  }
  return [...out];
}

function extractMeta(content, rel) {
  const meta = {};
  if (/^['"]use client['"]/.test(content)) meta.isClient = true;

  const tables = new Set();
  let m;
  const supaRe = /\.from\(['"](\w+)['"]\)/g;
  while ((m = supaRe.exec(content)) !== null) tables.add(m[1]);
  if (tables.size) meta.supabaseTables = [...tables];

  if (rel.startsWith('app/api/')) {
    const methods = ['GET','POST','PUT','PATCH','DELETE']
      .filter(v => new RegExp(`export\\s+(?:async\\s+)?function\\s+${v}`).test(content));
    if (methods.length) meta.httpMethods = methods;
  }

  if (content.includes('generateStaticParams')) meta.rendering = 'SSG';
  else if (meta.isClient) meta.rendering = 'Client';
  else meta.rendering = 'SSR';

  if (content.includes('wow_listings'))         meta.usesWowData = true;
  if (content.includes('@anthropic-ai/sdk') ||
      content.includes("from 'anthropic'"))     meta.usesClaudeAPI = true;
  if (content.includes('stripe'))               meta.usesStripe = true;
  if (content.includes('useStore') ||
      content.includes('zustand'))              meta.usesZustand = true;

  // Keyword tags for search
  const keywords = [];
  if (meta.usesClaudeAPI) keywords.push('claude', 'ai', 'anthropic');
  if (meta.usesStripe)    keywords.push('stripe', 'payment');
  if (meta.usesWowData)   keywords.push('wow', 'stay', 'listing');
  if (meta.supabaseTables?.length) keywords.push('database', 'supabase', ...meta.supabaseTables);
  meta.keywords = keywords;

  return meta;
}

// ── Scan ───────────────────────────────────────────────────────────────────────
function scanDir(dir, files = [], ignorePatterns = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return files; }
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const rel  = path.relative(ROOT, full);
    if (isIgnored(rel, ignorePatterns)) continue;
    if (e.isDirectory()) scanDir(full, files, ignorePatterns);
    else if (e.isFile()) {
      const ext = path.extname(e.name);
      if (!SCAN_EXTS.has(ext)) continue;
      if (SKIP_FILES.has(e.name)) continue;
      files.push(full);
    }
  }
  return files;
}

// ── Build nodes ────────────────────────────────────────────────────────────────
function buildGraph(allFiles, existingNodes = {}, cache = {}) {
  const nodes = { ...existingNodes };
  const newCache = { ...cache };

  for (const fullPath of allFiles) {
    const rel = path.relative(ROOT, fullPath);
    let content = '';
    try { content = fs.readFileSync(fullPath, 'utf8'); }
    catch { continue; }

    const hash = sha256(content);
    // Cache hit — reuse existing node
    if (cache[rel]?.hash === hash && existingNodes[rel]) {
      newCache[rel] = { hash };
      continue;
    }

    const stat = fs.statSync(fullPath);
    const cat  = categorize(rel);
    const dom  = domain(rel);
    const imports = cat !== 'config' ? extractImports(content, fullPath) : [];
    const exports = cat !== 'config' ? extractExports(content) : [];
    const meta    = cat !== 'config' ? extractMeta(content, rel) : {};
    const lines   = content.split('\n').length;

    const deps = [...new Set(
      imports.map(imp => resolveImport(imp, fullPath)).filter(Boolean).filter(r => r !== rel)
    )];

    nodes[rel] = { id: rel, category: cat, domain: dom, lines, exports, deps, meta, mtime: stat.mtimeMs };
    newCache[rel] = { hash };
  }

  // Compute importedBy (reverse edges)
  const importedBy = {};
  for (const [id, node] of Object.entries(nodes)) {
    for (const dep of node.deps) {
      (importedBy[dep] = importedBy[dep] || []).push(id);
    }
  }
  for (const node of Object.values(nodes)) {
    node.importedBy = importedBy[node.id] || [];
  }

  return { nodes, cache: newCache };
}

// ── Cycle detection (DFS) ──────────────────────────────────────────────────────
function detectCycles(nodes) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  const cycles = [];

  function dfs(id, stack) {
    color[id] = GRAY;
    stack.push(id);
    for (const dep of (nodes[id]?.deps || [])) {
      if (!nodes[dep]) continue;
      if (color[dep] === GRAY) {
        const cycleStart = stack.indexOf(dep);
        cycles.push(stack.slice(cycleStart).concat(dep));
      } else if (color[dep] !== BLACK) {
        dfs(dep, stack);
      }
    }
    stack.pop();
    color[id] = BLACK;
  }

  for (const id of Object.keys(nodes)) {
    if (!color[id]) dfs(id, []);
  }
  return cycles.slice(0, 20); // cap at 20
}

// ── God nodes ──────────────────────────────────────────────────────────────────
function godNodes(nodes, top = 10) {
  return Object.values(nodes)
    .filter(n => !['config', 'data', 'script'].includes(n.category))
    .sort((a, b) => b.importedBy.length - a.importedBy.length)
    .slice(0, top)
    .map(n => ({ id: n.id, importedBy: n.importedBy.length, domain: n.domain }));
}

// ── Surprising connections (cross-domain edges) ────────────────────────────────
function surprisingConnections(nodes, top = 10) {
  const scored = [];
  for (const node of Object.values(nodes)) {
    for (const dep of node.deps) {
      const depNode = nodes[dep];
      if (!depNode) continue;
      if (node.domain !== depNode.domain) {
        scored.push({
          from: node.id, to: dep,
          fromDomain: node.domain, toDomain: depNode.domain,
          score: (node.importedBy.length + depNode.importedBy.length),
        });
      }
    }
  }
  // Deduplicate (ignore direction) and sort by score desc
  const seen = new Set();
  const unique = scored.filter(e => {
    const key = [e.from, e.to].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  return unique.sort((a, b) => b.score - a.score).slice(0, top);
}

// ── BFS shortest path ──────────────────────────────────────────────────────────
function shortestPath(nodes, fromId, toId) {
  // Normalize partial input to full path
  const allIds = Object.keys(nodes);
  const findId = (q) => allIds.find(id => id === q || id.endsWith(q) || id.includes(q)) || q;
  const src = findId(fromId);
  const dst = findId(toId);

  if (!nodes[src]) return { error: `Not found: ${src}` };
  if (!nodes[dst]) return { error: `Not found: ${dst}` };
  if (src === dst) return { path: [src] };

  // BFS on undirected graph (deps + importedBy)
  const visited = new Map([[src, null]]);
  const queue = [src];
  while (queue.length) {
    const cur = queue.shift();
    const neighbors = [
      ...(nodes[cur]?.deps || []),
      ...(nodes[cur]?.importedBy || []),
    ];
    for (const n of neighbors) {
      if (!nodes[n] || visited.has(n)) continue;
      visited.set(n, cur);
      if (n === dst) {
        // Reconstruct
        const path = [];
        let c = dst;
        while (c !== null) { path.unshift(c); c = visited.get(c); }
        return { path, length: path.length - 1 };
      }
      queue.push(n);
    }
  }
  return { error: `No path found from ${src} to ${dst}` };
}

// ── Affected files (reverse deps BFS) ─────────────────────────────────────────
function affectedFiles(nodes, fileId) {
  const allIds = Object.keys(nodes);
  const target = allIds.find(id => id === fileId || id.endsWith(fileId) || id.includes(fileId));
  if (!target) return { error: `Not found: ${fileId}` };

  const visited = new Set([target]);
  const queue = [target];
  const affected = [];

  while (queue.length) {
    const cur = queue.shift();
    for (const importer of (nodes[cur]?.importedBy || [])) {
      if (!visited.has(importer)) {
        visited.add(importer);
        affected.push(importer);
        queue.push(importer);
      }
    }
  }
  return { target, affected, count: affected.length };
}

// ── Query (keyword search + BFS neighborhood) ──────────────────────────────────
function queryGraph(nodes, term) {
  const q = term.toLowerCase();
  const scored = Object.values(nodes).map(n => {
    let score = 0;
    if (n.id.toLowerCase().includes(q))           score += 10;
    if (n.domain.toLowerCase().includes(q))        score += 5;
    if (n.category.toLowerCase().includes(q))      score += 3;
    if ((n.meta.keywords || []).some(k => k.includes(q))) score += 8;
    if ((n.exports || []).some(e => e.toLowerCase().includes(q))) score += 6;
    if ((n.meta.supabaseTables || []).some(t => t.includes(q))) score += 7;
    return { ...n, score };
  }).filter(n => n.score > 0).sort((a, b) => b.score - a.score).slice(0, 15);

  return scored.map(n => ({
    file: n.id, domain: n.domain, category: n.category, score: n.score,
    deps: n.deps.length, importedBy: n.importedBy.length,
  }));
}

// ── Mermaid architecture diagram ───────────────────────────────────────────────
function generateMermaid(nodes) {
  const domainNodes = {};
  for (const n of Object.values(nodes)) {
    if (['config','script','data'].includes(n.category)) continue;
    (domainNodes[n.domain] = domainNodes[n.domain] || []).push(n);
  }

  // Cross-domain edges only (to keep diagram readable)
  const crossEdges = new Set();
  for (const n of Object.values(nodes)) {
    for (const dep of n.deps) {
      const depNode = nodes[dep];
      if (!depNode) continue;
      if (n.domain !== depNode.domain) {
        crossEdges.add(`  ${n.domain} --> ${depNode.domain}`);
      }
    }
  }

  const domainOrder = ['CORE','SHARED','FOOD','AUTO','STAY','AZUR','RENT','SERV',
    'LEARN','SEC','NEWS','NIKO','NFC','PRO','ADMIN'];
  const presentDomains = domainOrder.filter(d => domainNodes[d]);

  let md = `# NIKA — Architecture Diagram\n\n\`\`\`mermaid\ngraph TD\n`;
  for (const d of presentDomains) {
    const count = domainNodes[d]?.length || 0;
    md += `  ${d}["${d}<br/>${count} files"]\n`;
  }
  md += '\n';
  for (const edge of [...crossEdges].sort()) md += edge + '\n';
  md += '```\n\n';

  // Per-domain file list
  md += `## Files per Domain\n\n`;
  for (const d of presentDomains) {
    const files = domainNodes[d] || [];
    md += `### ${d} (${files.length})\n`;
    for (const f of files.sort((a,b) => b.importedBy.length - a.importedBy.length).slice(0, 8)) {
      md += `- \`${f.id}\`${f.importedBy.length ? ` ← ${f.importedBy.length} importers` : ''}\n`;
    }
    if (files.length > 8) md += `- …and ${files.length - 8} more\n`;
    md += '\n';
  }
  return md;
}

// ── GRAPH_REPORT.md ────────────────────────────────────────────────────────────
function generateReport(nodes, cycles, gods, surprising) {
  const all = Object.values(nodes);
  const byDom = {}, byCat = {};
  for (const n of all) {
    (byDom[n.domain] = byDom[n.domain] || []).push(n);
    (byCat[n.category] = byCat[n.category] || []).push(n);
  }

  const domOrder = ['CORE','SHARED','DATA','FOOD','AUTO','STAY','AZUR','RENT','SERV',
    'LEARN','SEC','NEWS','NIKO','NFC','PRO','ADMIN','SCRIPTS'];

  let md = `# NIKA — Carte du projet (graphify v2)\n\n`;
  md += `> Généré le ${new Date().toLocaleString('fr-FR')} · ${all.length} fichiers · cache SHA256\n\n`;

  // Stats
  md += `## Vue d'ensemble\n\n`;
  md += `| Métrique | Valeur |\n|---|---|\n`;
  md += `| Fichiers total | ${all.length} |\n`;
  md += `| Pages | ${(byCat['page']||[]).length} |\n`;
  md += `| Composants | ${(byCat['component']||[]).length} |\n`;
  md += `| Routes API | ${(byCat['api-route']||[]).length} |\n`;
  md += `| Client components | ${all.filter(n=>n.meta.isClient).length} |\n`;
  md += `| SSG | ${all.filter(n=>n.meta.rendering==='SSG').length} |\n`;
  md += `| Supabase | ${all.filter(n=>n.meta.supabaseTables?.length).length} |\n`;
  md += `| Claude API | ${all.filter(n=>n.meta.usesClaudeAPI).length} |\n`;
  md += `| Cycles détectés | ${cycles.length} |\n\n`;

  // God nodes
  md += `## God nodes (fichiers les plus importés)\n\n`;
  for (const g of gods) {
    md += `- \`${g.id}\` — **${g.importedBy}** importeurs · ${g.domain}\n`;
  }
  md += '\n';

  // Surprising connections
  if (surprising.length) {
    md += `## Connexions surprenantes (cross-domain)\n\n`;
    for (const e of surprising) {
      md += `- \`${e.from}\` → \`${e.to}\` _(${e.fromDomain} → ${e.toDomain})_\n`;
    }
    md += '\n';
  }

  // Cycles
  if (cycles.length) {
    md += `## ⚠️ Imports circulaires (${cycles.length})\n\n`;
    for (const c of cycles) {
      md += `- ${c.map(f=>`\`${f}\``).join(' → ')}\n`;
    }
    md += '\n';
  }

  // Supabase tables
  const allTables = new Set();
  all.forEach(n => (n.meta.supabaseTables||[]).forEach(t => allTables.add(t)));
  if (allTables.size) {
    md += `## Tables Supabase\n\n`;
    md += [...allTables].sort().map(t => `- \`${t}\``).join('\n') + '\n\n';
  }

  // Routes API
  md += `## Routes API\n\n`;
  for (const n of (byCat['api-route']||[]).sort((a,b)=>a.id.localeCompare(b.id))) {
    const methods = n.meta.httpMethods?.join(', ') || '?';
    const tables  = n.meta.supabaseTables?.join(', ') || '-';
    md += `- \`${n.id.replace('app/api/','/api/')}\` — \`${methods}\` · ${tables}\n`;
  }
  md += '\n';

  // By domain
  md += `## Par domaine\n\n`;
  for (const dom of domOrder) {
    const dns = byDom[dom];
    if (!dns?.length) continue;
    md += `### ${dom} (${dns.length})\n\n`;
    for (const n of dns.sort((a,b)=>a.id.localeCompare(b.id))) {
      const flags = [
        n.meta.isClient ? 'client' : '',
        n.meta.rendering === 'SSG' ? 'SSG' : '',
        n.meta.usesClaudeAPI ? 'Claude' : '',
        n.meta.usesStripe ? 'Stripe' : '',
        n.meta.supabaseTables?.length ? `DB:${n.meta.supabaseTables.join(',')}` : '',
        n.meta.httpMethods?.join('|') || '',
      ].filter(Boolean);
      const flagStr = flags.length ? ` · \`${flags.join(' ')}\`` : '';
      md += `- [\`${n.id}\`](../${n.id}) — ${n.lines}L · ↑${n.importedBy.length}${flagStr}\n`;
    }
    md += '\n';
  }

  md += `---\n*Commandes : \`node scripts/graphify.mjs [--update|--watch|--query "term"|--path a b|--affected f|--cycles]\`*\n`;
  return md;
}

// ── HTML interactive ───────────────────────────────────────────────────────────
function generateHTML(nodes, gods, surprising, cycles) {
  const all = Object.values(nodes);
  const DC = {
    CORE:'#E07038',SHARED:'#0EA87A',DATA:'#D4A017',STAY:'#3B82F6',
    FOOD:'#EF4444',AUTO:'#8B5CF6',AZUR:'#06B6D4',NIKO:'#10B981',
    PRO:'#F59E0B',ADMIN:'#6B7280',SCRIPTS:'#9CA3AF',NFC:'#EC4899',
    RENT:'#84CC16',NEWS:'#F97316',SERV:'#14B8A6',LEARN:'#A78BFA',SEC:'#DC2626',
  };

  const rows = all.sort((a,b)=>b.importedBy.length-a.importedBy.length).map(n => {
    const c = DC[n.domain] || '#888';
    const flags = [
      n.meta.isClient ? '⚡' : '',
      n.meta.rendering==='SSG' ? '📄' : '',
      n.meta.usesClaudeAPI ? '🤖' : '',
      n.meta.usesStripe ? '💳' : '',
      n.meta.supabaseTables?.length ? '🗄️' : '',
      n.importedBy.length > 5 ? '⭐' : '',
    ].join('');
    const isGod = gods.some(g=>g.id===n.id);
    return `<tr class="row" data-id="${n.id}" data-text="${n.id} ${n.domain} ${n.category} ${(n.meta.keywords||[]).join(' ')}">
      <td><span class="badge" style="background:${c}18;color:${c};border:1px solid ${c}38">${n.domain}</span></td>
      <td class="fid${isGod?' god':''}">${n.id}</td>
      <td style="color:#5A7080">${n.category}</td>
      <td style="text-align:right">${n.lines}</td>
      <td style="text-align:center">${flags}</td>
      <td style="text-align:right;color:#0EA87A">${n.importedBy.length}</td>
      <td style="text-align:right;color:#5A7080">${n.deps.length}</td>
    </tr>`;
  }).join('');

  const godsHTML = gods.map(g =>
    `<div class="god-card" onclick="filterBy('${g.id}')">${g.id}<br><small>${g.importedBy} importeurs</small></div>`
  ).join('');

  const surprHTML = surprising.map(e =>
    `<div class="surp-item"><span class="badge-sm" style="color:${DC[e.fromDomain]||'#888'}">${e.fromDomain}</span> → <span class="badge-sm" style="color:${DC[e.toDomain]||'#888'}">${e.toDomain}</span><br><small>${e.from.split('/').pop()} → ${e.to.split('/').pop()}</small></div>`
  ).join('');

  const cycleHTML = cycles.length
    ? cycles.slice(0,5).map(c => `<div class="cycle">⚠️ ${c.join(' → ')}</div>`).join('')
    : '<div style="color:#0EA87A">Aucun cycle détecté ✓</div>';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>NIKA — Graphify v2</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'SF Mono','Fira Code',monospace;background:#060A14;color:#C4CDD6;font-size:12px;display:flex;flex-direction:column;height:100vh}
header{padding:12px 20px;border-bottom:1px solid #1E2A3A;display:flex;align-items:center;gap:12px;flex-shrink:0}
h1{font-family:sans-serif;font-size:18px;font-weight:900;font-style:italic;color:#E07038}
.subtitle{color:#5A7080;font-size:11px}
.toolbar{padding:8px 20px;background:#080E1A;border-bottom:1px solid #1E2A3A;display:flex;gap:10px;align-items:center;flex-shrink:0;flex-wrap:wrap}
input[type=text]{padding:5px 10px;background:#0D1826;border:1px solid #1E2A3A;color:#C4CDD6;border-radius:4px;font-size:12px;font-family:inherit;width:280px}
input[type=text]:focus{outline:none;border-color:#E07038}
.count{color:#5A7080;font-size:11px;margin-left:auto}
.main{display:flex;flex:1;overflow:hidden}
.sidebar{width:240px;flex-shrink:0;border-right:1px solid #1E2A3A;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:16px}
.sidebar-section h3{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5A7080;margin-bottom:8px}
.god-card{padding:6px 8px;background:#0D1826;border:1px solid #1E2A3A;border-radius:4px;cursor:pointer;margin-bottom:4px;font-size:10px;color:#7BAFD4;line-height:1.4}
.god-card:hover{border-color:#E07038;color:#E07038}
.surp-item{padding:5px 0;border-bottom:1px solid #0D1826;font-size:10px;line-height:1.5}
.badge-sm{font-size:9px;font-weight:700}
.cycle{font-size:10px;color:#EF4444;padding:3px 0;line-height:1.4;word-break:break-all}
.table-wrap{flex:1;overflow:auto}
table{width:100%;border-collapse:collapse}
th{padding:7px 10px;text-align:left;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#5A7080;border-bottom:1px solid #1E2A3A;background:#080E1A;position:sticky;top:0;cursor:pointer;user-select:none}
th:hover{color:#E07038}
td{padding:4px 10px;border-bottom:1px solid #0A1020;vertical-align:middle}
.row:hover td{background:#0D1826}
.row.highlight td{background:#1A2A18}
.fid{color:#7BAFD4;font-size:11px;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fid.god{color:#E07038;font-weight:700}
.badge{font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap}
.detail-panel{position:fixed;right:0;top:0;bottom:0;width:320px;background:#080E1A;border-left:1px solid #1E2A3A;padding:16px;overflow-y:auto;display:none;z-index:100}
.detail-panel.open{display:block}
.detail-panel h2{font-size:12px;color:#E07038;margin-bottom:12px;word-break:break-all}
.detail-row{display:flex;gap:8px;margin-bottom:6px;font-size:11px}
.detail-label{color:#5A7080;min-width:80px;flex-shrink:0}
.close-btn{position:absolute;top:12px;right:12px;background:none;border:none;color:#5A7080;cursor:pointer;font-size:16px}
.dep-link{display:block;color:#7BAFD4;padding:2px 0;font-size:10px;cursor:pointer}
.dep-link:hover{color:#E07038}
</style>
</head>
<body>
<header>
  <h1>NIKA</h1>
  <span class="subtitle">Graphify v2 · ${all.length} fichiers · ${new Date().toLocaleDateString('fr-FR')}</span>
</header>
<div class="toolbar">
  <input type="text" id="search" placeholder="Filtrer fichiers, domaines, catégories, tables…" oninput="filterTable()">
  <button onclick="clearFilter()" style="padding:5px 10px;background:#0D1826;border:1px solid #1E2A3A;color:#5A7080;border-radius:4px;cursor:pointer;font-size:11px">✕ Reset</button>
  <span class="count" id="count">${all.length} fichiers</span>
</div>
<div class="main">
  <div class="sidebar">
    <div class="sidebar-section">
      <h3>⭐ God Nodes</h3>
      ${godsHTML}
    </div>
    <div class="sidebar-section">
      <h3>🔀 Cross-Domain</h3>
      ${surprHTML}
    </div>
    <div class="sidebar-section">
      <h3>🔁 Cycles</h3>
      ${cycleHTML}
    </div>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th onclick="sortBy('domain')">Domaine</th>
        <th onclick="sortBy('id')">Fichier</th>
        <th onclick="sortBy('category')">Type</th>
        <th onclick="sortBy('lines')" style="text-align:right">Lignes</th>
        <th style="text-align:center">Flags</th>
        <th onclick="sortBy('importedBy')" style="text-align:right" title="Nombre de fichiers qui importent ce fichier">↑ Impor.</th>
        <th onclick="sortBy('deps')" style="text-align:right">Dépend</th>
      </tr></thead>
      <tbody id="tbody">${rows}</tbody>
    </table>
  </div>
</div>

<div class="detail-panel" id="detail">
  <button class="close-btn" onclick="closeDetail()">✕</button>
  <h2 id="d-title"></h2>
  <div id="d-body"></div>
</div>

<script>
const GRAPH = ${JSON.stringify(Object.fromEntries(
  Object.values(nodes).map(n => [n.id, { deps: n.deps, importedBy: n.importedBy, meta: n.meta, category: n.category, domain: n.domain, lines: n.lines, exports: n.exports }])
))};

let sortKey = 'importedBy', sortDir = -1;

function filterTable() {
  const q = document.getElementById('search').value.toLowerCase();
  const rows = document.querySelectorAll('.row');
  let v = 0;
  rows.forEach(r => {
    const show = !q || r.dataset.text.toLowerCase().includes(q);
    r.style.display = show ? '' : 'none';
    if (show) v++;
  });
  document.getElementById('count').textContent = v + ' fichiers';
}

function filterBy(id) {
  document.getElementById('search').value = id;
  filterTable();
}

function clearFilter() {
  document.getElementById('search').value = '';
  filterTable();
}

function sortBy(key) {
  if (sortKey === key) sortDir *= -1; else sortDir = -1;
  sortKey = key;
  const tbody = document.getElementById('tbody');
  const rows = [...tbody.querySelectorAll('.row')];
  rows.sort((a, b) => {
    let av = a.dataset[key] || a.querySelector('.fid')?.textContent || '';
    let bv = b.dataset[key] || b.querySelector('.fid')?.textContent || '';
    if (!isNaN(av) && !isNaN(bv)) return sortDir * (Number(av) - Number(bv));
    return sortDir * String(av).localeCompare(String(bv));
  });
  rows.forEach(r => tbody.appendChild(r));
}

document.getElementById('tbody').addEventListener('click', e => {
  const row = e.target.closest('.row');
  if (!row) return;
  showDetail(row.dataset.id);
});

function showDetail(id) {
  const n = GRAPH[id];
  if (!n) return;
  document.querySelectorAll('.row').forEach(r => r.classList.toggle('highlight', r.dataset.id === id));
  document.getElementById('d-title').textContent = id;
  const deps = n.deps.map(d => '<span class="dep-link" onclick="showDetail(\'' + d + '\')">' + d + '</span>').join('') || '<em style="color:#5A7080">aucune</em>';
  const importedBy = n.importedBy.map(d => '<span class="dep-link" onclick="showDetail(\'' + d + '\')">' + d + '</span>').join('') || '<em style="color:#5A7080">aucun</em>';
  const exports = n.exports?.join(', ') || '-';
  const tables = n.meta.supabaseTables?.join(', ') || '-';
  document.getElementById('d-body').innerHTML = \`
    <div class="detail-row"><span class="detail-label">Domaine</span><span>\${n.domain}</span></div>
    <div class="detail-row"><span class="detail-label">Catégorie</span><span>\${n.category}</span></div>
    <div class="detail-row"><span class="detail-label">Lignes</span><span>\${n.lines}</span></div>
    <div class="detail-row"><span class="detail-label">Rendu</span><span>\${n.meta.rendering||'?'}</span></div>
    <div class="detail-row"><span class="detail-label">Tables DB</span><span>\${tables}</span></div>
    <div class="detail-row"><span class="detail-label">Exports</span><span style="font-size:10px">\${exports}</span></div>
    <div class="detail-row" style="flex-direction:column"><span class="detail-label" style="margin-bottom:4px">↓ Dépend de (\${n.deps.length})</span>\${deps}</div>
    <div class="detail-row" style="flex-direction:column"><span class="detail-label" style="margin-bottom:4px">↑ Importé par (\${n.importedBy.length})</span>\${importedBy}</div>
  \`;
  document.getElementById('detail').classList.add('open');
}

function closeDetail() {
  document.getElementById('detail').classList.remove('open');
  document.querySelectorAll('.row').forEach(r => r.classList.remove('highlight'));
}
</script>
</body>
</html>`;
}

// ── Watch mode ─────────────────────────────────────────────────────────────────
function watchMode() {
  console.log('[graphify] Watch mode actif — Ctrl+C pour arrêter\n');
  let debounceTimer = null;
  const changed = new Set();

  fs.watch(ROOT, { recursive: true }, (event, filename) => {
    if (!filename) return;
    const ext = path.extname(filename);
    if (!SCAN_EXTS.has(ext)) return;
    if ([...IGNORE_DIRS].some(d => filename.includes(d))) return;
    changed.add(filename);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`[graphify] Changement détecté: ${[...changed].join(', ')}`);
      changed.clear();
      runBuild(true);
    }, 800);
  });
}

// ── Main build ─────────────────────────────────────────────────────────────────
function runBuild(isUpdate = false) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const ignorePatterns = loadIgnore();
  const cache = loadCache();
  let existingNodes = {};

  if ((isUpdate || MODE_UPDATE) && fs.existsSync(GRAPH_FILE)) {
    try {
      existingNodes = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8')).nodes || {};
    } catch { /* scan complet */ }
  }

  const allFiles = scanDir(ROOT, [], ignorePatterns);
  console.log(`[graphify] ${isUpdate || MODE_UPDATE ? 'Update' : 'Scan'} — ${allFiles.length} fichiers trouvés`);

  const { nodes, cache: newCache } = buildGraph(allFiles, existingNodes, cache);
  saveCache(newCache);

  const cycles    = detectCycles(nodes);
  const gods      = godNodes(nodes);
  const surprising = surprisingConnections(nodes);

  // Outputs
  const graph = { version: 2, project: 'NIKA', generatedAt: Date.now(), nodeCount: Object.keys(nodes).length, nodes };
  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2));
  fs.writeFileSync(REPORT_FILE, generateReport(nodes, cycles, gods, surprising));
  fs.writeFileSync(path.join(OUT_DIR, 'graph.html'), generateHTML(nodes, gods, surprising, cycles));
  fs.writeFileSync(MERMAID_FILE, generateMermaid(nodes));

  console.log(`[graphify] ✓ ${Object.keys(nodes).length} nœuds · ${cycles.length} cycles · ${gods.length} god nodes`);
  console.log(`[graphify] → graphify-out/ (graph.json · GRAPH_REPORT.md · graph.html · architecture.md)`);
}

// ── Entry point ────────────────────────────────────────────────────────────────
async function main() {
  // Query modes (no rebuild needed if graph exists)
  if (QUERY_TERM) {
    if (!fs.existsSync(GRAPH_FILE)) { console.log('Run graphify first.'); process.exit(1); }
    const { nodes } = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
    const results = queryGraph(nodes, QUERY_TERM);
    console.log(`\nRésultats pour "${QUERY_TERM}" (${results.length}) :\n`);
    results.forEach(r => console.log(`  [${r.score}] ${r.file} — ${r.domain}/${r.category} ↑${r.importedBy}`));
    return;
  }

  if (PATH_FROM && PATH_TO) {
    if (!fs.existsSync(GRAPH_FILE)) { console.log('Run graphify first.'); process.exit(1); }
    const { nodes } = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
    const result = shortestPath(nodes, PATH_FROM, PATH_TO);
    if (result.error) console.log('❌', result.error);
    else console.log(`\nChemin (${result.length} sauts) :\n  ${result.path.join(' → ')}`);
    return;
  }

  if (AFFECTED_FILE) {
    if (!fs.existsSync(GRAPH_FILE)) { console.log('Run graphify first.'); process.exit(1); }
    const { nodes } = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
    const result = affectedFiles(nodes, AFFECTED_FILE);
    if (result.error) console.log('❌', result.error);
    else {
      console.log(`\nModifier "${result.target}" impacte ${result.count} fichier(s) :\n`);
      result.affected.forEach(f => console.log(' ', f));
    }
    return;
  }

  if (MODE_CYCLES) {
    if (!fs.existsSync(GRAPH_FILE)) { console.log('Run graphify first.'); process.exit(1); }
    const { nodes } = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
    const cycles = detectCycles(nodes);
    if (!cycles.length) { console.log('✓ Aucun cycle détecté'); return; }
    console.log(`\n⚠️ ${cycles.length} cycle(s) :\n`);
    cycles.forEach(c => console.log(' ', c.join(' → ')));
    return;
  }

  runBuild();
  if (MODE_WATCH) watchMode();
}

main().catch(console.error);
