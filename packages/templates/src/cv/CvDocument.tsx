import { Document, Image, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { DocRef, Emphasis, NoteBox } from '../components.js';
import { LOGO_FILES } from '../files.js';
import { SANS, SERIF } from '../fonts.js';
import { formatDate, fullName } from '../format.js';
import { SectionBody } from './entries.js';
import type { CvModel, CvSectionNode } from './model.js';

const QR_SIZE = 100;

const styles = StyleSheet.create({
  page: {
    fontFamily: SANS,
    fontSize: 9,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 45,
    // Sin `lineHeight` aquí: react-pdf deja en blanco el texto dinámico (nº de hojas) si lo hereda.
  },
  header: {
    position: 'absolute',
    top: 20,
    right: 45,
    fontSize: 7,
    fontStyle: 'italic',
  },
  pageNumber: { position: 'absolute', bottom: 22, right: 45, fontFamily: SERIF, fontSize: 10 },

  // Portada
  logo: { width: 62, marginLeft: -10 },
  university: { fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  coverBody: { paddingLeft: 60, paddingRight: 30 },
  coverTitle: { fontSize: 22, fontWeight: 'bold', fontStyle: 'italic', marginBottom: 18 },
  coverField: { flexDirection: 'row', fontSize: 11, marginBottom: 11 },
  coverValue: { flex: 1, borderBottomWidth: 0.6, paddingLeft: 4 },
  // `lineHeight` siempre junto a `fontSize`: react-pdf lo calcula con el tamaño del mismo estilo.
  paragraph: { fontSize: 9, textAlign: 'justify', marginBottom: 8, lineHeight: 1.25 },
  qrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 12,
    rowGap: 8,
    marginBottom: 14,
  },
  qrCell: { width: QR_SIZE + 10, alignItems: 'center' },
  qrLabel: { fontWeight: 'bold', fontSize: 8, marginBottom: 2 },
  qrBox: {
    width: QR_SIZE,
    height: QR_SIZE,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCaption: { fontSize: 6.5, textAlign: 'center', marginTop: 2, maxLines: 3 },
  important: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  bullet: { flexDirection: 'row', marginBottom: 8, paddingRight: 10 },
  bulletMark: { width: 12 },

  // Apartados
  blockTitle: { fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  sectionTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 7,
  },
  inlineNote: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 8.5,
    textAlign: 'center',
    marginBottom: 6,
  },
});

/** Recuadro con el QR del código de verificación de un título. */
function QrCode({ value }: { value: string }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  let path = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  const margin = 2;
  const box = size + margin * 2;
  return (
    <Svg width={QR_SIZE - 8} height={QR_SIZE - 8} viewBox={`${-margin} ${-margin} ${box} ${box}`}>
      <Path d={path} fill="#000" />
    </Svg>
  );
}

function Cover({ model }: { model: CvModel }) {
  // La plantilla trae tres recuadros; si hay más títulos se añaden (lo permite la nota).
  const slots = Math.max(3, model.degreeVerifications.length);
  const fields: [string, string | null][] = [
    ['Nombre', fullName(model.applicant)],
    ['D.N.I.', model.applicant.dni],
    ['Fecha', formatDate(model.date)],
    ['Código plaza', model.positionCode],
  ];

  return (
    <View>
      <Image src={LOGO_FILES.cv} style={styles.logo} />
      <Text style={styles.university}>Universidad de Extremadura</Text>
      <View style={styles.coverBody}>
        <Text style={styles.coverTitle}>Currículum vitae</Text>
        <View style={styles.coverField}>
          <Text>Número de hojas que contiene: </Text>
          <Text style={styles.coverValue} render={({ totalPages }) => String(totalPages)} />
        </View>
        {fields.map(([label, value]) => (
          <View key={label} style={styles.coverField}>
            <Text>{label}: </Text>
            <Text style={styles.coverValue}>{value}</Text>
          </View>
        ))}
        <Text style={[styles.coverField, { marginBottom: 26 }]}>Firma:</Text>
      </View>

      <Text style={styles.paragraph}>
        El arriba firmante declara que son ciertos los datos que figuran en este{' '}
        <Text style={{ fontStyle: 'italic' }}>currículum</Text>, asumiendo, en caso contrario, las
        responsabilidades que pudieran derivarse de las inexactitudes que consten en el mismo.
      </Text>
      <Text style={styles.paragraph}>
        Inserte en los siguientes recuadros el(los) código(s) de autorización para consultar los
        títulos universitarios oficiales españoles de los que es titular el solicitante (inclúyanse
        cuadros adicionales si es necesario):
      </Text>
      <View style={styles.qrGrid}>
        {Array.from({ length: slots }, (_, index) => {
          const verification = model.degreeVerifications[index];
          return (
            <View key={index} style={styles.qrCell} wrap={false}>
              <Text style={styles.qrLabel}>QR Titulación {index + 1}</Text>
              <View style={styles.qrBox}>
                {verification && <QrCode value={verification.code} />}
              </View>
              {verification && <Text style={styles.qrCaption}>{verification.degreeName}</Text>}
            </View>
          );
        })}
      </View>

      <View wrap={false}>
        <Text style={styles.important}>IMPORTANTE:</Text>
        <View style={styles.bullet}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={[styles.paragraph, { flex: 1, marginBottom: 0 }]}>
            No olvide que es necesario <Text style={{ fontWeight: 'bold' }}>firmar al margen</Text>{' '}
            cada una de las hojas y que éste currículum no excluye que en el proceso de evaluación
            se le requiera para ampliar la información aquí contenida.
          </Text>
        </View>
        <View style={styles.bullet}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={[styles.paragraph, { flex: 1, marginBottom: 0 }]}>
            <Emphasis text="**TODOS** los documentos aportados como justificantes de los méritos, **deberán ser numerados convenientemente y reseñados en cada apartado del** ***currículum*** a los efectos de su más fácil localización, en caso de contrario, la **Comisión EXCLUIRÁ** a los candidatos hasta que procedan a la subsanación de este defecto." />
          </Text>
        </View>
      </View>
    </View>
  );
}

/** "2.- CURRÍCULUM ACADÉMICO", con la primera palabra en cursiva como en la plantilla. */
function BlockTitle({ node }: { node: CvSectionNode }) {
  const [first, ...rest] = node.section.title.split(' ');
  return (
    <View style={styles.sectionTitle} minPresenceAhead={80}>
      <Text style={[styles.blockTitle, { flex: 1 }]}>
        {node.section.label} <Text style={{ fontStyle: 'italic' }}>{first}</Text> {rest.join(' ')}
      </Text>
      {node.section.docRef === 'section' && (
        <DocRef codes={node.docCodes} style={{ marginTop: 10, fontSize: 11 }} />
      )}
    </View>
  );
}

function Section({ node, depth }: { node: CvSectionNode; depth: number }) {
  const { section } = node;
  const inlineNotes = section.notes.filter((note) => note.startsWith('('));
  const boxedNotes = section.notes.filter((note) => !note.startsWith('('));

  return (
    <View style={{ paddingLeft: depth > 1 ? 14 : 0 }}>
      {depth === 0 ? (
        <BlockTitle node={node} />
      ) : (
        <View style={styles.sectionTitle} minPresenceAhead={60}>
          <Text style={{ flex: 1 }}>
            {section.label} {section.title}
          </Text>
          {section.docRef === 'section' && <DocRef codes={node.docCodes} />}
        </View>
      )}
      {inlineNotes.map((note) => (
        <Text key={note} style={styles.inlineNote}>
          {note}
        </Text>
      ))}
      <SectionBody code={section.code} entries={node.entries} />
      {node.children.map((child) => (
        <Section key={child.section.code} node={child} depth={depth + 1} />
      ))}
      {boxedNotes.map((note) => (
        <NoteBox key={note} text={note} />
      ))}
    </View>
  );
}

/** Réplica del CV normalizado (`referencias/Plantilla_CV.doc`) con los apartados que tienen méritos. */
export function CvDocument({ model }: { model: CvModel }) {
  const name = fullName(model.applicant);
  return (
    <Document
      title={`Currículum vitae${name ? ` – ${name}` : ''}`}
      author={name || undefined}
      language="es"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.header} fixed>
          Curriculum vitae plazas PCI. Universidad de Extremadura
        </Text>
        <Cover model={model} />
        {model.sections.map((node, index) => (
          // El bloque 2 y el 4 empiezan página, como en la plantilla; el 5 va a continuación.
          <View key={node.section.code} break={index === 0 || node.section.code === '4'}>
            <Section node={node} depth={0} />
          </View>
        ))}
        <Text style={styles.pageNumber} fixed render={({ pageNumber }) => String(pageNumber)} />
      </Page>
    </Document>
  );
}
