# @jump-section/core

<div align="center">
  <img src="https://raw.githubusercontent.com/bae080311/jump-section/main/docs/public/logo.png" alt="Jump Section Logo" width="200" />
</div>

Framework-agnostic scroll section management library. Tracks active sections via IntersectionObserver and provides programmatic scroll navigation.

## Installation

```bash
npm install @jump-section/core
# or
pnpm add @jump-section/core
# or
yarn add @jump-section/core
```

## Usage

```typescript
import { ScrollManager } from '@jump-section/core';

const manager = new ScrollManager({
  offset: -80,
  behavior: 'smooth',
  hash: true,
  keyboard: true,
});

// Register sections
manager.registerSection('section-1', document.getElementById('section-1')!);
manager.registerSection('section-2', document.getElementById('section-2')!);

// Scroll to a section
await manager.scrollTo('section-1');

// Listen to active section changes
const unsubscribe = manager.onActiveChange((activeId, meta) => {
  console.log('Active section:', activeId);
  console.log('Previous:', meta.previous, 'Direction:', meta.direction);
});

// Cleanup
unsubscribe();
manager.destroy();
```

## API

### `ScrollManager`

#### Constructor

```typescript
new ScrollManager(options?: ScrollOptions)
```

**Options:**

| Option     | Type                  | Default    | Description                                                |
| ---------- | --------------------- | ---------- | ---------------------------------------------------------- |
| `offset`   | `number`              | `0`        | Vertical offset in pixels (useful for fixed headers)       |
| `behavior` | `ScrollBehavior`      | `'smooth'` | Scroll behavior: `'smooth'` \| `'instant'` \| `'auto'`     |
| `hash`     | `boolean`             | `false`    | Sync active section with URL hash                          |
| `root`     | `HTMLElement \| null` | `null`     | Custom scroll container (defaults to `window`)             |
| `keyboard` | `boolean`             | `false`    | Enable `Alt+ArrowDown` / `Alt+ArrowUp` keyboard navigation |

#### Methods

##### `registerSection(id: string, element: HTMLElement): void`

Registers a section element to be tracked.

##### `unregisterSection(id: string): void`

Unregisters a section from tracking.

##### `scrollTo(id: string): Promise<void>`

Scrolls to the specified section. Returns a Promise that resolves when scrolling is complete.

##### `scrollToNext(): Promise<void>`

Scrolls to the next section in DOM order.

##### `scrollToPrev(): Promise<void>`

Scrolls to the previous section in DOM order.

##### `scrollToFirst(): Promise<void>`

Scrolls to the first registered section.

##### `scrollToLast(): Promise<void>`

Scrolls to the last registered section.

##### `onActiveChange(callback: (id: string | null, meta: ActiveChangeMeta) => void): () => void`

Subscribes to active section changes. Returns an unsubscribe function.

`ActiveChangeMeta`:

- `previous: string | null` — previously active section ID
- `direction: 'up' | 'down' | null` — scroll direction at the time of change

##### `onProgressChange(id: string, callback: (progress: number) => void): () => void`

Subscribes to scroll progress (0–1) for a specific section. Returns an unsubscribe function.

##### `disableSection(id: string): void`

Temporarily excludes a section from active tracking.

##### `enableSection(id: string): void`

Re-includes a previously disabled section in active tracking.

##### `getSections(): string[]`

Returns registered section IDs sorted by DOM position (top to bottom), excluding disabled sections.

##### `getActiveId(): string | null`

Returns the currently active section ID.

##### `destroy(): void`

Cleans up all observers, event listeners, and internal state.

## License

ISC
