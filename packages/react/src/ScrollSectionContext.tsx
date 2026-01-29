'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FC,
} from 'react';
import { ScrollManager } from '@jump-section/core';

const ScrollSectionContext = createContext<ScrollManager | null>(null);

interface ScrollSectionProviderProps {
  children: ReactNode;
  offset?: number;
  behavior?: ScrollBehavior;
}

export const ScrollSectionProvider: FC<ScrollSectionProviderProps> = ({
  children,
  offset,
  behavior,
}) => {
  const [manager] = useState<ScrollManager>(() => new ScrollManager({ offset, behavior }));

  useEffect(() => {
    return () => {
      manager.destroy();
    };
  }, [manager]);

  return <ScrollSectionContext.Provider value={manager}>{children}</ScrollSectionContext.Provider>;
};

export const useScrollManager = (): ScrollManager => {
  const context = useContext(ScrollSectionContext);
  if (!context) {
    throw new Error('useScrollManager must be used within a ScrollSectionProvider');
  }
  return context;
};
