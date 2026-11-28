/**
 * useCameraFeed — manages stream URL state and retry logic for HTTP/MP4 feeds.
 * Extracted from CameraFeed so the state logic is testable independently.
 */
import { useState, useRef, useEffect } from 'react';

import { camerasAPI } from '../services/api';

interface UseCameraFeedOptions {
  cameraId: number;
  streamType: string;
}

interface UseCameraFeedResult {
  streamUrl: string;
  hasError: boolean;
  errorMsg: string;
  handleError: (e?: any) => Promise<void>;
  retry: () => void;
}

export function useCameraFeed({ cameraId, streamType }: UseCameraFeedOptions): UseCameraFeedResult {
  const [streamUrl, setStreamUrl] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const retryRef = useRef(0);

  /**
   * A media element cannot send an Authorization header, so the URL carries a
   * ticket that is scoped to this camera and expires in two minutes instead of
   * the account's access token. A copied stream URL is therefore worthless
   * beyond that camera and that window.
   */
  const buildStreamUrl = async (): Promise<string> => {
    // The stream lives on the Django backend. In the PWA/dev this is the same
    // origin behind the Vite/nginx proxy, but in the packaged desktop app the
    // SPA is served by the local AI service, so a relative /api path would hit
    // that origin instead of the backend and 404. Build the absolute URL from
    // the configured backend origin (same source as resolveMediaUrl).
    const base =
      (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:8000';

    try {
      const res = await camerasAPI.streamTicket(cameraId);
      const ticket = res.data?.ticket;
      if (!ticket) return '';
      return `${base.replace(/\/$/, '')}/api/cameras/${cameraId}/stream/?ticket=${encodeURIComponent(ticket)}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    let active = true;
    retryRef.current = 0;
    setHasError(false);
    setErrorMsg('');

    buildStreamUrl().then((url) => {
      if (active) setStreamUrl(url);
    });

    return () => {
      active = false;
    };
  }, [cameraId]);

  const handleError = async (e?: any) => {
    const mediaErr = e?.target?.error;
    let details = mediaErr ? `Code ${mediaErr.code}: ${mediaErr.message}` : 'Unknown error';
    if (!mediaErr && streamUrl) {
      try {
        const res = await fetch(streamUrl);
        if (!res.ok) {
          const body = await res.text();
          try {
            const json = JSON.parse(body);
            details = json.error || json.detail || body;
          } catch {
            details = `${res.status} ${res.statusText}: ${body.slice(0, 200)}`;
          }
        }
      } catch { /* network unreachable */ }
    }
    if (retryRef.current < 2) {
      retryRef.current += 1;
      const attempt = retryRef.current;
      setTimeout(async () => {
        const url = await buildStreamUrl();
        setStreamUrl(url);
      }, 1000 * attempt);
    } else {
      setHasError(true);
      setErrorMsg(details);
    }
  };

  const retry = () => {
    retryRef.current = 0;
    setHasError(false);
    setErrorMsg('');
    buildStreamUrl().then(setStreamUrl);
  };

  return { streamUrl, hasError, errorMsg, handleError, retry };
}
