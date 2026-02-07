import { MetadataRoute } from 'next';
import { i18n } from '@/i18n-config';

const baseUrl = 'https://jump-section.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/docs',
    '/docs/installation',
    '/docs/quick-start',
    '/docs/example',
    '/docs/context',
    '/docs/react',
    '/docs/vue',
    '/docs/core',
  ];

  const sitemapEntries = routes.flatMap((route) =>
    i18n.locales.map((locale) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
    })),
  );

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...sitemapEntries,
  ];
}
