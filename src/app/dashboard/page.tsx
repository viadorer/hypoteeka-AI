import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getTenantConfig, getDefaultTenantId } from '@/lib/tenant/config';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = {
  title: 'Moje hypotéka — Klientská zóna',
  description: 'Stav vaší žádosti o hypotéku, další kroky a kontakt na poradce.',
  robots: { index: false, follow: false },
};

interface ProfileRow {
  display_name?: string | null;
  preferred_name?: string | null;
}

interface SessionRow {
  id: string;
  client_profile?: { propertyPrice?: number; equity?: number; monthlyIncome?: number; name?: string; purpose?: string } | null;
  updated_at: string;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard');

  const tenant = getTenantConfig(getDefaultTenantId());

  // Fetch user profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('display_name, preferred_name')
    .eq('id', user.id)
    .single();
  const profile = profileData as ProfileRow | null;

  // Fetch recent sessions
  const { data: sessionsData } = await supabase
    .from('sessions')
    .select('id, client_profile, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(5);
  const sessions = (sessionsData ?? []) as SessionRow[];

  const firstName = profile?.preferred_name ?? profile?.display_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'klient';

  return (
    <DashboardClient
      firstName={firstName}
      tenantTitle={tenant.branding.title}
      logoUrl={tenant.branding.logoUrl ?? '/logo.png'}
      sessions={sessions.map(s => ({
        id: s.id,
        propertyPrice: s.client_profile?.propertyPrice ?? null,
        purpose: s.client_profile?.purpose ?? null,
        updatedAt: s.updated_at,
      }))}
    />
  );
}
