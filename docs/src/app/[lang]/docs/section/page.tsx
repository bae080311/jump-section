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
    title: isKo ? '섹션 관리' : 'Section Management',
    description: isKo
      ? 'jump-section 라이브러리에서 섹션을 등록하고 관리하는 방법입니다.'
      : 'How to register and manage sections in jump-section library.',
    lang: params.lang,
    path: '/docs/section',
  });
}

export default async function Page(props: { params: Promise<{ lang: Locale }> }) {
  const params = await props.params;
  const isKo = params.lang === 'ko';

  const breadcrumbData = generateBreadcrumbJsonLd([
    { name: 'Home', item: 'https://jump-section.vercel.app' },
    { name: 'Docs', item: `https://jump-section.vercel.app/${params.lang}/docs` },
    { name: 'Section', item: `https://jump-section.vercel.app/${params.lang}/docs/section` },
  ]);

  const articleData = generateArticleJsonLd({
    title: isKo ? '섹션 관리' : 'Section Management',
    description: isKo
      ? 'jump-section 라이브러리에서 섹션을 등록하고 관리하는 방법입니다.'
      : 'How to register and manage sections in jump-section library.',
    url: `https://jump-section.vercel.app/${params.lang}/docs/section`,
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
