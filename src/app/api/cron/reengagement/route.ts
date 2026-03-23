/**
 * Re-engagement cron job
 *
 * Runs daily. Finds sessions where:
 * - User provided email (in profile)
 * - Lead was NOT captured (leadCaptured = false)
 * - Session was last updated 24-72h ago
 *
 * Sends a re-engagement email: "Vaše kalkulace je stále k dispozici"
 *
 * Schedule via vercel.json:
 * { "crons": [{ "path": "/api/cron/reengagement", "schedule": "0 9 * * *" }] }
 */

import { storage } from '@/lib/storage';
import { sendBrevoEmail } from '@/lib/brevo';
import { getDefaultTenantId } from '@/lib/tenant/config';

export async function GET(req: Request) {
  // Verify cron secret (Vercel sets this header)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const tenantId = getDefaultTenantId();
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const THREE_DAYS = 3 * ONE_DAY;

  try {
    const sessions = await storage.listSessions(tenantId);
    let sent = 0;

    for (const session of sessions) {
      // Skip if no email or already captured
      const email = session.profile?.email;
      if (!email || session.state.leadCaptured) continue;

      // Check time window: 24h-72h since last update
      const age = now - new Date(session.updatedAt).getTime();
      if (age < ONE_DAY || age > THREE_DAYS) continue;

      // Skip if very few interactions
      if (session.state.turnCount < 3) continue;

      // Build and send email
      const name = session.profile?.name?.split(' ')[0] ?? '';
      const sessionUrl = `https://hypoteeka.cz/?session=${session.id}`;

      const htmlContent = `
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="width:40px;height:3px;background:#E91E63;border-radius:2px;margin-bottom:24px;"></div>
    <h1 style="font-size:20px;color:#0A1E5C;margin:0 0 8px;">Vaše kalkulace je stále k dispozici</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">
      ${name ? `Dobrý den, ${name}. ` : ''}Všimli jsme si, že jste nedávno zkoumali možnosti hypotéky. Vaše výpočty a konverzace jsou stále uložené a čekají na vás.
    </p>

    <div style="text-align:center;margin:24px 0;">
      <a href="${sessionUrl}" style="display:inline-block;background:#E91E63;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;">Pokračovat v konverzaci</a>
    </div>

    <p style="font-size:13px;color:#9ca3af;margin:16px 0 0;text-align:center;">
      Nebo se rovnou spojte s naším specialistou na +420 777 123 456.
    </p>
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">Hypoteeka AI -- hypoteeka.cz</p>
</div>
</body>
</html>`;

      await sendBrevoEmail({
        to: email,
        toName: session.profile?.name,
        subject: 'Vaše kalkulace hypotéky je stále k dispozici',
        htmlContent,
      });

      sent++;
      console.log(`[Reengagement] Sent to ${email}, session ${session.id}`);
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Reengagement] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
