import React from 'react';
import {
  Modal, Stack, Group, TextInput, PasswordInput, Select, Button, Box,
  LoadingOverlay, Title, ActionIcon, Text
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Envelope, Edit, Lock, ShieldAlt, User,  UserPlus, X } from '@boxicons/react';
import PasswordRequirements from '../../../shared/components/PasswordRequirements';
import { validatePassword } from '../../../shared/utils/password';

const ORANGE = '#FF6B00';
const SUBMIT = '#FF5722';

interface UserFormModalProps {
    opened: boolean;
    onClose: () => void;
    onSubmit: (values: any) => Promise<void>;
    initialValues?: any;
    loading: boolean;
    isEdit?: boolean;
    isView?: boolean;
    onEdit?: () => void;
}

export function UserFormModal({ opened, onClose, onSubmit, initialValues, loading, isEdit, isView, onEdit }: UserFormModalProps) {
    const form = useForm({
        initialValues: isView ? { ...(initialValues || {}), password: '', password2: '' } : initialValues || {
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            password2: '',
            role: 'Barangay Tanod',
        },
        validate: {
            email: (val) => (!val ? 'Email is required' : /^\S+@\S+$/.test(val) ? null : 'Invalid email'),
            // Password is only required when creating a new user
            password: (val) => (!isEdit && !isView ? validatePassword(val) : null),
            password2: (val, values) => (!isEdit && !isView && val !== values.password ? 'Passwords do not match' : null),
        },
    });

    // Reset form when modal opens with new data
    React.useEffect(() => {
        if (opened) {
            if (initialValues) form.setValues(initialValues);
            else form.reset();
        }
    }, [opened, initialValues]);

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            withCloseButton={false}
            centered
            radius="lg"
            size="compact-lg"
            padding="xl"
        >
            {/* Custom Header Section */}
            <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap" gap="sm">
                <Group align="center" gap="md" style={{ flex: 1, minWidth: 200 }}>
                    <Box
                        bg={ORANGE}
                        p={10}
                        style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                        {isView ? (
                            <User width={28} height={28} style={{ color: 'white', display: 'block' }} />
                        ) : isEdit ? (
                            <Box style={{ position: 'relative' }}>
                                <User width={28} height={28} style={{ color: 'white', display: 'block' }} />
                                <Box
                                    bg="#ffffff"
                                    style={{
                                        position: 'absolute',
                                        bottom: -3,
                                        right: -3,
                                        width: 15,
                                        height: 15,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Edit width={10} height={10} style={{ color: ORANGE, display: 'block' }} />
                                </Box>
                            </Box>
                        ) : (
                            <UserPlus width={28} height={28} style={{ color: 'white', display: 'block' }} />
                        )}
                    </Box>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Title order={3} fw={700}>{isView ? 'View User Account' : isEdit ? 'Edit User Account' : 'Create New User'}</Title>
                        <Text c="dimmed" fz="sm" fw={400} style={{ maxWidth: 300, lineHeight: 1.4 }}>
                            {isView
                                ? 'Review the account details and role assignment.'
                                : isEdit
                                    ? 'Update the account details and role assignment.'
                                    : 'Enter the new account details and role.'}
                        </Text>
                    </Stack>
                </Group>
                <ActionIcon variant="transparent" color="gray" onClick={onClose} aria-label="Close">
                    <X width={24} height={24} />
                </ActionIcon>
            </Group>
            <hr style={{ border: '0.5px solid #eee', marginBottom: '25px' }} />

            <Box pos="relative">
                <LoadingOverlay visible={loading} />
                <form onSubmit={form.onSubmit(onSubmit)}>
                    <Stack gap="lg">
                        <Group grow>
                            <TextInput
                                label={
                                    <Text size="sm" fw={700} mb={5}>
                                        First Name <span style={{ color: 'red' }}>*</span>
                                    </Text>
                                }
                                placeholder="Juan"
                                {...form.getInputProps('first_name')}
                                radius="md"
                                size="md"
                                readOnly={isView}
                                leftSection={<User width={18} height={18} style={{ color: '#888' }} />}
                                styles={{ input: { border: '1.5px solid #E0E0E0' } }}
                            />
                            <TextInput
                                label={
                                    <Text size="sm" fw={700} mb={5}>
                                        Last Name <span style={{ color: 'red' }}>*</span>
                                    </Text>
                                }
                                placeholder="Dela Cruz"
                                {...form.getInputProps('last_name')}
                                radius="md"
                                size="md"
                                readOnly={isView}
                                leftSection={<User width={18} height={18} style={{ color: '#888' }} />}
                                styles={{ input: { border: '1.5px solid #E0E0E0' } }}
                            />
                        </Group>

                        <TextInput
                            label={
                                <Text size="sm" fw={700} mb={5}>
                                    Email <span style={{ color: 'red' }}>*</span>
                                </Text>
                            }
                            placeholder="juan@example.com"
                            {...form.getInputProps('email')}
                            radius="md"
                            size="md"
                            readOnly={isView}
                            leftSection={<Envelope width={18} height={18} style={{ color: '#888' }} />}
                            styles={{ input: { border: '1.5px solid #E0E0E0' } }}
                        />

                        {!isEdit && !isView && (
                            <Group grow align="flex-start">
                                <Stack gap="sm">
                                    <PasswordInput
                                        label={
                                            <Text size="sm" fw={700} mb={5}>
                                                Password <span style={{ color: 'red' }}>*</span>
                                            </Text>
                                        }
                                        placeholder="Enter password"
                                        {...form.getInputProps('password')}
                                        radius="md"
                                        size="md"
                                        leftSection={<Lock width={18} height={18} style={{ color: '#888' }} />}
                                        styles={{ input: { border: '1.5px solid #E0E0E0' } }}
                                    />
                                    <Box>
                                        <PasswordRequirements password={form.values.password} />
                                    </Box>
                                </Stack>
                                <PasswordInput
                                    label={
                                        <Text size="sm" fw={700} mb={5}>
                                            Confirm Password <span style={{ color: 'red' }}>*</span>
                                        </Text>
                                    }
                                    placeholder="Re-enter password"
                                    {...form.getInputProps('password2')}
                                    radius="md"
                                    size="md"
                                    leftSection={<Lock width={18} height={18} style={{ color: '#888' }} />}
                                    styles={{ input: { border: '1.5px solid #E0E0E0' } }}
                                />
                            </Group>
                        )}

                        <Select
                            label={
                                <Text size="sm" fw={700} mb={5}>
                                    Role <span style={{ color: 'red' }}>*</span>
                                </Text>
                            }
                            placeholder="Select role"
                            data={['CCTV Chief', 'CCTV Operator', 'Barangay Tanod']}
                            {...form.getInputProps('role')}
                            radius="md"
                            size="md"
                            disabled={isView}
                            leftSection={<ShieldAlt width={18} height={18} style={{ color: '#888' }} />}
                            styles={{ input: { border: '1.5px solid #E0E0E0' } }}
                        />

                        {/* Footer Actions */}
                        {isView ? (
                            <Button
                                fullWidth
                                color="orange"
                                radius="md"
                                size="md"
                                h={48}
                                onClick={onEdit}
                            >
                                Edit
                            </Button>
                        ) : (
                            <Group grow mt="lg">
                                <Button
                                    variant="outline"
                                    color="gray"
                                    radius="md"
                                    size="md"
                                    h={48}
                                    onClick={onClose}
                                    styles={{ root: { border: '1.5px solid #E0E0E0', color: '#333' } }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    bg={SUBMIT}
                                    radius="md"
                                    size="md"
                                    h={48}
                                    type="submit"
                                    loading={loading}
                                    styles={{ root: { backgroundColor: SUBMIT } }}
                                >
                                    {isEdit ? 'Update Changes' : 'Create Account'}
                                </Button>
                            </Group>
                        )}
                    </Stack>
                </form>
            </Box>
        </Modal>
    );
}