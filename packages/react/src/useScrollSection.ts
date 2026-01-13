import { useEffect, useState } from 'react';
import { useScrollManager } from './ScrollSectionContext';

export const useScrollSection = (sectionId?: string) => {
  const manager = useScrollManager();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = manager.onActiveChange((id: string | null) => {
      setActiveId(id);
    });
    return () => {
      unsubscribe();
    };
  }, [manager]);

  const registerRef = (element: HTMLElement | null) => {
    if (sectionId && element) {
      manager.registerSection(sectionId, element);
    } else if (sectionId && !element) {
      manager.unregisterSection(sectionId);
    }
  };

  return {
    registerRef,
    scrollTo: (id: string) => manager.scrollTo(id),
    activeId,
    isActive: sectionId ? activeId === sectionId : false,
  };
};
