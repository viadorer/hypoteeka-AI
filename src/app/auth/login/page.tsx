import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { LegalFooter } from '@/components/layout/LegalFooter';
import { LoginClient } from './LoginClient';

export const metadata: Metadata = {
  title: 'Přihlášení',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={null}>
          <LoginClient />
        </Suspense>
      </main>
      <LegalFooter />
    </div>
  );
}
