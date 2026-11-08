import { useEffect, useState } from 'react';
import { Box, Button, Container, Stack, Text, Title, rem } from '@mantine/core';
import { authAPI } from '../../shared/services/api';
import { useAuth } from '../../shared/hooks/useAuth';
import type { User } from '../../shared/types';
import EditProfileModal from '../../shared/components/profile/EditNameModal';
import ChangePasswordModal from '../../shared/components/profile/ChangePasswordModal';
import ChangeEmailModal from '../../shared/components/profile/ChangeEmailModal';
import VerificationCodeModal from '../../shared/components/VerificationCodeModal';
import NotificationPermissionModal from '../../shared/components/NotificationPermissionModal';
import TermsAndConditionsModal from '../../shared/components/TermsAndConditionsModal';
import PrivacyPolicyModal from '../../shared/components/PrivacyPolicyModal';
import ProfileIdentityCard from '../components/profile/ProfileIdentityCard';
import PersonalInformationSection from '../components/profile/PersonalInformationSection';
import PreferencesSection from '../components/profile/PreferencesSection';
import LegalSection from '../components/profile/LegalSection';
import ProfileSkeleton from '../components/profile/ProfileSkeleton';
import { LogoutConfirmModal } from '../components/profile/LogoutConfirmModal';
import { useProfileAccent } from '../components/profile/profileTheme';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const { logout, setUser: setAuthUser } = useAuth();
  const { accent } = useProfileAccent();

  const [editOpened, setEditOpened] = useState(false);
  const [passwordOpened, setPasswordOpened] = useState(false);
  const [emailOpened, setEmailOpened] = useState(false);
  const [twoFAModalOpened, setTwoFAModalOpened] = useState(false);
  const [twoFAIntent, setTwoFAIntent] = useState<'enable' | 'disable'>('enable');
  const [notifConsentOpened, setNotifConsentOpened] = useState(false);
  const [notifConfirming, setNotifConfirming] = useState(false);
  const [logoutOpened, setLogoutOpened] = useState(false);
  const [termsOpened, setTermsOpened] = useState(false);
  const [privacyOpened, setPrivacyOpened] = useState(false);

  const fetchProfile = () => {
    authAPI
      .getProfile()
      .then((res) => setUser(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (field: string, value: unknown) => {
    setUpdating(true);
    try {
      const res = await authAPI.updateProfile({ [field]: value });
      setUser(res.data);
      setAuthUser(res.data);
    } catch (err) {
      console.error('Update failed', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleNotificationToggle = (checked: boolean) => {
    if (checked) {
      // Ask for consent first, like every website does
      setNotifConsentOpened(true);
      return;
    }
    // Turning off takes effect immediately
    handleUpdate('receive_notifications', false);
  };

  const handleNotificationConfirm = async () => {
    setNotifConfirming(true);
    try {
      const res = await authAPI.updateProfile({ receive_notifications: true });
      setUser(res.data);
      setAuthUser(res.data);
      setNotifConsentOpened(false);
    } catch (err) {
      console.error('Update failed', err);
    } finally {
      setNotifConfirming(false);
    }
  };

  const handlePictureUpload = async (file: File) => {
    setPhotoError(null);

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setPhotoError('That file type isn’t supported. Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('That photo is larger than 5 MB. Choose a smaller file.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);
      const res = await authAPI.updateProfile(formData);
      setUser(res.data);
      setAuthUser(res.data);
    } catch (err) {
      console.error('Upload failed', err);
      setPhotoError('Couldn’t upload your photo. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const openTwoFactorModal = () => {
    setTwoFAIntent(user?.two_factor_enabled ? 'disable' : 'enable');
    setTwoFAModalOpened(true);
  };

  if (!user) {
    return <ProfileSkeleton />;
  }

  return (
    <>
      <Container size="xs" py={{ base: 'md', sm: 'lg' }} px={0}>
        <Box mb="lg">
          <Title
            order={1}
            fz={{ base: rem(28), sm: rem(32) }}
            fw={700}
            lh={1.15}
            style={{ letterSpacing: rem(-1) }}
          >
            Profile
          </Title>
          <Text fz={{ base: 'sm', sm: 'md' }} c="dimmed" lh={1.5} mt={6}>
            Manage your details, account security, and preferences.
          </Text>
        </Box>

        <Stack gap="md">
          <ProfileIdentityCard
            user={user}
            uploading={uploading}
            photoError={photoError}
            onPictureSelect={handlePictureUpload}
          />

          <PersonalInformationSection
            user={user}
            onEditName={() => setEditOpened(true)}
            onChangeEmail={() => setEmailOpened(true)}
            onChangePassword={() => setPasswordOpened(true)}
          />

          <PreferencesSection
            user={user}
            updating={updating}
            onNotificationToggle={handleNotificationToggle}
            onTwoFactorClick={openTwoFactorModal}
            onLanguageChange={(language) => handleUpdate('preferred_language', language)}
          />

          <LegalSection
            onTermsClick={() => setTermsOpened(true)}
            onPrivacyClick={() => setPrivacyOpened(true)}
          />

          <Button
            fullWidth
            variant="light"
            color="orange"
            size="md"
            radius="md"
            mt="xs"
            onClick={() => setLogoutOpened(true)}
          >
            <span style={{ fontWeight: 600, color: accent }}>Log out</span>
          </Button>
        </Stack>
      </Container>

      <EditProfileModal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        user={{ first_name: user.first_name, last_name: user.last_name }}
        onUpdated={(updated) => setUser((prev) => prev ? { ...prev, ...updated } : prev)}
      />

      <ChangePasswordModal
        opened={passwordOpened}
        onClose={() => setPasswordOpened(false)}
      />

      <ChangeEmailModal
        opened={emailOpened}
        onClose={() => setEmailOpened(false)}
        currentEmail={user.email}
        onEmailChanged={fetchProfile}
      />

      <NotificationPermissionModal
        opened={notifConsentOpened}
        onClose={() => setNotifConsentOpened(false)}
        onConfirm={handleNotificationConfirm}
        confirming={notifConfirming}
      />

      <VerificationCodeModal
        opened={twoFAModalOpened}
        onClose={() => setTwoFAModalOpened(false)}
        email={user.email}
        onSendCode={async () => { await authAPI.send2FACode(); }}
        onVerify={async (code) => { await authAPI.verify2FACode(code); }}
        onVerified={fetchProfile}
        title="Confirm it's you"
        subtitle={twoFAIntent === 'disable' ? '2FA has been disabled.' : '2FA has been enabled. You will need to verify your identity on future logins.'}
        verifyLabel={twoFAIntent === 'disable' ? 'Disable 2FA' : 'Enable 2FA'}
      />

      <LogoutConfirmModal
        opened={logoutOpened}
        onClose={() => setLogoutOpened(false)}
        onConfirm={logout}
      />

      <TermsAndConditionsModal opened={termsOpened} onClose={() => setTermsOpened(false)} />
      <PrivacyPolicyModal opened={privacyOpened} onClose={() => setPrivacyOpened(false)} />
    </>
  );
}
