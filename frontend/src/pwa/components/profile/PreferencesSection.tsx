import type { ReactNode } from 'react';
import {
  Box,
  Group,
  LoadingOverlay,
  Paper,
  Select,
  Switch,
  Text,
  ThemeIcon,
  rem,
  useMantineColorScheme,
} from '@mantine/core';
import { Bell, CheckShield, GlobeAlt, Moon, Sun } from '@boxicons/react';
import type { User } from '../../../shared/types';
import { CARD_PADDING, useProfileAccent } from './profileTheme';
import ProfileSectionHeading from './ProfileSectionHeading';

interface PreferenceRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  control: ReactNode;
}

function PreferenceRow({ icon, title, description, control }: PreferenceRowProps) {
  return (
    <Group
      wrap="nowrap"
      gap="sm"
      justify="space-between"
      align="center"
      px={CARD_PADDING}
      py="md"
    >
      <Group gap="sm" wrap="nowrap" align="center" style={{ flex: 1, minWidth: 0 }}>
        <ThemeIcon
          size={34}
          radius="md"
          variant="light"
          color="orange"
          style={{ flexShrink: 0 }}
        >
          {icon}
        </ThemeIcon>

        <Box style={{ minWidth: 0 }}>
          <Text fz={rem(15)} fw={600} lh={1.35}>
            {title}
          </Text>
          <Text fz={rem(13)} c="dimmed" lh={1.4}>
            {description}
          </Text>
        </Box>
      </Group>

      <Box style={{ flexShrink: 0 }}>{control}</Box>
    </Group>
  );
}

interface PreferencesSectionProps {
  user: User;
  updating: boolean;
  onNotificationToggle: (checked: boolean) => void;
  onTwoFactorClick: () => void;
  onLanguageChange: (language: string) => void;
}

export default function PreferencesSection({
  user,
  updating,
  onNotificationToggle,
  onTwoFactorClick,
  onLanguageChange,
}: PreferencesSectionProps) {
  const { isDark, accent } = useProfileAccent();
  const { setColorScheme } = useMantineColorScheme();

  return (
    <Paper withBorder radius="lg" pos="relative" style={{ overflow: 'hidden' }}>
      <LoadingOverlay
        visible={updating}
        overlayProps={{ blur: 2, backgroundOpacity: 0.45 }}
      />

      <ProfileSectionHeading
        title="PREFERENCES"
        description="Alerts, security, and display."
      />

      <PreferenceRow
        icon={<Bell width={18} height={18} color={accent} fill={accent} />}
        title="Notifications"
        description="Alerts about new incidents and updates."
        control={
          <Switch
            color="orange"
            size="md"
            aria-label="Receive notifications"
            checked={user.receive_notifications}
            onChange={(event) => onNotificationToggle(event.currentTarget.checked)}
          />
        }
      />

      <PreferenceRow
        icon={<CheckShield width={18} height={18} color={accent} />}
        title="Two-factor authentication"
        description="Require a one-time code when you sign in."
        control={
          <Switch
            color="orange"
            size="md"
            aria-label="Two-factor authentication"
            checked={user.two_factor_enabled || false}
            onChange={onTwoFactorClick}
          />
        }
      />

      <PreferenceRow
        icon={
          isDark
            ? <Moon width={18} height={18} color={accent} />
            : <Sun width={18} height={18} color={accent} />
        }
        title="Dark mode"
        description="Switch between the dark and light theme."
        control={
          <Switch
            color="orange"
            size="md"
            aria-label="Dark mode"
            checked={isDark}
            onChange={(event) =>
              setColorScheme(event.currentTarget.checked ? 'dark' : 'light')
            }
          />
        }
      />

      {/* Language needs its own line on narrow phones, so the select
          sits under the label instead of squeezing it. */}
      <Box px={CARD_PADDING} py="md">
        <Group gap="sm" wrap="nowrap" align="center">
          <ThemeIcon
            size={34}
            radius="md"
            variant="light"
            color="orange"
            style={{ flexShrink: 0 }}
          >
            <GlobeAlt width={18} height={18} color={accent} />
          </ThemeIcon>

          <Box style={{ minWidth: 0 }}>
            <Text fz={rem(15)} fw={600} lh={1.35}>
              Language
            </Text>
            <Text fz={rem(13)} c="dimmed" lh={1.4}>
              Choose the language AERIS uses.
            </Text>
          </Box>
        </Group>

        <Select
          mt="sm"
          size="sm"
          radius="md"
          aria-label="Preferred language"
          allowDeselect={false}
          value={user.preferred_language || 'English'}
          onChange={(value) => value && onLanguageChange(value)}
          data={['English', 'Filipino']}
          w="100%"
          maw={rem(240)}
        />
      </Box>
    </Paper>
  );
}
