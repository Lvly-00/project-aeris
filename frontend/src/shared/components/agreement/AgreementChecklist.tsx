import { Checkbox, Divider, Stack, Text } from '@mantine/core';

import { LegalLinkButton } from './LegalLinkButton';

interface AgreementChecklistProps {
  termsChecked: boolean;
  privacyChecked: boolean;
  onTermsChange: (checked: boolean) => void;
  onPrivacyChange: (checked: boolean) => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

/**
 * The acceptance gate: one checkbox per document, then a single row that
 * accepts both. Each policy opens in its own modal on top of this one.
 */
export function AgreementChecklist({
  termsChecked,
  privacyChecked,
  onTermsChange,
  onPrivacyChange,
  onOpenTerms,
  onOpenPrivacy,
}: AgreementChecklistProps) {
  const allChecked = termsChecked && privacyChecked;
  const someChecked = termsChecked || privacyChecked;

  return (
    <Stack gap="md">
      <Checkbox
        color="orange"
        checked={termsChecked}
        onChange={(event) => onTermsChange(event.currentTarget.checked)}
        label={
          <Text component="span" fz="sm">
            I accept the <LegalLinkButton onClick={onOpenTerms}>Terms of Use</LegalLinkButton>
          </Text>
        }
      />

      <Checkbox
        color="orange"
        checked={privacyChecked}
        onChange={(event) => onPrivacyChange(event.currentTarget.checked)}
        label={
          <Text component="span" fz="sm">
            I accept the{' '}
            <LegalLinkButton onClick={onOpenPrivacy}>Privacy Policy</LegalLinkButton>
          </Text>
        }
      />

      <Divider color="var(--mantine-color-default-border)" />

      <Checkbox
        color="orange"
        checked={allChecked}
        indeterminate={!allChecked && someChecked}
        onChange={(event) => {
          const value = event.currentTarget.checked;
          onTermsChange(value);
          onPrivacyChange(value);
        }}
        label={
          <Text fz="sm" fw={600}>
           I agree to everything (Terms and Conditions and Privacy Policy)
          </Text>
        }
      />
    </Stack>
  );
}
