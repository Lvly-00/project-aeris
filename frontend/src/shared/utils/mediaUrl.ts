/**
 * Resolves backend-relative media paths into absolute URLs.
 *
 * Login/register/2FA payloads used to serialize ImageFields without a request
 * context, producing relative `/media/...` paths that fail to load against
 * the Vite origin. New payloads carry absolute URLs, but this keeps any
 * stale value working.
 */
export function resolveMediaUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/')) {
    const base = (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:8000';
    return `${base.replace(/\/$/, '')}${src}`;
  }
  return src;
}