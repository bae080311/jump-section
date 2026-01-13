import React, { createContext, useContext, useEffect, useRef } from 'react';
import { ScrollManager, ScrollOptions } from '@jump-section/core';

const ScrollSectionContext = createContext<ScrollManager | null>(null);

interface ScrollSectionProviderProps extends ScrollOptions {
  children: React.ReactNode;
}

export const ScrollSectionProvider: React.FC<ScrollSectionProviderProps> = ({
  children,
  offset,
  behavior,
}) => {
  const managerRef = useRef<ScrollManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new ScrollManager({ offset, behavior });
  }

  useEffect(() => {
    return () => {
      managerRef.current?.destroy();
    };
  }, []);

  return (
    <ScrollSectionContext.Provider value={managerRef.current}>
      {children}
    </ScrollSectionContext.Provider>
  );
};

export const useScrollManager = (): ScrollManager => {
  const context = useContext(ScrollSectionContext);
  if (!context) {
    throw new Error('useScrollManager must be used within a ScrollSectionProvider');
  }
  return context;
};
