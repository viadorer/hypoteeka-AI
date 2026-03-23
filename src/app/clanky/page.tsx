import { storage } from '@/lib/storage';
import { getTenantConfig, getDefaultTenantId } from '@/lib/tenant/config';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Články a rady',
  description: 'Užitečné články o hypotékách, financování bydlení a trhu s nemovitostmi.',
};

export default async function ArticlesPage() {
  const tenantId = getDefaultTenantId();
  const tenant = getTenantConfig(tenantId);
  const articles = await storage.listNews(tenantId);
  const published = articles.filter(a => a.published);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8 inline-block">
          &larr; Zpět na {tenant.branding.title}
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-[#0A1E5C] mb-4">Články a rady</h1>
        <p className="text-gray-500 mb-12">
          Užitečné informace o hypotékách, financování bydlení a trhu s nemovitostmi.
        </p>

        {published.length === 0 ? (
          <p className="text-gray-400 text-center py-16">Zatím tu nejsou žádné články.</p>
        ) : (
          <div className="space-y-6">
            {published.map(article => {
              const readTime = Math.max(1, Math.round(article.content.split(/\s+/).length / 200));
              const date = new Date(article.publishedAt).toLocaleDateString('cs-CZ', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });

              return (
                <Link
                  key={article.id}
                  href={`/clanky/${article.slug}`}
                  className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all"
                >
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{article.title}</h2>
                  {article.summary && (
                    <p className="text-sm text-gray-500 leading-relaxed mb-3">{article.summary}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{date}</span>
                    <span>&middot;</span>
                    <span>{readTime} min čtení</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
