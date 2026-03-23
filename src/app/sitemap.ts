import type { MetadataRoute } from 'next';
import { storage } from '@/lib/storage';
import { getDefaultTenantId } from '@/lib/tenant/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hypoteeka.cz';

  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/clanky`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Add published articles
  try {
    const tenantId = getDefaultTenantId();
    const articles = await storage.listNews(tenantId);
    for (const article of articles) {
      if (!article.published) continue;
      entries.push({
        url: `${siteUrl}/clanky/${article.slug}`,
        lastModified: new Date(article.updatedAt),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // Storage not available at build time — skip articles
  }

  return entries;
}
