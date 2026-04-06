# @jump-section/vue

<div align="center">
  <img src="https://raw.githubusercontent.com/bae080311/jump-section/main/docs/public/logo.png" alt="Jump Section Logo" width="200" />
</div>

Vue composables for jump-section scroll management.

## Installation

```bash
npm install @jump-section/vue
# or
pnpm add @jump-section/vue
# or
yarn add @jump-section/vue
```

## Requirements

- Vue 3.0.0 or higher

## Usage

### Basic Example

```vue
<script setup lang="ts">
import { ScrollSectionProvider } from '@jump-section/vue';
import Navigation from './Navigation.vue';
import Content from './Content.vue';
</script>

<template>
  <ScrollSectionProvider :offset="-80" behavior="smooth">
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

### Scroll Progress

```vue
<script setup lang="ts">
import { useScrollProgress } from '@jump-section/vue';

const props = defineProps<{ id: string }>();
const progress = useScrollProgress(props.id);
</script>

<template>
  <div :style="{ width: `${progress * 100}%` }" />
</template>
```

### Composition API (without `ScrollSectionProvider`)

```vue
<script setup lang="ts">
import { provideScrollManager, useScrollSection } from '@jump-section/vue';

// Call in the root component instead of using ScrollSectionProvider
provideScrollManager({ offset: -80, behavior: 'smooth', hash: true });

const { activeId, scrollTo } = useScrollSection();
</script>
```

## API

### `ScrollSectionProvider`

Component that provides scroll management context to descendants.

**Props:**

| Prop       | Type                  | Default    | Description                                                |
| ---------- | --------------------- | ---------- | ---------------------------------------------------------- |
| `offset`   | `number`              | `0`        | Vertical offset in pixels (useful for fixed headers)       |
| `behavior` | `ScrollBehavior`      | `'smooth'` | Scroll behavior: `'smooth'` \| `'instant'` \| `'auto'`     |
| `hash`     | `boolean`             | `false`    | Sync active section with URL hash                          |
| `keyboard` | `boolean`             | `false`    | Enable `Alt+ArrowDown` / `Alt+ArrowUp` keyboard navigation |
| `root`     | `HTMLElement \| null` | `null`     | Custom scroll container (defaults to `window`)             |

### `useScrollSection(sectionId?: string)`

Composable for registering a section and accessing scroll controls.

**Returns:**

| Property        | Type                                    | Description                                                                   |
| --------------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| `registerRef`   | `(el: Element \| undefined) => void`    | Ref callback to register the section element                                  |
| `scrollTo`      | `(id: string) => Promise<void>`         | Scroll to a specific section                                                  |
| `scrollToNext`  | `() => Promise<void>`                   | Scroll to the next section                                                    |
| `scrollToPrev`  | `() => Promise<void>`                   | Scroll to the previous section                                                |
| `scrollToFirst` | `() => Promise<void>`                   | Scroll to the first section                                                   |
| `scrollToLast`  | `() => Promise<void>`                   | Scroll to the last section                                                    |
| `activeId`      | `Readonly<Ref<string \| null>>`         | Currently active section ID (reactive)                                        |
| `isActive`      | `ComputedRef<boolean>`                  | Whether this section is active (only meaningful when `sectionId` is provided) |
| `direction`     | `Readonly<Ref<'up' \| 'down' \| null>>` | Current scroll direction                                                      |

### `useScrollProgress(sectionId: string): Readonly<Ref<number>>`

Returns a reactive scroll progress value (0–1) for a specific section.

### `provideScrollManager(options?: ScrollOptions): ScrollManager`

Alternative to `ScrollSectionProvider` for Composition API usage. Call in a parent component's `setup` to provide a `ScrollManager` instance to all descendants.

### `useScrollManager(): ScrollManager`

Returns the underlying `ScrollManager` instance for advanced use cases.

## License

ISC
