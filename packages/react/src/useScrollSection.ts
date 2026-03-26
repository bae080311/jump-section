'use client';

import { useEffect, useState, useCallback } from 'react';
import { useScrollManager } from './ScrollSectionContext';

export const useScrollSection = (sectionId?: string) => {
  const manager = useScrollManager();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const unsubscribe = manager.onActiveChange((id, meta) => {
      setActiveId(id);
      setDirection(meta.direction);
    });
    return unsubscribe;
  }, [manager]);

  const registerRef = useCallback(
    (element: HTMLElement | null) => {
      if (sectionId && element) {
        manager.registerSection(sectionId, element);
      } else if (sectionId && !element) {
        manager.unregisterSection(sectionId);
      }
    },
    [sectionId, manager],
  );

  return {
    registerRef,
    scrollTo: useCallback((id: string) => manager.scrollTo(id), [manager]),
    scrollToNext: useCallback(() => manager.scrollToNext(), [manager]),
    scrollToPrev: useCallback(() => manager.scrollToPrev(), [manager]),
    scrollToFirst: useCallback(() => manager.scrollToFirst(), [manager]),
    scrollToLast: useCallback(() => manager.scrollToLast(), [manager]),
    activeId,
    isActive: sectionId ? activeId === sectionId : false,
    direction,
  };
};

/** 특정 섹션의 스크롤 진행률(0~1)을 추적합니다 */
export const useScrollProgress = (sectionId: string): number => {
  const manager = useScrollManager();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = manager.onProgressChange(sectionId, setProgress);
    return unsubscribe;
  }, [manager, sectionId]);

  return progress;
};
