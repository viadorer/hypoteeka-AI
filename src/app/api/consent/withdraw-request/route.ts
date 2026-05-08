import { sendBrevoEmail, buildConsentWithdrawRequestEmailHtml } from '@/lib/brevo';
import { signWithdrawToken } from '@/lib/consent-token';
import type { ConsentScope } from '@/lib/storage/types';

const ALLOWED_SCOPES: ConsentScope[] = [
  'handoff_partner',
  'marketing',
  'analytics',
  'rate_alerts',
  'transactional_email',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? 'hypoteeka.cz';
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const scope: ConsentScope | undefined = ALLOWED_SCOPES.includes(body.scope) ? body.scope : undefined;

    if (!EMAIL_RE.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Neplatný formát e-mailu.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed token. We do NOT check whether the email exists in DB —
    // doing so would leak information about who is/isn't a customer (privacy
    // best practice). The confirm endpoint handles the no-match case silently.
    const token = signWithdrawToken({ email, scope });
    const confirmUrl = `${getOrigin(req)}/odvolat-souhlas/${encodeURIComponent(token)}`;

    sendBrevoEmail({
      to: email,
      subject: 'Potvrzení odvolání souhlasu — hypoteeka.cz',
      htmlContent: buildConsentWithdrawRequestEmailHtml({ confirmUrl, email }),
    }).catch(err => console.error('[Consent] withdraw-request email failed:', err));

    // Always return success to avoid email enumeration.
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Neznámá chyba';
    console.error('[Consent] withdraw-request error:', message);
    return new Response(
      JSON.stringify({ error: 'Požadavek se nepodařilo zpracovat.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
