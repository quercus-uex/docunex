import type { ProfileInput } from '@docunex/shared';
import { AnnexIII, type Applicant } from '@docunex/templates';
import { useMemo } from 'react';
import { PdfFrame } from './PdfFrame';

function orNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** Anexo III con los datos que hay en el formulario del perfil, aunque no estén guardados. */
export default function AnnexPreview({ values }: { values: ProfileInput }) {
  const document = useMemo(() => {
    const applicant: Applicant = {
      lastNames: orNull(values.lastNames),
      firstName: orNull(values.firstName),
      dni: orNull(values.dni)?.toUpperCase() ?? null,
      birthDate: values.birthDate,
      address: orNull(values.address),
      postalCode: orNull(values.postalCode),
      city: orNull(values.city),
      province: orNull(values.province),
      email: orNull(values.email),
      phone: orNull(values.phone),
      degree: orNull(values.degree),
    };
    return <AnnexIII model={{ applicant, positionCode: null, resolutionDate: null, date: null }} />;
  }, [values]);

  return <PdfFrame document={document} fileName="Anexo III.pdf" />;
}
