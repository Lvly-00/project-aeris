import React from 'react';
import { Modal, Text, Group, Button } from '@mantine/core';

interface DeleteUserModalProps {
    opened: boolean;
    onClose: () => void;
    onConfirm: () => void;
    userName: string;
    loading: boolean;
}

export function DeleteUserModal({ opened, onClose, onConfirm, userName, loading }: DeleteUserModalProps) {
    return (
        <Modal opened={opened} onClose={onClose} title="Confirm Delete" centered size="sm">
            <Text size="sm" mb="lg">
                Are you sure you want to delete <b>{userName}</b>? This action cannot be undone and will disable their access immediately.
            </Text>
            <Group justify="flex-end">
                <Button variant="default" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button color="red" onClick={onConfirm} loading={loading}>Delete User</Button>
            </Group>
        </Modal>
    );
}