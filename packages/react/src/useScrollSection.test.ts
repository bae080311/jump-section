import { describe, it, expect } from 'vitest';
import { useScrollSection, useScrollProgress } from './useScrollSection';

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
