import { Modal, Stack, Text, ScrollArea, Box, Group, Title, ActionIcon, Button, Image } from '@mantine/core';

export interface PrivacyPolicyModalProps {
  opened: boolean;
  onClose: () => void;
  onAcknowledge?: () => void;
}

const INTRO = `Effective Date: August 30, 2026

AERIS (AI-Assisted Emergency Response and Incident Surveillance System) is a public-safety monitoring system developed to assist Barangay Sampaloc, Apalit, Pampanga, in monitoring and managing selected incidents through authorized CCTV cameras and AI-assisted analysis.

This Privacy Policy explains how AERIS collects, uses, stores, and protects information processed through the system. It also establishes the responsibilities of authorized users in handling CCTV footage, incident records, and other information that may contain personal data.`;

const SECTIONS = [
  {
    title: '1. Information Collected and Processed',
    body: `AERIS processes information necessary for its public-safety and incident management functions. Depending on the system's configuration, this may include:

CCTV Footage. Video captured by authorized IP-based CCTV cameras installed in designated areas of the barangay. The footage may contain images of individuals, vehicles, and activities within the cameras' coverage areas.

Incident Records. Information generated or recorded during incident detection and management, including the type of incident, date and time, location, incident status, AI-generated detection results, verification status, and response-related details.

User Account Information. Information needed to manage authorized system accounts, including user names or identifiers, account credentials, assigned roles, access permissions, and system activity logs.`,
  },
  {
    title: '2. Purpose of Data Processing',
    body: `Information processed through AERIS is used solely to support authorized public-safety operations and incident management within Barangay Sampaloc. These activities include monitoring designated CCTV cameras, identifying potential incidents, recording and verifying reported events, assisting personnel in reviewing incidents, monitoring response activities, and maintaining system security records.

The system must not be used to access, collect, or use information for unauthorized personal purposes or activities unrelated to its intended functions.`,
  },
  {
    title: '3. Legal Basis and Compliance',
    body: `The collection and processing of personal information through AERIS shall be carried out in accordance with applicable Philippine laws and regulations, including the Data Privacy Act of 2012 (Republic Act No. 10173), its implementing rules and regulations, and applicable guidelines issued by the National Privacy Commission.

CCTV operations and the handling of recorded footage shall also comply with applicable privacy, transparency, security, and data-protection requirements.

The responsible barangay authority shall ensure that appropriate policies and procedures are established for the lawful operation and use of the system.`,
  },
  {
    title: '4. Human Verification of AI-Generated Detections',
    body: `AERIS uses AI-assisted analysis to identify potential public-safety incidents. However, an AI-generated detection does not automatically constitute a confirmed incident.

Authorized personnel must review and verify relevant information before a detection is treated as confirmed or used as the basis for operational action. The system is intended to assist human decision-making and does not replace the judgment and responsibility of authorized personnel.`,
  },
  {
    title: '5. Data Minimization and Access Control',
    body: `AERIS shall process only information reasonably necessary to carry out its intended functions. Access to CCTV footage, incident records, and administrative features shall be limited to personnel whose assigned duties require such access.

Each user shall be granted permissions appropriate to their role. Users must not access records, cameras, or system functions beyond their authorized responsibilities.`,
  },
  {
    title: '6. Access, Use, and Disclosure of Information',
    body: `Information processed through AERIS shall be accessible only to authorized personnel for legitimate and approved purposes.

Users must not copy, download, photograph, record, transmit, publish, or disclose CCTV footage, screenshots, incident records, or other system information to unauthorized persons or organizations.

Any disclosure or release of information must have proper authorization and a lawful basis, consistent with applicable laws and established barangay procedures.`,
  },
  {
    title: '7. Data Retention and Disposal',
    body: `CCTV footage, incident records, system logs, and other information shall be retained only for the period necessary to fulfill their legitimate operational, security, legal, or administrative purposes.

The responsible barangay authority shall establish appropriate retention periods, taking into account applicable legal requirements and operational needs. When information is no longer required and no legal obligation requires its continued retention, it shall be securely deleted, destroyed, or otherwise disposed of in accordance with approved procedures.`,
  },
  {
    title: '8. Data Security',
    body: `AERIS shall implement appropriate organizational, physical, and technical safeguards to protect information against unauthorized access, disclosure, alteration, loss, or destruction.

Depending on the system's configuration, these safeguards may include user authentication, role-based access controls, secure account management, activity logging, restricted administrative privileges, network security measures, and appropriate application security controls.

Authorized users are responsible for protecting their account credentials and promptly reporting any suspected security weakness or unauthorized system activity.`,
  },
  {
    title: '9. Privacy of Individuals Captured by CCTV',
    body: `CCTV cameras may capture individuals who are not involved in any reported incident. Their images and other identifiable information must be handled with due care and respect for their privacy.

Authorized personnel shall not access, use, or disclose CCTV footage for personal interest, entertainment, harassment, unauthorized surveillance, or any other purpose inconsistent with the system's intended public-safety functions.

All users are expected to observe confidentiality and follow the applicable rules governing CCTV monitoring and the handling of personal information.`,
  },
  {
    title: '10. Rights of Data Subjects',
    body: `Individuals whose personal information is processed through AERIS may exercise the rights available to them under applicable data-protection laws, subject to lawful limitations and the circumstances of the processing.

Requests or concerns relating to personal information shall be directed to the designated barangay privacy or data-protection authority. Requests shall be reviewed and handled in accordance with applicable legal requirements and established procedures.`,
  },
  {
    title: '11. Reporting Security Incidents and Data Breaches',
    body: `Any suspected unauthorized access, disclosure, loss, alteration, or misuse of information processed through AERIS must be reported immediately to the system administrator and the appropriate barangay authority.

Reported incidents shall be assessed and addressed through established security and incident-management procedures. Where required by law, the responsible authority shall comply with applicable personal data breach management, documentation, and notification requirements.`,
  },
  {
    title: '12. Amendments to This Privacy Policy',
    body: `This Privacy Policy may be revised when necessary to reflect changes in the AERIS system, barangay procedures, operational requirements, or applicable laws and regulations.

The latest approved version shall be made available to authorized users. Users are responsible for observing the current policy and any related rules governing the use of AERIS.`,
  },
  {
    title: '13. Contact Information',
    body: `For questions, requests, or concerns regarding this Privacy Policy or the processing of personal information through AERIS, individuals may contact the designated barangay administrator or privacy/data-protection authority.`,
  },
];

const FOOTER = `Project AERIS
Barangay Sampaloc, Apalit, Pampanga
For authorized barangay use only.`;

export default function PrivacyPolicyModal({ opened, onClose, onAcknowledge }: PrivacyPolicyModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false} 
      centered
      size="lg"
      radius="lg"
      padding="xl"
    >
      {/* Header Section */}
      <Group justify="space-between" align="flex-start" mb="xs">
        <Group align="center" gap="md">
          <Image src="/icon.png" alt="Aeris Logo" w={90} />
          <Stack gap={2}>
            <Title order={3} fw={700}>Privacy Policy</Title>
            <Text size="sm" c="dimmed">
              Read how we handle and protect your information.
            </Text>
          </Stack>
        </Group>
        <ActionIcon variant="transparent" color="gray" onClick={onClose}>
          <i className='bx bx-x' style={{ fontSize: '24px' }}></i>
        </ActionIcon>
      </Group>

      <hr style={{ border: '0.5px solid #eee', marginBottom: '20px' }} />

      {/* Main Content Area */}
      <ScrollArea.Autosize mah="50vh" mx={-10} px={20} type="hover">
        <Stack gap="lg" >
          <Text size="md" c="dimmed" lh={1.6} style={{ whiteSpace: 'pre-line', textAlign: 'justify' }}>
            {INTRO}
          </Text>

          {SECTIONS.map((s) => (
            <Box key={s.title}>
              <Text size="md" fw={700} mb={4} style={{ color: 'var(--mantine-color-text)' }}>
                {s.title}
              </Text>
              <Text size="md" c="dimmed" lh={1.6} style={{ whiteSpace: 'pre-line', textAlign: 'justify' }}>
                {s.body}
              </Text>
            </Box>
          ))}

          <Text size="md" c="dimmed" lh={1.6} style={{ whiteSpace: 'pre-line', textAlign: 'justify' }}>
            {FOOTER}
          </Text>
        </Stack>
      </ScrollArea.Autosize>

      {/* Footer Action */}
      <Box mt="xl">
        {onAcknowledge ? (
          <Button
            fullWidth
            bg="#FF5722"
            radius="md"
            size="md"
            h={48}
            onClick={onAcknowledge}
            styles={{ root: { backgroundColor: '#FF5722' } }}
          >
            I Understand
          </Button>
        ) : (
          <Button
            fullWidth
            variant="default"
            radius="md"
            size="md"
            h={48}
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </Box>
    </Modal>
  );
}