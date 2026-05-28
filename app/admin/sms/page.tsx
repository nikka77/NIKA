import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'SMS Admin — NIKA' };

export default async function AdminSmsPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== (process.env.ADMIN_EMAIL || 'dan@nika.fr')) redirect('/404');

  const admin = createAdminClient();
  const { data: logs } = admin
    ? await admin.from('sms_logs').select('*').order('created_at', { ascending: false }).limit(50)
    : { data: [] };

  const statusColor: Record<string, string> = {
    received: '#0094D4',
    processed: '#0EA878',
    failed: '#D44B24',
    pending: '#D4A017',
  };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <Link href="/admin" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '0.8rem' }}>← Admin</Link>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2rem' }}>
        Logs SMS
      </h1>

      <div style={{ background: 'rgba(0,148,212,0.04)', border: '1px solid rgba(0,148,212,0.12)', borderRadius: 10, padding: '1.2rem 1.5rem', marginBottom: '2rem', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--td)' }}>📱 Gestion SMS NIKA</strong><br />
        Les pros peuvent envoyer des SMS pour mettre à jour leur profil, stock, horaires en temps réel.
      </div>

      {logs && logs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {logs.map((log: { id: string; from_number: string; content: string; status: string; action?: string; created_at: string }) => (
            <div key={log.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', marginBottom: '0.3rem' }}>{log.from_number}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', marginBottom: '0.3rem' }}>&quot;{log.content}&quot;</div>
                {log.action && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>Action: {log.action}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: statusColor[log.status] || 'var(--td3)', background: `${statusColor[log.status] || '#666'}15`, border: `1px solid ${statusColor[log.status] || '#666'}30`, borderRadius: 10, padding: '2px 8px', display: 'inline-block', marginBottom: 4 }}>
                  {log.status}
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>
                  {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '4rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
          Aucun SMS reçu pour l&apos;instant.
        </div>
      )}
    </main>
  );
}
