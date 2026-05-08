import { storage } from '@/lib/storage';
import { sendBrevoEmail, buildConsentWithdrawalEmailHtml } from '@/lib/brevo';
import { verifyWithdrawToken } from '@/lib/consent-token';
import type { ConsentScope } from '@/lib/storage/types';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token : '';

    const result = verifyWithdrawToken(token);
    if (!result.valid) {
      const reason = result.reason === 'expired'
        ? 'Odkaz již vypršel. Vyžádejte si nový.'
        : 'Neplatný odkaz pro odvolání souhlasu.';
      return new Response(
        JSON.stringify({ error: reason }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, scope } = result.payload;
    const count = await storage.withdrawConsentsByEmail(email, scope as ConsentScope | undefined);

    if (count > 0) {
      sendBrevoEmail({
        to: email,
        subject: 'Odvolání souhlasu bylo zaznamenáno',
        htmlContent: buildConsentWithdrawalEmailHtml({
          scope,
          withdrawnCount: count,
          withdrawnAt: new Date().toISOString(),
        }),
      }).catch(err => console.error('[Consent] withdraw-confirm email failed:', err));
    }

    console.log(`[Consent] Anonymous withdraw confirmed for ${email}, count=${count}, scope=${scope ?? 'all'}`);

    return new Response(
      JSON.stringify({ success: true, withdrawn: count }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Neznámá chyba';
    console.error('[Consent] withdraw-confirm error:', message);
    return new Response(
      JSON.stringify({ error: 'Požadavek se nepodařilo zpracovat.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
