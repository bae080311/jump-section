import { Metadata } from 'next';
import { Locale } from '@/i18n-config';

interface MetadataProps {
  title: string;
  description: string;
  lang: Locale;
  path: string;
}

export function constructMetadata({ title, description, lang, path }: MetadataProps): Metadata {
  const baseUrl = 'https://jump-section.vercel.app';
  const url = `${baseUrl}/${lang}${path}`;
  const alternates = {
    canonical: url,
    languages: {
      en: `${baseUrl}/en${path}`,
      ko: `${baseUrl}/ko${path}`,
    },
  };

  return {
    title,
    description,
    alternates,
    openGraph: {
      title: `${title} | jump-section`,
      description,
      url,
      images: [
        {
          url: '/logo.png',
          width: 800,
          height: 600,
          alt: 'jump-section logo',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | jump-section`,
      description,
      images: ['/logo.png'],
    },
  };
}
