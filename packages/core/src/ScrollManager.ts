export interface ScrollOptions {
  offset?: number;
  behavior?: ScrollBehavior;
  /** URL hash와 활성 섹션을 자동으로 동기화합니다 */
  hash?: boolean;
  /** window 대신 커스텀 스크롤 컨테이너를 사용합니다 */
  root?: HTMLElement | null;
  /**
   * 키보드 네비게이션을 활성화합니다. 
   * `true`로 설정하면 Alt+ArrowUp/Down 키로 이전/다음 섹션으로 이동합니다.
   * 커스텀 키를 사용하려면 `{ prev: "KeyA", next: "KeyB" }`와 같은 객체를 전달합니다.
   */
  keyboard?: boolean | { prev: string; next: string };
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
  private options: Required<Omit<ScrollOptions, 'keyboard'>> & { keyboard: false | { prev: string; next: string } };
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
    } as Required<Omit<ScrollOptions, 'keyboard'>> & { keyboard: false | { prev: string; next: string } };

    // keyboard 옵션 정규화
    if (this.options.keyboard === true) {
      this.options.keyboard = { prev: 'ArrowUp', next: 'ArrowDown' };
    } else if (typeof this.options.keyboard === 'object') {
      this.options.keyboard = {
        prev: this.options.keyboard.prev || 'ArrowUp',
        next: this.options.keyboard.next || 'ArrowDown',
      };
    }

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
      // IntersectionObserver가 rootMargin을 계산하는 방식 때문에 보정 필요
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
    if (typeof window === 'undefined' || !this.options.keyboard) return;

    this.keyboardHandler = (e: KeyboardEvent) => {
      const { prev, next } = this.options.keyboard as { prev: string; next: string };

      // Alt 키는 기본 동작으로 Alt+Arrow가 브라우저 히스토리 이동에 사용될 수 있으므로
      // Alt 키 없이 단일 키만으로 동작하도록 변경
      if (e.defaultPrevented) return; // 이미 다른 핸들러에 의해 처리됨

      if (e.key === next) {
        e.preventDefault();
        this.scrollToNext();
      } else if (e.key === prev) {
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
    const id = entry?.[0] ?? best.target.id; // entry?.[0]이 우선, 없으면 element.id 사용

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

      const rawProgress = (scrollTop - sectionTop + viewportHeight * 0.2) / sectionHeight; // 20% 지점에서 시작
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
      element.id = id; // 요소에 id가 없으면 할당
    }

    this.observer?.observe(element);
    this.resizeObserver?.observe(element);

    // hash 옵션: 현재 URL hash와 일치하면 해당 섹션으로 스크롤
    if (this.options.hash && window.location.hash === `#${id}`) {
      // 즉시 스크롤하면 IntersectionObserver가 제대로 작동하지 않을 수 있으므로 setTimeout
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
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();

        // root가 있을 경우 root 내부에서의 상대적인 위치를 사용
        if (this.options.root) {
          const rootRect = this.options.root.getBoundingClientRect();
          return aRect.top - rootRect.top - (bRect.top - rootRect.top);
        }
        return aRect.top - bRect.top;
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
      return Promise.reject(new Error(`Section "${id}" not found`));
    }

    // 스크롤 위치 계산
    const elementRect = element.getBoundingClientRect();
    let targetScrollTop: number;

    if (this.options.root) {
      const rootRect = this.options.root.getBoundingClientRect();
      targetScrollTop = this.options.root.scrollTop + (elementRect.top - rootRect.top) - this.options.offset;
    } else {
      targetScrollTop = window.scrollY + elementRect.top - this.options.offset;
    }

    // 스크롤 옵션
    const scrollOptions: ScrollToOptions = {
      top: targetScrollTop,
      behavior: this.options.behavior,
    };

    return new Promise((resolve) => {
      let animationFrame: number;
      const checkScrollEnd = () => {
        const current = this.currentScrollTop;
        // 스크롤이 거의 멈췄거나 목표 지점에 도달했으면 완료
        if (Math.abs(current - targetScrollTop) < 2 || this.options.behavior === 'auto') {
          // focus 관리: 스크롤 후 해당 섹션의 첫 번째 포커스 가능한 요소에 포커스
          const focusable = element.querySelector<HTMLElement>(
            'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])',
          );
          focusable?.focus();

          resolve();
          return;
        }
        animationFrame = requestAnimationFrame(checkScrollEnd);
      };

      if (this.options.behavior === 'smooth') {
        animationFrame = requestAnimationFrame(checkScrollEnd);
      } else {
        resolve(); // 'auto'일 경우 즉시 완료
      }

      if (this.options.root) {
        this.options.root.scrollTo(scrollOptions);
      } else {
        window.scrollTo(scrollOptions);
      }
    });
  }

  /** 현재 활성 섹션 다음 섹션으로 스크롤합니다 */
  public scrollToNext(): Promise<void> {
    const sections = this.getSections();
    const currentIndex = this.activeId ? sections.indexOf(this.activeId) : -1;
    const nextIndex = currentIndex + 1;

    if (nextIndex < sections.length) {
      return this.scrollTo(sections[nextIndex]);
    }
    return Promise.resolve();
  }

  /** 현재 활성 섹션 이전 섹션으로 스크롤합니다 */
  public scrollToPrev(): Promise<void> {
    const sections = this.getSections();
    const currentIndex = this.activeId ? sections.indexOf(this.activeId) : -1;
    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
      return this.scrollTo(sections[prevIndex]);
    }
    return Promise.resolve();
  }

  /** 활성 섹션 변경을 구독합니다 */
  public onActiveChange(callback: ActiveChangeCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** 섹션 스크롤 진행률을 구독합니다 (0부터 1까지) */
  public onProgress(id: string, callback: ProgressCallback) {
    if (!this.progressListeners.has(id)) {
      this.progressListeners.set(id, new Set());
    }
    this.progressListeners.get(id)?.add(callback);
    return () => this.progressListeners.get(id)?.delete(callback);
  }

  private notifyListeners() {
    const meta: ActiveChangeMeta = {
      previous: this.previousId,
      direction: this.scrollDirection,
    };
    this.listeners.forEach((cb) => cb(this.activeId, meta));
  }

  /** 모든 리스너를 정리하고 observer를 해제합니다 */
  public destroy() {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    if (this.scrollHandler) {
      this.scrollRoot.removeEventListener('scroll', this.scrollHandler as EventListener);
    }
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
    }
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
    this.sections.clear();
    this.disabledSections.clear();
    this.listeners.clear();
    this.progressListeners.clear();
  }
}
