import {
  type PDFDocument,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  type PDFObject,
  type PDFRef,
} from 'pdf-lib';

export interface OutlineItem {
  title: string;
  /** Página de destino (base 0). */
  pageIndex: number;
  children?: OutlineItem[];
}

/**
 * Añade marcadores (`/Outlines`). pdf-lib no tiene API para ellos, así que se escriben los objetos
 * directamente: cada nivel es una lista doblemente enlazada (`/First`, `/Last`, `/Prev`, `/Next`) que
 * cuelga de su `/Parent`. Los de primer nivel se muestran; sus hijos quedan plegados.
 */
export function addOutline(document: PDFDocument, items: OutlineItem[]): void {
  if (items.length === 0) return;
  const { context } = document;
  const pages = document.getPages();

  /** Escribe una lista de hermanos colgando de `parent` y devuelve sus referencias. */
  const writeLevel = (level: OutlineItem[], parent: PDFRef): PDFRef[] => {
    const refs = level.map(() => context.nextRef());
    level.forEach((item, index) => {
      const page = pages[item.pageIndex];
      if (!page) throw new Error(`Marcador "${item.title}" a una página inexistente`);
      const entries: Record<string, PDFObject> = {
        Title: PDFHexString.fromText(item.title),
        Parent: parent,
        Dest: context.obj([page.ref, PDFName.of('XYZ'), PDFNull, PDFNull, PDFNull]),
      };
      if (index > 0) entries.Prev = refs[index - 1]!;
      if (index < refs.length - 1) entries.Next = refs[index + 1]!;
      const children = item.children ?? [];
      if (children.length > 0) {
        const childRefs = writeLevel(children, refs[index]!);
        entries.First = childRefs[0]!;
        entries.Last = childRefs.at(-1)!;
        // Negativo: plegado.
        entries.Count = PDFNumber.of(-children.length);
      }
      context.assign(refs[index]!, context.obj(entries));
    });
    return refs;
  };

  const root = context.nextRef();
  const top = writeLevel(items, root);
  context.assign(
    root,
    context.obj({
      Type: 'Outlines',
      First: top[0]!,
      Last: top.at(-1)!,
      Count: PDFNumber.of(items.length),
    }),
  );
  document.catalog.set(PDFName.of('Outlines'), root);
  document.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
}
