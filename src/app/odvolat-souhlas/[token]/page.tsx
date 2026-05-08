import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalFooter } from '@/components/layout/LegalFooter';
import { ConfirmWithdrawal } from './ConfirmWithdrawal';

export const metadata: Metadata = {
  title: 'Potvrzení odvolání souhlasu',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ConfirmWithdrawalPage({ params }: Props) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
        <Link href="/podminky" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8 inline-block">
          &larr; Zpět na Podmínky
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-[#0A1E5C] mb-4">
          Potvrzení odvolání souhlasu
        </h1>
        <p className="text-gray-500 leading-relaxed mb-8">
          Klikněte na tlačítko níže pro dokončení odvolání souhlasu se zpracováním a předáním
          osobních údajů. Po potvrzení obdržíte e-mailem písemné potvrzení.
        </p>

        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 mb-8">
          <ConfirmWithdrawal token={token} />
        </div>

        <p className="text-xs text-gray-500 text-center">
          Odvolání nemá zpětný účinek na zpracování provedené před tímto okamžikem.
        </p>
      </div>

      <LegalFooter />
    </div>
  );
}
