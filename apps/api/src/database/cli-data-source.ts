// Punto de entrada para la CLI de TypeORM (generar y ejecutar migraciones).
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from './data-source.js';

try {
  process.loadEnvFile('.env');
} catch {
  // Sin .env: se usan las variables de entorno del proceso.
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('Falta DATABASE_URL');
}

export default new DataSource(createDataSourceOptions(url));
