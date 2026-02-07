# 🚀 jump-section

<div align="center">
  <img src="docs/public/logo.png" alt="Jump Section Logo" width="200" />
</div>

메뉴 클릭 시 해당하는 섹션으로 부드럽게 이동하고, 스크롤 위치에 따라 활성 섹션을 자동으로 추적하는 크로스 프레임워크 라이브러리입니다.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## ✨ Features

- 🎯 **자동 활성 섹션 추적**: IntersectionObserver를 사용한 정확한 섹션 감지
- 🎨 **크로스 프레임워크 지원**: React, Vue 3 모두 지원
- 📦 **모듈화된 구조**: Core 로직과 프레임워크별 래퍼 분리
- 🪶 **경량**: 최소한의 의존성으로 가벼운 번들 사이즈
- 🔧 **커스터마이징 가능**: offset, behavior 등 스크롤 옵션 설정 가능
- 💪 **TypeScript 지원**: 완전한 타입 정의 제공

## 📦 Installation

### React

```bash
npm install @jump-section/react
# or
pnpm add @jump-section/react
# or
yarn add @jump-section/react
```

### Vue 3

```bash
npm install @jump-section/vue
# or
pnpm add @jump-section/vue
# or
yarn add @jump-section/vue
```

## 🚀 Usage

### React

```tsx
import { ScrollSectionProvider, useScrollSection } from '@jump-section/react';

function App() {
  return (
    <ScrollSectionProvider offset={-80} behavior="smooth">
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
  const section1 = useScrollSection('section-1');
  const section2 = useScrollSection('section-2');

  return (
    <main>
      <section ref={section1.registerRef}>
        <h2>Section 1</h2>
        <p>Content here...</p>
      </section>
      <section ref={section2.registerRef}>
        <h2>Section 2</h2>
        <p>Content here...</p>
      </section>
    </main>
  );
}
```

### Vue 3

```vue
<template>
  <ScrollSectionProvider :offset="-80" behavior="smooth">
    <Navigation />
    <Content />
  </ScrollSectionProvider>
</template>

<script setup lang="ts">
import { ScrollSectionProvider } from '@jump-section/vue';
import Navigation from './Navigation.vue';
import Content from './Content.vue';
</script>
```

**Navigation.vue**

```vue
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

<script setup lang="ts">
import { useScrollSection } from '@jump-section/vue';

const { scrollTo, activeId } = useScrollSection();
</script>
```

**Content.vue**

```vue
<template>
  <main>
    <section :ref="section1.registerRef">
      <h2>Section 1</h2>
      <p>Content here...</p>
    </section>
    <section :ref="section2.registerRef">
      <h2>Section 2</h2>
      <p>Content here...</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useScrollSection } from '@jump-section/vue';

const section1 = useScrollSection('section-1');
const section2 = useScrollSection('section-2');
</script>
```

## 📚 API Reference

### React

#### `ScrollSectionProvider`

앱의 최상위에서 ScrollManager 인스턴스를 제공하는 Provider 컴포넌트입니다.

**Props:**

- `offset?: number` - 스크롤 위치 오프셋 (기본값: 0)
- `behavior?: ScrollBehavior` - 스크롤 동작 ('smooth' | 'auto', 기본값: 'smooth')
- `children: ReactNode` - 자식 컴포넌트

#### `useScrollSection(sectionId?: string)`

섹션을 등록하고 스크롤 기능을 사용하기 위한 훅입니다.

**Parameters:**

- `sectionId?: string` - 섹션 ID (옵션)

**Returns:**

- `registerRef: (element: HTMLElement | null) => void` - 섹션 엘리먼트를 등록하는 ref 콜백
- `scrollTo: (id: string) => void` - 특정 섹션으로 스크롤하는 함수
- `activeId: string | null` - 현재 활성화된 섹션 ID
- `isActive: boolean` - 현재 섹션이 활성화되어 있는지 여부

### Vue 3

#### `ScrollSectionProvider`

앱의 최상위에서 ScrollManager 인스턴스를 제공하는 Provider 컴포넌트입니다.

**Props:**

- `offset?: number` - 스크롤 위치 오프셋 (기본값: 0)
- `behavior?: ScrollBehavior` - 스크롤 동작 ('smooth' | 'auto', 기본값: 'smooth')

#### `provideScrollManager(options?: ScrollOptions)`

Composition API를 사용하여 ScrollManager를 제공합니다.

**Parameters:**

- `options?: ScrollOptions` - 스크롤 옵션

**Returns:**

- `ScrollManager` - ScrollManager 인스턴스

#### `useScrollSection(sectionId?: string)`

섹션을 등록하고 스크롤 기능을 사용하기 위한 Composition 함수입니다.

**Parameters:**

- `sectionId?: string` - 섹션 ID (옵션)

**Returns:**

- `registerRef: (element: Element | undefined) => void` - 섹션 엘리먼트를 등록하는 함수
- `scrollTo: (id: string) => void` - 특정 섹션으로 스크롤하는 함수
- `activeId: Readonly<Ref<string | null>>` - 현재 활성화된 섹션 ID (readonly ref)
- `isActive: boolean` - 현재 섹션이 활성화되어 있는지 여부

### Core

프레임워크에 독립적인 Core 로직을 직접 사용할 수도 있습니다.

```typescript
import { ScrollManager } from '@jump-section/core';

const manager = new ScrollManager({
  offset: -80,
  behavior: 'smooth',
});

// 섹션 등록
manager.registerSection('section-1', document.getElementById('section-1')!);

// 스크롤
manager.scrollTo('section-1');

// 활성 섹션 변경 감지
manager.onActiveChange((activeId) => {
  console.log('Active section:', activeId);
});

// 정리
manager.destroy();
```

## 🏗️ Project Structure

이 프로젝트는 pnpm workspace를 사용한 모노레포 구조입니다:

```
jump-section/
├── packages/
│   ├── core/
│   ├── react/
│   └── vue/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 🛠️ Development

### Prerequisites

- Node.js >= 16
- pnpm >= 9.0.0

### Setup

```bash
# 의존성 설치
pnpm install

# 모든 패키지 빌드
pnpm build

# 테스트 실행
pnpm test

# 코드 포맷팅
pnpm format
```

### Scripts

- `pnpm build` - Turbo를 사용하여 모든 패키지 빌드
- `pnpm test` - Vitest로 모든 테스트 실행
- `pnpm lint` - 린트 검사
- `pnpm format` - Prettier로 코드 포맷팅
- `pnpm check-exports` - 패키지 export 검증

## 🤝 Contributing

기여는 언제나 환영합니다! Issue를 열거나 Pull Request를 보내주세요.

## 📄 License

ISC © k_jin.0

## 🔗 Links

- [GitHub Repository](https://github.com/bae080311/jump-section)
- [Issues](https://github.com/bae080311/jump-section/issues)
