/**
 * Brevo (ex-Sendinblue) API client
 * 
 * Odesílá transakční emaily se shrnutím kalkulace.
 * API key: BREVO_API_KEY env variable
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface EmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
}

export async function sendBrevoEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[Brevo] Missing BREVO_API_KEY env variable');
    return { success: false, error: 'Brevo API key not configured' };
  }

  const body = {
    sender: {
      name: params.senderName ?? 'Hypoteeka AI',
      email: params.senderEmail ?? 'info@hypoteeka.cz',
    },
    to: [{ email: params.to, name: params.toName ?? params.to }],
    subject: params.subject,
    htmlContent: params.htmlContent,
  };

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Brevo] API error ${res.status}: ${err}`);
      return { success: false, error: `Brevo API ${res.status}` };
    }

    const data = await res.json();
    console.log(`[Brevo] Email sent to ${params.to}, messageId: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Brevo] Send error: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Build HTML email with mortgage calculation summary
 */
export function buildCalculationEmailHtml(data: {
  name?: string;
  propertyPrice?: number;
  equity?: number;
  loanAmount?: number;
  monthlyPayment?: number;
  rate?: number;
  years?: number;
  totalInterest?: number;
  ltvOk?: boolean;
  dstiOk?: boolean;
  dtiOk?: boolean;
  ltvValue?: number;
  dstiValue?: number;
  dtiValue?: number;
}): string {
  const fmt = (n?: number) => n != null ? n.toLocaleString('cs-CZ') + ' Kč' : '—';
  const pct = (n?: number) => n != null ? (n * 100).toFixed(1).replace('.', ',') + ' %' : '—';
  const check = (ok?: boolean) => ok ? '&#10003;' : '&#10007;';
  const checkColor = (ok?: boolean) => ok ? '#16a34a' : '#dc2626';

  return `
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="width:40px;height:3px;background:#E91E63;border-radius:2px;margin-bottom:24px;"></div>
    <h1 style="font-size:20px;color:#0A1E5C;margin:0 0 4px;">Shrnutí vaší kalkulace</h1>
    <p style="font-size:13px;color:#9ca3af;margin:0 0 24px;">${data.name ? `Připraveno pro ${data.name}` : 'Hypoteeka AI'}</p>

    ${data.monthlyPayment ? `
    <div style="background:#fdf2f8;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
      <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Měsíční splátka</p>
      <p style="font-size:28px;font-weight:700;color:#0A1E5C;margin:0;">${fmt(data.monthlyPayment)}</p>
    </div>` : ''}

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${data.propertyPrice ? `<tr><td style="padding:8px 0;color:#6b7280;">Cena nemovitosti</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;">${fmt(data.propertyPrice)}</td></tr>` : ''}
      ${data.equity ? `<tr><td style="padding:8px 0;color:#6b7280;">Vlastní zdroje</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;">${fmt(data.equity)}</td></tr>` : ''}
      ${data.loanAmount ? `<tr><td style="padding:8px 0;color:#6b7280;">Výše úvěru</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;">${fmt(data.loanAmount)}</td></tr>` : ''}
      ${data.rate != null ? `<tr><td style="padding:8px 0;color:#6b7280;">Úroková sazba</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;">${pct(data.rate)}</td></tr>` : ''}
      ${data.years ? `<tr><td style="padding:8px 0;color:#6b7280;">Splatnost</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;">${data.years} let</td></tr>` : ''}
      ${data.totalInterest ? `<tr><td style="padding:8px 0;color:#6b7280;">Celkem na úrocích</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;">${fmt(data.totalInterest)}</td></tr>` : ''}
    </table>

    ${data.ltvValue != null ? `
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f3f4f6;">
      <p style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Bonita ČNB</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;">LTV</td><td style="padding:6px 0;text-align:right;">${pct(data.ltvValue)}</td><td style="padding:6px 0;text-align:right;width:30px;color:${checkColor(data.ltvOk)};font-weight:700;">${check(data.ltvOk)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">DSTI</td><td style="padding:6px 0;text-align:right;">${pct(data.dstiValue)}</td><td style="padding:6px 0;text-align:right;width:30px;color:${checkColor(data.dstiOk)};font-weight:700;">${check(data.dstiOk)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">DTI</td><td style="padding:6px 0;text-align:right;">${data.dtiValue?.toFixed(1)}x</td><td style="padding:6px 0;text-align:right;width:30px;color:${checkColor(data.dtiOk)};font-weight:700;">${check(data.dtiOk)}</td></tr>
      </table>
    </div>` : ''}

    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f3f4f6;text-align:center;">
      <a href="https://hypoteeka.cz" style="display:inline-block;background:#E91E63;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">Pokračovat na hypoteeka.cz</a>
      <p style="font-size:11px;color:#9ca3af;margin:16px 0 0;">Výsledky jsou orientační. Pro přesnou nabídku vás rádi spojíme s naším specialistou.</p>
    </div>
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">Hypoteeka AI -- metodika ČNB 2026</p>
</div>
</body>
</html>`;
}
