'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ContactInner() {
  const searchParams = useSearchParams();
  const logement = searchParams.get('logement') || '';
  const lieu = searchParams.get('lieu') || '';
  const isStayRequest = !!(logement && lieu);

  const defaultMessage = isStayRequest
    ? `Bonjour,\n\nJe souhaite réserver le logement suivant via NIKA :\n\n🏠 ${logement}\n📍 ${lieu}\n\nMerci de me contacter pour confirmer les disponibilités et les modalités de réservation.\n\nCordialement,`
    : '';

  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: isStayRequest ? 'reservation-directe' : '',
    message: defaultMessage,
  });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, logement: logement || undefined, lieu: lieu || undefined }),
    });
    setSent(true);
    setSending(false);
  }

  if (sent) return (
    <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 56, marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 28, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '0.5rem' }}>Message envoyé !</h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)' }}>
          {isStayRequest
            ? 'Notre équipe vous contacte sous 24h pour confirmer la réservation.'
            : 'Nous vous répondons sous 24h.'}
        </p>
      </div>
    </main>
  );

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.5rem' }}>
        {isStayRequest ? 'Réservation directe' : 'Contact'}
      </h1>
      <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: isStayRequest ? '1.5rem' : '2.5rem', lineHeight: 1.6 }}>
        {isStayRequest
          ? 'Logement exclusif · Réservation hors plateformes grand public'
          : 'Une question, un partenariat, un problème technique ? Écrivez-nous.'}
      </p>

      {/* STAY direct reservation banner */}
      {isStayRequest && (
        <div style={{ background: 'rgba(0,188,160,0.08)', border: '1px solid rgba(0,188,160,0.3)', borderRadius: 10, padding: '1.2rem 1.4rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>🏠</span>
            <div>
              <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic', color: 'var(--teal)', marginBottom: 3 }}>{logement}</div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginBottom: 8 }}>📍 {lieu}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--teal)', background: 'rgba(0,188,160,0.12)', border: '1px solid rgba(0,188,160,0.25)', borderRadius: 20, padding: '2px 8px' }}>
                  Réservation directe propriétaire
                </span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: '#E07038', background: 'rgba(224,112,56,0.1)', border: '1px solid rgba(224,112,56,0.25)', borderRadius: 20, padding: '2px 8px' }}>
                  Commission 5–8% (vs 15.5% Airbnb)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ gap: '1rem' }} className="g-2 max-sm:grid-cols-1">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Votre nom *" required style={inputStyle} />
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *" required style={inputStyle} />
        </div>
        <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required style={inputStyle}>
          <option value="">Sujet *</option>
          {isStayRequest && <option value="reservation-directe">Réservation directe STAY</option>}
          <option value="support">Support technique</option>
          <option value="pro">Inscription professionnelle</option>
          <option value="partenariat">Partenariat</option>
          <option value="signalement">Signalement</option>
          <option value="rgpd">Demande RGPD</option>
          <option value="autre">Autre</option>
        </select>
        <textarea
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Votre message *"
          rows={isStayRequest ? 7 : 5}
          required
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <button type="submit" disabled={sending} style={{ padding: '13px', borderRadius: 6, background: isStayRequest ? 'var(--teal)' : 'var(--az)', color: '#fff', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', opacity: sending ? 0.7 : 1 }}>
          {sending ? 'Envoi...' : isStayRequest ? 'Envoyer la demande de réservation' : 'Envoyer le message'}
        </button>
      </form>

      {isStayRequest && (
        <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.6 }}>
          NIKA contacte le propriétaire en votre nom · Aucun frais cachés · Paiement sécurisé
        </p>
      )}

      <div style={{ marginTop: '3rem', gap: '1rem' }} className="g-2 max-sm:grid-cols-1">
        {[
          { icon: '📧', label: 'Email', value: 'support@nika.app' },
          { icon: '📍', label: 'Localisation', value: "Nice, Côte d'Azur" },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: '0.4rem' }}>{icon}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{label}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--bd2)', borderRadius: 6,
  padding: '11px 14px', fontFamily: 'var(--fo)',
  fontSize: 13, color: 'var(--td)', outline: 'none',
};

export default function ContactPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '60vh' }} />}>
      <ContactInner />
    </Suspense>
  );
}
