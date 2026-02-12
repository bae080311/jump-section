import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '../globals.css';
import { Navbar } from '@/components/navbar';
import { i18n, type Locale } from '@/i18n-config';
import { getDictionary } from '@/get-dictionary';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://jump-section.vercel.app'),
  title: {
    default: 'jump-section | Smooth Section Navigation',
    template: '%s | jump-section',
  },
  description:
    'A lightweight, high-performance library for smooth scrolling and section-aware navigation in React, Vue, and Core JS.',
  keywords: [
    'scroll',
    'navigation',
    'react',
    'vue',
    'javascript',
    'intersection observer',
    'smooth scroll',
    'toc',
    'nextjs',
  ],
  authors: [{ name: 'k_jin.0', url: 'https://github.com/bae080311' }],
  creator: 'k_jin.0',
  alternates: {
    canonical: '/',
    languages: {
      en: '/en',
      ko: '/ko',
    },
  },
  openGraph: {
    title: 'jump-section | Smooth Section Navigation',
    description:
      'A lightweight, high-performance library for smooth scrolling and section-aware navigation in React, Vue, and Core JS.',
    url: 'https://jump-section.vercel.app',
    siteName: 'jump-section',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'jump-section logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'jump-section | Smooth Section Navigation',
    description:
      'A lightweight, high-performance library for smooth scrolling and section-aware navigation in React, Vue, and Core JS.',
    creator: '@k_jin_0',
    images: ['/logo.png'],
  },
  verification: {
    google: 'gHhBwfHWdKD_7JX44AncUnNtxSw9VZQac-Ry6tuhaiE',
  },
};

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const params = await props.params;
  const dict = await getDictionary(params.lang as Locale);

  return (
    <html lang={params.lang}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Navbar dict={dict.navbar} lang={params.lang as Locale} />
        {props.children}
      </body>
    </html>
  );
}
