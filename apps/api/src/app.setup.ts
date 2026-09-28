import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** Configuración común a `main.ts` y a las pruebas e2e. */
export function configureApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableShutdownHooks();
  return app;
}
