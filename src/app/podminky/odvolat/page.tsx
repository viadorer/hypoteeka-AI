import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalFooter } from '@/components/layout/LegalFooter';
import { WithdrawRequestForm } from './WithdrawRequestForm';

export const metadata: Metadata = {
  title: 'Odvolat souhlas se zpracováním údajů',
  description: 'Self-service formulář pro odvolání souhlasu. Po odeslání obdržíte na e-mail potvrzovací odkaz.',
  robots: { index: true, follow: true },
};

export default function WithdrawRequestPage() {
  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
        <Link href="/podminky" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8 inline-block">
          &larr; Zpět na Podmínky
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-[#0A1E5C] mb-4">
          Odvolat souhlas se zpracováním údajů
        </h1>
        <p className="text-gray-500 leading-relaxed mb-8">
          Pokud jste nám poskytli své údaje a chcete odvolat souhlas s jejich zpracováním
          a předáním partnerovi, vyplňte níže e-mail, který jste použili. Pošleme vám
          potvrzovací odkaz s platností 24 hodin.
        </p>

        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 mb-8">
          <WithdrawRequestForm />
        </div>

        <div className="bg-[#F5F7FA] border border-gray-200 rounded-2xl p-6 text-sm text-gray-600 leading-relaxed space-y-3">
          <p>
            <strong>Jak to funguje:</strong>
          </p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Zadáte e-mail, který jste použili při kontaktu.</li>
            <li>Pokud na ten e-mail evidujeme záznam, obdržíte potvrzovací zprávu.</li>
            <li>Kliknete v ní na odkaz „Potvrdit odvolání souhlasu&quot;.</li>
            <li>Souhlas bude zaznamenán jako odvolaný a obdržíte písemné potvrzení.</li>
          </ol>
          <p className="text-xs text-gray-500 italic">
            Z důvodů ochrany soukromí dostanete stejnou odpověď bez ohledu na to, zda
            e-mail v naší evidenci máme. Tím chráníme i ty, kteří našimi klienty nejsou.
          </p>
          <p className="text-xs text-gray-500">
            Můžete nás také kontaktovat e-mailem na{' '}
            <a className="text-[#b80049] hover:underline" href="mailto:info@quadrum.cz">info@quadrum.cz</a>
            {' '}nebo písemně na sídle QUADRUM s.r.o.
          </p>
        </div>
      </div>

      <LegalFooter />
    </div>
  );
}
