import type { Metadata } from 'next';
import { getTenantConfig, getDefaultTenantId } from '@/lib/tenant/config';
import { LegalFooter } from '@/components/layout/LegalFooter';
import { CalculatorClient } from './CalculatorClient';
import { SiteHeader } from '@/components/layout/SiteHeader';

export const metadata: Metadata = {
  title: 'Kalkulačka hypotéky | Spočítejte si splátku',
  description:
    'Bezplatná online kalkulačka hypotéky. Spočítejte si měsíční splátku, úroky a celkové náklady. Aktuální sazby ČNB.',
  alternates: { canonical: 'https://www.hypoteeka.cz/kalkulacka' },
};

async function fetchRates(): Promise<{ avgRate: number; rateFix5y: number; rateFix10y: number; rpsn: number; date: string } | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hypoteeka.cz';
    const res = await fetch(`${baseUrl}/api/rates`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      avgRate: data.mortgage?.avgRate ?? 4.5,
      rateFix5y: data.mortgage?.rateFix5y ?? 4.5,
      rateFix10y: data.mortgage?.rateFix10y ?? 4.2,
      rpsn: data.mortgage?.rpsn ?? 4.7,
      date: data.date ?? new Date().toISOString().slice(0, 10),
    };
  } catch {
    return null;
  }
}

export default async function CalculatorPage() {
  const tenant = getTenantConfig(getDefaultTenantId());
  const rates = await fetchRates();

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <CalculatorClient
        tenantTitle={tenant.branding.title}
        logoUrl={tenant.branding.logoUrl ?? '/logo.png'}
        initialRate={rates?.rateFix5y ?? 4.5}
        rpsn={rates?.rpsn ?? 4.7}
        ratesDate={rates?.date ?? ''}
      />
      <LegalFooter />
    </div>
  );
}
