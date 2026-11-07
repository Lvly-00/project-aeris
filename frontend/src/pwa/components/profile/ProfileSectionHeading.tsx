import { Box, Text, Title, rem } from '@mantine/core';
import { CARD_PADDING } from './profileTheme';

interface ProfileSectionHeadingProps {
  title: string;
  description?: string;
}

export default function ProfileSectionHeading({
  title,
  description,
}: ProfileSectionHeadingProps) {
  return (
    <Box px={CARD_PADDING} pt="lg" pb="md">
      <Title order={2} fz={rem(15)} fw={700} lh={1.3}>
        {title}
      </Title>
      {description && (
        <Text fz={rem(13)} c="dimmed" lh={1.5} mt={3}>
          {description}
        </Text>
      )}
    </Box>
  );
}
