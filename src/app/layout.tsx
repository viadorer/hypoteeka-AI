import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import { StructuredData } from "./structured-data";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hypoteeka.cz';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Hypoteeka AI - Hypoteční poradce | Kalkulačka hypotéky online',
    template: '%s | Hypoteeka AI',
  },
  description: 'Spočítejte si hypotéku online s AI poradcem Hugo. Kalkulačka splátky, ověření bonity, porovnání sazeb bank. Bezplatná konzultace s hypotečním specialistou.',
  keywords: [
    'hypotéka', 'hypoteční kalkulačka', 'kalkulačka hypotéky', 'splátka hypotéky',
    'úroková sazba', 'bonita', 'LTV', 'DSTI', 'DTI', 'refinancování hypotéky',
    'hypoteční poradce', 'srovnání hypoték', 'hypotéka online', 'AI poradce',
    'Česká národní banka', 'ČNB sazby', 'fixace hypotéky',
  ],
  authors: [{ name: 'Hypoteeka.cz' }],
  creator: 'Hypoteeka.cz',
  publisher: 'Hypoteeka.cz',
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
    siteName: 'Hypoteeka AI',
    title: 'Hypoteeka AI - Hypoteční poradce | Kalkulačka hypotéky online',
    description: 'Spočítejte si hypotéku online s AI poradcem Hugo. Kalkulačka splátky, ověření bonity, porovnání sazeb bank. Bezplatná konzultace s hypotečním specialistou.',
    images: [
      {
        url: '/og-image',
        width: 1200,
        height: 630,
        alt: 'Hypoteeka AI - Váš hypoteční poradce',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hypoteeka AI - Hypoteční poradce',
    description: 'Spočítejte si hypotéku online s AI poradcem Hugo. Kalkulačka splátky, ověření bonity, porovnání sazeb bank.',
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
  category: 'finance',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#E91E63',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-Q6HN5J19BT" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-Q6HN5J19BT');
            `,
          }}
        />
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
