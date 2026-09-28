import { formatDocRanges } from '@docunex/shared';
import { Line, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { ReactNode } from 'react';
import { parseEmphasis } from './format.js';

export const LINE = 0.6;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  field: { flexDirection: 'row', alignItems: 'flex-start' },
  value: { flex: 1, borderBottomWidth: LINE, paddingLeft: 3, minHeight: 11 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  docRef: { flexDirection: 'row', flexShrink: 0, maxWidth: '45%', fontWeight: 'bold' },
  docRefBlank: { width: 80, borderBottomWidth: LINE },
  note: {
    borderWidth: 1,
    padding: 4,
    marginVertical: 6,
    textAlign: 'justify',
    fontSize: 8.5,
    lineHeight: 1.25,
  },
  tableHeader: { flexDirection: 'row', gap: 8, marginBottom: 3 },
  tableHeaderCell: { textDecoration: 'underline' },
  tableRow: { flexDirection: 'row', gap: 8, marginBottom: 3 },
  tableIndex: { width: 14 },
});

/** "Etiqueta: valor", con el valor sobre la línea del formulario. */
export function Field({ label, value, style }: { label: string; value: ReactNode; style?: Style }) {
  return (
    <View style={[styles.field, style ?? { flex: 1 }]}>
      <Text>{label}: </Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** Varios campos en una misma línea. */
export function Row({ children, style }: { children: ReactNode; style?: Style }) {
  return (
    <View style={style ? [styles.row, style] : styles.row} wrap={false}>
      {children}
    </View>
  );
}

const BOX = 8;

/** Casilla dibujada (las fuentes no traen ☐/☒). */
function Box({ checked }: { checked: boolean }) {
  return (
    <Svg width={BOX} height={BOX} viewBox={`0 0 ${BOX} ${BOX}`}>
      <Line x1={0} y1={0} x2={BOX} y2={0} stroke="#000" strokeWidth={1.2} />
      <Line x1={BOX} y1={0} x2={BOX} y2={BOX} stroke="#000" strokeWidth={1.2} />
      <Line x1={BOX} y1={BOX} x2={0} y2={BOX} stroke="#000" strokeWidth={1.2} />
      <Line x1={0} y1={BOX} x2={0} y2={0} stroke="#000" strokeWidth={1.2} />
      {checked && (
        <Line x1={1.5} y1={1.5} x2={BOX - 1.5} y2={BOX - 1.5} stroke="#000" strokeWidth={1} />
      )}
      {checked && (
        <Line x1={BOX - 1.5} y1={1.5} x2={1.5} y2={BOX - 1.5} stroke="#000" strokeWidth={1} />
      )}
    </Svg>
  );
}

/** "Etiqueta  SI ☒  NO ☐". */
export function Choice({
  label,
  value,
  labels = ['SI', 'NO'],
}: {
  label: string;
  value: boolean | null;
  labels?: [string, string];
}) {
  return (
    <View style={styles.choice}>
      <Text>{label}</Text>
      <Text> {labels[0]}</Text>
      <Box checked={value === true} />
      <Text> {labels[1]}</Text>
      <Box checked={value === false} />
    </View>
  );
}

/** "Doc. nº: DOC_03–DOC_05". Sin códigos (vistas previas) queda la línea en blanco. */
export function DocRef({ codes, style }: { codes: readonly number[]; style?: Style }) {
  return (
    <View style={style ? [styles.docRef, style] : styles.docRef}>
      <Text>Doc. nº: </Text>
      {codes.length > 0 ? (
        <Text style={{ flexShrink: 1 }}>{formatDocRanges(codes)}</Text>
      ) : (
        <View style={styles.docRefBlank} />
      )}
    </View>
  );
}

/** Texto con las marcas de énfasis de las notas. */
export function Emphasis({ text }: { text: string }) {
  return (
    <>
      {parseEmphasis(text).map((run, index) => (
        <Text
          key={index}
          style={{
            ...(run.bold && { fontWeight: 'bold' }),
            ...(run.italic && { fontStyle: 'italic' }),
          }}
        >
          {run.text}
        </Text>
      ))}
    </>
  );
}

/** Recuadro "Nota: …" de la plantilla. */
export function NoteBox({ text }: { text: string }) {
  return (
    <Text style={styles.note} wrap={false}>
      <Text style={{ fontWeight: 'bold' }}>Nota: </Text>
      <Emphasis text={text} />
    </Text>
  );
}

export interface Column {
  label: string;
  /** Proporción del ancho. */
  flex: number;
  align?: 'left' | 'center' | 'right';
}

/** Tabla numerada de la plantilla: cabeceras subrayadas y una fila por entrada ("1.", "2."…). */
export function Table({ columns, rows }: { columns: Column[]; rows: ReactNode[][] }) {
  return (
    <View>
      <View style={styles.tableHeader} wrap={false}>
        <View style={styles.tableIndex} />
        {columns.map((column) => (
          <Text
            key={column.label}
            style={[styles.tableHeaderCell, { flex: column.flex, textAlign: column.align }]}
          >
            {column.label}
          </Text>
        ))}
      </View>
      {rows.map((cells, index) => (
        <View key={index} style={styles.tableRow} wrap={false}>
          <Text style={styles.tableIndex}>{index + 1}.</Text>
          {cells.map((cell, column) => (
            <View
              key={column}
              style={{
                flex: columns[column]!.flex,
                alignItems:
                  columns[column]!.align === 'right'
                    ? 'flex-end'
                    : columns[column]!.align === 'center'
                      ? 'center'
                      : 'flex-start',
              }}
            >
              {typeof cell === 'string' || typeof cell === 'number' ? <Text>{cell}</Text> : cell}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
