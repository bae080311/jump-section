import { describe, it, expect } from 'vitest';
import { useScrollSection, useScrollProgress, ScrollSectionProvider } from './useScrollSection';

describe('useScrollSection', () => {
  it('is a function', () => {
    expect(typeof useScrollSection).toBe('function');
  });
});

describe('useScrollProgress', () => {
  it('is a function', () => {
    expect(typeof useScrollProgress).toBe('function');
  });
});

describe('ScrollSectionProvider', () => {
  it('is a component object', () => {
    expect(typeof ScrollSectionProvider).toBe('object');
  });
});
