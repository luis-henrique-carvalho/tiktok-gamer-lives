import type { GameModule } from '../../contracts/engine.js';
import { AxBGameEngine } from './engine.js';
import { AxBInputMapper } from './mapper.js';
import { AxBProjectionBuilder } from './projection.js';
import { AxBConfigSchema } from './schema.js';
import type {
  AxBCommand,
  AxBConfig,
  AxBProjection,
  AxBState,
} from './types.js';

export * from './types.js';
export * from './constants.js';
export * from './schema.js';
export * from './mapper.js';
export * from './engine.js';
export * from './projection.js';

export const axbGameModule: GameModule<
  AxBState,
  AxBConfig,
  AxBProjection,
  AxBCommand
> = {
  id: 'axb',
  name: 'A x B (Batalha de Lados)',
  version: '1.0.0',
  mapper: new AxBInputMapper(),
  engine: new AxBGameEngine(),
  projection: new AxBProjectionBuilder(),
  validateConfig(rawConfig: unknown): AxBConfig {
    return AxBConfigSchema.parse(rawConfig);
  },
};
