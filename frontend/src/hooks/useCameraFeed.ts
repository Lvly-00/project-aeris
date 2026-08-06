/**
 * useCameraFeed — manages stream URL state and retry logic for HTTP/MP4 feeds.
 * Extracted from CameraFeed so the state logic is testable independently.
 */
import { useState, useRef, useEffect } from 'react';

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

  const buildStreamUrl = () => {
    const token = localStorage.getItem('access_token');
    return `/api/cameras/${cameraId}/stream/?token=${encodeURIComponent(token || '')}`;
  };

  useEffect(() => {
    setStreamUrl(buildStreamUrl());
    retryRef.current = 0;
    setHasError(false);
    setErrorMsg('');
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
      setTimeout(() => setStreamUrl(buildStreamUrl()), 1000 * retryRef.current);
    } else {
      setHasError(true);
      setErrorMsg(details);
    }
  };

  const retry = () => {
    retryRef.current = 0;
    setHasError(false);
    setErrorMsg('');
    setStreamUrl(buildStreamUrl());
  };

  return { streamUrl, hasError, errorMsg, handleError, retry };
}
