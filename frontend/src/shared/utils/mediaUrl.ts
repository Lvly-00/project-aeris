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
  // Already absolute
  if (/^https?:\/\//i.test(src)) return src;
  const base = (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:8000';
  // Media is served from the server root, so drop any API path (".../api").
  const origin = base.replace(/\/+$/, '').replace(/\/api$/, '');
  // Absolute path: prepend backend origin
  if (src.startsWith('/')) return `${origin}${src}`;
  // Relative path like "media/evidence/..." — add a leading slash then prepend
  return `${origin}/${src}`;
}