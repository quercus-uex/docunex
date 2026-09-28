import type { MeritDto, ProfileDto } from '@docunex/shared';
import { buildCvModel, CvDocument, type CvModel } from '@docunex/templates';
import { Alert } from '@mantine/core';
import { useMemo } from 'react';
import { PdfFrame } from './PdfFrame';

/** CV con todos los méritos, en el orden de la lista. Sin numeración: los "Doc. nº" van en blanco. */
export default function CvPreview({
  merits,
  profile,
}: {
  merits: MeritDto[];
  profile: ProfileDto | undefined;
}) {
  const result = useMemo((): { model: CvModel } | { error: string } => {
    try {
      const model = buildCvModel({
        applicant: {
          firstName: profile?.firstName ?? null,
          lastNames: profile?.lastNames ?? null,
          dni: profile?.dni ?? null,
        },
        positionCode: null,
        date: null,
        degreeVerifications: profile?.degreeVerifications ?? [],
        merits: merits.map((merit) => ({
          type: merit.type,
          data: merit.data,
          documentIds: [],
        })),
      });
      return { model };
    } catch (error) {
      return { error: String(error) };
    }
  }, [merits, profile]);
  const document = useMemo(
    () => ('model' in result ? <CvDocument model={result.model} /> : null),
    [result],
  );

  if ('error' in result || !document) {
    return (
      <Alert color="red" title="No se pudo preparar el currículum">
        {'error' in result && result.error}
      </Alert>
    );
  }
  return <PdfFrame document={document} fileName="Currículum vitae.pdf" />;
}
