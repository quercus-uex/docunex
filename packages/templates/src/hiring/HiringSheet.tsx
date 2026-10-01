import { formatIban, formatNuss } from '@docunex/shared';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { LOGO_FILES } from '../files.js';
import { SANS } from '../fonts.js';
import { formatDate, fullName, sortableName } from '../format.js';
import type { HiringSheetModel } from '../models.js';

const BORDER = 0.75;

const styles = StyleSheet.create({
  page: {
    fontFamily: SANS,
    fontSize: 9,
    paddingTop: 110,
    paddingBottom: 60,
    paddingHorizontal: 60,
  },
  header: { position: 'absolute', top: 35, left: 60, flexDirection: 'row', gap: 14 },
  logo: { width: 24 },
  headerText: { marginTop: 8 },
  university: { fontSize: 8, fontWeight: 'bold', marginBottom: 3 },
  subtitle: { fontSize: 7.5 },
  title: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  lead: { fontSize: 8.5, textAlign: 'center', marginBottom: 14 },
  section: { fontSize: 9.5, fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
  box: { flexDirection: 'row', borderWidth: BORDER, borderTopWidth: 0 },
  firstBox: { borderTopWidth: BORDER },
  boxLabel: {
    width: 175,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2.5,
    borderRightWidth: BORDER,
  },
  boxValue: { flex: 1, paddingHorizontal: 4, paddingVertical: 2.5 },
  table: { borderLeftWidth: BORDER },
  row: { flexDirection: 'row' },
  cell: {
    borderRightWidth: BORDER,
    borderBottomWidth: BORDER,
    paddingHorizontal: 4,
    paddingVertical: 2.5,
  },
  index: { width: '7%', textAlign: 'center' },
  name: { width: '73%' },
  page_: { width: '20%', textAlign: 'center' },
  headerCell: { fontWeight: 'bold', textAlign: 'center', borderTopWidth: BORDER },
  detail: { fontSize: 7.5, color: '#333', marginTop: 1 },
  missing: { fontStyle: 'italic' },
  signature: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    right: 60,
    fontSize: 7,
    color: '#555',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

function Boxes({ rows }: { rows: [string, string | null][] }) {
  return (
    <View>
      {rows.map(([label, value], index) => (
        <View
          key={label}
          style={index === 0 ? [styles.box, styles.firstBox] : styles.box}
          wrap={false}
        >
          <Text style={styles.boxLabel}>{label}</Text>
          <Text style={styles.boxValue}>{value ?? ''}</Text>
        </View>
      ))}
    </View>
  );
}

function address(applicant: HiringSheetModel['applicant']): string {
  const place = [applicant.postalCode, applicant.city].filter(Boolean).join(' ');
  const province =
    applicant.province && applicant.province !== applicant.city ? `(${applicant.province})` : '';
  return [applicant.address, [place, province].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
}

/**
 * Portada de la documentación de la segunda fase: datos para el contrato y lista de los documentos que
 * se adjuntan, con su página. No es un modelo oficial de la UEx.
 */
export function HiringSheet({ model }: { model: HiringSheetModel }) {
  const { applicant, hiring } = model;
  return (
    <Document
      title={`Documentación para la contratación${model.positionCode ? ` ${model.positionCode}` : ''}`}
      author={fullName(applicant) || undefined}
      language="es"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Image src={LOGO_FILES.vertical} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.university}>Universidad de Extremadura</Text>
            <Text style={styles.subtitle}>Personal Científico e Investigador (PCI)</Text>
          </View>
        </View>

        <Text style={styles.title}>DOCUMENTACIÓN PARA LA FORMALIZACIÓN DEL CONTRATO</Text>
        <Text style={styles.lead}>Segunda fase del proceso selectivo de plazas PCI</Text>

        <Text style={styles.section}>Plaza</Text>
        <Boxes
          rows={[
            ['Código de la plaza', model.positionCode],
            ['Denominación', model.positionTitle],
            ['Nº de registro de la solicitud', model.registryNumber],
          ]}
        />

        <Text style={styles.section}>Datos personales</Text>
        <Boxes
          rows={[
            ['Apellidos y nombre', sortableName(applicant)],
            ['DNI/NIE', applicant.dni],
            ['Fecha de nacimiento', formatDate(applicant.birthDate)],
            ['Lugar de nacimiento', hiring.birthPlace],
            ['Nacionalidad', hiring.nationality],
            ['Domicilio', address(applicant)],
            ['Correo electrónico', applicant.email],
            ['Teléfono', applicant.phone],
          ]}
        />

        <Text style={styles.section}>Datos bancarios y de la Seguridad Social</Text>
        <Boxes
          rows={[
            ['IBAN (cuenta para la nómina)', hiring.iban && formatIban(hiring.iban)],
            [
              'Nº de afiliación a la Seguridad Social',
              hiring.socialSecurityNumber && formatNuss(hiring.socialSecurityNumber),
            ],
          ]}
        />

        <Text style={styles.section}>Documentación que se adjunta</Text>
        <View style={styles.table}>
          <View style={styles.row} fixed>
            <Text style={[styles.cell, styles.index, styles.headerCell]}>Nº</Text>
            <Text style={[styles.cell, styles.name, styles.headerCell]}>DOCUMENTO</Text>
            <Text style={[styles.cell, styles.page_, styles.headerCell]}>PÁGINA</Text>
          </View>
          {model.entries.map((entry, index) => (
            <View key={entry.label} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.index]}>{index + 1}</Text>
              <View style={[styles.cell, styles.name]}>
                <Text>
                  {entry.label}
                  {entry.required ? '' : ' (si procede)'}
                </Text>
                {entry.documents.map((document, position) => (
                  <Text key={position} style={styles.detail}>
                    · {document.name}
                    {entry.documents.length > 1 && document.page !== null
                      ? ` (pág. ${document.page})`
                      : ''}
                  </Text>
                ))}
              </View>
              {entry.documents.length === 0 ? (
                <Text style={[styles.cell, styles.page_, styles.missing]}>No se adjunta</Text>
              ) : (
                <Text style={[styles.cell, styles.page_]}>{entry.documents[0]!.page ?? ''}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.signature} wrap={false}>
          <Text>Fecha: {formatDate(model.date)}</Text>
          <Text>(Firma)</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>{sortableName(applicant)}</Text>
          <Text>{model.positionCode ? `Plaza ${model.positionCode}` : ''}</Text>
        </View>
      </Page>
    </Document>
  );
}
