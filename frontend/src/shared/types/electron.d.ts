export {};

declare global {
  interface Window {
    electronAPI?: {
      getBackendUrl: () => string;
      getAiUrl: () => string;

      isDesktop: boolean;
      platform: string;

      minimize: () => void;
      maximize: () => void;
      close: () => void;

      openDevTools: () => void;

      onNotification: (
        callback: (data: unknown) => void
      ) => void;

      showNotification: (
        title: string,
        body: string
      ) => void;
    };
  }
}