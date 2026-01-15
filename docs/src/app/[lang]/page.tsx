import { Hero } from '@/components/hero';
import { getDictionary } from '@/get-dictionary';
import { Locale } from '@/i18n-config';

export default async function Home(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = params.lang as Locale;
  const dict = await getDictionary(lang);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <Hero dict={dict.hero} lang={lang} />

      {/* Features Section */}
      <section className="py-32 px-4 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: params.lang === 'ko' ? '프레임워크 호환' : 'Cross-Framework',
              description:
                params.lang === 'ko'
                  ? '동일한 API로 React, Vue, Vanilla Javascript를 모두 지원합니다.'
                  : 'Native support for React, Vue, and Vanilla Javascript with the same API.',
            },
            {
              title: params.lang === 'ko' ? '고성능' : 'High Performance',
              description:
                params.lang === 'ko'
                  ? '가볍고 복잡한 레이아웃과 수많은 섹션에도 최적화되었습니다.'
                  : 'Lightweight and optimized for complex layouts and multiple sections.',
            },
            {
              title: params.lang === 'ko' ? '부드러운 애니메이션' : 'Smooth Animations',
              description:
                params.lang === 'ko'
                  ? '이징(easing)과 지속 시간을 지원하는 맞춤형 점프 동작을 제공합니다.'
                  : 'Customizable jump behavior with support for easing and duration.',
            },
          ].map((feature, i) => (
            <div key={i} className="glass-card p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 w-full text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} jump-section.{' '}
          {params.lang === 'ko'
            ? 'Next.js와 Framer Motion으로 제작되었습니다.'
            : 'Built with Next.js and Framer Motion.'}
        </p>
      </footer>
    </main>
  );
}
