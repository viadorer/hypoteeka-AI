import { storage } from '@/lib/storage';
import { createSupabaseServer } from '@/lib/supabase/server';
import { sendBrevoEmail, buildConsentWithdrawalEmailHtml } from '@/lib/brevo';
import type { ConsentScope } from '@/lib/storage/types';

const ALLOWED_SCOPES: ConsentScope[] = [
  'handoff_partner',
  'marketing',
  'analytics',
  'rate_alerts',
  'transactional_email',
];

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Pro odvolání souhlasu se prosím přihlaste, nebo nás kontaktujte na info@quadrum.cz.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({})) as { scope?: ConsentScope };
    const scope = body.scope;

    if (scope && !ALLOWED_SCOPES.includes(scope)) {
      return new Response(
        JSON.stringify({ error: 'Neznámý rozsah souhlasu.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const count = await storage.withdrawConsentsForUser(user.id, scope);
    console.log(`[Consent] Withdrawn ${count} consent(s) for user ${user.id} (scope: ${scope ?? 'all'})`);

    // Audit-trail closing: send confirmation email to the user (best effort, non-blocking)
    if (user.email && count > 0) {
      const userName = (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined);
      sendBrevoEmail({
        to: user.email,
        toName: userName,
        subject: 'Odvolání souhlasu bylo zaznamenáno',
        htmlContent: buildConsentWithdrawalEmailHtml({
          name: userName,
          scope,
          withdrawnCount: count,
          withdrawnAt: new Date().toISOString(),
        }),
      }).catch(err => console.error('[Consent] withdrawal confirmation email failed:', err));
    }

    return new Response(
      JSON.stringify({ success: true, withdrawn: count }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Neznámá chyba';
    console.error('[Consent] withdraw error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
