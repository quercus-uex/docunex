import { PACKAGE_BLOCKS } from '@docunex/shared';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { ReactNode } from 'react';
import { LOGO_FILES } from '../files.js';
import { SANS } from '../fonts.js';
import { formatDate, fullName } from '../format.js';
import type { AnnexIIIModel } from '../models.js';

const BORDER = 0.75;

const styles = StyleSheet.create({
  page: { fontFamily: SANS, fontSize: 9, paddingTop: 22, paddingHorizontal: 64, paddingBottom: 30 },
  logo: { width: 52, alignSelf: 'center', marginBottom: 10 },
  title: { fontWeight: 'bold', textAlign: 'center', fontSize: 9, marginBottom: 8 },
  subtitle: { fontWeight: 'bold', textAlign: 'center', fontSize: 10, marginBottom: 14 },
  table: { borderTopWidth: BORDER, borderLeftWidth: BORDER },
  row: { flexDirection: 'row' },
  cell: {
    borderRightWidth: BORDER,
    borderBottomWidth: BORDER,
    paddingHorizontal: 5,
    paddingVertical: 3,
    minHeight: 19,
  },
  label: { fontSize: 8.5 },
  value: { fontSize: 9.5, marginTop: 1 },
  heading: { fontWeight: 'bold', fontSize: 11 },
  paragraph: { fontSize: 9.5, textAlign: 'justify', lineHeight: 1.35 },
  positionTable: { width: 355, alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  positionHeader: { fontWeight: 'bold', textAlign: 'center' },
  signature: { flexDirection: 'row', marginTop: 26, paddingLeft: 24, height: 70 },
  documentation: { fontSize: 7.5, marginTop: 10, lineHeight: 1.3 },
  documentationList: { fontSize: 7.5, marginTop: 8, paddingLeft: 70, lineHeight: 1.45 },
  footer: {
    position: 'absolute',
    bottom: 26,
    left: 64,
    right: 64,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 7.5,
    lineHeight: 2.2,
  },
});

/** Celda con la etiqueta y, a su lado o debajo, el valor. */
function Cell({
  label,
  value,
  style,
  stacked = false,
}: {
  label?: string;
  value?: ReactNode;
  style?: Style;
  stacked?: boolean;
}) {
  return (
    <View
      style={[
        styles.cell,
        stacked ? {} : { flexDirection: 'row', alignItems: 'center' },
        style ?? {},
      ]}
    >
      {label && <Text style={styles.label}>{label}</Text>}
      {value !== undefined && value !== null && value !== '' && (
        <Text style={[styles.value, stacked ? {} : { marginLeft: 4, marginTop: 0, flex: 1 }]}>
          {value}
        </Text>
      )}
    </View>
  );
}

/** Réplica del Anexo III (`referencias/Modelo_solicitud.pdf`). */
export function AnnexIII({ model }: { model: AnnexIIIModel }) {
  const { applicant } = model;
  const [year, month, day] = applicant.birthDate?.split('-') ?? [];

  return (
    <Document
      title="Anexo III. Solicitud de participación (PCI)"
      author={fullName(applicant) || undefined}
      language="es"
    >
      <Page size="A4" style={styles.page}>
        <Image src={LOGO_FILES.annex} style={styles.logo} />
        <Text style={styles.title}>ANEXO III</Text>
        <Text style={styles.subtitle}>
          SOLICITUD PARA PARTICIPAR EN PROCESO DE SELECCIÓN PARA CONTRATACIÓN DE{'\n'}PERSONAL
          CIENTÍFICO E INVESTIGADOR (PCI)
        </Text>

        <View style={styles.table}>
          <View style={styles.row}>
            <Cell label="Apellidos:" value={applicant.lastNames} style={{ flex: 6 }} />
            <Cell label="Nombre:" value={applicant.firstName} style={{ flex: 4 }} />
          </View>
          <View style={styles.row}>
            <Cell label="D.N.I.:" value={applicant.dni} style={{ flex: 4.2 }} />
            <Cell label={'Fecha de\nNacimiento:'} style={{ flex: 1.8 }} />
            {(
              [
                ['Día', day],
                ['Mes', month],
                ['Año', year],
              ] as const
            ).map(([label, value]) => (
              <View key={label} style={{ flex: 4 / 3 }}>
                <Text
                  style={[
                    styles.cell,
                    styles.label,
                    { textAlign: 'center', minHeight: 13, paddingVertical: 1.5 },
                  ]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    styles.value,
                    { textAlign: 'center', minHeight: 17, marginTop: 0 },
                  ]}
                >
                  {value ?? ''}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.row}>
            <Cell label="Domicilio:" value={applicant.address} style={{ flex: 8 }} />
            <Cell label="C.P.:" value={applicant.postalCode} style={{ flex: 2 }} />
          </View>
          <View style={styles.row}>
            <Cell label="Localidad:" value={applicant.city} style={{ flex: 6 }} />
            <Cell label="Provincia:" value={applicant.province} style={{ flex: 4 }} />
          </View>
          <View style={styles.row}>
            <Cell label="Correo Electrónico:" value={applicant.email} style={{ flex: 6 }} />
            <Cell label="Teléfono:" value={applicant.phone} style={{ flex: 4 }} />
          </View>
          <View style={styles.row}>
            <Cell label="Titulación:" value={applicant.degree} style={{ flex: 1 }} />
          </View>
        </View>

        <Text style={[styles.paragraph, { marginTop: 22 }]}>
          <Text style={styles.heading}>EXPONE: </Text>
          Que desea participar en el proceso selectivo convocado para la cobertura de plazas de
          Personal Científico e Investigador, y a tal efecto se especifica la referencia de las
          solicitadas conforme a las indicaciones contenidas en la convocatoria:
        </Text>

        <View style={[styles.table, styles.positionTable]}>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.positionHeader, { flex: 1, minHeight: 0 }]}>
              Código de la plaza
            </Text>
            <Text style={[styles.cell, styles.positionHeader, { flex: 1, minHeight: 0 }]}>
              Fecha Resolución
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cell, { flex: 1, fontSize: 10.5 }]}>
              {model.positionCode ?? 'IN'}
            </Text>
            <Text style={[styles.cell, { flex: 1, fontSize: 10.5 }]}>
              {formatDate(model.resolutionDate)}
            </Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          <Text style={styles.heading}>SOLICITA: </Text>
          Su admisión al proceso selectivo referenciado. La presentación de la solicitud para
          participar en la convocatoria supone la aceptación íntegra de los términos y condiciones
          de las presentes bases.
        </Text>

        <View style={styles.signature}>
          <Text style={{ flex: 1 }}>Fecha: {formatDate(model.date)}</Text>
          <Text style={{ flex: 1, paddingLeft: 60 }}>(Firma del solicitante)</Text>
        </View>

        <Text style={styles.documentation}>
          Documentación que se acompaña en un único archivo pdf (consultar el documento de
          instrucciones en esta misma web) y en este orden:
        </Text>
        <View style={styles.documentationList}>
          {PACKAGE_BLOCKS.map((block) => (
            <Text key={block.number}>
              {block.number}. {block.title}
            </Text>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>SR. VICERRECTOR DE INVESTIGACIÓN Y TRANSFERENCIA</Text>
          <Text>UNIVERSIDAD DE EXTREMADURA</Text>
          <Text>Avda. de Elvas, s/n - 06006 BADAJOZ</Text>
          <Text style={{ fontSize: 6.5 }}>Código RedSara:U00200011</Text>
        </View>
      </Page>
    </Document>
  );
}
