import { describe, it, expect } from 'vitest';
import { formatScore, calculatePercentage } from '../formatters.js';

describe('formatters', () => {
  describe('formatScore', () => {
    it('deve formatar números menores que 1000 como string normal', () => {
      expect(formatScore(0)).toBe('0');
      expect(formatScore(999)).toBe('999');
    });

    it('deve formatar milhares com sufixo k', () => {
      expect(formatScore(1000)).toBe('1.0k');
      expect(formatScore(1550)).toBe('1.6k');
    });

    it('deve formatar milhões com sufixo M', () => {
      expect(formatScore(1_000_000)).toBe('1.0M');
      expect(formatScore(2_500_000)).toBe('2.5M');
    });
  });

  describe('calculatePercentage', () => {
    it('deve calcular porcentagens corretamente', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 100)).toBe(25);
    });

    it('deve retornar 0 quando o total for 0 ou negativo', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
      expect(calculatePercentage(50, -10)).toBe(0);
    });

    it('deve limitar entre 0 e 100', () => {
      expect(calculatePercentage(150, 100)).toBe(100);
      expect(calculatePercentage(-10, 100)).toBe(0);
    });
  });
});
