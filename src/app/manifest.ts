import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hypoteeka AI - Hypoteční poradce',
    short_name: 'Hypoteeka AI',
    description: 'Spočítejte si hypotéku online s AI poradcem Hugo. Kalkulačka splátky, ověření bonity, porovnání sazeb bank.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F7FA',
    theme_color: '#E91E63',
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
