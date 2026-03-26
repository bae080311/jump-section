'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FC,
} from 'react';
import { ScrollManager, type ScrollOptions } from '@jump-section/core';

const ScrollSectionContext = createContext<ScrollManager | null>(null);

interface ScrollSectionProviderProps extends ScrollOptions {
  children: ReactNode;
}

export const ScrollSectionProvider: FC<ScrollSectionProviderProps> = ({
  children,
  offset,
  behavior,
  hash,
  root,
  keyboard,
}) => {
  const [manager] = useState<ScrollManager>(
    () => new ScrollManager({ offset, behavior, hash, root, keyboard }),
  );

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
