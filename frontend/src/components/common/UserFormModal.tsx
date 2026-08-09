import React from 'react';
import { Modal, Stack, Group, TextInput, PasswordInput, Select, Button, Box, LoadingOverlay } from '@mantine/core';
import { useForm } from '@mantine/form';

interface UserFormModalProps {
    opened: boolean;
    onClose: () => void;
    onSubmit: (values: any) => Promise<void>;
    initialValues?: any;
    zones: { value: string; label: string }[];
    loading: boolean;
    isEdit?: boolean;
}

export function UserFormModal({ opened, onClose, onSubmit, initialValues, zones, loading, isEdit }: UserFormModalProps) {
    const form = useForm({
        initialValues: initialValues || {
            username: '',
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            password2: '',
            role: 'Tanod',
            phone_number: '',
            barangay_zone: null,
        },
        validate: {
            username: (val) => (val.length < 3 ? 'Username too short' : null),
            // Password is only required when creating a new user
            password: (val) => (!isEdit && val.length < 8 ? 'Password must be 8+ characters' : null),
            password2: (val, values) => (!isEdit && val !== values.password ? 'Passwords do not match' : null),
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
        <Modal opened={opened} onClose={onClose} title={isEdit ? "EDIT USER ACCOUNT" : "CREATE NEW USER"} centered size="lg">
            <Box pos="relative">
                <LoadingOverlay visible={loading} />
                <form onSubmit={form.onSubmit(onSubmit)}>
                    <Stack>
                        <Group grow>
                            <TextInput label="First Name" placeholder="Juan" required {...form.getInputProps('first_name')} />
                            <TextInput label="Last Name" placeholder="Dela Cruz" required {...form.getInputProps('last_name')} />
                        </Group>
                        <TextInput label="Username" placeholder="juandelacruz" required disabled={isEdit} {...form.getInputProps('username')} />
                        <TextInput label="Email" placeholder="juan@example.com" {...form.getInputProps('email')} />

                        {!isEdit && (
                            <Group grow>
                                <PasswordInput label="Password" required {...form.getInputProps('password')} />
                                <PasswordInput label="Confirm Password" required {...form.getInputProps('password2')} />
                            </Group>
                        )}

                        <Group grow>
                            <Select label="Role" data={['Admin', 'Operator', 'Tanod']} {...form.getInputProps('role')} />
                            <Select label="Assigned Zone" placeholder="Select Zone" data={zones} clearable {...form.getInputProps('barangay_zone')} />
                        </Group>
                        <TextInput label="Phone Number" placeholder="09XXXXXXXXX" {...form.getInputProps('phone_number')} />

                        <Group justify="flex-end" mt="xl">
                            <Button variant="subtle" onClick={onClose}>Cancel</Button>
                            <Button type="submit" color="#FF6B00">{isEdit ? "Update Changes" : "Create Account"}</Button>
                        </Group>
                    </Stack>
                </form>
            </Box>
        </Modal>
    );
}