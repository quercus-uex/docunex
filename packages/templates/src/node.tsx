/**
 * Renderizado en Node (`@docunex/templates/node`): lo usa la API para generar el expediente. Va en un
 * punto de entrada aparte porque `renderToBuffer` no existe en la versión de react-pdf del navegador.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { AnnexIII } from './annex/AnnexIII.js';
import { CvDocument } from './cv/CvDocument.js';
import type { CvModel } from './cv/model.js';
import { IndexSheet } from './index-sheet/IndexSheet.js';
import type { AnnexIIIModel, IndexSheetModel, SeparatorModel } from './models.js';
import { Separator } from './separator/Separator.js';

function render(element: ReactElement): Promise<Buffer> {
  // oxlint-disable-next-line typescript/no-explicit-any -- renderToBuffer exige un <Document>.
  return renderToBuffer(element as any);
}

export const renderAnnexIII = (model: AnnexIIIModel) => render(<AnnexIII model={model} />);
export const renderCv = (model: CvModel) => render(<CvDocument model={model} />);
export const renderIndexSheet = (model: IndexSheetModel) => render(<IndexSheet model={model} />);
export const renderSeparator = (model: SeparatorModel) => render(<Separator model={model} />);
