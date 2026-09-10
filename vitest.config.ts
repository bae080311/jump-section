import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // .tsx 를 빠뜨리면 테스트가 없는 컴포넌트(Section.tsx)가 리포트에 아예
      // 나타나지 않아 커버리지가 실제보다 높게 보인다. 로드된 .tsx 는 표시되므로
      // 이 누락은 눈에 띄지 않는다.
      include: ['packages/*/src/**/*.{ts,tsx}'],
      // index.ts 는 re-export 뿐이고 벤치 파일은 성능 측정용이라 집계 대상이 아니다
      // (집계에 끼면 0% 로 잡혀 전체 수치를 낮게 왜곡한다).
      // 디렉터리 이름(__bench__)이 아니라 vitest 자신의 벤치 파일 패턴을 기준으로
      // 제외한다 — 그러지 않으면 __bench__ 밖에 둔 *.bench.ts 가 다시 0% 로 들어온다.
      exclude: ['packages/*/src/index.ts', '**/*.{bench,benchmark}.?(c|m)[jt]s?(x)'],
    },
  },
});
