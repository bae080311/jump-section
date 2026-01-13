import {
  inject,
  provide,
  onMounted,
  onUnmounted,
  ref,
  readonly,
  defineComponent,
  PropType,
} from 'vue';
import { ScrollManager, ScrollOptions } from '@jump-section/core';

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

  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    unsubscribe = manager.onActiveChange((id) => {
      activeId.value = id;
    });
  });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
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
    activeId: readonly(activeId),
    isActive: sectionId ? activeId.value === sectionId : false,
  };
}

export const ScrollSectionProvider = defineComponent({
  name: 'ScrollSectionProvider',
  props: {
    offset: { type: Number, default: 0 },
    behavior: { type: String as PropType<ScrollBehavior>, default: 'smooth' },
  },
  setup(props, { slots }) {
    provideScrollManager({ offset: props.offset, behavior: props.behavior });
    return () => (slots.default ? slots.default() : null);
  },
});
