import type { Metadata } from 'next';
import { getTenantConfig, getDefaultTenantId } from '@/lib/tenant/config';
import { LegalFooter } from '@/components/layout/LegalFooter';
import { OffersClient } from './OffersClient';

export const metadata: Metadata = {
  title: 'Nabídky hypoték | Srovnání bank',
  description:
    'Porovnání aktuálních sazeb hypoték z 8+ partnerských bank. Najděte nejlepší nabídku pro vaši situaci.',
  alternates: { canonical: 'https://www.hypoteeka.cz/nabidky' },
};

async function fetchRates() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hypoteeka.cz';
    const res = await fetch(`${baseUrl}/api/rates`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ loan?: string; years?: string }>;
}) {
  const tenant = getTenantConfig(getDefaultTenantId());
  const rates = await fetchRates();
  const params = await searchParams;
  const loanAmount = params.loan ? Number(params.loan) : 4_000_000;
  const years = params.years ? Number(params.years) : 30;

  return (
    <div className="min-h-screen bg-surface">
      <OffersClient
        tenantTitle={tenant.branding.title}
        logoUrl={tenant.branding.logoUrl ?? '/logo.png'}
        loanAmount={loanAmount}
        years={years}
        rateFix5y={rates?.mortgage?.rateFix5y ?? 4.5}
        rateFix1y={rates?.mortgage?.rateFix1y ?? 4.7}
        rateFix10y={rates?.mortgage?.rateFix10y ?? 4.2}
        ratesDate={rates?.date ?? ''}
      />
      <LegalFooter />
    </div>
  );
}
