export {};

type UpdateStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' | 'current' | 'downloaded'; version?: string }
  | {
      status: 'downloading';
      percent: number;
      transferred?: number;
      total?: number;
      bytesPerSecond?: number;
    }
  | { status: 'error'; message?: string };

declare global {
  interface Window {
    electronAPI?: {
      getBackendUrl: () => string;
      getAiUrl: () => string;
      /** Absolute path of a File chosen via <input type="file">. */
      getPathForFile: (file: File) => string;

      isDesktop: boolean;
      platform: string;

      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onWindowStateChange: (
        callback: (state: { maximized: boolean }) => void
      ) => () => void;

      openDevTools: () => void;

      onNotification: (
        callback: (data: unknown) => void
      ) => void;

      showNotification: (
        title: string,
        body: string
      ) => void;

      getVersion: () => Promise<string>;
      getUpdateStatus: () => Promise<UpdateStatus>;
      checkForUpdates: () => Promise<{
        ok: boolean;
        reason?: string;
        message?: string;
      }>;
      downloadUpdate: () => Promise<{
        ok: boolean;
        reason?: string;
        message?: string;
      }>;
      installUpdate: () => void;
      onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
    };
  }
}