import { describe, it, expect } from 'vitest';
import { checkHealth } from '../health.js';

describe('checkHealth', () => {
  it('deve retornar status ok com timestamp e uptime corretos', () => {
    const result = checkHealth(120.5);
    expect(result.status).toBe('ok');
    expect(result.uptimeSeconds).toBe(120);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('deve utilizar o process.uptime por padrão', () => {
    const result = checkHealth();
    expect(result.status).toBe('ok');
    expect(typeof result.uptimeSeconds).toBe('number');
  });
});
