import En from './en.mdx';
import Ko from './ko.mdx';
import { Locale } from '@/i18n-config';

export default async function Page(props: { params: Promise<{ lang: Locale }> }) {
  const params = await props.params;
  if (params.lang === 'ko') {
    return <Ko />;
  }
  return <En />;
}
