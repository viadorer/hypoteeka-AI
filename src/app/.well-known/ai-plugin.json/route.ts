import { NextResponse } from 'next/server';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hypoteeka.cz';

  return NextResponse.json({
    schema_version: 'v1',
    name_for_human: 'Hypoteeka AI',
    name_for_model: 'hypoteeka_ai',
    description_for_human: 'Hypoteční poradce s AI. Kalkulačka splátky, ověření bonity, porovnání sazeb bank.',
    description_for_model: 'Hypoteeka AI is a Czech mortgage advisory service powered by AI. It helps users calculate mortgage payments, verify creditworthiness (DSTI, DTI, LTV checks per Czech National Bank regulations), compare bank rates, and connect with mortgage specialists. All data is specific to the Czech Republic mortgage market. The service uses live rates from the Czech National Bank (ČNB).',
    auth: {
      type: 'none',
    },
    api: {
      type: 'openapi',
      url: `${siteUrl}/openapi.json`,
    },
    logo_url: `${siteUrl}/logo.png`,
    contact_email: 'info@hypoteeka.cz',
    legal_info_url: `${siteUrl}/legal`,
  });
}
