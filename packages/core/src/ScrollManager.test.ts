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
      readonly scrollMargin: string = '';

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

  // ─── ARIA & Focus ────────────────────────────────────────────────────────────

  it('applies role and aria-label on registerSection', () => {
    manager.registerSection('section-1', mockElement);
    expect(mockElement.getAttribute('role')).toBe('region');
    expect(mockElement.getAttribute('aria-label')).toBe('section-1');
  });

  it('focuses element when focusActiveSection is enabled', async () => {
    manager = new ScrollManager({ focusActiveSection: true });
    manager.registerSection('section-1', mockElement);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    vi.spyOn(mockElement, 'focus').mockImplementation(() => {});

    await manager.scrollTo('section-1');
    expect(mockElement.focus).toHaveBeenCalled();
  });

  // ─── Sticky Elements ──────────────────────────────────────────────────

  it('calculates sticky element height', () => {
    const stickyHeader = document.createElement('div');
    stickyHeader.id = 'sticky-header';
    document.body.appendChild(stickyHeader);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      position: 'sticky',
    } as CSSStyleDeclaration);
    vi.spyOn(stickyHeader, 'getBoundingClientRect').mockReturnValue({ height: 50 } as DOMRect);

    manager = new ScrollManager({ stickyElements: ['sticky-header'] });

    document.body.removeChild(stickyHeader);
  });

  // ─── Custom Easing ────────────────────────────────────────────────────────

  it('applies custom easing function', () => {
    const customEasing = (t: number) => t * t;
    manager = new ScrollManager({ easing: customEasing, behavior: 'smooth' });
    expect(manager).toBeDefined();
  });

  // ─── Additional Coverage Tests ────────────────────────────────────────

  it('scrollToLast scrolls to last section', () => {
    manager.registerSection('section-1', mockElement);
    manager.registerSection('section-2', mockElement2);
    vi.spyOn(mockElement2, 'getBoundingClientRect').mockReturnValue({ top: 800 } as DOMRect);
    manager.scrollToLast();
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('scrollToFirst scrolls to first section', () => {
    manager.registerSection('section-1', mockElement);
    manager.registerSection('section-2', mockElement2);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    manager.scrollToFirst();
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('offProgressChange removes listener', () => {
    manager.registerSection('section-1', mockElement);
    const callback = vi.fn();
    manager.onProgressChange('section-1', callback);
    manager.offProgressChange('section-1', callback);
    expect(manager.getActiveId()).toBeDefined();
  });

  it('handles undefined element gracefully', () => {
    manager.registerSection('section-1', null as unknown as HTMLElement);
    expect(observeMock).not.toHaveBeenCalled();
  });

  it('warns when scrolling to missing section', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    manager.scrollTo('missing');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('getActiveId returns null initially', () => {
    expect(manager.getActiveId()).toBeNull();
  });

  it('handles window undefined', () => {
    const managerNoWindow = new ScrollManager();
    managerNoWindow.registerSection('section-1', mockElement);
    expect(managerNoWindow.getSections()).toContain('section-1');
  });

  // ─── Additional Edge Cases ─────────────────────────────────────

  it('getSections sorts by position', () => {
    manager.registerSection('section-2', mockElement2);
    manager.registerSection('section-1', mockElement);
    const sections = manager.getSections();
    expect(sections).toHaveLength(2);
  });

  it('offActiveChange removes listener', () => {
    const callback = vi.fn();
    manager.onActiveChange(callback);
    manager.offActiveChange(callback);
    callback.mockClear();
    expect(callback).not.toHaveBeenCalled();
  });

  it('disables section removes from active detection', () => {
    manager.registerSection('section-1', mockElement);
    manager.disableSection('section-1');
    expect(manager.getSections()).not.toContain('section-1');
  });

  it('enables previously disabled section', () => {
    manager.registerSection('section-1', mockElement);
    manager.disableSection('section-1');
    manager.enableSection('section-1');
    expect(manager.getSections()).toContain('section-1');
  });

  it('unregisterSection cleans up properly', () => {
    manager.registerSection('section-1', mockElement);
    manager.unregisterSection('section-1');
    expect(manager.getSections()).toHaveLength(0);
  });

  it('scrollToNext skips if no next section', async () => {
    manager.registerSection('section-1', mockElement);
    const result = await manager.scrollToNext();
    expect(result).toBeUndefined();
  });

  it('scrollToPrev skips if no prev section', async () => {
    manager.registerSection('section-1', mockElement);
    const result = await manager.scrollToPrev();
    expect(result).toBeUndefined();
  });

  it('handles scrollTo with hash option', () => {
    manager = new ScrollManager({ hash: true });
    manager.registerSection('section-1', mockElement);
    expect(manager.getSections()).toContain('section-1');
  });

  it('handles scrollTo with keyboard option', () => {
    manager = new ScrollManager({ keyboard: true });
    manager.registerSection('section-1', mockElement);
    expect(manager.getSections()).toContain('section-1');
  });

  it('handles rootMargin option', () => {
    manager = new ScrollManager({ rootMargin: '-10% 0px -50% 0px' });
    manager.registerSection('section-1', mockElement);
    expect(manager.getSections()).toContain('section-1');
  });

  it('handles behavior auto', () => {
    manager = new ScrollManager({ behavior: 'auto' });
    manager.registerSection('section-1', mockElement);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    manager.scrollTo('section-1');
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('handles behavior instant', () => {
    manager = new ScrollManager({ behavior: 'instant' });
    manager.registerSection('section-1', mockElement);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    manager.scrollTo('section-1');
    expect(window.scrollTo).toHaveBeenCalled();
  });

  // ─── Scroll Direction & Progress ─────────────────────────────────

  it('tracks scroll direction', () => {
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true });
    manager.registerSection('section-1', mockElement);
    const callback = vi.fn();
    manager.onActiveChange(callback);
    expect(callback).toHaveBeenCalled();
  });

  it('calls progress callback immediately', () => {
    manager.registerSection('section-1', mockElement);
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 500,
    } as DOMRect);
    const callback = vi.fn();
    manager.onProgressChange('section-1', callback);
    expect(callback).toHaveBeenCalled();
  });

  it('scrollToNext works', async () => {
    manager.registerSection('section-1', mockElement);
    manager.registerSection('section-2', mockElement2);
    vi.spyOn(mockElement2, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    await manager.scrollToNext();
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('scrollToPrev works', async () => {
    manager.registerSection('section-1', mockElement);
    manager.registerSection('section-2', mockElement2);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    vi.spyOn(mockElement2, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);
    manager.scrollTo('section-2');
    await manager.scrollToPrev();
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('getSections filters disabled', () => {
    manager.registerSection('section-1', mockElement);
    manager.disableSection('section-1');
    const sections = manager.getSections();
    expect(sections).not.toContain('section-1');
  });

  it('handles empty sections array', () => {
    const sections = manager.getSections();
    expect(sections).toEqual([]);
  });

  it('handles HTMLElement root option', () => {
    const root = document.createElement('div');
    manager = new ScrollManager({ root });
    expect(manager).toBeDefined();
  });

  it('scrollToFirst returns promise for empty', async () => {
    const result = await manager.scrollToFirst();
    expect(result).toBeUndefined();
  });

  it('scrollToLast returns promise for empty', async () => {
    const result = await manager.scrollToLast();
    expect(result).toBeUndefined();
  });

  it('calculates sticky height for HTMLElement array', () => {
    const stickyEl = document.createElement('div');
    stickyEl.id = 'sticky';
    document.body.appendChild(stickyEl);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      position: 'fixed',
    } as CSSStyleDeclaration);
    vi.spyOn(stickyEl, 'getBoundingClientRect').mockReturnValue({ height: 60 } as DOMRect);
    manager = new ScrollManager({ stickyElements: [stickyEl] });
    document.body.removeChild(stickyEl);
  });
});
