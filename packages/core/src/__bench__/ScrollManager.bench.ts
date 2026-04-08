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

// 벤치마크 루프 외부에서 공유 인스턴스 생성 — 초기화 비용이 측정치에 포함되지 않도록
const sharedManager = new ScrollManager();
const sharedEl = document.createElement('div');

describe('ScrollManager 벤치마크', () => {
  bench('registerSection + unregisterSection', () => {
    sharedManager.registerSection('s1', sharedEl);
    sharedManager.unregisterSection('s1');
  });

  bench('getSections', () => {
    sharedManager.getSections();
  });

  bench('getActiveId', () => {
    sharedManager.getActiveId();
  });

  bench('onActiveChange (subscribe/unsubscribe)', () => {
    const unsub = sharedManager.onActiveChange(() => {});
    unsub();
  });

  bench('disableSection + enableSection', () => {
    sharedManager.registerSection('s2', sharedEl);
    sharedManager.disableSection('s2');
    sharedManager.enableSection('s2');
    sharedManager.unregisterSection('s2');
  });
});
