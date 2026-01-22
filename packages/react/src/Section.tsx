import React, { type ElementType, forwardRef } from 'react';
import { useScrollSection } from './useScrollSection';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  id: string;
  as?: ElementType;
  children?: React.ReactNode;
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ id, as: Component = 'section', children, ...props }, ref) => {
    const { registerRef } = useScrollSection(id);

    const handleRef = (node: HTMLElement | null) => {
      registerRef(node);
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    };

    return (
      <Component id={id} ref={handleRef} {...props}>
        {children}
      </Component>
    );
  },
);

Section.displayName = 'Section';
