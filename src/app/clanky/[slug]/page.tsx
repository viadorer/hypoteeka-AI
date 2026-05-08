import { storage } from '@/lib/storage';
import { getTenantConfig, getDefaultTenantId } from '@/lib/tenant/config';
import { LegalFooter } from '@/components/layout/LegalFooter';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenantId = getDefaultTenantId();
  const articles = await storage.listNews(tenantId);
  const article = articles.find(a => a.slug === slug && a.published);

  if (!article) return { title: 'Článek nenalezen' };

  return {
    title: article.title,
    description: article.summary ?? article.content.slice(0, 160),
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const tenantId = getDefaultTenantId();
  const tenant = getTenantConfig(tenantId);
  const articles = await storage.listNews(tenantId);
  const article = articles.find(a => a.slug === slug && a.published);

  if (!article) notFound();

  const readTime = Math.max(1, Math.round(article.content.split(/\s+/).length / 200));
  const date = new Date(article.publishedAt).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const primaryColor = tenant.branding.primaryColor;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
        <Link href="/clanky" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8 inline-block">
          &larr; Všechny články
        </Link>

        <article>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0A1E5C] mb-4 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-gray-400 mb-8">
            <span>{date}</span>
            <span>&middot;</span>
            <span>{readTime} min čtení</span>
          </div>

          {article.summary && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-8">
              <div className="w-8 h-[3px] rounded-full mb-3" style={{ backgroundColor: primaryColor }} />
              <p className="text-gray-600 leading-relaxed">{article.summary}</p>
            </div>
          )}

          <div className="prose prose-gray max-w-none
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#0A1E5C] [&_h2]:mt-8 [&_h2]:mb-4
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-6 [&_h3]:mb-3
            [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-4
            [&_ul]:my-4 [&_ol]:my-4
            [&_li]:text-gray-600 [&_li]:leading-relaxed
            [&_strong]:text-gray-900
            [&_a]:font-medium [&_a]:underline
            [&_blockquote]:border-l-3 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500 [&_blockquote]:italic
          ">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        </article>

        {/* Sticky CTA bar */}
        <div className="mt-12 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="w-8 h-[3px] rounded-full mx-auto mb-4" style={{ backgroundColor: primaryColor }} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Chcete spočítat hypotéku?
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Zeptejte se AI poradce Huga — spočítá splátku, ověří bonitu a porovná sazby bank. Zdarma.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            Začít konverzaci s Hugem
          </Link>
        </div>
      </div>

      <LegalFooter />
    </div>
  );
}
