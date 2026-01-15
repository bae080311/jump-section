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
  title: 'jump-section | Smooth Section Navigation',
  description:
    'A lightweight, high-performance library for smooth scrolling and section-aware navigation in React, Vue, and Core JS.',
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
