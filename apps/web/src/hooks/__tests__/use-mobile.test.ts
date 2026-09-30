import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile', () => {
  it('returns true when window width is less than 768px', () => {
    window.innerWidth = 500;
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when window width is greater than or equal to 768px', () => {
    window.innerWidth = 1024;
    let changeHandler: (() => void) | undefined;
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Trigger change event
    window.innerWidth = 600;
    act(() => {
      changeHandler?.();
    });
    expect(result.current).toBe(true);
  });
});
