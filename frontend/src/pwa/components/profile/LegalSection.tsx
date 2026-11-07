import { Group, Paper, Text, UnstyledButton, rem } from '@mantine/core';
import { ChevronRight } from '@boxicons/react';
import { CARD_PADDING } from './profileTheme';
import ProfileSectionHeading from './ProfileSectionHeading';

function LegalRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-haspopup="dialog"
      px={CARD_PADDING}
      py="md"
      w="100%"
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text fz={rem(15)} fw={500} lh={1.4}>
          {label}
        </Text>
        <ChevronRight
          width={18}
          height={18}
          color="var(--mantine-color-dimmed)"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        />
      </Group>
    </UnstyledButton>
  );
}

interface LegalSectionProps {
  onTermsClick: () => void;
  onPrivacyClick: () => void;
}

export default function LegalSection({
  onTermsClick,
  onPrivacyClick,
}: LegalSectionProps) {
  return (
    <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
      <ProfileSectionHeading title="Legal" />

      <LegalRow label="Terms of Use" onClick={onTermsClick} />
      <LegalRow label="Privacy Policy" onClick={onPrivacyClick} />
    </Paper>
  );
}
