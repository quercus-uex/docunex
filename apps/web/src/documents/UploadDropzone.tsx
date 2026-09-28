import {
  ACCEPTED_UPLOAD_TYPES,
  type DocumentKind,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
} from '@docunex/shared';
import { Group, Stack, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconFileUpload, IconUpload, IconX } from '@tabler/icons-react';
import { useUploadDocuments } from './api';
import { notifyDropRejections, notifyUploadResults } from './uploadNotifications';

const accept = Object.fromEntries(
  Object.entries(ACCEPTED_UPLOAD_TYPES).map(([mime, extensions]) => [mime, [...extensions]]),
);

export function UploadDropzone({ kind }: { kind?: DocumentKind }) {
  const upload = useUploadDocuments();

  return (
    <Dropzone
      onDrop={(files) => upload.mutate({ files, kind }, { onSuccess: notifyUploadResults })}
      onReject={notifyDropRejections}
      accept={accept}
      maxSize={MAX_UPLOAD_BYTES}
      maxFiles={MAX_UPLOAD_FILES}
      loading={upload.isPending}
    >
      <Group justify="center" gap="lg" mih={110} style={{ pointerEvents: 'none' }}>
        <Dropzone.Accept>
          <IconUpload size={40} stroke={1.5} />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX size={40} stroke={1.5} />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconFileUpload size={40} stroke={1.5} />
        </Dropzone.Idle>
        <Stack gap={4}>
          <Text size="lg">Arrastra aquí tus justificantes o haz clic para elegirlos</Text>
          <Text size="sm" c="dimmed">
            PDF o imágenes (JPG, PNG, TIFF, WebP). Hasta {MAX_UPLOAD_FILES} ficheros de 50 MB cada
            uno.
          </Text>
        </Stack>
      </Group>
    </Dropzone>
  );
}
