/**
 * Broker notification — email s detaily nového leadu.
 *
 * Volá se z chat route po `assignLeadToBroker()`. Pokud BREVO_API_KEY
 * není nastaven, jen zaloguje (dev mode).
 */

import { sendBrevoEmail } from './brevo';
import type { ClientProfile } from './agent/client-profile';
import type { BrokerHandoffPayload, BrokerVertical } from './broker-pool';

function fmt(n?: number | null): string {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString('cs-CZ') + ' Kč';
}

function fmtBool(b?: boolean): string {
  return b === undefined ? '—' : b ? 'ano' : 'ne';
}

function verticalLabel(v: BrokerVertical): string {
  switch (v) {
    case 'bydleni': return 'Vlastní bydlení';
    case 'investice': return 'Investiční nemovitost';
    case 'refi': return 'Refinanc / refix';
    default: return 'Neurčeno';
  }
}

function buildEmailHtml(args: {
  broker: BrokerHandoffPayload['broker'];
  profile: ClientProfile;
  vertical: BrokerVertical;
  sessionId: string;
  reason: string;
}): string {
  const { broker, profile, vertical, sessionId, reason } = args;

  const clientFullName = profile.name ?? '—';
  const phoneRow = profile.phone ? `<tr><td><strong>Telefon</strong></td><td><a href="tel:${profile.phone}">${profile.phone}</a></td></tr>` : '';
  const emailRow = profile.email ? `<tr><td><strong>Email</strong></td><td><a href="mailto:${profile.email}">${profile.email}</a></td></tr>` : '';
  const purpose = profile.purpose ?? '—';

  return `
<!doctype html>
<html lang="cs">
<head><meta charset="utf-8"><title>Nový lead z Hypoteeka AI</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #001a41; background: #f6f7fb; padding: 24px;">
  <div style="max-width: 620px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,26,65,0.08);">
    <div style="width: 36px; height: 3px; background: #b80049; border-radius: 999px; margin-bottom: 16px;"></div>
    <p style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(0,26,65,0.4); margin: 0 0 4px;">Nový lead z Hypoteeka AI</p>
    <h1 style="font-size: 22px; margin: 0 0 16px;">Ahoj ${broker.displayName},</h1>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 16px;">
      Dostal jsi nový lead — <strong>${clientFullName}</strong>. Klient prošel kalkulaci s Hugem
      a souhlasil s předáním. Vertikála: <strong>${verticalLabel(vertical)}</strong>.
    </p>
    <p style="font-size: 13px; line-height: 1.55; color: rgba(0,26,65,0.7); margin: 0 0 24px; padding: 12px 14px; background: #f1f3ff; border-radius: 10px;">
      <strong>Důvod předání od Huga:</strong><br>${reason}
    </p>

    <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(0,26,65,0.5); margin: 24px 0 8px;">Kontakt</h2>
    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 6px 0; width: 160px;"><strong>Jméno</strong></td><td>${clientFullName}</td></tr>
      ${phoneRow}
      ${emailRow}
    </table>

    <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(0,26,65,0.5); margin: 24px 0 8px;">Záměr klienta</h2>
    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 6px 0; width: 160px;"><strong>Účel</strong></td><td>${purpose}</td></tr>
      ${profile.propertyPrice ? `<tr><td><strong>Cena nemovitosti</strong></td><td>${fmt(profile.propertyPrice)}</td></tr>` : ''}
      ${profile.equity !== undefined ? `<tr><td><strong>Vlastní zdroje</strong></td><td>${fmt(profile.equity)}</td></tr>` : ''}
      ${profile.monthlyIncome ? `<tr><td><strong>Měsíční příjem</strong></td><td>${fmt(profile.monthlyIncome)}</td></tr>` : ''}
      ${profile.location ? `<tr><td><strong>Lokalita</strong></td><td>${profile.location}</td></tr>` : ''}
      ${profile.propertyType ? `<tr><td><strong>Typ</strong></td><td>${profile.propertyType}</td></tr>` : ''}
      ${profile.age !== undefined ? `<tr><td><strong>Věk</strong></td><td>${profile.age}</td></tr>` : ''}
      ${profile.employmentType ? `<tr><td><strong>Forma příjmu</strong></td><td>${profile.employmentType}</td></tr>` : ''}
    </table>

    ${vertical === 'investice' ? `
    <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(0,26,65,0.5); margin: 24px 0 8px;">Investiční detaily</h2>
    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
      ${profile.isFirstInvestment !== undefined ? `<tr><td style="padding: 6px 0; width: 160px;"><strong>První investice</strong></td><td>${fmtBool(profile.isFirstInvestment)}</td></tr>` : ''}
      ${profile.investmentExperience ? `<tr><td><strong>Zkušenost</strong></td><td>${profile.investmentExperience}</td></tr>` : ''}
      ${profile.legalForm ? `<tr><td><strong>Forma</strong></td><td>${profile.legalForm === 'sro' ? 's.r.o.' : profile.legalForm === 'kombinace' ? 'FO + s.r.o.' : 'fyzická osoba'}</td></tr>` : ''}
      ${profile.expectedRentalIncome ? `<tr><td><strong>Očekávaný nájem</strong></td><td>${fmt(profile.expectedRentalIncome)}/měs</td></tr>` : ''}
      ${profile.targetRentalYield !== undefined ? `<tr><td><strong>Cílový výnos</strong></td><td>${profile.targetRentalYield} % p.a.</td></tr>` : ''}
      ${profile.valuationAvgPrice ? `<tr><td><strong>Realvisor odhad</strong></td><td>${fmt(profile.valuationAvgPrice)}</td></tr>` : ''}
    </table>
    ` : ''}

    <p style="font-size: 13px; color: rgba(0,26,65,0.55); margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e9edff;">
      Session ID: <code style="font-family: monospace;">${sessionId}</code><br>
      Konzultace přes Hypoteeku je pro klienta vždy zdarma. Klient čeká, že se ozveš.
    </p>
  </div>
</body>
</html>`.trim();
}

export async function notifyBrokerOfNewLead(args: {
  broker: BrokerHandoffPayload['broker'];
  profile: ClientProfile;
  vertical: BrokerVertical;
  sessionId: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  // Fallback broker (id='fallback-david') je hardcoded — i ten potřebuje notifikaci.
  if (!args.broker.email) {
    return { ok: false, error: 'Broker has no email' };
  }

  const subject = `Nový lead z Hypoteeka AI — ${args.profile.name ?? args.profile.email ?? args.profile.phone ?? 'klient'}`;
  const html = buildEmailHtml(args);

  const res = await sendBrevoEmail({
    to: args.broker.email,
    toName: args.broker.fullName,
    subject,
    htmlContent: html,
    senderName: 'Hypoteeka AI',
  });

  if (!res.success) return { ok: false, error: res.error };
  return { ok: true };
}
