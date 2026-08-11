export const APP_TARGET =
    import.meta.env.VITE_APP_TARGET || 'pwa';

export const isDesktopApp =
    APP_TARGET === 'desktop';

export const isPwa =
    APP_TARGET === 'pwa';