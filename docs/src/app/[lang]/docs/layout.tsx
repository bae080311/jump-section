import { Sidebar } from '@/components/sidebar';
import { Locale } from '@/i18n-config';

export default async function DocsLayout(props: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const params = await props.params;
  const { children } = props;
  return (
    <div className="pt-16 min-h-screen">
      <Sidebar lang={params.lang as Locale} />
      <main className="md:ml-64 p-8 md:p-16 max-w-4xl">
        <div className="prose prose-invert max-w-none">{children}</div>
      </main>
    </div>
  );
}
