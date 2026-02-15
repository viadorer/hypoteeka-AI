import { NextRequest, NextResponse } from 'next/server';

const MAPY_API_URL = 'https://api.mapy.com/v1/suggest';

export async function GET(req: NextRequest) {
  const apiKey = process.env.MAPY_COM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing MAPY_COM_API_KEY' }, { status: 500 });
  }

  const query = req.nextUrl.searchParams.get('query');
  if (!query || query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const params = new URLSearchParams({
      query,
      lang: 'cs',
      limit: '5',
      locality: 'cz',
      apikey: apiKey,
    });
    params.append('type', 'regional.address');

    const url = `${MAPY_API_URL}?${params.toString()}`;
    console.log('[Suggest] Fetching:', url.replace(apiKey, '***'));
    const res = await fetch(url, {
      headers: { 'X-Mapy-Api-Key': apiKey },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Suggest] Mapy.com API error ${res.status}: ${text}`);
      return NextResponse.json({ error: 'Suggest API error', detail: text }, { status: res.status });
    }

    const data = await res.json();

    // Transform to flat structure matching what RealVisor valuo needs
    const items = (data.items ?? []).map((item: Record<string, unknown>) => {
      const pos = item.position as { lon: number; lat: number } | undefined;
      const rs = item.regionalStructure as Array<{ name: string; type: string }> | undefined;

      // Extract address components from regionalStructure
      const findRegional = (type: string) => rs?.find(r => r.type === type)?.name ?? '';

      return {
        name: item.name as string,
        label: `${item.name}, ${item.location ?? ''}`.replace(/, $/, ''),
        lat: pos?.lat ?? 0,
        lng: pos?.lon ?? 0,
        street: findRegional('regional.street'),
        streetNumber: findRegional('regional.address'),
        city: findRegional('regional.municipality'),
        district: findRegional('regional.municipality_part'),
        region: findRegional('regional.region'),
        postalCode: (item.zip as string) ?? '',
        location: item.location as string ?? '',
      };
    });

    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    console.error('[Suggest] Network error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Network error' }, { status: 500 });
  }
}
