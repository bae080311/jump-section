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
    title: isKo ? '사용 예시' : 'Examples',
    description: isKo
      ? 'jump-section 라이브러리의 다양한 사용 예시를 확인해보세요.'
      : 'Check out various examples of using jump-section library.',
    lang: params.lang,
    path: '/docs/example',
  });
}

export default async function Page(props: { params: Promise<{ lang: Locale }> }) {
  const params = await props.params;
  const isKo = params.lang === 'ko';

  const breadcrumbData = generateBreadcrumbJsonLd([
    { name: 'Home', item: 'https://jump-section.vercel.app' },
    { name: 'Docs', item: `https://jump-section.vercel.app/${params.lang}/docs` },
    { name: 'Examples', item: `https://jump-section.vercel.app/${params.lang}/docs/example` },
  ]);

  const articleData = generateArticleJsonLd({
    title: isKo ? '사용 예시' : 'Examples',
    description: isKo
      ? 'jump-section 라이브러리의 다양한 사용 예시를 확인해보세요.'
      : 'Check out various examples of using jump-section library.',
    url: `https://jump-section.vercel.app/${params.lang}/docs/example`,
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
