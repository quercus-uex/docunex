import type { DataSourceOptions } from 'typeorm';
import { entities } from './entities.js';
import { migrations } from './migrations/index.js';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

export function createDataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    uuidExtension: 'pgcrypto',
    entities,
    migrations,
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
  };
}
