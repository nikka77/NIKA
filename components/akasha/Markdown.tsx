// components/akasha/Markdown.tsx — mini-renderer Markdown → JSX, SANS dépendance.
// Sous-ensemble : titres (#..######), gras **, italique *, code `, liens [t](u), listes, paragraphes.
// Pas de dangerouslySetInnerHTML : on construit des nœuds React (sûr par construction).
import type { ReactNode } from 'react';

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[1]) {
      const href = m[3];
      const isExternal = /^https?:/.test(href);
      const safe = isExternal || href.startsWith('/') ? href : '#';
      nodes.push(
        <a
          key={key}
          href={safe}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          style={{ color: 'var(--purple)', textDecoration: 'underline' }}
        >
          {m[2]}
        </a>,
      );
    } else if (m[4]) {
      nodes.push(
        <strong key={key} style={{ color: 'var(--td)', fontWeight: 700 }}>
          {m[5]}
        </strong>,
      );
    } else if (m[6]) {
      nodes.push(<em key={key}>{m[7]}</em>);
    } else if (m[8]) {
      nodes.push(
        <code
          key={key}
          style={{ fontFamily: 'monospace', fontSize: '0.9em', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}
        >
          {m[9]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const HEADING_SIZES = [26, 22, 18, 16, 15, 14];
const isHeading = (l: string) => /^#{1,6}\s+/.test(l);
const isUl = (l: string) => /^\s*[-*]\s+/.test(l);
const isOl = (l: string) => /^\s*\d+\.\s+/.test(l);

export default function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let b = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      blocks.push(
        <p
          key={`b${b++}`}
          style={{
            fontFamily: 'var(--fe)',
            fontStyle: 'italic',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: 'var(--td)',
            fontSize: HEADING_SIZES[level - 1],
            margin: '1.4rem 0 0.6rem',
            lineHeight: 1.15,
          }}
        >
          {renderInline(h[2], `h${b}`)}
        </p>,
      );
      i++;
      continue;
    }

    if (isUl(line)) {
      const items: string[] = [];
      while (i < lines.length && isUl(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`b${b++}`} style={{ margin: '0.3rem 0 0.9rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((it, k) => (
            <li key={k} style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.6 }}>
              {renderInline(it, `li${b}-${k}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (isOl(line)) {
      const items: string[] = [];
      while (i < lines.length && isOl(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`b${b++}`} style={{ margin: '0.3rem 0 0.9rem', paddingLeft: '1.3rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((it, k) => (
            <li key={k} style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.6 }}>
              {renderInline(it, `oli${b}-${k}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isHeading(lines[i]) && !isUl(lines[i]) && !isOl(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`b${b++}`} style={{ fontFamily: 'var(--fo)', fontSize: 14.5, color: 'var(--td2)', lineHeight: 1.75, margin: '0 0 0.9rem' }}>
        {renderInline(para.join(' '), `p${b}`)}
      </p>,
    );
  }

  return <div className="akasha-md">{blocks}</div>;
}
