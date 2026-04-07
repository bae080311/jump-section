export interface ScrollOptions {
  offset?: number;
  behavior?: ScrollBehavior;
  /** URL hash와 활성 섹션을 자동으로 동기화합니다 */
  hash?: boolean;
  /** window 대신 커스텀 스크롤 컨테이너를 사용합니다 */
  root?: HTMLElement | null;
  /** Alt+ArrowDown/Up 키보드 네비게이션을 활성화합니다 */
  keyboard?: boolean;
  /** 디버그 모드를 활성화하여 섹션 경계 및 상태를 시각화합니다 */
  debug?: boolean;
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
  private debugElements: Map<string, HTMLDivElement> = new Map();

  constructor(options: ScrollOptions = {}) {
    this.options = {
      offset: 0,
      behavior: 'smooth',
      hash: false,
      root: null,
      keyboard: false,
      debug: false,
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
    if (this.options.debug) {
      this.updateDebugOverlays(entries);
    }

    const visibleEntries = entries.filter((e) => e.isIntersecting);

    if (visibleEntries.length === 0) return;

    const best = visibleEntries.reduce((prev, current) =>
      prev.intersectionRatio > current.intersectionRatio ? prev : current,
    );

    // element.id 대신 sections Map에서 id 역조회 (id와 element.id가 다를 수 있음)
    let id = best.target.id;
    for (const [sectionId, el] of this.sections.entries()) {
      if (el === best.target) {
        id = sectionId;
        break;
      }
    }

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
      if (this.options.debug) {
        this.updateDebugActiveState();
      }
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

  private createDebugOverlay(id: string, element: HTMLElement): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = `jump-section-debug-${id}`;
    overlay.style.cssText = ` 
      position: absolute; 
      top: 0; 
      left: 0; 
      width: 100%; 
      height: 100%; 
      pointer-events: none; 
      box-sizing: border-box; 
      border: 2px solid rgba(0, 100, 255, 0.5); 
      background: rgba(0, 100, 255, 0.1); 
      z-index: 9999; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-family: monospace; 
      font-size: 12px; 
      color: white; 
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8); 
      overflow: hidden; 
    `;
    element.style.position =
      element.style.position === 'static' ? 'relative' : element.style.position;

    const label = document.createElement('span');
    label.style.cssText = ` 
      padding: 2px 5px; 
      background: rgba(0, 100, 255, 0.7); 
      border-radius: 3px; 
    `;
    label.textContent = `ID: ${id}`;
    overlay.appendChild(label);

    return overlay;
  }

  private updateDebugOverlays(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
      const element = entry.target as HTMLElement;
      const id = [...this.sections.entries()].find(([, el]) => el === element)?.[0] ?? element.id;
      if (!id) return;

      let overlay = this.debugElements.get(id);
      if (!overlay) {
        overlay = this.createDebugOverlay(id, element);
        element.appendChild(overlay);
        this.debugElements.set(id, overlay);
      }

      const ratio = Math.round(entry.intersectionRatio * 100);
      const isActive = id === this.activeId;

      overlay.style.borderColor = isActive
        ? 'rgba(0, 255, 0, 0.8)'
        : entry.isIntersecting
          ? 'rgba(255, 165, 0, 0.8)'
          : 'rgba(0, 100, 255, 0.5)';
      overlay.style.background = isActive
        ? 'rgba(0, 255, 0, 0.1)'
        : entry.isIntersecting
          ? 'rgba(255, 165, 0, 0.1)'
          : 'rgba(0, 100, 255, 0.1)';

      const label = overlay.querySelector('span') as HTMLSpanElement;
      if (label) {
        label.textContent = `ID: ${id} | Ratio: ${ratio}% ${isActive ? '| ACTIVE' : ''}`;
        label.style.background = isActive
          ? 'rgba(0, 255, 0, 0.7)'
          : entry.isIntersecting
            ? 'rgba(255, 165, 0, 0.7)'
            : 'rgba(0, 100, 255, 0.7)';
      }
    });
  }

  private updateDebugActiveState() {
    this.debugElements.forEach((overlay, id) => {
      const isActive = id === this.activeId;
      const label = overlay.querySelector('span') as HTMLSpanElement;
      const currentText = label.textContent || '';
      const newText = isActive
        ? currentText.includes('| ACTIVE')
          ? currentText
          : `${currentText} | ACTIVE`
        : currentText.replace(' | ACTIVE', '');

      if (label) {
        label.textContent = newText;
        label.style.background = isActive ? 'rgba(0, 255, 0, 0.7)' : 'rgba(0, 100, 255, 0.7)';
      }
      overlay.style.borderColor = isActive ? 'rgba(0, 255, 0, 0.8)' : 'rgba(0, 100, 255, 0.5)';
      overlay.style.background = isActive ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 100, 255, 0.1)';
    });
  }

  private removeDebugOverlay(id: string) {
    const overlay = this.debugElements.get(id);
    if (overlay) {
      overlay.remove();
      this.debugElements.delete(id);
    }
  }

  /**
   * 섹션을 등록하고 IntersectionObserver로 감시합니다.
   * @note `debug: true` 옵션 활성화 시, 오버레이 표시를 위해 `position` 스타일이 `relative`로 변경될 수 있습니다.
   */
  public registerSection(id: string, element: HTMLElement) {
    if (typeof window === 'undefined') return;
    if (!element) return;

    this.sections.set(id, element);

    if (!element.id) {
      element.id = id;
    }

    this.observer?.observe(element);
    this.resizeObserver?.observe(element);

    if (this.options.debug) {
      const overlay = this.createDebugOverlay(id, element);
      element.appendChild(overlay);
      this.debugElements.set(id, overlay);
    }

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
    if (this.options.debug) {
      this.removeDebugOverlay(id);
    }

    if (this.activeId === id) {
      this.previousId = this.activeId;
      this.activeId = null;
      this.scheduleNotify();
    }
  }

  /** 특정 섹션을 활성 감지에서 일시적으로 제외합니다 */
  public disableSection(id: string) {
    this.disabledSections.add(id);
    if (this.options.debug) {
      const overlay = this.debugElements.get(id);
      if (overlay) {
        overlay.style.borderStyle = 'dashed';
        const label = overlay.querySelector('span');
        if (label && !label.textContent?.includes('| DISABLED')) {
          label.textContent += ' | DISABLED';
        }
      }
    }
    if (this.activeId === id) {
      this.previousId = this.activeId;
      this.activeId = null;
      this.scheduleNotify();
    }
  }

  /** 비활성화된 섹션을 다시 활성 감지에 포함시킵니다 */
  public enableSection(id: string) {
    this.disabledSections.delete(id);
    if (this.options.debug) {
      const overlay = this.debugElements.get(id);
      if (overlay) {
        overlay.style.borderStyle = 'solid';
        const label = overlay.querySelector('span');
        if (label) {
          label.textContent = label.textContent?.replace(' | DISABLED', '') || '';
        }
      }
    }
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

    return new Promise((resolve) => {
      const targetScrollTop =
        element.getBoundingClientRect().top + this.currentScrollTop + this.options.offset;

      const rootElement = this.options.root;
      const scrollContainer = rootElement ?? window;

      const onScrollEnd = () => {
        scrollContainer.removeEventListener('scroll', onScrollEnd);
        resolve();
      };

      // 스크롤 이벤트 리스너가 중복 등록되지 않도록 방지
      scrollContainer.removeEventListener('scroll', onScrollEnd);
      scrollContainer.addEventListener('scroll', onScrollEnd, { passive: true });

      if (rootElement) {
        rootElement.scrollTo({
          top: targetScrollTop,
          behavior: this.options.behavior,
        });
      } else {
        window.scrollTo({
          top: targetScrollTop,
          behavior: this.options.behavior,
        });
      }

      // behavior가 'auto'일 경우 scroll 이벤트가 발생하지 않을 수 있으므로,
      // 일정 시간 후 강제로 resolve
      if (this.options.behavior === 'auto' || this.options.behavior === 'instant') {
        setTimeout(onScrollEnd, 100);
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
    const currentIndex = this.activeId
      ? sortedSections.indexOf(this.activeId)
      : sortedSections.length;
    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
      return this.scrollTo(sortedSections[prevIndex]);
    }
    return Promise.resolve();
  }

  /** 첫 번째 섹션으로 스크롤합니다 */
  public scrollToFirst(): Promise<void> {
    const sortedSections = this.getSections();
    if (sortedSections.length > 0) {
      return this.scrollTo(sortedSections[0]);
    }
    return Promise.resolve();
  }

  /** 마지막 섹션으로 스크롤합니다 */
  public scrollToLast(): Promise<void> {
    const sortedSections = this.getSections();
    if (sortedSections.length > 0) {
      return this.scrollTo(sortedSections[sortedSections.length - 1]);
    }
    return Promise.resolve();
  }

  /** 활성 섹션 변경을 구독합니다 */
  public onActiveChange(callback: ActiveChangeCallback): () => void {
    this.listeners.add(callback);
    callback(this.activeId, { previous: this.previousId, direction: this.scrollDirection });
    return () => {
      this.listeners.delete(callback);
    };
  }

  /** 활성 섹션 변경 구독을 해제합니다 */
  public offActiveChange(callback: ActiveChangeCallback) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    if (this.activeId === null && this.previousId === null) return;

    const meta: ActiveChangeMeta = {
      previous: this.previousId,
      direction: this.scrollDirection,
    };

    this.listeners.forEach((callback) => callback(this.activeId, meta));
  }

  /**
   * 특정 섹션의 스크롤 진행률 변화를 구독합니다.
   * 진행률은 섹션이 뷰포트 하단(0)에서 상단(1)으로 이동하는 정도를 나타냅니다.
   */
  public onProgressChange(id: string, callback: ProgressCallback): () => void {
    if (!this.progressListeners.has(id)) {
      this.progressListeners.set(id, new Set());
    }
    this.progressListeners.get(id)?.add(callback);
    // 즉시 현재 진행률을 한 번 호출하여 초기 상태 동기화
    queueMicrotask(() => this.updateProgress());
    return () => {
      this.progressListeners.get(id)?.delete(callback);
    };
  }

  /** 특정 섹션의 스크롤 진행률 구독을 해제합니다 */
  public offProgressChange(id: string, callback: ProgressCallback) {
    this.progressListeners.get(id)?.delete(callback);
    if (this.progressListeners.get(id)?.size === 0) {
      this.progressListeners.delete(id);
    }
  }

  /** 모든 리스너를 해제하고 Observer 연결을 끊습니다 */
  public destroy() {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.listeners.clear();
    this.progressListeners.clear();
    this.sections.clear();
    this.disabledSections.clear();
    this.debugElements.forEach((overlay) => overlay.remove());
    this.debugElements.clear();

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
