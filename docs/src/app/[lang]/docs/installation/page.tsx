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
    title: isKo ? '설치 가이드' : 'Installation Guide',
    description: isKo
      ? 'jump-section 라이브러리를 설치하는 방법입니다. React, Vue, Core JS 패키지를 지원합니다.'
      : 'How to install jump-section library. Supports React, Vue, and Core JS packages.',
    lang: params.lang,
    path: '/docs/installation',
  });
}

export default async function Page(props: { params: Promise<{ lang: Locale }> }) {
  const params = await props.params;
  const isKo = params.lang === 'ko';

  const breadcrumbData = generateBreadcrumbJsonLd([
    { name: 'Home', item: 'https://jump-section.vercel.app' },
    { name: 'Docs', item: `https://jump-section.vercel.app/${params.lang}/docs` },
    {
      name: 'Installation',
      item: `https://jump-section.vercel.app/${params.lang}/docs/installation`,
    },
  ]);

  const articleData = generateArticleJsonLd({
    title: isKo ? '설치 가이드' : 'Installation Guide',
    description: isKo
      ? 'jump-section 라이브러리를 설치하는 방법입니다.'
      : 'How to install jump-section library.',
    url: `https://jump-section.vercel.app/${params.lang}/docs/installation`,
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
