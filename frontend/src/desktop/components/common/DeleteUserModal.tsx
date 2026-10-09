import { Modal, Stack, Text, Group, Button, Box, ActionIcon, ThemeIcon } from '@mantine/core';
import { X, Trash } from '@boxicons/react';

interface DeleteUserModalProps {
    opened: boolean;
    onClose: () => void;
    onConfirm: () => void;
    userName: string;
    loading: boolean;
}

export function DeleteUserModal({ opened, onClose, onConfirm, userName, loading }: DeleteUserModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            centered
            size="md"
            withCloseButton={false}
            padding={0}
            radius="md"
            zIndex={1100}
            overlayProps={{
                backgroundOpacity: 0.6,
                blur: 3,
            }}
            styles={{
                content: {
                    overflow: 'hidden',
                },
                body: {
                    padding: 0,
                },
            }}
        >
            <Stack gap={0}>
                {/* Close Button */}
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="lg"
                    onClick={onClose}
                    disabled={loading}
                    style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        zIndex: 2,
                    }}
                >
                    <X size="sm" />
                </ActionIcon>

                {/* Header */}
                <Stack align="center" gap={12} px={32} pt={30} pb={24}>
                    <ThemeIcon
                        size={72}
                        radius="50%"
                        variant="light"
                        color="red"
                        style={{
                            backgroundColor: 'var(--mantine-color-red-light)',
                        }}
                    >
                        <Trash
                            size="lg"
                            color="var(--mantine-color-red-6)"
                        />
                    </ThemeIcon>

                    <Stack align="center" gap={6}>
                        <Text
                            fw={700}
                            size="xl"
                            ta="center"
                            c="var(--mantine-color-text)"
                        >
                            Delete User
                        </Text>

                        <Text
                            size="sm"
                            c="dimmed"
                            ta="center"
                            maw={350}
                            lh={1.5}
                        >
                            Are you sure you want to delete{' '}
                            <Text span fw={600} c="var(--mantine-color-text)">
                                {userName}
                            </Text>
                            ? This action cannot be undone and will disable their access immediately.
                        </Text>
                    </Stack>
                </Stack>

                {/* Footer */}
                <Box px={32} pt={8} pb={28}>
                    <Group grow gap={12}>
                        <Button
                            variant="default"
                            size="md"
                            radius="md"
                            disabled={loading}
                            onClick={onClose}
                            styles={{
                                root: {
                                    borderColor: 'var(--mantine-color-default-border)',
                                    color: 'var(--mantine-color-text)',
                                    fontWeight: 600,
                                },
                            }}
                        >
                            Cancel
                        </Button>

                        <Button
                            color="red"
                            size="md"
                            radius="md"
                            loading={loading}
                            leftSection={!loading && <Trash size="sm" />}
                            onClick={onConfirm}
                            styles={{
                                root: {
                                    backgroundColor: 'var(--mantine-color-red-6)',
                                    fontWeight: 600,
                                },
                            }}
                        >
                            Delete User
                        </Button>
                    </Group>
                </Box>
            </Stack>
        </Modal>
    );
}