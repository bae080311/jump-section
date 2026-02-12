import { Metadata } from 'next';
import En from './en.mdx';
import Ko from './ko.mdx';
import { Locale } from '@/i18n-config';
import { constructMetadata } from '@/lib/metadata';
import { JsonLd, generateBreadcrumbJsonLd, generateArticleJsonLd } from '@/components/json-ld';

export async function generateMetadata(props: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const params = await props.params;
  const isKo = params.lang === 'ko';
  return constructMetadata({
    title: isKo ? '빠른 시작' : 'Quick Start',
    description: isKo
      ? 'jump-section 라이브러리를 빠르게 시작하는 방법입니다. 기본적인 사용법을 배워보세요.'
      : 'Quick start guide for jump-section library. Learn the basic usage.',
    lang: params.lang,
    path: '/docs/quick-start',
  });
}

export default async function Page(props: { params: Promise<{ lang: Locale }> }) {
  const params = await props.params;
  const isKo = params.lang === 'ko';

  const breadcrumbData = generateBreadcrumbJsonLd([
    { name: 'Home', item: 'https://jump-section.vercel.app' },
    { name: 'Docs', item: `https://jump-section.vercel.app/${params.lang}/docs` },
    {
      name: 'Quick Start',
      item: `https://jump-section.vercel.app/${params.lang}/docs/quick-start`,
    },
  ]);

  const articleData = generateArticleJsonLd({
    title: isKo ? '빠른 시작' : 'Quick Start',
    description: isKo
      ? 'jump-section 라이브러리를 빠르게 시작하는 방법입니다.'
      : 'Quick start guide for jump-section library.',
    url: `https://jump-section.vercel.app/${params.lang}/docs/quick-start`,
    authorName: 'k_jin.0',
  });

  return (
    <>
      <JsonLd data={breadcrumbData} />
      <JsonLd data={articleData} />
      {isKo ? <Ko /> : <En />}
    </>
  );
}
