import { NextRequest, NextResponse } from 'next/server';

const REALVISOR_API_URL = process.env.REALVISOR_API_URL ?? 'https://api-production-88cf.up.railway.app/api/v1/public/api-leads';

export async function POST(req: NextRequest) {
  const apiKey = process.env.REALVISOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing REALVISOR_API_KEY' }, { status: 500 });
  }

  try {
    const body = await req.json();

    const url = `${REALVISOR_API_URL}/valuo`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Valuation/Valuo] API error ${res.status}: ${text}`);
      return NextResponse.json({ error: 'Valuation API error', detail: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[Valuation/Valuo] Network error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Network error' }, { status: 500 });
  }
}
