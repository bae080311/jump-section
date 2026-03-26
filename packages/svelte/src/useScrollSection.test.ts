import { describe, it, expect } from 'vitest';
import { provideScrollManager, useScrollManager, useScrollSection, useScrollProgress } from './useScrollSection';

describe('Svelte exports', () => {
  it('provideScrollManager is a function', () => {
    expect(typeof provideScrollManager).toBe('function');
  });

  it('useScrollManager is a function', () => {
    expect(typeof useScrollManager).toBe('function');
  });

  it('useScrollSection is a function', () => {
    expect(typeof useScrollSection).toBe('function');
  });

  it('useScrollProgress is a function', () => {
    expect(typeof useScrollProgress).toBe('function');
  });
});
