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
    title: isKo ? 'Core JS 사용법' : 'Core JS Usage',
    description: isKo
      ? 'Vanilla JS에서 jump-section 라이브러리를 사용하는 방법입니다. 프레임워크 없이 사용하는 방법을 알아보세요.'
      : 'How to use jump-section library in Vanilla JS. Learn about using it without frameworks.',
    lang: params.lang,
    path: '/docs/core',
  });
}

export default async function Page(props: { params: Promise<{ lang: Locale }> }) {
  const params = await props.params;
  const isKo = params.lang === 'ko';

  const breadcrumbData = generateBreadcrumbJsonLd([
    { name: 'Home', item: 'https://jump-section.vercel.app' },
    { name: 'Docs', item: `https://jump-section.vercel.app/${params.lang}/docs` },
    { name: 'Core', item: `https://jump-section.vercel.app/${params.lang}/docs/core` },
  ]);

  const articleData = generateArticleJsonLd({
    title: isKo ? 'Core JS 사용법' : 'Core JS Usage',
    description: isKo
      ? 'Vanilla JS에서 jump-section 라이브러리를 사용하는 방법입니다.'
      : 'How to use jump-section library in Vanilla JS.',
    url: `https://jump-section.vercel.app/${params.lang}/docs/core`,
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
