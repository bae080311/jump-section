# @jump-section/react

<div align="center">
  <img src="https://raw.githubusercontent.com/bae080311/jump-section/main/docs/public/logo.png" alt="Jump Section Logo" width="200" />
</div>

React hooks for jump-section scroll management. Easily add scroll-to-section navigation to your React applications.

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
        <p>Content for section 1...</p>
      </section>
      <section ref={ref2}>
        <h2>Section 2</h2>
        <p>Content for section 2...</p>
      </section>
    </main>
  );
}
```

### Using the `Section` component

You can use the `Section` component instead of manually calling `useScrollSection(id)` and attaching a ref:

```tsx
import { ScrollSectionProvider, Section, useScrollSection } from '@jump-section/react';

function App() {
  return (
    <ScrollSectionProvider offset={-80} behavior="smooth">
      <Navigation />
      <main>
        <Section id="section-1">
          <h2>Section 1</h2>
          <p>Content for section 1...</p>
        </Section>
        <Section id="section-2">
          <h2>Section 2</h2>
          <p>Content for section 2...</p>
        </Section>
      </main>
    </ScrollSectionProvider>
  );
}
```

**Section props:** `id` (required), `as?: ElementType` (default: `'section'`), plus any HTML attributes.

### With Active State

```tsx
function Section({ id, title, children }) {
  const { registerRef, isActive } = useScrollSection(id);

  return (
    <section ref={registerRef} className={isActive ? 'active' : ''}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

## API

### `ScrollSectionProvider`

Provides scroll management context to child components.

**Props:**

- `offset?: number` - Vertical offset in pixels (useful for fixed headers)
- `behavior?: ScrollBehavior` - Scroll behavior: `'smooth'` | `'instant'` | `'auto'`
- `children: ReactNode` - Child components

### `useScrollSection(sectionId?: string)`

Hook for managing scroll sections.

**Parameters:**

- `sectionId?: string` - Optional section ID to register

**Returns:**

- `registerRef: (element: HTMLElement | null) => void` - Ref callback to register the section element
- `scrollTo: (id: string) => void` - Function to scroll to a specific section
- `activeId: string | null` - Currently active section ID
- `isActive: boolean` - Whether this section is currently active (only if sectionId provided)

### `Section`

Wrapper component that registers a scroll section without manually using `useScrollSection` and a ref.

**Props:**

- `id: string` - (Required) Unique section ID used for `scrollTo(id)` and active detection
- `as?: ElementType` - (Optional) HTML tag or component to render (default: `'section'`)
- Other HTML attributes (`className`, `style`, etc.) are forwarded to the root element

### `useScrollManager()`

Hook to access the underlying ScrollManager instance directly.

**Returns:**

- `ScrollManager` - The scroll manager instance

## TypeScript

This package includes TypeScript definitions.

## License

ISC
