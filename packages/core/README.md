# @jump-section/core

<div align="center">
  <img src="https://raw.githubusercontent.com/bae080311/jump-section/main/docs/public/logo.png" alt="Jump Section Logo" width="200" />
</div>

Core scroll management library for jump-section. Framework-agnostic scroll navigation with intersection observer.

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

// Create a scroll manager instance
const manager = new ScrollManager({
  offset: -80, // Offset for fixed headers (optional)
  behavior: 'smooth', // Scroll behavior (optional)
});

// Register sections
const section1 = document.getElementById('section-1');
const section2 = document.getElementById('section-2');

manager.registerSection('section-1', section1);
manager.registerSection('section-2', section2);

// Scroll to a section
manager.scrollTo('section-1');

// Listen to active section changes
const unsubscribe = manager.onActiveChange((activeId) => {
  console.log('Active section:', activeId);
});

// Cleanup
manager.unregisterSection('section-1');
manager.destroy();
unsubscribe();
```

## API

### `ScrollManager`

#### Constructor

```typescript
new ScrollManager(options?: ScrollOptions)
```

**Options:**

- `offset?: number` - Vertical offset in pixels (useful for fixed headers)
- `behavior?: ScrollBehavior` - Scroll behavior: `'smooth'` | `'instant'` | `'auto'`

#### Methods

##### `registerSection(id: string, element: HTMLElement): void`

Registers a section element to be tracked by the scroll manager.

##### `unregisterSection(id: string): void`

Unregisters a section from tracking.

##### `scrollTo(id: string): void`

Scrolls to the specified section.

##### `onActiveChange(callback: (id: string | null) => void): () => void`

Subscribes to active section changes. Returns an unsubscribe function.

##### `destroy(): void`

Cleans up the scroll manager and removes all observers.

## License

ISC
