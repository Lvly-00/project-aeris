import { Image } from '@mantine/core';
import { Maximize } from '@boxicons/react';

import { AppModal } from '../../../shared/components/modals/AppModal';
import { ModalHeader } from '../../../shared/components/modals/ModalHeader';

interface EvidenceLightboxProps {
  opened: boolean;
  onClose: () => void;
  /** Resolved media URL for the captured frame. */
  src: string;
  incidentId: number;
}

/** Full-size view of the captured frame, never larger than the screen. */
export function EvidenceLightbox({ opened, onClose, src, incidentId }: EvidenceLightboxProps) {
  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      size="xl"
      label="Incident evidence"
      header={
        <ModalHeader
          title="Incident evidence"
          description={`Incident #${incidentId}`}
          icon={<Maximize width={20} height={20} />}
          onClose={onClose}
        />
      }
    >
      <Image
        src={src}
        alt={`Evidence captured for incident ${incidentId}`}
        w="100%"
        radius="md"
        fit="contain"
        style={{ maxHeight: '65dvh' }}
      />
    </AppModal>
  );
}
