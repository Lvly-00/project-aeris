import { useState, type ReactNode } from 'react';
import { Box, Button, Group, Paper, Text, rem } from '@mantine/core';
import type { User } from '../../../shared/types';
import { CARD_PADDING } from './profileTheme';
import { getFullName, maskEmail } from './profileUser';
import ProfileSectionHeading from './ProfileSectionHeading';

/** Every action shares this width so the button column lines up across rows. */
const ACTION_WIDTH = 72;

interface ActionButtonProps {
  children: ReactNode;
  ariaLabel: string;
  onClick: () => void;
  pressed?: boolean;
}

function ActionButton({ children, ariaLabel, onClick, pressed }: ActionButtonProps) {
  return (
    <Button
      variant="filled"
      color="orange"
      size="sm"
      px={10}
      miw={rem(ACTION_WIDTH)}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      onClick={onClick}
      style={{ flexShrink: 0 }}
    >
      {children}
    </Button>
  );
}

interface AccountRowProps {
  label: string;
  value: string;
  children: ReactNode;
}


function AccountRow({ label, value, children }: AccountRowProps) {
  return (
    <Box px={CARD_PADDING} py="sm">
      <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz={rem(13)} c="dimmed" lh={1.4}>
            {label}
          </Text>
          <Text mt={4} fz={rem(15)} fw={500} lh={1.4} style={{ overflowWrap: 'anywhere' }}>
            {value}
          </Text>
        </Box>

        <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
          {children}
        </Group>
      </Group>
    </Box>
  );
}

interface PersonalInformationSectionProps {
  user: User;
  onEditName: () => void;
  onChangeEmail: () => void;
  onChangePassword: () => void;
}

export default function PersonalInformationSection({
  user,
  onEditName,
  onChangeEmail,
  onChangePassword,
}: PersonalInformationSectionProps) {
  const [revealEmail, setRevealEmail] = useState(false);

  return (
    <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
      <ProfileSectionHeading
        title="PERSONAL INFORMATION"
        description="Your name, email, and password."
      />

      <AccountRow label="Name" value={getFullName(user)}>
        <ActionButton ariaLabel="Edit name" onClick={onEditName}>
          Edit
        </ActionButton>
      </AccountRow>

      <AccountRow
        label="Email"
        value={revealEmail ? user.email : maskEmail(user.email)}
      >
        <Button
          aria-label={revealEmail ? 'Hide email' : 'Show email'}
          variant='transparent'
          aria-pressed={revealEmail}
          onClick={() => setRevealEmail((revealed) => !revealed)}
        >
          {revealEmail ? 'Hide' : 'Show'}
        </Button>
        <ActionButton ariaLabel="Change email" onClick={onChangeEmail}>
          Change
        </ActionButton>
      </AccountRow>

      <AccountRow label="Password" value="••••••••">
        <ActionButton ariaLabel="Change password" onClick={onChangePassword}>
          Change
        </ActionButton>
      </AccountRow>
    </Paper>
  );
}
