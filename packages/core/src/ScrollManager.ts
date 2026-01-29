export interface ScrollOptions {
  offset?: number;
  behavior?: ScrollBehavior;
}

export type ActiveChangeCallback = (id: string | null) => void;

export class ScrollManager {
  private sections: Map<string, HTMLElement> = new Map();
  private observer: IntersectionObserver | null = null;
  private activeId: string | null = null;
  private listeners: Set<ActiveChangeCallback> = new Set();
  private options: ScrollOptions;

  constructor(options: ScrollOptions = {}) {
    this.options = {
      offset: 0,
      behavior: 'smooth',
      ...options,
    };
    this.initObserver();
  }

  private initObserver() {
    if (typeof window === 'undefined') return;

    this.observer = new IntersectionObserver(this.handleIntersection, {
      rootMargin: '-20% 0px -60% 0px',
      threshold: [0, 0.1, 0.5, 1],
    });
  }

  private handleIntersection = (entries: IntersectionObserverEntry[]) => {
    const visibleEntries = entries.filter((e) => e.isIntersecting);

    if (visibleEntries.length > 0) {
      const best = visibleEntries.reduce((prev, current) =>
        prev.intersectionRatio > current.intersectionRatio ? prev : current,
      );

      const id = best.target.id;
      if (id && id !== this.activeId) {
        this.activeId = id;
        this.notifyListeners();
      }
    }
  };

  public registerSection(id: string, element: HTMLElement) {
    if (typeof window === 'undefined') return;
    if (!element) return;
    this.sections.set(id, element);
    if (!this.observer) {
      this.observer = new IntersectionObserver(this.handleIntersection, {
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0,
      });
    }

    if (!element.id) {
      element.id = id;
    }
    this.observer.observe(element);
  }

  public unregisterSection(id: string) {
    const element = this.sections.get(id);
    if (element && this.observer) {
      this.observer.unobserve(element);
    }
    this.sections.delete(id);
  }

  public scrollTo(id: string) {
    if (typeof window === 'undefined') return;

    const element = this.sections.get(id);
    if (!element) {
      console.warn(
        `[ScrollManager] Section with id "${id}" not found. Available sections: ${Array.from(
          this.sections.keys(),
        ).join(', ')}`,
      );
      return;
    }

    const { offset, behavior } = this.options;
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      top: elementPosition + (offset || 0),
      behavior: behavior || 'smooth',
    });
  }

  public onActiveChange(callback: ActiveChangeCallback) {
    this.listeners.add(callback);
    callback(this.activeId);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.activeId));
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.sections.clear();
    this.listeners.clear();
  }
}
