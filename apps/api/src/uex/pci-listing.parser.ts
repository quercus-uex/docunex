import {
  parseApplicationDeadline,
  POSITION_CODE_PATTERN,
  positionStage,
  type PositionStage,
  type PositionStageDocuments,
  type UexPosition,
} from '@docunex/shared';
import { HTMLElement, parse } from 'node-html-parser';

type Column = 'code' | 'department' | 'center' | PositionStage | 'observations';

const CODE_IN_TEXT = /\bIN\d{6}\b/i;
/** Nombre de los PDF de la UEx: `IN000913_C.pdf`, `IN000913_A1.pdf`, `IN000913_A2.pdf`. */
const DOCUMENT_FILE = /\/(IN\d{6})_(C|A1|A2)\.pdf(?:$|[?#])/i;
const DOCUMENT_SUFFIX: Record<string, PositionStage> = {
  C: 'call',
  A1: 'firstMinutes',
  A2: 'secondMinutes',
};

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function columnFor(header: string): Column | null {
  const text = normalize(header);
  if (/^acta\s*(1|i|primera)\b/.test(text) || text === 'primera acta') return 'firstMinutes';
  if (/^acta\s*(2|ii|segunda)\b/.test(text) || text === 'segunda acta') return 'secondMinutes';
  if (text.startsWith('convocatoria')) return 'call';
  if (text.startsWith('plaza') || text.startsWith('codigo') || text === 'ref.') return 'code';
  if (text.startsWith('departamento') || text.startsWith('dpto')) return 'department';
  if (text.startsWith('centro')) return 'center';
  if (text.startsWith('observaciones')) return 'observations';
  return null;
}

function cellsOf(row: HTMLElement): HTMLElement[] {
  return row.childNodes.filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && (node.tagName === 'TD' || node.tagName === 'TH'),
  );
}

function cellText(cell: HTMLElement | undefined): string | null {
  const text = cell?.text.replace(/\s+/g, ' ').trim() ?? '';
  return text === '' ? null : text;
}

function absoluteUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

function emptyDocuments(): PositionStageDocuments {
  return { call: null, firstMinutes: null, secondMinutes: null };
}

interface Draft {
  code: string;
  department: string | null;
  center: string | null;
  documents: PositionStageDocuments;
  observations: string | null;
}

/** Añade al borrador los PDF del patrón `<código>_<fase>.pdf` que haya entre los enlaces. */
function collectDocumentLinks(
  element: HTMLElement,
  baseUrl: string,
  drafts: Map<string, Draft>,
): void {
  for (const link of element.querySelectorAll('a[href]')) {
    const url = absoluteUrl(link.getAttribute('href')!, baseUrl);
    const match = url && DOCUMENT_FILE.exec(url);
    if (!match) continue;
    const code = match[1]!.toUpperCase();
    const stage = DOCUMENT_SUFFIX[match[2]!.toUpperCase()]!;
    const draft = drafts.get(code) ?? newDraft(code);
    draft.documents[stage] ??= url;
    drafts.set(code, draft);
  }
}

function newDraft(code: string): Draft {
  return { code, department: null, center: null, documents: emptyDocuments(), observations: null };
}

function parseTable(table: HTMLElement, baseUrl: string, drafts: Map<string, Draft>): void {
  const rows = table.querySelectorAll('tr');
  const headerIndex = rows.findIndex((row) =>
    cellsOf(row).some((cell) => columnFor(cell.text) === 'code'),
  );
  if (headerIndex === -1) return;
  const columns = cellsOf(rows[headerIndex]!).map((cell) => columnFor(cell.text));

  for (const row of rows.slice(headerIndex + 1)) {
    const cells = cellsOf(row);
    const cell = (column: Column) => cells[columns.indexOf(column)];
    const code = (cellText(cell('code')) ?? '').toUpperCase().match(CODE_IN_TEXT)?.[0];
    if (!code || !POSITION_CODE_PATTERN.test(code)) continue;

    const draft = drafts.get(code) ?? newDraft(code);
    draft.department ??= cellText(cell('department'));
    draft.center ??= cellText(cell('center'));
    draft.observations ??= cellText(cell('observations'));
    for (const stage of ['call', 'firstMinutes', 'secondMinutes'] as const) {
      const href = cell(stage)?.querySelector('a[href]')?.getAttribute('href');
      if (href) draft.documents[stage] ??= absoluteUrl(href, baseUrl);
    }
    drafts.set(code, draft);
  }
}

/**
 * Plazas PCI de la página de convocatorias de la UEx.
 *
 * Lee las tablas cuya cabecera tiene una columna «Plaza» y reconoce el resto de columnas por su
 * título (el orden no importa). Además recorre todos los enlaces de la página con el patrón de
 * nombres de la UEx (`IN000913_A1.pdf`), así que una plaza cuyos PDF estén fuera de la tabla (o en
 * una tabla con otro formato) se detecta igualmente. Solo se devuelven plazas con código `IN` + 6
 * dígitos; las antiguas (`DPCI...`) se descartan.
 */
export function parsePciListing(html: string, baseUrl: string): UexPosition[] {
  const root = parse(html, { comment: false });
  const drafts = new Map<string, Draft>();
  for (const table of root.querySelectorAll('table')) parseTable(table, baseUrl, drafts);
  collectDocumentLinks(root, baseUrl, drafts);

  return [...drafts.values()]
    .map((draft) => ({
      ...draft,
      stage: positionStage(draft.documents),
      deadline: parseApplicationDeadline(draft.observations),
    }))
    .sort((a, b) => b.code.localeCompare(a.code));
}
