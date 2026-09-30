import type { GameModule } from '../../contracts/engine.js';

export class GameRegistry {
  private readonly games = new Map<
    string,
    GameModule<unknown, unknown, unknown, unknown>
  >();

  registerGame(game: GameModule<unknown, unknown, unknown, unknown>): void {
    if (this.games.has(game.id)) {
      throw new Error(`Game with id "${game.id}" is already registered`);
    }

    this.games.set(game.id, game);
  }

  getGame(gameId: string): GameModule<unknown, unknown, unknown, unknown> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error(`Game with id "${gameId}" not found in registry`);
    }

    return game;
  }

  hasGame(gameId: string): boolean {
    return this.games.has(gameId);
  }

  listGames(): readonly GameModule<unknown, unknown, unknown, unknown>[] {
    return Array.from(this.games.values());
  }
}

export const defaultGameRegistry = new GameRegistry();
