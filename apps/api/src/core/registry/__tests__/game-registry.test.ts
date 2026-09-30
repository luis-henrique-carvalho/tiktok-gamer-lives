import { describe, expect, it } from 'vitest';
import { GameRegistry } from '../game-registry.js';
import type { GameModule } from '../../../contracts/engine.js';
import { axbGameModule } from '../../../games/axb/index.js';

describe('GameRegistry (TDD Red -> Green)', () => {
  it('registers and retrieves a game module successfully', () => {
    const registry = new GameRegistry();

    registry.registerGame(axbGameModule);

    expect(registry.hasGame('axb')).toBe(true);
    const retrieved = registry.getGame('axb');
    expect(retrieved).toBe(axbGameModule);
    expect(retrieved.id).toBe('axb');
    expect(retrieved.name).toBe('A x B (Batalha de Lados)');
  });

  it('lists all registered games', () => {
    const registry = new GameRegistry();

    const mockGame2: GameModule = {
      id: 'tug-of-war',
      name: 'Tug of War',
      version: '1.0.0',
      mapper: { mapInteraction: () => null },
      engine: {
        createInitialState: () => ({}),
        applyCommand: () => ({ nextState: {} }),
      },
      projection: { project: () => ({}) },
    };

    registry.registerGame(axbGameModule);
    registry.registerGame(mockGame2);

    const list = registry.listGames();
    expect(list).toHaveLength(2);
    expect(list.map((g) => g.id)).toEqual(['axb', 'tug-of-war']);
  });

  it('throws descriptive error on registering duplicate game id', () => {
    const registry = new GameRegistry();
    registry.registerGame(axbGameModule);

    expect(() => {
      registry.registerGame(axbGameModule);
    }).toThrowError('Game with id "axb" is already registered');
  });

  it('throws descriptive error on getting non-existent game id', () => {
    const registry = new GameRegistry();

    expect(registry.hasGame('non-existent')).toBe(false);
    expect(() => {
      registry.getGame('non-existent');
    }).toThrowError('Game with id "non-existent" not found in registry');
  });
});
