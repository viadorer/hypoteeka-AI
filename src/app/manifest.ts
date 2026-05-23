import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hypoteeka AI - Hypoteční poradce',
    short_name: 'Hypoteeka AI',
    description: 'Spočítejte si hypotéku online s AI poradcem Hugo. Kalkulačka splátky, ověření bonity, porovnání sazeb bank.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f9ff',
    theme_color: '#b80035',
    orientation: 'portrait',
    categories: ['finance', 'business'],
    lang: 'cs',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
