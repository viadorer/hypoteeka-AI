/**
 * HMAC-signed tokens for anonymous consent withdrawal magic links.
 *
 * Why: GDPR Art. 7(3) requires withdrawal to be "as easy as giving consent".
 * Most leads are anonymous (no account), so a self-service magic link emailed
 * to the address on file is the right UX. We sign with HMAC so no DB row is
 * needed — the token itself proves authenticity.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface WithdrawTokenPayload {
  email: string;
  scope?: string;
  exp: number; // unix seconds
  iat: number; // unix seconds
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const secret =
    process.env.CONSENT_WITHDRAW_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('CONSENT_WITHDRAW_SECRET (or NEXTAUTH_SECRET / SUPABASE_SERVICE_ROLE_KEY) not configured');
  }
  return secret;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function signWithdrawToken(payload: { email: string; scope?: string; ttlSeconds?: number }): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (payload.ttlSeconds ?? DEFAULT_TTL_SECONDS);
  const body: WithdrawTokenPayload = {
    email: payload.email.toLowerCase().trim(),
    scope: payload.scope,
    exp,
    iat: now,
  };
  const bodyB64 = b64urlEncode(Buffer.from(JSON.stringify(body), 'utf-8'));
  const sig = createHmac('sha256', getSecret()).update(bodyB64).digest();
  const sigB64 = b64urlEncode(sig);
  return `${bodyB64}.${sigB64}`;
}

export type VerifyResult =
  | { valid: true; payload: WithdrawTokenPayload }
  | { valid: false; reason: 'malformed' | 'bad_signature' | 'expired' };

export function verifyWithdrawToken(token: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'malformed' };
  const [bodyB64, sigB64] = parts;

  const expectedSig = createHmac('sha256', getSecret()).update(bodyB64).digest();
  let providedSig: Buffer;
  try {
    providedSig = b64urlDecode(sigB64);
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (providedSig.length !== expectedSig.length) return { valid: false, reason: 'bad_signature' };
  if (!timingSafeEqual(providedSig, expectedSig)) return { valid: false, reason: 'bad_signature' };

  let payload: WithdrawTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(bodyB64).toString('utf-8')) as WithdrawTokenPayload;
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true, payload };
}
