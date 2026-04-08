import { bench, describe, vi } from 'vitest';
import { ScrollManager } from '../ScrollManager';

class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  readonly scrollMargin: string = '';

  constructor(
    public callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {}

  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
  takeRecords = (): IntersectionObserverEntry[] => [];
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
vi.stubGlobal('scrollTo', () => {});

describe('ScrollManager 벤치마크', () => {
  bench('registerSection + unregisterSection', () => {
    const manager = new ScrollManager();
    const el = document.createElement('div');
    manager.registerSection('s1', el);
    manager.unregisterSection('s1');
    manager.destroy();
  });

  bench('getSections', () => {
    const manager = new ScrollManager();
    const el = document.createElement('div');
    manager.registerSection('s1', el);
    manager.getSections();
    manager.destroy();
  });

  bench('getActiveId', () => {
    const manager = new ScrollManager();
    manager.getActiveId();
    manager.destroy();
  });

  bench('onActiveChange (subscribe/unsubscribe)', () => {
    const manager = new ScrollManager();
    const unsub = manager.onActiveChange(() => {});
    unsub();
    manager.destroy();
  });

  bench('disableSection + enableSection', () => {
    const manager = new ScrollManager();
    const el = document.createElement('div');
    manager.registerSection('s1', el);
    manager.disableSection('s1');
    manager.enableSection('s1');
    manager.destroy();
  });
});
