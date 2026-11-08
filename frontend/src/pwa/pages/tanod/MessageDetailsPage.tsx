import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Container } from '@mantine/core';

import { dispatchMessagesAPI } from '../../../shared/services/api';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrl';
import type { DispatchMessage } from '../../../shared/types';
import { IncidentEvidence } from '../../components/incidents/IncidentEvidence';
import { messageTypeLabel } from '../../components/tanod/messages/messageMeta';
import { MessageDetailHeader } from '../../components/tanod/messages/MessageDetailHeader';
import { MessageDetailCard } from '../../components/tanod/messages/MessageDetailCard';
import { MessageDetailSkeleton } from '../../components/tanod/messages/MessageDetailSkeleton';

interface MessageResponse {
  data: DispatchMessage;
}

export default function MessageDetailsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const messageId = Number(id);

  const { data, isLoading } = useQuery({
    queryKey: ['dispatch-message', messageId],
    queryFn: () => dispatchMessagesAPI.get(messageId),
    enabled: !!messageId,
    refetchInterval: 15000,
  });

  const message = data?.data;

  const markRead = useMutation({
    mutationFn: () => dispatchMessagesAPI.markRead(messageId),

    /* Clear the unread rail in the same tick the page opens. */
    onMutate: () => {
      queryClient.setQueryData<MessageResponse>(['dispatch-message', messageId], (old) =>
        old ? { ...old, data: { ...old.data, is_read: true } } : old
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-messages'] });
    },

    onError: () => {
      // Put the read state back if the server rejected it.
      queryClient.invalidateQueries({ queryKey: ['dispatch-message', messageId] });
    },
  });

  useEffect(() => {
    if (message && !message.is_read) {
      markRead.mutate();
    }
    // Only the message identity and read state should trigger a mark-read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.id, message?.is_read]);

  const goBack = () => navigate('/pwa/tanod/messages', { replace: true });

  if (isLoading || !message) {
    return <MessageDetailSkeleton />;
  }

  const incident = message.incident_data;

  return (
    <Container size="sm" py="md" pb="xl" px={0}>
      <MessageDetailHeader message={message} onBack={goBack} />

      <IncidentEvidence
        src={resolveMediaUrl(incident.evidence_image) ?? null}
        incidentId={incident.id}
        typeLabel={messageTypeLabel(incident.incident_type)}
      />

      <MessageDetailCard message={message} />
    </Container>
  );
}
