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
      threshold: [0, 0.1, 0.5, 1,],
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

    if (visibleEntries.length === 0) {
      // 모든 섹션이 뷰포트 밖으로 벗어났을 때 비활성 상태로 전환
      if (this.activeId !== null) {
        this.previousId = this.activeId;
        this.activeId = null;
        this.scheduleNotify();
      }
      return;
    }

    const best = visibleEntries.reduce((prev, current) =>
      prev.intersectionRatio > current.intersectionRatio ? prev : current,
    );

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
        `[ScrollManager] Section with id "${id}" not found. Available sections: ${Array.from(
          this.sections.keys(),
        ).join(', ')}`,
      );
      return Promise.resolve();
    }

    const elementRect = element.getBoundingClientRect();
    const rootRect = this.options.root?.getBoundingClientRect() || { top: 0, left: 0, };

    const targetScrollTop =
      elementRect.top + this.currentScrollTop - rootRect.top + this.options.offset;

    const scrollTarget = this.options.root || window;

    return new Promise<void>((resolve) => {
      const scrollHandler = () => {
        if (
          Math.abs(this.currentScrollTop - targetScrollTop) < 1 ||
          (scrollTarget === window &&
            window.innerHeight + window.scrollY >= document.body.offsetHeight) || // End of page
          (this.options.root &&
            this.options.root.clientHeight + this.options.root.scrollTop >=
              this.options.root.scrollHeight) // End of root scrollable element
        ) {
          scrollTarget.removeEventListener('scroll', scrollHandler);
          resolve();
        }
      };

      if (this.options.behavior === 'smooth') {
        scrollTarget.addEventListener('scroll', scrollHandler, { passive: true, });
      } else {
        resolve(); // 'auto' behavior resolves immediately
      }

      if (this.options.root) {
        this.options.root.scrollTo({
          top: targetScrollTop,
          behavior: this.options.behavior,
        });
      } else {
        window.scrollTo({
          top: targetScrollTop,
          behavior: this.options.behavior,
        });
      }
    });
  }

  /** 다음 섹션으로 스크롤합니다 */
  public scrollToNext(): Promise<void> {
    const sortedSections = this.getSections();
    const currentIndex = this.activeId ? sortedSections.indexOf(this.activeId) : -1;
    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedSections.length) {
      return this.scrollTo(sortedSections[nextIndex]);
    }
    return Promise.resolve();
  }

  /** 이전 섹션으로 스크롤합니다 */
  public scrollToPrev(): Promise<void> {
    const sortedSections = this.getSections();
    const currentIndex = this.activeId ? sortedSections.indexOf(this.activeId) : -1;
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      return this.scrollTo(sortedSections[prevIndex]);
    }
    return Promise.resolve();
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

  /** 활성 섹션 변경 이벤트를 구독합니다 */
  public onActiveChange(callback: ActiveChangeCallback): () => void {
    this.listeners.add(callback);
    // 즉시 현재 활성 섹션 상태를 전달
    callback(this.activeId, { previous: this.previousId, direction: this.scrollDirection, });
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    const meta: ActiveChangeMeta = { previous: this.previousId, direction: this.scrollDirection, };
    this.listeners.forEach((listener) => listener(this.activeId, meta));
  }

  /** 특정 섹션의 스크롤 진행률 이벤트를 구독합니다 */
  public onProgressChange(sectionId: string, callback: ProgressCallback) {
    return this.onProgress(sectionId, callback);
  }

  /** 특정 섹션의 스크롤 진행률 이벤트를 구독합니다 */
  public onProgress(sectionId: string, callback: ProgressCallback) {
    if (!this.progressListeners.has(sectionId)) {
      this.progressListeners.set(sectionId, new Set());
    }
    this.progressListeners.get(sectionId)?.add(callback);
    // 즉시 현재 진행률 상태를 전달
    this.updateProgress();
    return () => {
      this.progressListeners.get(sectionId)?.delete(callback);
    };
  }

  /** 등록된 모든 이벤트 리스너와 Observer를 해제하고 정리합니다 */
  public destroy() {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.sections.forEach((element) => {
      this.observer?.unobserve(element);
      this.resizeObserver?.unobserve(element);
    });
    this.sections.clear();
    this.disabledSections.clear();
    this.listeners.clear();
    this.progressListeners.clear();

    if (this.scrollHandler) {
      this.scrollRoot.removeEventListener('scroll', this.scrollHandler as EventListener);
    }
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
    }
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
  }
}
