import {
  type CvSectionCode,
  getMeritType,
  type MeritData,
  type MeritType,
  optionLabel,
} from '@docunex/shared';
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import { Choice, type Column, DocRef, Field, Row, Table } from '../components.js';
import { formatDate, formatNumber } from '../format.js';
import type { CvEntry } from './model.js';

const INDENT = 14;

const styles = StyleSheet.create({
  entry: { marginBottom: 8 },
  indented: { paddingLeft: INDENT },
  coursesTitle: { fontWeight: 'bold', textAlign: 'center', marginTop: 6, marginBottom: 4 },
  cap: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, fontWeight: 'bold' },
});

type Data<T extends MeritType> = MeritData<T>;

function option<T extends MeritType>(type: T, field: keyof Data<T> & string, value: string | null) {
  return optionLabel(getMeritType(type).fieldDefs, field, value);
}

function period(start: string | null, end: string | null): string {
  if (!start) return '';
  return `${formatDate(start)} – ${end ? formatDate(end) : 'actualidad'}`;
}

function Entry({ children }: { children: ReactNode }) {
  return (
    <View style={styles.entry} wrap={false}>
      {children}
    </View>
  );
}

function Indented({ children }: { children: ReactNode }) {
  return <View style={styles.indented}>{children}</View>;
}

// --- Bloque 2 -----------------------------------------------------------------------------------

function GradeCounts({ data }: { data: Data<'academic_record'> | Data<'other_degree'> }) {
  return (
    <>
      <Row>
        <Field label="Titulación" value={data.degree} />
      </Row>
      <Row>
        <Field label="Nº Matrículas de Honor" value={formatNumber(data.honors)} />
        <Field label="Nº Sobresalientes" value={formatNumber(data.outstanding)} />
        <Field label="Nº Notables" value={formatNumber(data.notable)} />
        <Field label="Nº Aprobados" value={formatNumber(data.pass)} />
      </Row>
      <Row>
        <Field
          label="Calificación Media"
          value={formatNumber(data.averageGrade)}
          style={{ width: 160 }}
        />
      </Row>
    </>
  );
}

function AcademicRecord({ data }: { data: Data<'academic_record'> }) {
  return (
    <Entry>
      <GradeCounts data={data} />
      <View style={{ gap: 3, marginTop: 4 }}>
        <Choice label="Premio Nacional de Licenciatura o grado" value={data.nationalAward} />
        <Choice
          label="Premio Extraordinario de Licenciatura o Grado"
          value={data.extraordinaryAward}
        />
        <Choice label="Tesina:" value={data.tesina} />
      </View>
    </Entry>
  );
}

function DoctoralStudies({ data }: { data: Data<'doctoral_studies'> }) {
  return (
    <Entry>
      <Row>
        <Field label="Master oficial habilitante" value={data.qualifyingMaster} />
      </Row>
      <Row>
        <Field label="Programa de Doctorado" value={data.doctoralProgram} />
      </Row>
      <Row>
        <Field label="Departamento responsable" value={data.department} />
      </Row>
      {data.courses.length > 0 && (
        <>
          <Text style={styles.coursesTitle}>CURSOS DE DOCTORADO RECIBIDOS</Text>
          <Table
            columns={[
              { label: 'Asignatura', flex: 5 },
              { label: 'Créditos', flex: 1, align: 'center' },
              { label: 'Calificación', flex: 1.4, align: 'center' },
            ]}
            rows={data.courses.map((course) => [
              course.subject,
              formatNumber(course.credits),
              course.grade ?? '',
            ])}
          />
        </>
      )}
      <Row style={{ marginTop: 6 }}>
        <Field
          label="Calificación Media Doctorado/Master"
          value={formatNumber(data.averageGrade)}
          style={{ width: 240 }}
        />
      </Row>
      <Choice label="Premio Extraordinario fin de Master" value={data.masterExtraordinaryAward} />
    </Entry>
  );
}

function Doctorate({ data }: { data: Data<'doctorate'> }) {
  return (
    <Entry>
      <Row>
        <Field label="Título de la Tesis" value={data.thesisTitle} />
      </Row>
      <Row>
        <Field label="Director" value={data.supervisors} />
      </Row>
      <Row>
        <Field label="Fecha de lectura" value={formatDate(data.defenseDate)} />
        <Field label="Calificación" value={data.grade} />
      </Row>
      <Row>
        <Choice label="Premio Extraordinario de Doctorado:" value={data.extraordinaryAward} />
        <Field label="Fecha del acuerdo de concesión" value={formatDate(data.awardDate)} />
      </Row>
      <Choice label="Doctorado Internacional:" value={data.international} />
    </Entry>
  );
}

function OtherDegree({ data }: { data: Data<'other_degree'> }) {
  return (
    <Entry>
      <GradeCounts data={data} />
    </Entry>
  );
}

// --- Bloque 4 -----------------------------------------------------------------------------------

function ResearchStay({ data }: { data: Data<'research_stay'> }) {
  return (
    <Entry>
      <Row>
        <Field label="Centro" value={data.center} />
      </Row>
      <Row>
        <Field label="Localidad" value={data.city} style={{ flex: 2.2 }} />
        <Field label="País" value={data.country} style={{ flex: 1.6 }} />
        <Field label="Año" value={data.year} style={{ flex: 0.8 }} />
        <Field label="Duración (meses)" value={formatNumber(data.months)} style={{ flex: 1.3 }} />
      </Row>
    </Entry>
  );
}

function BookDetails({
  data,
}: {
  data: Pick<
    Data<'book'>,
    'pages' | 'publisher' | 'cityCountry' | 'year' | 'isbn' | 'legalDeposit'
  >;
}) {
  return (
    <>
      <Row>
        <Field label="Número de páginas" value={formatNumber(data.pages)} style={{ flex: 1.3 }} />
        <Field label="Editorial" value={data.publisher} style={{ flex: 2.2 }} />
        <Field label="Ciudad/País" value={data.cityCountry} style={{ flex: 1.8 }} />
      </Row>
      <Row>
        <Field label="Año" value={data.year} style={{ flex: 0.8 }} />
        <Field label="I.S.B.N." value={data.isbn} style={{ flex: 2 }} />
        <Field label="Lugar de Depósito" value={data.legalDeposit} style={{ flex: 2 }} />
      </Row>
    </>
  );
}

function Book({ data }: { data: Data<'book'> }) {
  return (
    <Entry>
      <Row>
        <Field label="Título" value={data.title} />
      </Row>
      <Row>
        <Field label="Autor/es" value={data.authors} />
      </Row>
      <BookDetails data={data} />
    </Entry>
  );
}

function BookChapter({ data }: { data: Data<'book_chapter'> }) {
  return (
    <Entry>
      <Row>
        <Field label="Título del libro" value={data.bookTitle} />
      </Row>
      <BookDetails data={data} />
      <Row>
        <Field label="Título del Capítulo" value={data.chapterTitle} />
      </Row>
      <Row>
        <Field label="Autor/es" value={data.authors} />
      </Row>
      <Row>
        <Field label="Página inicial" value={data.firstPage} style={{ width: 120 }} />
        <Field label="Página final" value={data.lastPage} style={{ width: 120 }} />
      </Row>
    </Entry>
  );
}

function Article({ data }: { data: Data<'article'> }) {
  const index = data.index === 'other' ? data.otherIndex : option('article', 'index', data.index);
  return (
    <Entry>
      <Row>
        <Field label="Título" value={data.title} />
      </Row>
      <Row>
        <Field label="Autor/es" value={data.authors} />
      </Row>
      <Row>
        <Field label="Revista o publicación periódica" value={data.journal} />
      </Row>
      <Row>
        <Field label="Volumen" value={data.volume} style={{ flex: 1.3 }} />
        <Field label="Primera página" value={data.firstPage} style={{ flex: 1.3 }} />
        <Field label="Última página" value={data.lastPage} style={{ flex: 1.3 }} />
        <Field label="Año" value={data.year} style={{ flex: 0.9 }} />
      </Row>
      {data.doi && (
        <Row>
          <Field label="DOI" value={data.doi} />
        </Row>
      )}
      {data.indexed && (
        <>
          <Row>
            <Field
              label="Índice (JCR, SJR, Latindex, otros…), cuartil y categoría"
              value={[index, option('article', 'quartile', data.quartile), data.category]
                .filter(Boolean)
                .join(', ')}
            />
          </Row>
          <Row>
            <Field
              label="Posición y número total de revistas en la categoría"
              value={
                data.rank !== null && data.categoryTotal !== null
                  ? `${data.rank}/${data.categoryTotal}`
                  : formatNumber(data.rank ?? data.categoryTotal)
              }
            />
          </Row>
        </>
      )}
    </Entry>
  );
}

function Presentation({ data }: { data: Data<'conference_talk'> | Data<'poster'> }) {
  return (
    <Entry>
      <Row>
        <Field label="Autor/es" value={data.authors} />
      </Row>
      <Indented>
        <Row>
          <Field label="Título" value={data.title} />
        </Row>
        <Row>
          <Field label="Congreso" value={data.congress} style={{ flex: 2.4 }} />
          <Field
            label="Carácter (Nal./Internal.)"
            value={option('conference_talk', 'scope', data.scope)}
            style={{ flex: 1.6 }}
          />
        </Row>
        <Row>
          <Field
            label="Lugar de celebración (Ciudad/País)"
            value={`${data.city}/${data.country}`}
            style={{ flex: 3 }}
          />
          <Field label="AÑO" value={data.year} style={{ flex: 0.8 }} />
        </Row>
      </Indented>
    </Entry>
  );
}

function FundedWork({
  data,
  kind,
}: {
  data: Data<'project'> | Data<'industry_contract'>;
  kind: 'project' | 'contract';
}) {
  const funder = data.code ? `${data.funder} (${data.code})` : data.funder;
  return (
    <Entry>
      <Row>
        <Field
          label={kind === 'project' ? 'Título del proyecto' : 'Título del Contrato/Convenio'}
          value={data.title}
        />
      </Row>
      <Indented>
        <Row>
          <Field
            label="Carácter (Autonómico/Nacional/Internacional)"
            value={option('project', 'scope', data.scope)}
          />
        </Row>
        <Row>
          <Field
            label={
              kind === 'project'
                ? 'Entidad financiadora y código del Proyecto'
                : 'Entidad financiadora y código del Contrato/Convenio'
            }
            value={funder}
          />
        </Row>
        <Row>
          <Field label="Duración desde" value={formatDate(data.startDate)} style={{ flex: 1.2 }} />
          <Field label="hasta" value={formatDate(data.endDate)} style={{ flex: 0.9 }} />
          <Field
            label="Número de investigadores"
            value={formatNumber(data.researchers)}
            style={{ flex: 1.5 }}
          />
        </Row>
        <Row>
          <Field label="Investigador principal" value={data.principalInvestigator} />
        </Row>
      </Indented>
    </Entry>
  );
}

function ThesisSupervision({ data }: { data: Data<'thesis_supervision'> }) {
  return (
    <Entry>
      <Row>
        <Field label="Título del trabajo" value={data.workTitle} />
      </Row>
      <Indented>
        <Row>
          <Field label="Tesis doctoral" value={data.thesis} style={{ flex: 2 }} />
          <Field
            label="Fecha de defensa pública"
            value={formatDate(data.defenseDate)}
            style={{ flex: 1.4 }}
          />
        </Row>
        <Row>
          <Field label="Doctorando" value={data.doctoralStudent} />
        </Row>
      </Indented>
    </Entry>
  );
}

function ArtExhibition({ data }: { data: Data<'art_exhibition'> }) {
  return (
    <Entry>
      <Row>
        <Field label="Autor/es" value={data.authors} />
      </Row>
      <Indented>
        <Row>
          <Field label="Título" value={data.title} />
        </Row>
        <Row>
          <Field
            label="Tipo de participación (individual/colectiva)"
            value={option('art_exhibition', 'participation', data.participation)}
            style={{ flex: 1.6 }}
          />
          <Field label="Sala" value={data.venue} style={{ flex: 1.8 }} />
        </Row>
        <Row>
          <Field
            label="Lugar de exposición (Ciudad/País)"
            value={`${data.city}/${data.country}`}
            style={{ flex: 3 }}
          />
          <Field label="AÑO" value={data.year} style={{ flex: 0.8 }} />
        </Row>
      </Indented>
    </Entry>
  );
}

function Patent({ data }: { data: Data<'patent'> }) {
  return (
    <Entry>
      <Row>
        <Field label="Inventor/es" value={data.inventors} />
      </Row>
      <Indented>
        <Row>
          <Field label="Título" value={data.title} />
        </Row>
        <Row>
          <Field label="Nº de solicitud" value={data.applicationNumber} style={{ flex: 1.4 }} />
          <Field label="Fecha" value={formatDate(data.date)} />
        </Row>
        <Row>
          <Field label="Entidad titular" value={data.holder} />
        </Row>
        <Row>
          <Field label="Empresa/s que la están o han explotado" value={data.companies} />
        </Row>
      </Indented>
    </Entry>
  );
}

/** Méritos que se imprimen como un bloque de campos. */
function EntryBlock({ entry }: { entry: CvEntry }) {
  switch (entry.type) {
    case 'academic_record':
      return <AcademicRecord data={entry.data} />;
    case 'doctoral_studies':
      return <DoctoralStudies data={entry.data} />;
    case 'doctorate':
      return <Doctorate data={entry.data} />;
    case 'other_degree':
      return <OtherDegree data={entry.data} />;
    case 'research_stay':
      return <ResearchStay data={entry.data} />;
    case 'book':
      return <Book data={entry.data} />;
    case 'book_chapter':
      return <BookChapter data={entry.data} />;
    case 'article':
      return <Article data={entry.data} />;
    case 'conference_talk':
    case 'poster':
      return <Presentation data={entry.data} />;
    case 'project':
      return <FundedWork data={entry.data} kind="project" />;
    case 'industry_contract':
      return <FundedWork data={entry.data} kind="contract" />;
    case 'thesis_supervision':
      return <ThesisSupervision data={entry.data} />;
    case 'art_exhibition':
      return <ArtExhibition data={entry.data} />;
    case 'patent':
      return <Patent data={entry.data} />;
    // Van en tabla (`SectionBody`).
    case 'master':
    case 'teacher_training':
    case 'language':
    case 'grant':
    case 'peer_review':
    case 'professional_activity':
      return null;
  }
}

// --- Apartados en tabla -------------------------------------------------------------------------

function ofType<T extends MeritType>(entries: CvEntry[], type: T) {
  return entries.filter((entry): entry is Extract<CvEntry, { type: T }> => entry.type === type);
}

const DOC_COLUMN: Column = { label: '', flex: 2, align: 'right' };

const GRANT_COLUMNS: Column[] = [
  { label: 'Beca', flex: 3 },
  { label: 'Organismo', flex: 3 },
  { label: 'Período de disfrute', flex: 2.3 },
  { label: 'Meses', flex: 0.7, align: 'right' },
];

/**
 * Méritos de un apartado: en tabla numerada si la plantilla lo presenta así (2.d, 2.f, 4.a, 4.k y 5)
 * y, si no, como bloques de campos.
 */
export function SectionBody({ code, entries }: { code: CvSectionCode; entries: CvEntry[] }) {
  switch (code) {
    case '2.d': {
      const masters = ofType(entries, 'master');
      const cap = ofType(entries, 'teacher_training');
      return (
        <View>
          {masters.length > 0 && (
            <Table
              columns={[{ label: 'Master', flex: 4 }, { label: 'Créditos', flex: 1 }, DOC_COLUMN]}
              rows={masters.map((entry) => [
                entry.data.name,
                formatNumber(entry.data.credits),
                <DocRef key="doc" codes={entry.docCodes} style={{ maxWidth: '100%' }} />,
              ])}
            />
          )}
          <View style={styles.cap} wrap={false}>
            <Choice label="Curso de Adaptación Pedagógica:" value={cap.length > 0} />
            <DocRef codes={cap.flatMap((entry) => entry.docCodes)} />
          </View>
        </View>
      );
    }
    case '2.f':
      return (
        <Table
          columns={[
            { label: 'Idioma y nivel', flex: 2.5 },
            { label: 'Certificadora', flex: 2.5 },
            DOC_COLUMN,
          ]}
          rows={ofType(entries, 'language').map((entry) => [
            `${entry.data.language} ${entry.data.level}`,
            entry.data.certifier,
            <DocRef key="doc" codes={entry.docCodes} style={{ maxWidth: '100%' }} />,
          ])}
        />
      );
    case '4.a.1':
    case '4.a.2':
    case '4.a.3':
      return (
        <Table
          columns={GRANT_COLUMNS}
          rows={ofType(entries, 'grant').map((entry) => [
            entry.data.name,
            entry.data.organization,
            period(entry.data.startDate, entry.data.endDate),
            formatNumber(entry.data.months),
          ])}
        />
      );
    case '4.k':
      return (
        <Table
          columns={[
            { label: 'Revista', flex: 4 },
            { label: '(cuartil/decil)', flex: 1.4 },
          ]}
          rows={ofType(entries, 'peer_review').map((entry) => [
            entry.data.journal,
            entry.data.rank,
          ])}
        />
      );
    case '5':
      return (
        <Table
          columns={[
            { label: 'Tipo de actividad', flex: 3.5 },
            { label: 'Fecha de Inicio/cese', flex: 2.2 },
            { label: 'Duración (meses)', flex: 1.2, align: 'right' },
          ]}
          rows={ofType(entries, 'professional_activity').map((entry) => [
            entry.data.activity,
            period(entry.data.startDate, entry.data.endDate),
            formatNumber(entry.data.months),
          ])}
        />
      );
    default:
      return (
        <>
          {entries.map((entry, index) => (
            <EntryBlock key={index} entry={entry} />
          ))}
        </>
      );
  }
}
