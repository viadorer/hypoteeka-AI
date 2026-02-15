import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import { StructuredData } from "./structured-data";
import { getTenantConfig, getDefaultTenantId } from "@/lib/tenant/config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const tenant = getTenantConfig(getDefaultTenantId());
const isValuation = tenant.features.primaryFlow === 'valuation';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || `https://${tenant.domain}`;

const siteTitle = isValuation
  ? 'Odhad.online - Orientační odhad ceny nemovitosti zdarma'
  : 'Hypoteeka AI - Hypoteční poradce | Kalkulačka hypotéky online';
const siteDescription = isValuation
  ? 'Zjistěte orientační tržní cenu nebo výši nájmu vaší nemovitosti. Odhad bytu, domu i pozemku zdarma a nezávazně.'
  : 'Spočítejte si hypotéku online s AI poradcem Hugo. Kalkulačka splátky, ověření bonity, porovnání sazeb bank. Bezplatná konzultace s hypotečním specialistou.';
const siteKeywords = isValuation
  ? ['odhad nemovitosti', 'cena nemovitosti', 'odhad bytu', 'odhad domu', 'cena pozemku', 'tržní cena', 'odhad nájmu', 'pronájem', 'odhad online', 'odhad zdarma']
  : ['hypotéka', 'hypoteční kalkulačka', 'kalkulačka hypotéky', 'splátka hypotéky', 'úroková sazba', 'bonita', 'LTV', 'DSTI', 'DTI', 'refinancování hypotéky', 'hypoteční poradce', 'srovnání hypoték', 'hypotéka online', 'AI poradce', 'Česká národní banka', 'ČNB sazby', 'fixace hypotéky'];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: siteTitle,
    template: `%s | ${tenant.branding.title}`,
  },
  description: siteDescription,
  keywords: siteKeywords,
  authors: [{ name: tenant.name }],
  creator: tenant.name,
  publisher: tenant.name,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'cs_CZ',
    url: '/',
    siteName: tenant.branding.title,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: '/og-image',
        width: 1200,
        height: 630,
        alt: tenant.branding.title,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og-image'],
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  category: isValuation ? 'real estate' : 'finance',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: tenant.branding.primaryColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <head>
        {tenant.gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${tenant.gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${tenant.gaId}');
                `,
              }}
            />
          </>
        )}
        <StructuredData />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-[#F5F7FA] text-gray-900`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
