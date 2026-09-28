# DocUNEx

Herramienta personal para preparar el expediente de solicitud de plazas de Personal Científico
Investigador (PCI) de la Universidad de Extremadura.

## Qué hace

- **Plazas:** guarda las plazas a las que te presentas (código, título y fecha de resolución).
- **Documentos:** sube tu DNI, los justificantes y los demás documentos una sola vez. Se
  normalizan a PDF y se reutilizan en todas las solicitudes.
- **Méritos:** mantiene un catálogo de méritos del CV, cada uno con sus justificantes.
- **Solicitudes:** un asistente de seis pasos para cada plaza:
  1. Plaza, fecha de la solicitud y los textos «Expone» y «Solicita» de RedSara.
  2. Documentos que exige la convocatoria.
  3. Méritos que se incluyen y en qué orden.
  4. Validación: documentos que faltan y estimación del tamaño.
  5. Generación del expediente en un único PDF: Anexo III, CV, hoja índice, separadores y
     justificantes numerados. Si pasa de 10 MB (el límite de RedSara por fichero), se recomprimen
     las imágenes de los documentos más pesados.
  6. Guía para presentarlo en el registro electrónico (rec.redsara.es), con los datos listos para
     copiar, y anotación del número de registro. Una vez registrada, la solicitud queda bloqueada.

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
| `pnpm templates:preview` | Genera en `packages/templates/preview/` los PDF de ejemplo de las plantillas |
| `pnpm db:up` / `pnpm db:down` | Arranca / para PostgreSQL |

## Estructura

```
apps/api          API NestJS + TypeORM + pg-boss
apps/web          SPA React + Vite + Mantine
packages/shared   esquemas Zod y tipos compartidos entre API y web
packages/templates plantillas PDF (Anexo III, CV, hoja índice, separadores) con @react-pdf/renderer
```
