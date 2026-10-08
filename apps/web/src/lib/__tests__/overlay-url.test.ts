import { describe, expect, it } from 'vitest';
import {
  parseOverlaySearch,
  buildOverlayUrl,
  type OverlaySearch,
} from '../overlay-url';

describe('overlay-url utilities', () => {
  describe('parseOverlaySearch', () => {
    it('returns default values when input is empty', () => {
      const result = parseOverlaySearch({});

      expect(result).toEqual({
        sessionId: null,
        theme: 'neon',
        mode: 'simulation',
        volume: 0.6,
        muted: false,
      });
    });

    it('parses valid search parameters correctly', () => {
      const raw = {
        sessionId: 'session-123',
        theme: 'minimal',
        mode: 'live',
        volume: 0.8,
        muted: true,
      };

      const result = parseOverlaySearch(raw);

      expect(result).toEqual({
        sessionId: 'session-123',
        theme: 'minimal',
        mode: 'live',
        volume: 0.8,
        muted: true,
      });
    });

    it('handles stringified values and clamps volume', () => {
      const raw = {
        sessionId: 'session-abc',
        theme: 'minimal',
        mode: 'live',
        volume: '1.5',
        muted: '1',
      };

      const result = parseOverlaySearch(raw);

      expect(result.volume).toBe(1);
      expect(result.muted).toBe(true);
    });

    it('clamps negative volume to 0', () => {
      const raw = {
        volume: -0.5,
      };

      const result = parseOverlaySearch(raw);

      expect(result.volume).toBe(0);
    });

    it('falls back to default volume when volume is invalid or NaN', () => {
      expect(parseOverlaySearch({ volume: 'not-a-number' }).volume).toBe(0.6);
      expect(parseOverlaySearch({ volume: NaN }).volume).toBe(0.6);
      expect(parseOverlaySearch({ volume: undefined }).volume).toBe(0.6);
    });

    it('falls back to neon theme for unknown themes', () => {
      expect(parseOverlaySearch({ theme: 'dark-cyber' }).theme).toBe('neon');
      expect(parseOverlaySearch({ theme: 123 }).theme).toBe('neon');
    });

    it('falls back to simulation mode for unknown modes', () => {
      expect(parseOverlaySearch({ mode: 'invalid' }).mode).toBe('simulation');
      expect(parseOverlaySearch({ mode: '' }).mode).toBe('simulation');
    });

    it('parses string muted representations', () => {
      expect(parseOverlaySearch({ muted: 'true' }).muted).toBe(true);
      expect(parseOverlaySearch({ muted: '1' }).muted).toBe(true);
      expect(parseOverlaySearch({ muted: '0' }).muted).toBe(false);
      expect(parseOverlaySearch({ muted: 'false' }).muted).toBe(false);
      expect(parseOverlaySearch({ muted: false }).muted).toBe(false);
    });

    it('cleans empty or whitespace-only sessionId', () => {
      expect(parseOverlaySearch({ sessionId: '   ' }).sessionId).toBeNull();
      expect(parseOverlaySearch({ sessionId: '' }).sessionId).toBeNull();
      expect(parseOverlaySearch({ sessionId: null }).sessionId).toBeNull();
    });
  });

  describe('buildOverlayUrl', () => {
    it('builds a full URL with given origin and search parameters', () => {
      const search: OverlaySearch = {
        sessionId: 'session-456',
        theme: 'neon',
        mode: 'simulation',
        volume: 0.5,
        muted: false,
      };

      const url = buildOverlayUrl('http://localhost:5173', search);

      expect(url).toBe(
        'http://localhost:5173/overlay?sessionId=session-456&theme=neon&mode=simulation&volume=0.5&muted=0',
      );
    });

    it('builds relative URL if origin is empty or slash', () => {
      const search: OverlaySearch = {
        sessionId: 'session-789',
        theme: 'minimal',
        mode: 'live',
        volume: 1,
        muted: true,
      };

      const url = buildOverlayUrl('', search);

      expect(url).toBe(
        '/overlay?sessionId=session-789&theme=minimal&mode=live&volume=1&muted=1',
      );
    });

    it('omits sessionId query param if sessionId is null', () => {
      const search: OverlaySearch = {
        sessionId: null,
        theme: 'neon',
        mode: 'simulation',
        volume: 0.6,
        muted: false,
      };

      const url = buildOverlayUrl('http://localhost:5173', search);

      expect(url).toBe(
        'http://localhost:5173/overlay?theme=neon&mode=simulation&volume=0.6&muted=0',
      );
    });
  });
});
