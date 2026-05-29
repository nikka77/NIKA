'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'VTC pour l\'aéroport demain 6h',
  'Pizza à livrer maintenant',
  'Runner pour faire mes courses',
  'Où est ma commande ?',
];

const QUICK_REPLIES: Record<string, string[]> = {
  vtc: ['Maintenant', 'Planifier', 'Aéroport', 'Gare'],
  food: ['Pizza', 'Sushi', 'Burger', 'Voir tout'],
  track: ['Ma dernière commande', 'Mon chauffeur', 'Annuler'],
};

export default function NikoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setStarted(true);
    const userMsg: Message = { role: 'user', content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/niko', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const { text } = JSON.parse(data);
            if (text) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + text,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Désolé, connexion perdue. Réessaie dans un instant.',
        };
        return updated;
      });
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [messages, loading]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  const lastMsg = messages[messages.length - 1];
  const lastText = lastMsg?.content?.toLowerCase() || '';
  let quickReplies: string[] = [];
  if (lastText.includes('vtc') || lastText.includes('trajet')) quickReplies = QUICK_REPLIES.vtc;
  else if (lastText.includes('pizza') || lastText.includes('restaurant') || lastText.includes('livraison')) quickReplies = QUICK_REPLIES.food;
  else if (lastText.includes('commande') || lastText.includes('suivi')) quickReplies = QUICK_REPLIES.track;

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 54px)', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '1rem 1.4rem', borderBottom: '1px solid var(--bd)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--az), #0056A0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fn)', fontSize: 18, letterSpacing: '0.06em', color: '#fff' }}>N</div>
          <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: 'var(--teal)', border: '2px solid var(--bg2)' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 18, letterSpacing: '0.1em', color: 'var(--td)' }}>NIKO</div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--teal)' }}>En ligne · Nice, Antibes, Cannes</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['VTC', 'FOOD', 'COURSES'].map(tag => (
            <span key={tag} style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 20, background: 'rgba(0,148,212,0.08)', border: '1px solid rgba(0,148,212,0.2)', color: 'var(--az)' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!started && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1.8rem', padding: '2rem 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--az), #0056A0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fn)', fontSize: 32, letterSpacing: '0.06em', color: '#fff', margin: '0 auto 1rem', boxShadow: '0 0 32px rgba(0,148,212,0.25)' }}>N</div>
              <h1 style={{ fontFamily: 'var(--fn)', fontSize: 'clamp(36px,7vw,64px)', letterSpacing: '0.12em', color: 'var(--td)', marginBottom: '0.4rem' }}>NIKO</h1>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.6, maxWidth: 320 }}>
                Transport, livraison, courses — dis-moi ce dont tu as besoin.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 360 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '12px 16px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--az)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd2)')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--az), #0056A0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fn)', fontSize: 12, color: '#fff', flexShrink: 0 }}>N</div>
            )}
            <div style={{
              maxWidth: '75%',
              background: msg.role === 'user' ? 'var(--az)' : 'var(--bg2)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--bd)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '10px 14px',
              fontFamily: 'var(--fo)', fontSize: 14, lineHeight: 1.55,
              color: msg.role === 'user' ? '#fff' : 'var(--td)',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content || (msg.role === 'assistant' && loading && i === messages.length - 1 ? (
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--td3)', animation: 'ndp 1s ease-in-out infinite' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--td3)', animation: 'ndp 1s ease-in-out 0.2s infinite' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--td3)', animation: 'ndp 1s ease-in-out 0.4s infinite' }} />
                </span>
              ) : '')}
            </div>
          </div>
        ))}

        {/* Quick replies */}
        {!loading && quickReplies.length > 0 && messages.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 38 }}>
            {quickReplies.map(r => (
              <button key={r} onClick={() => sendMessage(r)} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20, border: '1px solid var(--az)', color: 'var(--az)', background: 'rgba(0,148,212,0.06)', cursor: 'pointer', transition: 'all 0.15s' }}>
                {r}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '0.8rem 1.4rem 1rem', borderTop: '1px solid var(--bd)', background: 'var(--bg2)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 24, padding: '8px 8px 8px 16px', transition: 'border-color 0.2s' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="VTC, livraison, courses..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{
              width: 36, height: 36, borderRadius: '50%', background: input.trim() && !loading ? 'var(--az)' : 'var(--bg)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !loading ? 'pointer' : 'default', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 8M14 8L9 3M14 8L9 13" stroke={input.trim() && !loading ? '#fff' : 'var(--td3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: '0.5rem' }}>
          NIKO couvre Nice · Antibes · Cannes
        </p>
      </div>
    </main>
  );
}
