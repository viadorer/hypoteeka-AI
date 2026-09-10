import type { MetadataRoute } from 'next';
import { IS_INDEXABLE } from '@/lib/site-visibility';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hypoteeka.cz';

  // Dev mód (viz CLAUDE.md 2.1): web se nesmí indexovat.
  if (!IS_INDEXABLE) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
