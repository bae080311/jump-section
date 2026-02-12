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
    title: isKo ? 'React 사용법' : 'React Usage',
    description: isKo
      ? 'React에서 jump-section 라이브러리를 사용하는 방법입니다. Hook과 컴포넌트 사용법을 알아보세요.'
      : 'How to use jump-section library in React. Learn about hooks and components.',
    lang: params.lang,
    path: '/docs/react',
  });
}

export default async function Page(props: { params: Promise<{ lang: Locale }> }) {
  const params = await props.params;
  const isKo = params.lang === 'ko';

  const breadcrumbData = generateBreadcrumbJsonLd([
    { name: 'Home', item: 'https://jump-section.vercel.app' },
    { name: 'Docs', item: `https://jump-section.vercel.app/${params.lang}/docs` },
    { name: 'React', item: `https://jump-section.vercel.app/${params.lang}/docs/react` },
  ]);

  const articleData = generateArticleJsonLd({
    title: isKo ? 'React 사용법' : 'React Usage',
    description: isKo
      ? 'React에서 jump-section 라이브러리를 사용하는 방법입니다.'
      : 'How to use jump-section library in React.',
    url: `https://jump-section.vercel.app/${params.lang}/docs/react`,
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
