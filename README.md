# DocUNEx

Herramienta personal para preparar el expediente de solicitud de plazas de Personal Científico
Investigador (PCI) de la Universidad de Extremadura. Ver [`PROPUESTA.md`](PROPUESTA.md) y
[`PLAN.md`](PLAN.md).

## Requisitos

- Node.js 24 (≥ 24.11) y pnpm 12
- PostgreSQL 18. Lo más cómodo es el `docker-compose.yml` incluido.

## Puesta en marcha

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # y cambia JWT_SECRET
pnpm db:up                               # PostgreSQL en localhost:5432 (bases docunex y docunex_test)
pnpm user:create                         # crea tu usuario (pide correo y contraseña)
pnpm dev                                 # API en :3000 y web en http://localhost:5173
```

`pnpm user:create` también sirve para cambiar la contraseña de un usuario existente.

## Scripts

| Script | Qué hace |
|--------|----------|
| `pnpm dev` | Compila `packages/shared` y `packages/templates` y arranca en modo desarrollo la API, la web y el *watch* de ambos paquetes |
| `pnpm build` | Compila todos los paquetes |
| `pnpm test` | Pruebas unitarias |
| `pnpm test:e2e` | Pruebas e2e de la API (necesitan `pnpm db:up`; usan la base `docunex_test`) |
| `pnpm typecheck` | Comprobación de tipos |
| `pnpm lint` / `pnpm format` | oxlint / Prettier |
| `pnpm templates:preview` | Genera en `packages/templates/preview/` los PDF de ejemplo de las plantillas, para compararlos con `referencias/` |
| `pnpm db:up` / `pnpm db:down` | Arranca / para PostgreSQL |

## Estructura

```
apps/api          API NestJS + TypeORM + pg-boss
apps/web          SPA React + Vite + Mantine
packages/shared   esquemas Zod y tipos compartidos entre API y web
packages/templates plantillas PDF (Anexo III, CV, hoja índice, separadores) con @react-pdf/renderer
referencias/      documentación oficial de la convocatoria
```
