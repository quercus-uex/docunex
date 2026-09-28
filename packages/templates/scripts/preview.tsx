/**
 * Genera los PDF de ejemplo en `preview/` para compararlos a ojo con los de `referencias/`:
 * `pnpm templates:preview`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderToBuffer } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import {
  AnnexIII,
  CvDocument,
  EXAMPLE_ANNEX,
  EXAMPLE_CV_FULL,
  EXAMPLE_CV_SPARSE,
  EXAMPLE_INDEX,
  EXAMPLE_SEPARATORS,
  IndexSheet,
  Separator,
} from '../src/index.js';

const outDir = join(import.meta.dirname, '..', 'preview');

const documents: Record<string, () => ReactElement> = {
  'anexo-iii.pdf': () => <AnnexIII model={EXAMPLE_ANNEX} />,
  'cv-completo.pdf': () => <CvDocument model={EXAMPLE_CV_FULL} />,
  'cv-con-huecos.pdf': () => <CvDocument model={EXAMPLE_CV_SPARSE} />,
  'hoja-indice.pdf': () => <IndexSheet model={EXAMPLE_INDEX} />,
  ...Object.fromEntries(
    EXAMPLE_SEPARATORS.map((model) => [
      `separador-${model.number}.pdf`,
      () => <Separator model={model} />,
    ]),
  ),
};

await mkdir(outDir, { recursive: true });
for (const [name, render] of Object.entries(documents)) {
  // oxlint-disable-next-line typescript/no-explicit-any -- renderToBuffer exige un <Document>.
  await writeFile(join(outDir, name), await renderToBuffer(render() as any));
  console.log(`preview/${name}`);
}
