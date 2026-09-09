import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      // index.ts 는 re-export 뿐이고, __bench__ 는 성능 측정용이라 커버리지 대상이 아니다.
      // 벤치 파일이 집계에 끼면 0% 로 잡혀 전체 수치를 실제보다 낮게 왜곡한다.
      exclude: ['packages/*/src/index.ts', '**/__bench__/**'],
    },
  },
});
