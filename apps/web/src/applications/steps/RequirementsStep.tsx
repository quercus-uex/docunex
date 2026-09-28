import type { ApplicationDto } from '@docunex/shared';
import { Button, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { MeritDocumentsField } from '../../merits/MeritDocumentsField';
import { useSetRequirementDocuments } from '../api';
import { SaveIndicator } from '../SaveIndicator';
import { useAutoSave } from '../useAutoSave';

/** ② Documentos justificativos de los requisitos (bloque 5). */
export function RequirementsStep({
  application,
  locked,
  onBack,
  onNext,
}: {
  application: ApplicationDto;
  locked: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const [documentIds, setDocumentIds] = useState(application.requirementDocumentIds);
  const save = useSetRequirementDocuments(application.id);
  const state = useAutoSave(documentIds, (ids) => save.mutateAsync(ids));

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Bloque 5 del expediente: los documentos que acreditan los requisitos de la convocatoria,
        normalmente el título (o su código QR en el perfil) y la certificación académica personal
        con la nota media. Llevan los primeros números DOC_nn; si alguno justifica también un
        mérito, conserva su número y no se repite.
      </Text>
      <MeritDocumentsField
        value={documentIds}
        onChange={setDocumentIds}
        uploadKind="degree"
        readOnly={locked}
        emptyText="Sin documentos de requisitos."
      />
      <Group justify="space-between">
        {locked ? <span /> : <SaveIndicator state={state} />}
        <Group>
          <Button variant="default" onClick={onBack}>
            Anterior
          </Button>
          <Button onClick={onNext}>Siguiente</Button>
        </Group>
      </Group>
    </Stack>
  );
}
