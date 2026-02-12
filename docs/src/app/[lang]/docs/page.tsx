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
    title: isKo ? '문서 개요' : 'Documentation Overview',
    description: isKo
      ? 'jump-section 라이브러리의 문서 개요입니다.'
      : 'Overview of jump-section library documentation.',
    lang: params.lang,
    path: '/docs',
  });
}

export default async function Page(props: { params: Promise<{ lang: Locale }> }) {
  const params = await props.params;
  const isKo = params.lang === 'ko';

  const breadcrumbData = generateBreadcrumbJsonLd([
    { name: 'Home', item: 'https://jump-section.vercel.app' },
    { name: 'Docs', item: `https://jump-section.vercel.app/${params.lang}/docs` },
  ]);

  const articleData = generateArticleJsonLd({
    title: isKo ? '문서 개요' : 'Documentation Overview',
    description: isKo
      ? 'jump-section 라이브러리의 문서 개요입니다.'
      : 'Overview of jump-section library documentation.',
    url: `https://jump-section.vercel.app/${params.lang}/docs`,
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
