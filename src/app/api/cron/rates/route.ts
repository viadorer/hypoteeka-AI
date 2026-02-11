import { refreshRates } from '@/lib/data/rates';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await refreshRates();

  if (result.success && result.rates) {
    return Response.json({
      ok: true,
      date: result.rates.lastUpdated,
      repo: result.rates.cnbRepo,
      mortgageAvg: result.rates.mortgageAvgRate,
      mortgageFix5y: result.rates.mortgageRateFix5y,
      rpsn: result.rates.mortgageRpsn,
    });
  }

  return Response.json({ ok: false, error: result.error }, { status: 500 });
}
