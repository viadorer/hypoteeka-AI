/**
 * České banky - konfigurace s logy a barvami
 * Loga: /public/images/banks/{slug}.svg
 */

export interface BankInfo {
  slug: string;
  name: string;
  shortName: string;
  color: string;
  logo: string;
}

export const BANKS: BankInfo[] = [
  { slug: 'ceska-sporitelna', name: 'Česká spořitelna', shortName: 'ČS', color: '#0050AA', logo: '/images/banks/ceska-sporitelna.svg' },
  { slug: 'csob', name: 'ČSOB', shortName: 'ČSOB', color: '#003DA5', logo: '/images/banks/csob.svg' },
  { slug: 'kb', name: 'Komerční banka', shortName: 'KB', color: '#CC0000', logo: '/images/banks/kb.svg' },
  { slug: 'unicredit', name: 'UniCredit Bank', shortName: 'UniCredit', color: '#E30613', logo: '/images/banks/unicredit.svg' },
  { slug: 'raiffeisen', name: 'Raiffeisenbank', shortName: 'RB', color: '#FFE600', logo: '/images/banks/raiffeisen.svg' },
  { slug: 'moneta', name: 'Moneta Money Bank', shortName: 'Moneta', color: '#00A651', logo: '/images/banks/moneta.svg' },
  { slug: 'mbank', name: 'mBank', shortName: 'mBank', color: '#E4002B', logo: '/images/banks/mbank.svg' },
  { slug: 'fio', name: 'Fio banka', shortName: 'Fio', color: '#009639', logo: '/images/banks/fio.svg' },
  { slug: 'hypotecni-banka', name: 'Hypoteční banka', shortName: 'HB', color: '#003DA5', logo: '/images/banks/hypotecni-banka.svg' },
  { slug: 'air-bank', name: 'Air Bank', shortName: 'Air', color: '#78BE20', logo: '/images/banks/air-bank.svg' },
];

export const BANK_MAP = Object.fromEntries(BANKS.map(b => [b.slug, b]));

export function getBankBySlug(slug: string): BankInfo | undefined {
  return BANK_MAP[slug];
}

export function getBankByName(name: string): BankInfo | undefined {
  const lower = name.toLowerCase();
  return BANKS.find(b =>
    b.name.toLowerCase().includes(lower) ||
    b.shortName.toLowerCase() === lower ||
    b.slug === lower
  );
}
