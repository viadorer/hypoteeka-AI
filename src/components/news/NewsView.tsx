'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  publishedAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function readTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function NewsView() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NewsArticle | null>(null);

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then((data: NewsArticle[]) => {
        if (Array.isArray(data)) setArticles(data);
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  // Article detail view
  if (selected) {
    return (
      <div className="flex-1 md:ml-[320px] min-h-screen bg-[#F5F7FA]">
        <div className="max-w-[720px] mx-auto px-4 md:px-6 py-8 md:py-12">
          <button
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#E91E63] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zpet na novinky
          </button>

          <article>
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(selected.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {readTime(selected.content)} min cteni
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-[#0A1E5C] leading-tight mb-4">
              {selected.title}
            </h1>

            {selected.summary && (
              <p className="text-base text-gray-500 leading-relaxed mb-6 border-l-3 border-[#E91E63] pl-4">
                {selected.summary}
              </p>
            )}

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100
              prose prose-gray max-w-none
              [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#0A1E5C] [&_h2]:mt-6 [&_h2]:mb-3
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-4 [&_h3]:mb-2
              [&_p]:text-[15px] [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:my-2
              [&_li]:text-[15px] [&_li]:text-gray-600 [&_li]:leading-relaxed
              [&_ul]:my-2 [&_ol]:my-2
              [&_strong]:text-gray-800
              [&_table]:text-sm [&_table]:w-full [&_table]:border-collapse
              [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-50 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-700 [&_th]:border [&_th]:border-gray-200
              [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-gray-200
              [&_blockquote]:border-l-3 [&_blockquote]:border-[#E91E63] [&_blockquote]:pl-4 [&_blockquote]:text-gray-500 [&_blockquote]:italic [&_blockquote]:my-4
            ">
              <ReactMarkdown>{selected.content}</ReactMarkdown>
            </div>
          </article>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="flex-1 md:ml-[320px] min-h-screen bg-[#F5F7FA]">
      <div className="max-w-[960px] mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0A1E5C] mb-2">
            Novinky
          </h1>
          <p className="text-gray-500 text-[15px]">
            Aktualni informace ze sveta hypotek a financovani nemovitosti
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-1/3 mb-4" />
                <div className="h-5 bg-gray-100 rounded w-full mb-2" />
                <div className="h-5 bg-gray-100 rounded w-2/3 mb-4" />
                <div className="h-4 bg-gray-50 rounded w-full mb-1" />
                <div className="h-4 bg-gray-50 rounded w-4/5" />
              </div>
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">Zatim zadne novinky.</p>
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article, idx) => (
              <button
                key={article.id}
                onClick={() => setSelected(article)}
                className={`group text-left bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300 overflow-hidden ${
                  idx === 0 ? 'md:col-span-2 lg:col-span-2' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(article.publishedAt)}
                    <span className="text-gray-200">|</span>
                    <Clock className="w-3.5 h-3.5" />
                    {readTime(article.content)} min
                  </div>

                  <h2 className={`font-bold text-[#0A1E5C] group-hover:text-[#E91E63] transition-colors mb-2 leading-snug ${
                    idx === 0 ? 'text-xl md:text-2xl' : 'text-base'
                  }`}>
                    {article.title}
                  </h2>

                  {article.summary && (
                    <p className={`text-gray-500 leading-relaxed ${
                      idx === 0 ? 'text-[15px] line-clamp-3' : 'text-sm line-clamp-2'
                    }`}>
                      {article.summary}
                    </p>
                  )}

                  <span className="inline-block mt-4 text-sm font-medium text-[#E91E63] group-hover:translate-x-1 transition-transform">
                    Cist dale →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
