import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import type { ClientProfile } from '@/lib/agent/client-profile';

const VALUO_URL = 'https://api-production-88cf.up.railway.app/api/v1/public/api-leads/valuo';

/**
 * POST /api/valuation/submit
 * Reads profile from session, builds RealVisor valuo payload, sends it.
 * No dependency on LLM parameter passing -- all data comes from stored profile + ADDRESS_DATA.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.REALVISOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing REALVISOR_API_KEY' }, { status: 500 });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Load session profile
    const session = await storage.getSession(sessionId);
    if (!session?.profile) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const p = session.profile as ClientProfile & Record<string, unknown>;

    // Map propertyType from Czech to API format
    const typeMap: Record<string, string> = { byt: 'flat', dum: 'house', pozemek: 'land' };
    const propertyType = typeMap[p.propertyType ?? ''] ?? p.propertyType ?? 'flat';

    // Split name into firstName + lastName
    const nameParts = (p.name ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // VALIDATE required fields
    const missing: string[] = [];
    if (!firstName) missing.push('jméno');
    if (!p.email) missing.push('email');
    const lat = p.propertyLat;
    const lng = p.propertyLng;
    if (!lat || !lng) missing.push('adresa (GPS souřadnice)');

    if (propertyType === 'flat') {
      if (!p.floorArea) missing.push('užitná plocha');
      if (!p.propertyRating) missing.push('stav nemovitosti');
      if (!p.propertySize) missing.push('dispozice (1+kk, 2+1...)');
      if (!p.propertyOwnership) missing.push('vlastnictví');
      if (!p.propertyConstruction) missing.push('konstrukce');
    } else if (propertyType === 'house') {
      if (!p.floorArea) missing.push('užitná plocha');
      if (!p.lotArea) missing.push('plocha pozemku');
      if (!p.propertyRating) missing.push('stav nemovitosti');
      if (!p.propertyOwnership) missing.push('vlastnictví');
      if (!p.propertyConstruction) missing.push('konstrukce');
    } else if (propertyType === 'land') {
      if (!p.lotArea) missing.push('plocha pozemku');
    }

    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        missingFields: missing,
        error: `Chybí povinné údaje: ${missing.join(', ')}`,
      });
    }

    // Build payload from profile
    const payload: Record<string, unknown> = {
      firstName,
      lastName,
      email: p.email,
      phone: p.phone ?? undefined,
      kind: 'sale',
      propertyType,
      address: p.propertyAddress ?? '',
      lat,
      lng,
      // Address components from parsed ADDRESS_DATA stored in profile
      street: (p._addrStreet as string) ?? '',
      streetNumber: (p._addrStreetNumber as string) ?? '',
      city: p.location ?? '',
      district: (p._addrDistrict as string) ?? '',
      region: (p._addrRegion as string) ?? '',
      postalCode: (p._addrPostalCode as string) ?? '',
    };

    // Type-specific fields
    if (propertyType === 'flat') {
      payload.floorArea = p.floorArea;
      payload.rating = p.propertyRating;
      payload.localType = p.propertySize;
      payload.ownership = p.propertyOwnership;
      payload.construction = p.propertyConstruction;
      if (p.propertyFloor !== undefined) payload.floor = p.propertyFloor;
      if (p.propertyTotalFloors) payload.totalFloors = p.propertyTotalFloors;
      if (p.propertyElevator !== undefined) payload.elevator = p.propertyElevator;
    } else if (propertyType === 'house') {
      payload.floorArea = p.floorArea;
      payload.lotArea = p.lotArea;
      payload.rating = p.propertyRating;
      payload.ownership = p.propertyOwnership;
      payload.construction = p.propertyConstruction;
      payload.houseType = 'family_house';
    } else if (propertyType === 'land') {
      payload.lotArea = p.lotArea;
      payload.landType = 'building';
    }

    // Remove undefined values
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );

    console.log('[Valuation/Submit] Payload:', JSON.stringify(cleanPayload, null, 2));

    const res = await fetch(VALUO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(cleanPayload),
    });

    const text = await res.text();
    console.log(`[Valuation/Submit] Response ${res.status}:`, text.substring(0, 500));

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok || !data.success) {
      return NextResponse.json({
        success: false,
        error: data.error ?? data.message ?? 'Ocenění selhalo',
        payload: cleanPayload,
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[Valuation/Submit] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Network error' }, { status: 500 });
  }
}
