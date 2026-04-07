# @jump-section/react

<div align="center">
  <img src="https://raw.githubusercontent.com/bae080311/jump-section/main/docs/public/logo.png" alt="Jump Section Logo" width="200" />
</div>

React hooks for jump-section scroll management.

## Installation

```bash
npm install @jump-section/react
# or
pnpm add @jump-section/react
# or
yarn add @jump-section/react
```

## Usage

### Basic Example

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

### Using the `Section` Component

```tsx
import { ScrollSectionProvider, Section, useScrollSection } from '@jump-section/react';

function App() {
  return (
    <ScrollSectionProvider offset={-80} behavior="smooth">
      <Navigation />
      <main>
        <Section id="section-1">
          <h2>Section 1</h2>
        </Section>
        <Section id="section-2">
          <h2>Section 2</h2>
        </Section>
      </main>
    </ScrollSectionProvider>
  );
}
```

### Scroll Progress

```tsx
import { useScrollProgress } from '@jump-section/react';

function Section({ id, children }) {
  const progress = useScrollProgress(id);

  return (
    <section>
      <div style={{ width: `${progress * 100}%` }} />
      {children}
    </section>
  );
}
```

## API

### `ScrollSectionProvider`

Provides scroll management context to child components.

**Props:**

| Prop       | Type                  | Default    | Description                                                |
| ---------- | --------------------- | ---------- | ---------------------------------------------------------- |
| `offset`   | `number`              | `0`        | Vertical offset in pixels (useful for fixed headers)       |
| `behavior` | `ScrollBehavior`      | `'smooth'` | Scroll behavior: `'smooth'` \| `'instant'` \| `'auto'`     |
| `hash`     | `boolean`             | `false`    | Sync active section with URL hash                          |
| `keyboard` | `boolean`             | `false`    | Enable `Alt+ArrowDown` / `Alt+ArrowUp` keyboard navigation |
| `root`     | `HTMLElement \| null` | `null`     | Custom scroll container (defaults to `window`)             |
| `children` | `ReactNode`           | —          | Child components                                           |

### `useScrollSection(sectionId?: string)`

Hook for registering a section and accessing scroll controls.

**Returns:**

| Property        | Type                                | Description                                                                   |
| --------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `registerRef`   | `(el: HTMLElement \| null) => void` | Ref callback to register the section element                                  |
| `scrollTo`      | `(id: string) => Promise<void>`     | Scroll to a specific section                                                  |
| `scrollToNext`  | `() => Promise<void>`               | Scroll to the next section                                                    |
| `scrollToPrev`  | `() => Promise<void>`               | Scroll to the previous section                                                |
| `scrollToFirst` | `() => Promise<void>`               | Scroll to the first section                                                   |
| `scrollToLast`  | `() => Promise<void>`               | Scroll to the last section                                                    |
| `activeId`      | `string \| null`                    | Currently active section ID                                                   |
| `isActive`      | `boolean`                           | Whether this section is active (only meaningful when `sectionId` is provided) |
| `direction`     | `'up' \| 'down' \| null`            | Current scroll direction                                                      |

### `useScrollProgress(sectionId: string): number`

Returns the scroll progress (0–1) for a specific section.

### `Section`

Convenience component that registers a scroll section without manually calling `useScrollSection` and attaching a ref.

**Props:**

| Prop | Type          | Description                                            |
| ---- | ------------- | ------------------------------------------------------ |
| `id` | `string`      | (Required) Unique section ID                           |
| `as` | `ElementType` | HTML tag or component to render (default: `'section'`) |

All other HTML attributes are forwarded to the root element.

### `useScrollManager()`

Returns the underlying `ScrollManager` instance for advanced use cases.

## License

ISC
