import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
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
