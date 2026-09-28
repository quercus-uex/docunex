import { Document, Page, StyleSheet, Text } from '@react-pdf/renderer';
import { SANS } from '../fonts.js';
import type { SeparatorModel } from '../models.js';

const styles = StyleSheet.create({
  page: {
    fontFamily: SANS,
    paddingHorizontal: 80,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  number: { fontSize: 48, fontWeight: 'bold', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: 'bold', lineHeight: 1.3 },
});

/** Página que precede a cada bloque del expediente, con su número y su título (lo piden las instrucciones). */
export function Separator({ model }: { model: SeparatorModel }) {
  return (
    <Document title={`${model.number}. ${model.title}`} language="es">
      <Page size="A4" style={styles.page}>
        <Text style={styles.number}>{model.number}</Text>
        <Text style={styles.title}>{model.title}</Text>
      </Page>
    </Document>
  );
}
