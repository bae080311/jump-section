# @jump-section/vue

Vue composables for jump-section scroll management. Easily add scroll-to-section navigation to your Vue 3 applications.

## Installation

```bash
npm install @jump-section/vue
# or
pnpm add @jump-section/vue
# or
yarn add @jump-section/vue
```

## Usage

### Basic Example

```vue
<script setup>
import { useScrollSection } from '@jump-section/vue';

// Initialize scroll manager with options
const { scrollTo, activeId } = useScrollSection({
  offset: -80,
  behavior: 'smooth',
});

// Register sections
const { registerRef: section1Ref } = useScrollSection('section-1');
const { registerRef: section2Ref } = useScrollSection('section-2');
</script>

<template>
  <div>
    <nav>
      <button @click="scrollTo('section-1')" :class="{ active: activeId === 'section-1' }">
        Section 1
      </button>
      <button @click="scrollTo('section-2')" :class="{ active: activeId === 'section-2' }">
        Section 2
      </button>
    </nav>

    <main>
      <section :ref="section1Ref">
        <h2>Section 1</h2>
        <p>Content for section 1...</p>
      </section>
      <section :ref="section2Ref">
        <h2>Section 2</h2>
        <p>Content for section 2...</p>
      </section>
    </main>
  </div>
</template>
```

### With Active State

```vue
<script setup>
import { useScrollSection } from '@jump-section/vue';

const props = defineProps({
  id: String,
  title: String,
});

const { registerRef, isActive } = useScrollSection(props.id);
</script>

<template>
  <section :ref="registerRef" :class="{ active: isActive }">
    <h2>{{ title }}</h2>
    <slot />
  </section>
</template>
```

### Composition API

```vue
<script setup>
import { useScrollSection } from '@jump-section/vue';
import { watch } from 'vue';

const { activeId, scrollTo } = useScrollSection({
  offset: -100,
  behavior: 'smooth',
});

// Watch for active section changes
watch(activeId, (newId) => {
  console.log('Active section changed to:', newId);
});

// Programmatic scroll
const handleClick = () => {
  scrollTo('target-section');
};
</script>
```

## API

### `useScrollSection(options?: ScrollOptions | string)`

Composable for managing scroll sections.

**Parameters:**

- `options?: ScrollOptions | string` - Configuration options or section ID
  - If `string`: Section ID to register
  - If `ScrollOptions`: Configuration object
    - `offset?: number` - Vertical offset in pixels
    - `behavior?: ScrollBehavior` - Scroll behavior: `'smooth'` | `'instant'` | `'auto'`

**Returns:**

- `registerRef: (element: HTMLElement | null) => void` - Ref callback to register the section element
- `scrollTo: (id: string) => void` - Function to scroll to a specific section
- `activeId: Ref<string | null>` - Currently active section ID (reactive)
- `isActive: ComputedRef<boolean>` - Whether this section is currently active (only if sectionId provided)
- `manager: ScrollManager` - The underlying scroll manager instance

## TypeScript

This package includes TypeScript definitions.

## Requirements

- Vue 3.0.0 or higher

## License

ISC
