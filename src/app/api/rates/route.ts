import { getMarketRates, getBankRates } from '@/lib/data/rates';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [rates, bankRates] = await Promise.all([
    getMarketRates(),
    getBankRates(),
  ]);

  return Response.json({
    date: rates.lastUpdated,
    source: rates.source,
    cnb: {
      repo: rates.cnbRepo,
    },
    mortgage: {
      avgRate: rates.mortgageAvgRate,
      rateFix1y: rates.mortgageRateFix1y,
      rateFix5y: rates.mortgageRateFix5y,
      rateFix10y: rates.mortgageRateFix10y,
      rateFix10yPlus: rates.mortgageRateFix10yPlus,
      rpsn: rates.mortgageRpsn,
      volumeTotal: rates.mortgageVolumeTotal,
      volumeFix5y: rates.mortgageVolumeFix5y,
    },
    ourRates: bankRates.ourRates,
  });
}
