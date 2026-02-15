import { NextRequest, NextResponse } from 'next/server';

// Valuo endpoint is always under /public/api-leads, regardless of REALVISOR_API_URL
const VALUO_BASE = 'https://api-production-88cf.up.railway.app/api/v1/public/api-leads';

export async function POST(req: NextRequest) {
  const apiKey = process.env.REALVISOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing REALVISOR_API_KEY' }, { status: 500 });
  }

  try {
    const body = await req.json();

    const url = `${VALUO_BASE}/valuo`;
    console.log('[Valuation/Valuo] URL:', url);
    console.log('[Valuation/Valuo] API key present:', !!apiKey, 'length:', apiKey.length);
    console.log('[Valuation/Valuo] Body keys:', Object.keys(body));
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log(`[Valuation/Valuo] Response ${res.status}:`, text.substring(0, 500));

    if (!res.ok) {
      return NextResponse.json({ error: 'Valuation API error', detail: text }, { status: res.status });
    }

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[Valuation/Valuo] Network error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Network error' }, { status: 500 });
  }
}
