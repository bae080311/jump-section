import { setContext, getContext, onDestroy } from 'svelte';
import { writable, readonly, derived, type Readable } from 'svelte/store';
import { ScrollManager, type ScrollOptions, type ActiveChangeMeta } from '@jump-section/core';

const SCROLL_MANAGER_KEY = Symbol('jump-section:scroll-manager');

/**
 * ScrollManager를 생성하고 Svelte 컴포넌트 context에 제공합니다.
 * 컴포넌트 초기화 단계에서 호출해야 합니다.
 */
export function provideScrollManager(options: ScrollOptions = {}): ScrollManager {
  const manager = new ScrollManager(options);
  setContext(SCROLL_MANAGER_KEY, manager);
  onDestroy(() => manager.destroy());
  return manager;
}

/**
 * Context에서 ScrollManager를 가져옵니다.
 * provideScrollManager를 호출한 컴포넌트의 자식에서만 사용 가능합니다.
 */
export function useScrollManager(): ScrollManager {
  const manager = getContext<ScrollManager>(SCROLL_MANAGER_KEY);
  if (!manager) {
    throw new Error(
      '[jump-section] useScrollManager는 provideScrollManager를 호출한 컴포넌트 내부에서만 사용할 수 있습니다.',
    );
  }
  return manager;
}

/**
 * 섹션 네비게이션을 위한 Svelte composable
 */
export function useScrollSection(sectionId?: string) {
  const manager = useScrollManager();

  const _activeId = writable<string | null>(null);
  const _direction = writable<'up' | 'down' | null>(null);

  const unsubscribe = manager.onActiveChange((id: string | null, meta: ActiveChangeMeta) => {
    _activeId.set(id);
    _direction.set(meta.direction);
  });

  onDestroy(unsubscribe);

  return {
    /** 섹션 DOM 요소에 ref로 연결하세요 */
    registerRef(element: HTMLElement | null) {
      if (!element || !sectionId) return;
      manager.registerSection(sectionId, element);
    },
    /** 섹션 등록 해제 (onDestroy에서 호출) */
    unregisterRef() {
      if (sectionId) manager.unregisterSection(sectionId);
    },
    scrollTo: (id: string) => manager.scrollTo(id),
    scrollToNext: () => manager.scrollToNext(),
    scrollToPrev: () => manager.scrollToPrev(),
    scrollToFirst: () => manager.scrollToFirst(),
    scrollToLast: () => manager.scrollToLast(),
    /** 현재 활성 섹션 ID store */
    activeId: readonly(_activeId) as Readable<string | null>,
    /** 이 섹션이 활성 상태인지 여부 store */
    isActive: derived(_activeId, ($id) => (sectionId ? $id === sectionId : false)),
    /** 스크롤 방향 store */
    direction: readonly(_direction) as Readable<'up' | 'down' | null>,
  };
}

/**
 * 특정 섹션의 스크롤 진행률(0~1)을 추적하는 Svelte composable
 */
export function useScrollProgress(sectionId: string): Readable<number> {
  const manager = useScrollManager();
  const _progress = writable(0);

  const unsubscribe = manager.onProgressChange(sectionId, (p: number) => {
    _progress.set(p);
  });

  onDestroy(unsubscribe);

  return readonly(_progress);
}
