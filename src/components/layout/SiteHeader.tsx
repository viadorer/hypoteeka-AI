'use client';

/**
 * Jednotná horní lišta pro celý web.
 *
 * Dřív měla každá část vlastní: landing sticky lištu s CTA, chat vlastní
 * pruh s přepínačem postranního panelu, dashboard jen UserMenu a ostatní
 * stránky nic — z chatu se tak nedalo přejít na kalkulačku, do dashboardu
 * ani do adminu.
 *
 * Odchylky jsou jen dvě a obě jsou funkční, ne kosmetické:
 *   `onOpenSidebar` – chat potřebuje otevřít historii konverzací
 *   `cta`           – landing má hlavní akci „spustit chat"
 *
 * Admin lištu nepoužívá: má vlastní přihlašovací bránu i odhlášení.
 */

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { useTenant } from '@/lib/tenant/use-tenant';

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Hugo' },
  { href: '/kalkulacka', label: 'Kalkulačka' },
  { href: '/clanky', label: 'Články' },
];

interface Props {
  /** Chat: otevře postranní panel s historií. */
  onOpenSidebar?: () => void;
  /** Landing: hlavní akce vpravo vedle uživatelského menu. */
  cta?: { label: string; onClick: () => void };
}

export function SiteHeader({ onOpenSidebar, cta }: Props) {
  const pathname = usePathname();
  const tenant = useTenant();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header
      className="sticky top-0 z-40 shrink-0 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between gap-3 px-4 h-14 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="p-2 -ml-2 rounded-xl hover:bg-surface-container transition-colors"
              aria-label="Otevřít historii konverzací"
            >
              <Menu className="w-5 h-5 text-on-surface-variant" />
            </button>
          )}

          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-full bg-surface-container-lowest shadow-soft border border-outline-variant/10 flex items-center justify-center flex-shrink-0">
              <Image
                src={tenant.branding.logoUrl ?? '/logo.png'}
                alt={tenant.branding.title}
                width={20}
                height={20}
                className="object-contain"
              />
            </span>
            <span className="text-sm font-bold text-on-surface hidden sm:block truncate">
              {tenant.branding.title}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-2">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive(link.href)
                    ? 'text-on-surface font-semibold bg-surface-container'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {cta && (
            <button
              onClick={cta.onClick}
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {cta.label}
            </button>
          )}
          <UserMenu />
        </div>
      </div>

      {/* Navigace na mobilu — pod hlavní lištou, ať se logo a menu nemačkají */}
      <nav className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? 'page' : undefined}
            className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
              isActive(link.href)
                ? 'text-on-surface font-semibold bg-surface-container'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
