import { useRef } from 'react';
import {
  Avatar,
  Badge,
  Box,
  FileButton,
  LoadingOverlay,
  Paper,
  Stack,
  Text,
  Title,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { Camera } from '@boxicons/react';
import type { User } from '../../../shared/types';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrl';
import { getFullName, getInitials } from './profileUser';
import { ORANGE, useProfileAccent } from './profileTheme';

interface ProfileIdentityCardProps {
  user: User;
  uploading: boolean;
  photoError: string | null;
  onPictureSelect: (file: File) => Promise<void>;
}

export default function ProfileIdentityCard({
  user,
  uploading,
  photoError,
  onPictureSelect,
}: ProfileIdentityCardProps) {
  const { isDark, accent } = useProfileAccent();
  const resetRef = useRef<() => void>(null);

  const fullName = getFullName(user);
  const initials = getInitials(user);
  const roleLabel = user.role_display || user.role || 'Staff';

  const handleSelect = async (file: File | null) => {
    if (!file) return;
    try {
      await onPictureSelect(file);
    } finally {
      // Allow picking the same file again after a failed attempt.
      resetRef.current?.();
    }
  };

  return (
    <Paper
      withBorder
      radius="lg"
      p={{ base: 'lg', sm: 'xl' }}
      pos="relative"
      style={{
        backgroundColor: isDark
          ? 'var(--mantine-color-dark-6)'
          : 'var(--mantine-color-orange-0)',
        borderColor: 'var(--mantine-color-orange-light-color)',
      }}
    >
      <LoadingOverlay
        visible={uploading}
        overlayProps={{ blur: 2, backgroundOpacity: 0.45 }}
      />

      <Stack align="center" gap={0}>
        <Box style={{ position: 'relative' }}>
          <Box p={3} style={{ border: `2px solid ${ORANGE}`, borderRadius: '50%' }}>
            <Avatar
              src={resolveMediaUrl(user.profile_picture)}
              size={88}
              radius="100%"
              alt={user.profile_picture ? `${fullName} profile photo` : undefined}
              color="orange"
            >
              <span style={{ color: accent }}>{initials}</span>
            </Avatar>
          </Box>

          <FileButton
            resetRef={resetRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={handleSelect}
          >
            {(props) => (
              <UnstyledButton
                {...props}
                aria-label="Change profile photo"
                title="Change profile photo"
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: -4,
                  width: 44,
                  height: 44,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  color: '#fff',
                }}
              >
                {/* The visible badge stays compact; the button around it
                    keeps a full 44px touch target. */}
                <Box
                  aria-hidden="true"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: ORANGE,
                    display: 'grid',
                    placeItems: 'center',
                    border: '2px solid var(--mantine-color-body)',
                    boxShadow: 'var(--mantine-shadow-sm)',
                  }}
                >
                  <Camera width={17} height={17} color="white" />
                </Box>
              </UnstyledButton>
            )}
          </FileButton>
        </Box>

        <Title
          order={2}
          fz={{ base: rem(19), sm: rem(21) }}
          fw={700}
          lh={1.3}
          mt="md"
          ta="center"
          style={{ overflowWrap: 'anywhere' }}
        >
          {fullName}
        </Title>

        <Badge
          mt={8}
          size="sm"
          radius="xl"
          variant="light"
          color="orange"
          tt="uppercase"
          fw={700}
          styles={{ label: { letterSpacing: rem(0.4) } }}
        >
          <span style={{ color: accent }}>{roleLabel}</span>
        </Badge>

        {photoError && (
          <Text
            role="alert"
            fz={rem(12)}
            c={isDark ? 'orange.4' : 'orange.9'}
            ta="center"
            lh={1.45}
            mt={10}
            maw={rem(260)}
          >
            {photoError}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
