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

## AI Pipeline

GitHub Actions에서 [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)이
동작합니다. 상주 서버는 없습니다.

| 워크플로우            | 트리거                     | 하는 일                                     |
| --------------------- | -------------------------- | ------------------------------------------- |
| `weekly-planning.yml` | 매주 월요일 09:00 (KST)    | 저장소 상태를 보고 개선 이슈를 제안         |
| `ai-implement.yml`    | 이슈에 `ai-implement` 라벨 | 구현 + 테스트 + 문서까지 하고 Draft PR 생성 |
| `claude.yml`          | 이슈/PR에서 `@claude` 멘션 | 빌드 에러 수정, 리뷰 코멘트 반영, 질문 응답 |
| `auto-format.yml`     | 수동 (`workflow_dispatch`) | Prettier 포맷만 적용 (LLM 미사용)           |

기본 흐름은 **제안 → 라벨 → 구현 → 리뷰**입니다. 주간 기획이 만든 이슈를 확인하고 `ai-implement`
라벨을 붙이면 Draft PR까지 자동으로 올라오고, 사람이 리뷰합니다. PR에서 고칠 게 있으면 코멘트로
`@claude`를 멘션하세요.

```
@claude CI 빌드 에러를 고쳐줘
@claude 이 리뷰 코멘트 반영해줘
```

AI가 만든 브랜치는 반드시 사람이 리뷰한 뒤 머지합니다 (`CLAUDE.md`「AI 파이프라인 거버넌스」).

### 관측 (로컬 n8n)

저장소를 바꾸는 일은 위의 Actions가, **실패를 알아채는 일**은 로컬 n8n(`.n8n/`)이 맡습니다.

| 워크플로우              | 방식                     | 하는 일                                      |
| ----------------------- | ------------------------ | -------------------------------------------- |
| `ci-failure-alert.json` | 15분마다 GitHub API 폴링 | 새로 실패한 워크플로우 실행을 Discord로 알림 |

워크플로우마다 `if: failure()`를 심는 대신 한 곳에서 모든 실패를 봅니다 — 앞으로 추가되는
워크플로우까지 자동으로 포함됩니다. 웹훅을 받지 않아 터널이 필요 없고, 읽기 전용 토큰만 씁니다.

```bash
bash scripts/n8n-setup.sh    # .env 생성 → 값 입력 → 다시 실행하면 기동
```

맥이 꺼져 있는 동안에는 알림이 지연됩니다(유실되지는 않습니다 — 폴링이라 다음 기동 때 따라잡습니다).

### 설정

1. [Claude GitHub App](https://github.com/apps/claude) 설치
2. `claude setup-token` 으로 토큰을 만들어 저장소 Secrets에 `CLAUDE_CODE_OAUTH_TOKEN` 으로 추가
   (구독 기반이라 API 과금이 없습니다)
3. 저장소 Labels에 `ai-proposal`, `ai-implement` 추가

## Contributing

Issue를 열거나 Pull Request를 보내주세요.

## License

ISC © k_jin.0

## Links

- [GitHub Repository](https://github.com/bae080311/jump-section)
- [Issues](https://github.com/bae080311/jump-section/issues)
