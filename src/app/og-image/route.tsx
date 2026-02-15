import { ImageResponse } from 'next/og';
import { getTenantConfig, getDefaultTenantId } from '@/lib/tenant/config';

export const runtime = 'edge';

export async function GET() {
  const tenant = getTenantConfig(getDefaultTenantId());
  const isValuation = tenant.features.primaryFlow === 'valuation';
  const primary = tenant.branding.primaryColor;

  const title = isValuation ? 'Odhad.online' : 'Hypoteeka AI';
  const subtitle = isValuation ? 'Orientacni odhad ceny nemovitosti' : 'Vas hypotecni poradce';
  const features = isValuation
    ? ['Odhad ceny bytu', 'Odhad domu', 'Odhad najmu']
    : ['Kalkulacka splatky', 'Overeni bonity', 'Sazby bank'];
  const domain = tenant.domain;
  const bgGradient = isValuation
    ? 'linear-gradient(135deg, #0A1E5C 0%, #1a3a8f 50%, #0A1E5C 100%)'
    : 'linear-gradient(135deg, #0A1E5C 0%, #1a3a8f 50%, #0A1E5C 100%)';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: bgGradient,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: primary,
          }}
        />

        {/* Logo circle */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: `${primary}26`,
            border: `3px solid ${primary}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            fontSize: '36px',
          }}
        >
          {isValuation ? (
            <svg width="40" height="40" viewBox="0 0 120 120" fill="none">
              <circle cx="52" cy="52" r="28" stroke={primary} strokeWidth="10" fill="none"/>
              <line x1="72" y1="72" x2="100" y2="100" stroke={primary} strokeWidth="10" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C9.24 2 7 4.24 7 7v5H5v10h14V12h-2V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v5H9V7c0-1.66 1.34-3 3-3z" fill={primary}/>
            </svg>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '56px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-1px',
            marginBottom: '12px',
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '24px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '40px',
          }}
        >
          {subtitle}
        </div>

        {/* Features row */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
          }}
        >
          {features.map((text) => (
            <div
              key={text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '10px 20px',
                fontSize: '18px',
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: primary,
                }}
              />
              {text}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          {domain}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
