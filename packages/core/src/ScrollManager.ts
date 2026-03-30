export interface ScrollOptions {
  offset?: number;
  behavior?: ScrollBehavior;
  /** URL hash와 활성 섹션을 자동으로 동기화합니다 */
  hash?: boolean;
  /** window 대신 커스텀 스크롤 컨테이너를 사용합니다 */
  root?: HTMLElement | null;
  /** 키보드 네비게이션을 활성화하고 단축키를 설정합니다 (기본: Alt+ArrowDown/Up) */
  keyboard?:
    | boolean
    | {
        next?: string; // 예: 'ArrowDown'
        previous?: string; // 예: 'ArrowUp'
        altKey?: boolean;
        ctrlKey?: boolean;
        shiftKey?: boolean;
        metaKey?: boolean;
      };
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
    } as Required<ScrollOptions>; // 'as Required<ScrollOptions>'를 추가하여 타입 추론 문제 해결
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

    const keyboardOptions =
      typeof this.options.keyboard === 'object' ? this.options.keyboard : {};

    const defaultKeyboardConfig = {
      next: 'ArrowDown',
      previous: 'ArrowUp',
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
    };

    const config = { ...defaultKeyboardConfig, ...keyboardOptions };

    this.keyboardHandler = (e: KeyboardEvent) => {
      const isAltKey = config.altKey === undefined ? true : config.altKey;
      const isCtrlKey = config.ctrlKey === undefined ? false : config.ctrlKey;
      const isShiftKey = config.shiftKey === undefined ? false : config.shiftKey;
      const isMetaKey = config.metaKey === undefined ? false : config.metaKey;

      const matchesModifier = (
        (isAltKey && e.altKey) ||
        (isCtrlKey && e.ctrlKey) ||
        (isShiftKey && e.shiftKey) ||
        (isMetaKey && e.metaKey)
      ) && !(
        (!isAltKey && e.altKey) ||
        (!isCtrlKey && e.ctrlKey) ||
        (!isShiftKey && e.shiftKey) ||
        (!isMetaKey && e.metaKey)
      );
      
      // 기본값이 altKey: true 이므로, 다른 수식어 키가 명시적으로 false인 경우도 처리
      const hasRequiredModifiers = 
        (isAltKey ? e.altKey : !e.altKey) &&
        (isCtrlKey ? e.ctrlKey : !e.ctrlKey) &&
        (isShiftKey ? e.shiftKey : !e.shiftKey) &&
        (isMetaKey ? e.metaKey : !e.metaKey);

      if (!hasRequiredModifiers) return;

      if (e.key === config.next) {
        e.preventDefault();
        this.scrollToNext();
      } else if (e.key === config.previous) {
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
      return Promise.reject(new Error(`Section with id "${id}" not found.`));
    }

    const offset = this.options.offset ?? 0;
    let top = element.offsetTop - offset;

    if (this.options.root) {
      // 루트가 있는 경우, 루트 기준의 offsetTop 계산
      const rootRect = this.options.root.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      top = elementRect.top - rootRect.top + this.options.root.scrollTop - offset;
    }

    return new Promise((resolve) => {
      const scrollTarget = this.options.root ?? window;
      const startScrollTop = this.currentScrollTop;
      const distance = top - startScrollTop;
      const duration = this.options.behavior === 'smooth' ? 500 : 0; // ms
      const startTime = performance.now();

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = this.easeInOutQuad(progress);
        const newScrollTop = startScrollTop + distance * ease;

        if (this.options.root) {
          this.options.root.scrollTop = newScrollTop;
        } else {
          window.scrollTo(0, newScrollTop);
        }

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          // 스크롤이 끝난 후, 실제 위치와 목표 위치가 다를 경우 한 번 더 조정
          if (this.options.root) {
            this.options.root.scrollTop = top;
          } else {
            window.scrollTo(0, top);
          }

          this.activeId = id; // 스크롤 완료 후 명시적으로 활성 ID 설정
          this.scheduleNotify();
          resolve();
        }
      };

      if (duration === 0) {
        if (this.options.root) {
          this.options.root.scrollTop = top;
        } else {
          window.scrollTo(0, top);
        }
        this.activeId = id; // 스크롤 완료 후 명시적으로 활성 ID 설정
        this.scheduleNotify();
        resolve();
      } else {
        requestAnimationFrame(animateScroll);
      }
    });
  }

  /** 다음 섹션으로 스크롤합니다 */
  public scrollToNext(): Promise<void> {
    const sections = this.getSections();
    const currentIndex = this.activeId ? sections.indexOf(this.activeId) : -1;

    if (currentIndex === -1) {
      // 활성 섹션이 없으면 첫 섹션으로 스크롤
      if (sections.length > 0) {
        return this.scrollTo(sections[0]);
      }
      return Promise.resolve();
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < sections.length) {
      return this.scrollTo(sections[nextIndex]);
    }
    return Promise.resolve();
  }

  /** 이전 섹션으로 스크롤합니다 */
  public scrollToPrev(): Promise<void> {
    const sections = this.getSections();
    const currentIndex = this.activeId ? sections.indexOf(this.activeId) : -1;

    if (currentIndex === -1) {
      // 활성 섹션이 없으면 마지막 섹션으로 스크롤
      if (sections.length > 0) {
        return this.scrollTo(sections[sections.length - 1]);
      }
      return Promise.resolve();
    }

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      return this.scrollTo(sections[prevIndex]);
    }
    return Promise.resolve();
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /** 활성 섹션 변경 리스너를 등록합니다 */
  public onActiveChange(callback: ActiveChangeCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** 특정 섹션의 스크롤 진행률 리스너를 등록합니다 (0에서 1 사이 값) */
  public onProgressChange(id: string, callback: ProgressCallback) {
    if (!this.progressListeners.has(id)) {
      this.progressListeners.set(id, new Set());
    }
    this.progressListeners.get(id)?.add(callback);
    this.updateProgress(); // 초기 값 즉시 전달
    return () => this.progressListeners.get(id)?.delete(callback);
  }

  private notifyListeners() {
    const meta: ActiveChangeMeta = {
      previous: this.previousId,
      direction: this.scrollDirection,
    };
    this.listeners.forEach((listener) => listener(this.activeId, meta));
  }

  /** 등록된 모든 이벤트 리스너와 observer를 정리합니다 */
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
    this.activeId = null;
    this.previousId = null;
  }
}
