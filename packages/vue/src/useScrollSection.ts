import {
  inject,
  provide,
  onMounted,
  onUnmounted,
  ref,
  readonly,
  computed,
  defineComponent,
  PropType,
} from 'vue';
import { ScrollManager, type ScrollOptions } from '@jump-section/core';

const ScrollManagerSymbol = Symbol('ScrollManager');

export function provideScrollManager(options: ScrollOptions = {}) {
  const manager = new ScrollManager(options);
  provide(ScrollManagerSymbol, manager);

  onUnmounted(() => {
    manager.destroy();
  });

  return manager;
}

export function useScrollManager(): ScrollManager {
  const manager = inject<ScrollManager>(ScrollManagerSymbol);
  if (!manager) {
    throw new Error(
      'useScrollManager must be used within a component that calls provideScrollManager',
    );
  }
  return manager;
}

export function useScrollSection(sectionId?: string) {
  const manager = useScrollManager();
  const activeId = ref<string | null>(null);
  const direction = ref<'up' | 'down' | null>(null);

  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    unsubscribe = manager.onActiveChange((id, meta) => {
      activeId.value = id;
      direction.value = meta.direction;
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  const registerRef = (element: Element | undefined) => {
    if (element && sectionId) {
      manager.registerSection(sectionId, element as HTMLElement);
    } else if (sectionId) {
      manager.unregisterSection(sectionId);
    }
  };

  return {
    registerRef,
    scrollTo: (id: string) => manager.scrollTo(id),
    scrollToNext: () => manager.scrollToNext(),
    scrollToPrev: () => manager.scrollToPrev(),
    scrollToFirst: () => manager.scrollToFirst(),
    scrollToLast: () => manager.scrollToLast(),
    activeId: readonly(activeId),
    isActive: computed(() => (sectionId ? activeId.value === sectionId : false)),
    direction: readonly(direction),
  };
}

/** 특정 섹션의 스크롤 진행률(0~1)을 추적하는 Vue composable */
export function useScrollProgress(sectionId: string) {
  const manager = useScrollManager();
  const progress = ref(0);

  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    unsubscribe = manager.onProgressChange(sectionId, (p) => {
      progress.value = p;
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  return readonly(progress);
}

export const ScrollSectionProvider = defineComponent({
  name: 'ScrollSectionProvider',
  props: {
    offset: { type: Number, default: 0 },
    behavior: { type: String as PropType<ScrollBehavior>, default: 'smooth' },
    hash: { type: Boolean, default: false },
    keyboard: { type: Boolean, default: false },
    root: { type: Object as PropType<HTMLElement | null>, default: null },
  },
  setup(props, { slots }) {
    provideScrollManager({
      offset: props.offset,
      behavior: props.behavior,
      hash: props.hash,
      keyboard: props.keyboard,
      root: props.root,
    });
    return () => (slots.default ? slots.default() : null);
  },
});
