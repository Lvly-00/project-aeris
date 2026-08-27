import { useState } from 'react';
import { Button } from '@mantine/core';
import { BoltCircle } from '@boxicons/react';
import { incidentsAPI } from '../../../shared/services/api';
import { notifications } from '@mantine/notifications';

interface Props {
  cameras: any[];
}

export function SimulateIncidentBtn({ cameras }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    console.log('[SIMULATE] Button clicked');

    const hasCameras = cameras && cameras.length > 0;

    const randomCam = hasCameras
      ? cameras[Math.floor(Math.random() * cameras.length)]
      : null;

    const payload: any = {
      incident_type:
        Math.random() > 0.5
          ? 'Fire'
          : 'Vehicle_Accident',

      confidence_score: Number(
        (0.75 + Math.random() * 0.2).toFixed(2)
      ),
    };

    if (randomCam) {
      payload.camera_id = randomCam.id;
    }

    console.log('[SIMULATE] Camera:', randomCam);
    console.log('[SIMULATE] Payload:', payload);

    setLoading(true);

    try {
      const response =
        await incidentsAPI.createFromDetection(payload);

      console.log('[SIMULATE] SUCCESS:', response.data);

      notifications.show({
        title: 'Simulation Sent',
        message: randomCam
          ? `Alert generated for ${randomCam.name}`
          : 'Alert generated (simulated)',
        color: 'orange',
        icon: <BoltCircle  width={16} height={16} />,
      });
    } catch (error: any) {
      console.error(
        '[SIMULATE] ERROR:',
        error?.response?.data || error
      );

      notifications.show({
        title: 'Simulation Error',
        message:
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          error?.message ||
          'Failed to create simulated incident',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="filled"
      color="orange"
      leftSection={<BoltCircle  width={ 18 } height={ 18 } fill="white" />}
      onClick={handleSimulate}
      loading={loading}
      // disabled={loading || cameras.length === 0}
      fw={700}
    >
      Simulate Incident
    </Button>
  );
}