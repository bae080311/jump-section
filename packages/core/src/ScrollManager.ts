export interface ScrollOptions {
  offset?: number;
  behavior?: ScrollBehavior;
  /** URL hash와 활성 섹션을 자동으로 동기화합니다 */
  hash?: boolean;
  /** window 대신 커스텀 스크롤 컨테이너를 사용합니다 */
  root?: HTMLElement | null;
  /** Alt+ArrowDown/Up 키보드 네비게이션을 활성화합니다 */
  keyboard?: boolean;
}

export interface ActiveChangeMeta {
  /** 이전에 활성화된 섹션 ID */
  previous: string | null;
  /** 스크롤 방향 */
  direction: 'up' | 'down' | null;
}

export type ActiveChangeCallback = (id: string | null, meta: ActiveChangeMeta) => void;
export type ProgressCallback = (progress: number) => void;

export class ScrollManager {
  private sections: Map<string, HTMLElement> = new Map();
  private disabledSections: Set<string> = new Set();
  private observer: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private activeId: string | null = null;
  private previousId: string | null = null;
  private lastScrollY: number = 0;
  private scrollDirection: 'up' | 'down' | null = null;
  private listeners: Set<ActiveChangeCallback> = new Set();
  private progressListeners: Map<string, Set<ProgressCallback>> = new Map();
  private options: Required<ScrollOptions>;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private popstateHandler: (() => void) | null = null;
  private notifyScheduled: boolean = false;

  constructor(options: ScrollOptions = {}) {
    this.options = {
      offset: 0,
      behavior: 'smooth',
      hash: false,
      root: null,
      keyboard: false,
      ...options,
    };
    this.initObserver();
    this.initScrollListener();
    if (this.options.hash) {
      this.initHashSync();
    }
    if (this.options.keyboard) {
      this.initKeyboard();
    }
  }

  private get scrollRoot(): Window | HTMLElement {
    return this.options.root ?? window;
  }

  private get currentScrollTop(): number {
    if (this.options.root) {
      return this.options.root.scrollTop;
    }
    return window.scrollY;
  }

  private initObserver() {
    if (typeof window === 'undefined') return;

    this.observer = new IntersectionObserver(this.handleIntersection, {
      root: this.options.root ?? null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: [0, 0.1, 0.5, 1],
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        // 섹션 크기 변경 시 observer 재연결로 rootMargin 재계산
        this.sections.forEach((element) => {
          this.observer?.unobserve(element);
          this.observer?.observe(element);
        });
      });
    }
  }

  private initScrollListener() {
    if (typeof window === 'undefined') return;

    this.scrollHandler = () => {
      const current = this.currentScrollTop;
      if (current !== this.lastScrollY) {
        this.scrollDirection = current > this.lastScrollY ? 'down' : 'up';
        this.lastScrollY = current;
      }
      this.updateProgress();
    };

    this.scrollRoot.addEventListener('scroll', this.scrollHandler as EventListener, {
      passive: true,
    });
  }

  private initHashSync() {
    if (typeof window === 'undefined') return;

    this.popstateHandler = () => {
      const id = window.location.hash.slice(1);
      if (id && this.sections.has(id)) {
        this.scrollTo(id);
      }
    };

    window.addEventListener('popstate', this.popstateHandler);
  }

  private initKeyboard() {
    if (typeof window === 'undefined') return;

    this.keyboardHandler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.scrollToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.scrollToPrev();
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  private handleIntersection = (entries: IntersectionObserverEntry[]) => {
    const visibleEntries = entries.filter((e) => e.isIntersecting);

    if (visibleEntries.length === 0) return;

    const best = visibleEntries.reduce((prev, current) =>
      prev.intersectionRatio > current.intersectionRatio ? prev : current,
    );

    // element.id 대신 sections Map에서 id 역조회 (id와 element.id가 다를 수 있음)
    const entry = [...this.sections.entries()].find(([, el]) => el === best.target);
    const id = entry?.[0] ?? best.target.id;

    if (!id || id === this.activeId || this.disabledSections.has(id)) return;

    this.previousId = this.activeId;
    this.activeId = id;
    this.scheduleNotify();

    if (this.options.hash) {
      history.replaceState(null, '', `#${id}`);
    }
  };

  private scheduleNotify() {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    queueMicrotask(() => {
      this.notifyScheduled = false;
      this.notifyListeners();
    });
  }

  private updateProgress() {
    if (this.progressListeners.size === 0) return;

    const scrollTop = this.currentScrollTop;
    const viewportHeight = this.options.root ? this.options.root.clientHeight : window.innerHeight;

    this.progressListeners.forEach((callbacks, id) => {
      if (callbacks.size === 0) return;
      const element = this.sections.get(id);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const sectionTop = this.options.root
        ? rect.top - this.options.root.getBoundingClientRect().top + this.options.root.scrollTop
        : rect.top + scrollTop;
      const sectionHeight = element.offsetHeight || rect.height;
      if (sectionHeight === 0) return;

      const rawProgress = (scrollTop - sectionTop + viewportHeight * 0.2) / sectionHeight;
      const progress = Math.max(0, Math.min(1, rawProgress));
      callbacks.forEach((cb) => cb(progress));
    });
  }

  /** 섹션을 등록하고 IntersectionObserver로 감시합니다 */
  public registerSection(id: string, element: HTMLElement) {
    if (typeof window === 'undefined') return;
    if (!element) return;

    this.sections.set(id, element);

    if (!element.id) {
      element.id = id;
    }

    this.observer?.observe(element);
    this.resizeObserver?.observe(element);

    // hash 옵션: 현재 URL hash와 일치하면 해당 섹션으로 스크롤
    if (this.options.hash && window.location.hash === `#${id}`) {
      setTimeout(() => this.scrollTo(id), 0);
    }
  }

  /** 섹션 등록을 해제하고 감시를 중지합니다 */
  public unregisterSection(id: string) {
    const element = this.sections.get(id);
    if (element) {
      this.observer?.unobserve(element);
      this.resizeObserver?.unobserve(element);
    }
    this.sections.delete(id);
    this.disabledSections.delete(id);
    this.progressListeners.delete(id);

    if (this.activeId === id) {
      this.previousId = this.activeId;
      this.activeId = null;
      this.scheduleNotify();
    }
  }

  /** 특정 섹션을 활성 감지에서 일시적으로 제외합니다 */
  public disableSection(id: string) {
    this.disabledSections.add(id);
    if (this.activeId === id) {
      this.previousId = this.activeId;
      this.activeId = null;
      this.scheduleNotify();
    }
  }

  /** 비활성화된 섹션을 다시 활성 감지에 포함시킵니다 */
  public enableSection(id: string) {
    this.disabledSections.delete(id);
  }

  /** 실제 DOM 위치 기준으로 정렬된 섹션 ID 목록을 반환합니다 */
  public getSections(): string[] {
    return [...this.sections.entries()]
      .filter(([id]) => !this.disabledSections.has(id))
      .sort(([, a], [, b]) => {
        const aTop = a.getBoundingClientRect().top;
        const bTop = b.getBoundingClientRect().top;
        return aTop - bTop;
      })
      .map(([id]) => id);
  }

  /** 현재 활성 섹션 ID를 반환합니다 */
  public getActiveId(): string | null {
    return this.activeId;
  }

  /** 지정한 섹션으로 스크롤합니다. 스크롤 완료 시 resolve되는 Promise를 반환합니다 */
  public scrollTo(id: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();

    const element = this.sections.get(id);
    if (!element) {
      console.warn(
        `[ScrollManager] Section with id "${id}" not found. Available sections: ${Array.from(this.sections.keys()).join(', ')}`,
      );
      return Promise.resolve();
    }

    const { offset, behavior } = this.options;

    if (this.options.root) {
      const elementTop = element.offsetTop;
      this.options.root.scrollTo({
        top: elementTop + offset,
        behavior,
      });
    } else {
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition + offset,
        behavior,
      });
    }

    return new Promise<void>((resolve) => {
      if (behavior === 'auto' || behavior === 'instant') {
        resolve();
        return;
      }

      let lastScrollY = this.currentScrollTop;
      let rafId: number;

      const checkSettled = () => {
        const current = this.currentScrollTop;
        if (current === lastScrollY) {
          cancelAnimationFrame(rafId);
          resolve();
          return;
        }
        lastScrollY = current;
        rafId = requestAnimationFrame(checkSettled);
      };

      rafId = requestAnimationFrame(checkSettled);

      // 안전망: 1초 후 강제 resolve
      setTimeout(() => {
        cancelAnimationFrame(rafId);
        resolve();
      }, 1000);
    });
  }

  /** 다음 섹션으로 스크롤합니다 */
  public scrollToNext(): Promise<void> {
    const ordered = this.getSections();
    const currentIndex = this.activeId ? ordered.indexOf(this.activeId) : -1;
    const nextId = ordered[currentIndex + 1];
    return nextId ? this.scrollTo(nextId) : Promise.resolve();
  }

  /** 이전 섹션으로 스크롤합니다 */
  public scrollToPrev(): Promise<void> {
    const ordered = this.getSections();
    const currentIndex = this.activeId ? ordered.indexOf(this.activeId) : ordered.length;
    const prevId = ordered[currentIndex - 1];
    return prevId ? this.scrollTo(prevId) : Promise.resolve();
  }

  /** 첫 번째 섹션으로 스크롤합니다 */
  public scrollToFirst(): Promise<void> {
    const ordered = this.getSections();
    return ordered.length > 0 ? this.scrollTo(ordered[0]) : Promise.resolve();
  }

  /** 마지막 섹션으로 스크롤합니다 */
  public scrollToLast(): Promise<void> {
    const ordered = this.getSections();
    return ordered.length > 0 ? this.scrollTo(ordered[ordered.length - 1]) : Promise.resolve();
  }

  /** 활성 섹션 변경 시 호출될 콜백을 등록합니다. 구독 해제 함수를 반환합니다 */
  public onActiveChange(callback: ActiveChangeCallback): () => void {
    this.listeners.add(callback);
    callback(this.activeId, { previous: this.previousId, direction: this.scrollDirection });
    return () => this.listeners.delete(callback);
  }

  /** 특정 섹션의 스크롤 진행률(0~1) 변경 시 호출될 콜백을 등록합니다 */
  public onProgressChange(id: string, callback: ProgressCallback): () => void {
    if (!this.progressListeners.has(id)) {
      this.progressListeners.set(id, new Set());
    }
    this.progressListeners.get(id)!.add(callback);
    return () => {
      const set = this.progressListeners.get(id);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.progressListeners.delete(id);
      }
    };
  }

  private notifyListeners() {
    const meta: ActiveChangeMeta = {
      previous: this.previousId,
      direction: this.scrollDirection,
    };
    this.listeners.forEach((listener) => listener(this.activeId, meta));
  }

  /** 모든 리소스를 정리합니다 */
  public destroy() {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();

    if (this.scrollHandler) {
      this.scrollRoot.removeEventListener('scroll', this.scrollHandler as EventListener);
      this.scrollHandler = null;
    }

    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }

    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }

    this.sections.clear();
    this.listeners.clear();
    this.progressListeners.clear();
    this.disabledSections.clear();
  }
}
