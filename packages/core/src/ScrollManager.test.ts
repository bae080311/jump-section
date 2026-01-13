import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScrollManager } from './ScrollManager';

describe('ScrollManager', () => {
  let manager: ScrollManager;
  let mockElement: HTMLElement;
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

    manager = new ScrollManager();
    mockElement = document.createElement('div');
    mockElement.id = 'section-1';
  });

  afterEach(() => {
    manager.destroy();
    vi.clearAllMocks();
  });

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

  it('scrolls to a section', () => {
    manager.registerSection('section-1', mockElement);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
      top: 100,
    } as DOMRect);

    manager.scrollTo('section-1');

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 100,
      behavior: 'smooth',
    });
  });

  it('scrolls with offset', () => {
    manager = new ScrollManager({ offset: -50 });
    manager.registerSection('section-1', mockElement);
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
      top: 100,
    } as DOMRect);

    manager.scrollTo('section-1');

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 50,
      behavior: 'smooth',
    });
  });

  it('notifies listeners on active change', () => {
    const callback = vi.fn();
    manager.onActiveChange(callback);

    const observerCallback = intersectionObserverMock.mock.calls[0][0]; // 1st call is in constructor

    manager.registerSection('section-1', mockElement);

    const entry = {
      isIntersecting: true,
      intersectionRatio: 0.8,
      target: mockElement,
    };

    observerCallback([entry]);

    expect(callback).toHaveBeenCalledWith('section-1');
  });
});
