import { Modal, Stack, Box, Title, Text, Button, Divider, rem } from '@mantine/core';
import { Check } from '@boxicons/react';

const GREEN_SUCCESS = '#2FB300';

export interface SuccessModalProps {
    opened: boolean;
    onClose?: () => void;
    /** Called when the action button is pressed. Defaults to onClose. */
    onAction?: () => void;
    /** Label of the action button. */
    actionLabel?: string;
    /** Main heading (e.g. "Change Password"). */
    title: string;
    /** Coloured sub-heading below the title (e.g. "Successfully!"). */
    subtitle?: string;
    /** Body text. */
    message: string;
    /** Action button colour. Defaults to success green. */
    buttonColor?: string;
    /** Custom icon above the title. Defaults to a large green BadgeCheck. */
    icon?: React.ReactNode;
}

/**
 * Shared success confirmation modal — available to ALL flows
 * (password reset, account creation, settings changes, ...).
 */
export default function SuccessModal({
    opened,
    onClose,
    onAction,
    actionLabel = 'Done',
    title,
    subtitle,
    message,
    buttonColor = GREEN_SUCCESS,
    icon,
}: SuccessModalProps) {
    const handleAction = () => {
        if (onAction) onAction();
        else if (onClose) onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={() => (onClose ? onClose() : undefined)}
            centered
            radius={15}
            padding={40}
            size={440}
            overlayProps={{ blur: 4, opacity: 0.4 }}
        >
            <Stack align="center" gap="lg" w="100%">

                <Box
                    bg="var(--mantine-color-green-light)"
                    style={{
                        borderRadius: '50%',
                        width: rem(86),
                        height: rem(86),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {icon ?? <Check size="lg" color="#00C853" strokeWidth={1.5} />}
                </Box>

                <Title order={3} fw={700} ta="center" style={{ lineHeight: 1.2 }}>
                    {title}
                </Title>

                {subtitle && (
                    <Text c={buttonColor} fw={700} fz={rem(28)} ta="center" mb="md" px={20}>
                        {subtitle}
                    </Text>
                )}

                <Text ta="center" c="dimmed" fz="sm" px={20} style={{ lineHeight: 1.5 }}>
                    {message}
                </Text>

                <Divider w="100%" color="var(--mantine-color-default-border)" />

                <Button
                    fullWidth
                    h={54}
                    radius="md"
                    color={buttonColor}
                    style={{ fontSize: rem(18), fontWeight: 700 }}
                    onClick={handleAction}
                >
                    {actionLabel}
                </Button>
            </Stack>
        </Modal>
    );
}
