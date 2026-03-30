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
      // rootMargin을 동적으로 계산하여 스크롤 위치에 따라 활성 섹션 변경
      rootMargin: `-${this.options.offset}px 0px -${window.innerHeight - (this.options.offset || 0) - 1}px 0px`,
      threshold: [0, 0.1, 0.5, 1],
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        // 섹션 크기 변경 시 observer 재연결로 rootMargin 재계산 및 IntersectionObserver 갱신
        this.observer?.disconnect();
        this.observer = new IntersectionObserver(this.handleIntersection, {
          root: this.options.root ?? null,
          rootMargin: `-${this.options.offset}px 0px -${window.innerHeight - (this.options.offset || 0) - 1}px 0px`,
          threshold: [0, 0.1, 0.5, 1],
        });
        this.sections.forEach((element) => this.observer?.observe(element));
        // 뷰포트 크기 변경 시에도 progress 업데이트
        this.updateProgress();
      });
      // root 엘리먼트 또는 window 자체를 ResizeObserver로 감시하여 뷰포트 크기 변화에 대응
      if (this.options.root) {
        this.resizeObserver.observe(this.options.root);
      } else {
        this.resizeObserver.observe(document.body); // window 대신 body를 관찰
      }
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

    // 뷰포트 중앙에 가장 가까운 섹션을 찾기 위해 intersectionRatio 대신 BoundingClientRect를 사용
    const viewportCenter = (this.options.root?.clientHeight || window.innerHeight) / 2;

    const best = visibleEntries.reduce((prev, current) => {
      const prevRect = prev.target.getBoundingClientRect();
      const currentRect = current.target.getBoundingClientRect();

      const prevCenter = prevRect.top + prevRect.height / 2;
      const currentCenter = currentRect.top + currentRect.height / 2;

      return Math.abs(prevCenter - viewportCenter) < Math.abs(currentCenter - viewportCenter)
        ? prev
        : current;
    });

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

  private notifyListeners() {
    this.listeners.forEach((cb) =>
      cb(this.activeId, {
        previous: this.previousId,
        direction: this.scrollDirection,
      }),
    );
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

      // 섹션이 뷰포트에 들어오기 시작하는 지점부터 완전히 지나갈 때까지 0에서 1로 진행
      const startScroll = sectionTop - viewportHeight + (this.options.offset || 0);
      const endScroll = sectionTop + sectionHeight - (this.options.offset || 0);
      const totalScrollDistance = endScroll - startScroll;

      if (totalScrollDistance <= 0) return; // 섹션 높이가 뷰포트 높이보다 작을 경우

      const rawProgress = (scrollTop - startScroll) / totalScrollDistance;
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

    this.disabledSections.add(id); // 스크롤 중에는 현재 섹션 비활성화

    const targetScrollTop =
      element.getBoundingClientRect().top +
      this.currentScrollTop -
      (this.options.offset || 0);

    return new Promise((resolve) => {
      const scrollContainer = this.options.root ?? window;
      const initialScrollTop = this.currentScrollTop;
      const distance = targetScrollTop - initialScrollTop;
      const duration = 500; // 스크롤 지속 시간 (ms)
      let startTime: number | null = null;

      const animateScroll = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2; // Easing 함수 (easeInOutCubic)

        if (scrollContainer === window) {
          window.scrollTo({
            top: initialScrollTop + distance * easeProgress,
            behavior: 'instant',
          });
        } else if (scrollContainer instanceof HTMLElement) {
          scrollContainer.scrollTop = initialScrollTop + distance * easeProgress;
        }

        if (progress < 1) {
          window.requestAnimationFrame(animateScroll);
        } else {
          this.disabledSections.delete(id); // 스크롤 완료 후 활성화
          this.activeId = id; // 스크롤 완료 후 명시적으로 activeId 설정
          this.scheduleNotify();
          resolve();
        }
      };

      if (this.options.behavior === 'smooth') {
        window.requestAnimationFrame(animateScroll);
      } else {
        if (scrollContainer === window) {
          window.scrollTo({
            top: targetScrollTop,
            behavior: 'auto',
          });
        } else if (scrollContainer instanceof HTMLElement) {
          scrollContainer.scrollTop = targetScrollTop;
        }
        this.disabledSections.delete(id); // 스크롤 완료 후 활성화
        this.activeId = id; // 스크롤 완료 후 명시적으로 activeId 설정
        this.scheduleNotify();
        resolve();
      }
    });
  }

  /** 다음 섹션으로 스크롤합니다 */
  public scrollToNext(): Promise<void> {
    const sections = this.getSections();
    const currentIndex = this.activeId ? sections.indexOf(this.activeId) : -1;
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
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      return this.scrollTo(sections[prevIndex]);
    }
    return Promise.resolve();
  }

  /** 활성 섹션 변경 이벤트 리스너를 등록합니다 */
  public onActiveChange(callback: ActiveChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** 섹션의 스크롤 진행률 (0-1) 리스너를 등록합니다 */
  public onProgressChange(id: string, callback: ProgressCallback): () => void {
    if (!this.progressListeners.has(id)) {
      this.progressListeners.set(id, new Set());
    }
    this.progressListeners.get(id)?.add(callback);
    this.updateProgress(); // 즉시 현재 진행률 업데이트
    return () => this.progressListeners.get(id)?.delete(callback);
  }

  /** 모든 이벤트 리스너와 Observer를 해제하고 정리합니다 */
  public destroy() {
    this.observer?.disconnect();
    this.observer = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

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
    this.notifyScheduled = false;
  }
}
