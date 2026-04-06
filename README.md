# jump-section

<div align="center">
  <img src="docs/public/logo.png" alt="Jump Section Logo" width="200" />
</div>

메뉴 클릭 시 해당 섹션으로 부드럽게 이동하고, 스크롤 위치에 따라 활성 섹션을 자동으로 추적하는 크로스 프레임워크 라이브러리입니다.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Features

- **자동 활성 섹션 추적**: IntersectionObserver를 사용한 정확한 섹션 감지
- **크로스 프레임워크**: React, Vue 3, Svelte 지원
- **경량**: Core 패키지는 zero dependency
- **TypeScript**: 완전한 타입 정의 제공
- **URL 해시 동기화**: 활성 섹션을 URL hash에 자동 반영
- **키보드 네비게이션**: `Alt+ArrowDown` / `Alt+ArrowUp` 지원
- **커스텀 스크롤 컨테이너**: `window` 외의 스크롤 영역 지원
- **스크롤 진행률 추적**: 섹션별 0–1 progress 콜백

## Installation

### React

```bash
npm install @jump-section/react
```

### Vue 3

```bash
npm install @jump-section/vue
```

### Svelte

```bash
npm install @jump-section/svelte
```

### Core (framework-agnostic)

```bash
npm install @jump-section/core
```

## Usage

### React

```tsx
import { ScrollSectionProvider, useScrollSection } from '@jump-section/react';

function App() {
  return (
    <ScrollSectionProvider offset={-80} behavior="smooth" hash keyboard>
      <Navigation />
      <Content />
    </ScrollSectionProvider>
  );
}

function Navigation() {
  const { scrollTo, activeId } = useScrollSection();

  return (
    <nav>
      <button
        onClick={() => scrollTo('section-1')}
        className={activeId === 'section-1' ? 'active' : ''}
      >
        Section 1
      </button>
      <button
        onClick={() => scrollTo('section-2')}
        className={activeId === 'section-2' ? 'active' : ''}
      >
        Section 2
      </button>
    </nav>
  );
}

function Content() {
  const { registerRef: ref1 } = useScrollSection('section-1');
  const { registerRef: ref2 } = useScrollSection('section-2');

  return (
    <main>
      <section ref={ref1}>
        <h2>Section 1</h2>
      </section>
      <section ref={ref2}>
        <h2>Section 2</h2>
      </section>
    </main>
  );
}
```

### Vue 3

```vue
<script setup lang="ts">
import { ScrollSectionProvider } from '@jump-section/vue';
</script>

<template>
  <ScrollSectionProvider :offset="-80" behavior="smooth" hash keyboard>
    <Navigation />
    <Content />
  </ScrollSectionProvider>
</template>
```

**Navigation.vue**

```vue
<script setup lang="ts">
import { useScrollSection } from '@jump-section/vue';

const { scrollTo, activeId } = useScrollSection();
</script>

<template>
  <nav>
    <button @click="scrollTo('section-1')" :class="{ active: activeId === 'section-1' }">
      Section 1
    </button>
    <button @click="scrollTo('section-2')" :class="{ active: activeId === 'section-2' }">
      Section 2
    </button>
  </nav>
</template>
```

**Content.vue**

```vue
<script setup lang="ts">
import { useScrollSection } from '@jump-section/vue';

const { registerRef: section1Ref } = useScrollSection('section-1');
const { registerRef: section2Ref } = useScrollSection('section-2');
</script>

<template>
  <main>
    <section :ref="section1Ref"><h2>Section 1</h2></section>
    <section :ref="section2Ref"><h2>Section 2</h2></section>
  </main>
</template>
```

### Core

```typescript
import { ScrollManager } from '@jump-section/core';

const manager = new ScrollManager({
  offset: -80,
  behavior: 'smooth',
  hash: true,
  keyboard: true,
});

manager.registerSection('section-1', document.getElementById('section-1')!);

await manager.scrollTo('section-1');

const unsubscribe = manager.onActiveChange((activeId, meta) => {
  console.log('Active:', activeId, '| Previous:', meta.previous, '| Direction:', meta.direction);
});

manager.destroy();
```

## Options

| Option     | Type                  | Default    | Description                                              |
| ---------- | --------------------- | ---------- | -------------------------------------------------------- |
| `offset`   | `number`              | `0`        | 고정 헤더 등을 위한 수직 오프셋 (px)                     |
| `behavior` | `ScrollBehavior`      | `'smooth'` | 스크롤 동작: `'smooth'` \| `'instant'` \| `'auto'`       |
| `hash`     | `boolean`             | `false`    | 활성 섹션을 URL hash에 자동 동기화                       |
| `keyboard` | `boolean`             | `false`    | `Alt+ArrowDown` / `Alt+ArrowUp` 키보드 네비게이션 활성화 |
| `root`     | `HTMLElement \| null` | `null`     | 커스텀 스크롤 컨테이너 (`window` 대신 사용)              |

## Project Structure

```
jump-section/
├── packages/
│   ├── core/      # framework-agnostic core (zero dependency)
│   ├── react/     # React hooks + components
│   ├── vue/       # Vue 3 composables + component
│   └── svelte/    # Svelte composables
├── docs/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 9.0.0

### Setup

```bash
pnpm install
pnpm build
pnpm test
pnpm format
```

### Scripts

| Command              | Description               |
| -------------------- | ------------------------- |
| `pnpm build`         | 전체 패키지 빌드 (turbo)  |
| `pnpm test`          | 전체 테스트 실행 (vitest) |
| `pnpm test:coverage` | 커버리지 포함 테스트      |
| `pnpm format`        | 코드 포맷팅 (prettier)    |
| `pnpm check-exports` | 패키지 export 검증        |

## Contributing

Issue를 열거나 Pull Request를 보내주세요.

## License

ISC © k_jin.0

## Links

- [GitHub Repository](https://github.com/bae080311/jump-section)
- [Issues](https://github.com/bae080311/jump-section/issues)
