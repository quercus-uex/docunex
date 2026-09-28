import { formatDocCode } from '@docunex/shared';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { LOGO_FILES } from '../files.js';
import { SANS } from '../fonts.js';
import { fullName, sortableName } from '../format.js';
import type { IndexSheetModel } from '../models.js';

const BORDER = 0.75;

const styles = StyleSheet.create({
  // Márgenes de `referencias/Indice_meritos.docx`: 3 cm a los lados; la cabecera ocupa la parte de arriba.
  page: {
    fontFamily: SANS,
    fontSize: 8,
    paddingTop: 170,
    paddingBottom: 60,
    paddingHorizontal: 72,
  },
  header: { position: 'absolute', top: 35, left: 72, flexDirection: 'row', gap: 14 },
  logo: { width: 24 },
  unit: { fontSize: 8, fontWeight: 'bold', marginTop: 8, marginBottom: 9 },
  address: { fontSize: 7, lineHeight: 1.3 },
  title: { fontSize: 9.5, fontWeight: 'bold', textAlign: 'center', marginBottom: 14 },
  box: { flexDirection: 'row', borderWidth: BORDER, marginBottom: 10 },
  boxLabel: {
    width: 118,
    fontWeight: 'bold',
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    borderRightWidth: BORDER,
  },
  boxValue: { flex: 1, paddingHorizontal: 4, paddingVertical: 1.5 },
  table: { borderLeftWidth: BORDER, marginTop: 4 },
  row: { flexDirection: 'row' },
  cell: {
    borderRightWidth: BORDER,
    borderBottomWidth: BORDER,
    paddingHorizontal: 3,
    paddingVertical: 1.5,
  },
  code: { width: '23%', fontWeight: 'bold' },
  name: { width: '60%' },
  page_: { width: '17%', textAlign: 'center' },
  headerCell: {
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 3,
    // En cada celda, no en la tabla: la fila de cabecera se repite en cada página.
    borderTopWidth: BORDER,
  },
  detail: { fontSize: 7, fontStyle: 'italic', marginTop: 1 },
  recipient: {
    fontSize: 9.5,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 1.25,
  },
});

function Box({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.box} wrap={false}>
      <Text style={styles.boxLabel}>{label}</Text>
      <Text style={styles.boxValue}>{value}</Text>
    </View>
  );
}

/** Réplica de la hoja índice (`referencias/Indice_meritos.docx`). */
export function IndexSheet({ model }: { model: IndexSheetModel }) {
  return (
    <Document
      title="Hoja índice de los méritos presentados"
      author={fullName(model.applicant) || undefined}
      language="es"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Image src={LOGO_FILES.vertical} style={styles.logo} />
          <View>
            <Text style={styles.unit}>Vicerrectorado de Investigación y Transferencia</Text>
            <Text style={styles.address}>
              {
                'Campus Universitario\nAvda. de Elvas, s/n\nTeléfono: 924/289305\nE-mail: vrinvestigacion@unex.es\n06006 - BADAJOZ'
              }
            </Text>
          </View>
        </View>

        <Text style={styles.title}>
          HOJA ÍNDICE EN LA QUE SE ENUMERAN LOS MÉRITOS PRESENTADOS.{'\n'}PLAZAS PCI
        </Text>
        <Box label="APELLIDOS Y NOMBRE" value={sortableName(model.applicant)} />
        <Box label="D.N.I." value={model.applicant.dni} />
        <Box label="CÓDIGO PLAZA" value={model.positionCode} />

        <View style={styles.table}>
          <View style={styles.row} fixed>
            <Text style={[styles.cell, styles.code, styles.headerCell]}>CÓDIGO{'\n'}DOCUMENTO</Text>
            <Text style={[styles.cell, styles.name, styles.headerCell, { paddingTop: 8 }]}>
              NOMBRE DOCUMENTO
            </Text>
            <Text style={[styles.cell, styles.page_, styles.headerCell]}>
              Página del archivo de méritos
            </Text>
          </View>
          {model.entries.map((entry) => (
            <View key={entry.code} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.code]}>{formatDocCode(entry.code)}</Text>
              <View style={[styles.cell, styles.name]}>
                <Text>{entry.name}</Text>
                {entry.detail && <Text style={styles.detail}>{entry.detail}</Text>}
              </View>
              <Text style={[styles.cell, styles.page_]}>{entry.page ?? ''}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.recipient} wrap={false}>
          Sr. Vicerrector de Investigación y Transferencia{'\n'}Universidad de Extremadura{'\n'}
          Avda. de Elvas, s/n - 06006 BADAJOZ
        </Text>
      </Page>
    </Document>
  );
}
