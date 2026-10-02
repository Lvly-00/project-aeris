import { useState } from 'react';
import { Button } from '@mantine/core';
import { BoltCircle } from '@boxicons/react';
import { incidentsAPI } from '../../../shared/services/api';
import { notifications } from '@mantine/notifications';

interface Props {
  cameras: any[];
}

const INCIDENT_TYPES = ['Fire', 'Smoke', 'Vehicle_Accident'];

const TYPE_LABEL: Record<string, string> = {
  Fire: 'Fire',
  Smoke: 'Smoke',
  Vehicle_Accident: 'Vehicular Accident',
};

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const hasCamera = (cameras?: any[]) => !!cameras && cameras.length > 0;

/**
 * Fires a test incident so the notification, the camera row and the detection
 * review list can be exercised end to end.
 *
 * Still random by design, but kept in step with the current rules:
 *  - any of the three incident types, so the type badges can be checked
 *  - a short burst of hits, so there is more than one row to tick or cross
 *  - sent as a simulation, which never joins a camera's live incident and so
 *    cannot mask a real detection while you are testing
 */
export function SimulateIncidentBtn({ cameras }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    const hasCameras = cameras && cameras.length > 0;
    const randomCam = hasCameras ? pick(cameras) : null;
    const incidentType = pick(INCIDENT_TYPES);
    const confidence = Number((0.75 + Math.random() * 0.2).toFixed(2));
    const repeat = 1 + Math.floor(Math.random() * 3);

    setLoading(true);

    try {
      const response = await incidentsAPI.createFromDetection({
        incident_type: incidentType,
        confidence_score: confidence,
        camera_id: randomCam?.id,
        source: 'simulation',
        repeat,
      });

      const created = response.data;
      const shown = created.detection_count ?? 1;

      notifications.show({
        title: 'Simulation Sent',
        message: randomCam
          ? `${TYPE_LABEL[incidentType] ?? incidentType} on ${randomCam.name} — ${shown} detection${
              shown === 1 ? '' : 's'
            } to review`
          : `${TYPE_LABEL[incidentType] ?? incidentType} (no camera selected)`,
        color: 'orange',
        icon: <BoltCircle  width={16} height={16} />,
      });
    } catch (error: any) {
      console.error('[SIMULATE] ERROR:', error?.response?.data || error);

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
      disabled={loading || !hasCamera(cameras)}
      fw={700}
    >
      Simulate Incident
    </Button>
  );
}
