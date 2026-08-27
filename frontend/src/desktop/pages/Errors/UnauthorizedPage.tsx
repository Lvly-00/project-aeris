import {
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Box,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlt } from '@boxicons/react';

const PRIMARY = '#FA5401';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  const handleReturn = () => {
    navigate('/cameras');
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--mantine-color-body)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <Container
        size="md"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack
          align="center"
          gap={0}
          style={{
            width: '100%',
            paddingTop: 60,
            paddingBottom: 40,
          }}
        >
          {/* =================================================
              401 ERROR NUMBER
          ================================================= */}
          <Box
            style={{
              position: 'relative',
              width: '100%',
              height: 250,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            {/* Large faded background 401 */}
            <Text
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -52%)',
                fontSize: 'clamp(150px, 22vw, 230px)',
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.08em',
                color: PRIMARY,
                opacity: 0.07,
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              401
            </Text>

            {/* Main 401 */}
            <Text
              aria-label="Error 401"
              style={{
                position: 'relative',
                zIndex: 1,
                fontSize: 'clamp(105px, 15vw, 160px)',
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.08em',
                color: PRIMARY,
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              401
            </Text>
          </Box>

          {/* =================================================
    TITLE
================================================= */}
          <Title
            order={1}
            ta="center"
            style={{
              color: 'var(--mantine-color-text)',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 750,
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Administrator Access Required
          </Title>

          {/* =================================================
    DESCRIPTION
================================================= */}
          <Stack
            align="center"
            gap={5}
            style={{
              marginTop: 14,
            }}
          >
            <Text
              ta="center"
              style={{
                color: 'var(--mantine-color-dimmed)',
                fontSize: 17,
                lineHeight: 1.5,
              }}
            >
              This area is restricted to authorized administrators.
            </Text>

            <Text
              ta="center"
              style={{
                color: 'var(--mantine-color-dimmed)',
                fontSize: 17,
                lineHeight: 1.5,
              }}
            >
              Your account does not have permission to access this page.
            </Text>
          </Stack>

          {/* =================================================
    ACTION BUTTON
================================================= */}
          <Button
            size="md"
            radius="sm"
            leftSection={<ArrowLeft  width={ 18 } height={ 18 } strokeWidth={2.5} />}
            onClick={handleReturn}
            style={{
              marginTop: 30,
              minWidth: 235,
              height: 48,
              backgroundColor: '#FA5401',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.02em',
              boxShadow: '0 4px 12px rgba(250, 84, 1, 0.18)',
            }}
            styles={{
              root: {
                '&:hover': {
                  backgroundColor: '#E94D00',
                },
              },
            }}
          >
            RETURN TO MONITORING
          </Button>

          {/* =================================================
    SECURITY LABEL
================================================= */}
          <Group
            gap={7}
            style={{
              marginTop: 22,
            }}
          >
            <ShieldAlt
               width={15} height={15}
              strokeWidth={2}
              color="#FA5401"
            />

            <Text
              style={{
                color: 'var(--mantine-color-dimmed)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
              }}
            >
              AERIS • ADMINISTRATOR ACCESS ONLY
            </Text>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}