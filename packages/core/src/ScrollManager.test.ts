import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScrollManager } from './ScrollManager';

describe('ScrollManager', () => {
  let manager: ScrollManager;
  let mockElement: HTMLElement;
  let mockElement2: HTMLElement;
  const intersectionObserverMock = vi.fn();
  const observeMock = vi.fn();
  const unobserveMock = vi.fn();
  const disconnectMock = vi.fn();

  beforeEach(() => {
    class IntersectionObserverMock implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: ReadonlyArray<number> = [];

      constructor(
        public callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        intersectionObserverMock(callback, options);
      }

      observe = observeMock;
      unobserve = unobserveMock;
      disconnect = disconnectMock;
      takeRecords = () => [];
    }

    window.IntersectionObserver = IntersectionObserverMock;
    window.scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });

    manager = new ScrollManager();
    mockElement = document.createElement('div');
    mockElement.id = 'section-1';
    mockElement2 = document.createElement('div');
    mockElement2.id = 'section-2';
  });

  afterEach(() => {
    manager.destroy();
    vi.clearAllMocks();
  });

  // ─── 등록 / 해제 ───────────────────────────────────────────────────────────

  it('registers a section and observes it', () => {
    manager.registerSection('section-1', mockElement);
    expect(observeMock).toHaveBeenCalledWith(mockElement);
    expect(mockElement.id).toBe('section-1');
  });

  it('unregisters a section and unobserves it', () => {
    manager.registerSection('section-1', mockElement);
    manager.unregisterSection('section-1');
    expect(unobserveMock).toHaveBeenCalledWith(mockElement);
  });

  it('does not register when element is falsy', () => {
    manager.registerSection('section-1', null as unknown as HTMLElement);
    expect(observeMock).not.toHaveBeenCalled();
  });

  // ─── 스크롤 ────────────────────────────────────────────────────────────────

  it('scrolls to a section', () => {
    manager.registerSection('section-1', mockElement);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);

    manager.scrollTo('section-1');

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 100, behavior: 'smooth' });
  });

  it('scrolls with offset', () => {
    manager = new ScrollManager({ offset: -50 });
    manager.registerSection('section-1', mockElement);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);

    manager.scrollTo('section-1');

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 50, behavior: 'smooth' });
  });

  it('warns when scrolling to unregistered section', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    manager.scrollTo('not-found');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not-found'));
  });

  it('scrollTo returns a Promise', () => {
    manager.registerSection('section-1', mockElement);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);
    const result = manager.scrollTo('section-1');
    expect(result).toBeInstanceOf(Promise);
  });

  // ─── 활성 섹션 변경 ────────────────────────────────────────────────────────

  it('notifies listeners on active change with meta', async () => {
    const callback = vi.fn();
    manager.onActiveChange(callback);

    const observerCallback = intersectionObserverMock.mock.calls[0][0];
    manager.registerSection('section-1', mockElement);

    const entry = { isIntersecting: true, intersectionRatio: 0.8, target: mockElement };
    observerCallback([entry]);

    await Promise.resolve(); // queueMicrotask flush
    expect(callback).toHaveBeenCalledWith('section-1', expect.objectContaining({ previous: null }));
  });

  it('calls listener immediately with current state when subscribed', () => {
    const callback = vi.fn();
    manager.onActiveChange(callback);
    expect(callback).toHaveBeenCalledWith(null, { previous: null, direction: null });
  });

  it('returns unsubscribe function', async () => {
    const callback = vi.fn();
    const unsubscribe = manager.onActiveChange(callback);
    callback.mockClear();

    unsubscribe();

    const observerCallback = intersectionObserverMock.mock.calls[0][0];
    manager.registerSection('section-1', mockElement);
    observerCallback([{ isIntersecting: true, intersectionRatio: 0.8, target: mockElement }]);

    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
  });

  // ─── disable / enable ──────────────────────────────────────────────────────

  it('disables a section from active detection', async () => {
    const callback = vi.fn();
    manager.onActiveChange(callback);
    callback.mockClear();

    manager.registerSection('section-1', mockElement);
    manager.disableSection('section-1');

    const observerCallback = intersectionObserverMock.mock.calls[0][0];
    observerCallback([{ isIntersecting: true, intersectionRatio: 0.9, target: mockElement }]);

    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
  });

  it('enables a previously disabled section', async () => {
    const callback = vi.fn();
    manager.registerSection('section-1', mockElement);
    manager.disableSection('section-1');
    manager.enableSection('section-1');
    manager.onActiveChange(callback);
    callback.mockClear();

    const observerCallback = intersectionObserverMock.mock.calls[0][0];
    observerCallback([{ isIntersecting: true, intersectionRatio: 0.9, target: mockElement }]);

    await Promise.resolve();
    expect(callback).toHaveBeenCalledWith('section-1', expect.any(Object));
  });

  // ─── getSections / getActiveId ─────────────────────────────────────────────

  it('getSections returns registered section ids', () => {
    manager.registerSection('section-1', mockElement);
    manager.registerSection('section-2', mockElement2);
    const sections = manager.getSections();
    expect(sections).toContain('section-1');
    expect(sections).toContain('section-2');
  });

  it('getSections excludes disabled sections', () => {
    manager.registerSection('section-1', mockElement);
    manager.disableSection('section-1');
    expect(manager.getSections()).not.toContain('section-1');
  });

  it('getActiveId returns current active id', async () => {
    expect(manager.getActiveId()).toBeNull();

    manager.registerSection('section-1', mockElement);
    const observerCallback = intersectionObserverMock.mock.calls[0][0];
    observerCallback([{ isIntersecting: true, intersectionRatio: 0.8, target: mockElement }]);

    await Promise.resolve();
    expect(manager.getActiveId()).toBe('section-1');
  });

  // ─── destroy ───────────────────────────────────────────────────────────────

  it('disconnects observer on destroy', () => {
    manager.destroy();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('clears all sections and listeners on destroy', () => {
    const callback = vi.fn();
    manager.registerSection('section-1', mockElement);
    manager.onActiveChange(callback);
    manager.destroy();

    expect(manager.getSections()).toHaveLength(0);
    expect(manager.getActiveId()).toBeNull();
  });

  // ─── onProgressChange ──────────────────────────────────────────────────────

  it('onProgressChange returns unsubscribe function', () => {
    manager.registerSection('section-1', mockElement);
    const callback = vi.fn();
    const unsubscribe = manager.onProgressChange('section-1', callback);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  // ─── rootMargin 일관성 (생성자에서 단일 observer 사용) ──────────────────────

  it('uses a single consistent IntersectionObserver from constructor', () => {
    manager.registerSection('section-1', mockElement);
    manager.registerSection('section-2', mockElement2);
    // 생성자에서 한 번만 생성되어야 함 (이전에는 registerSection에서 두 번째 observer가 생성됨)
    expect(intersectionObserverMock).toHaveBeenCalledTimes(1);
  });
});
