// Paste this into DevTools Console (F12 -> Console) while on the AERIS site.
// It only reads your current page/session and prints results locally. Nothing is sent anywhere.
(async () => {
  const out = { when: new Date().toISOString(), page: location.href };

  // 1) What does the site store client-side?
  out.storages = {};
  for (const n of ['localStorage', 'sessionStorage']) {
    try {
      const s = window[n];
      out.storages[n] = Object.keys(s).map(k => {
        const v = s.getItem(k) || '';
        return {
          key: k,
          chars: v.length,
          looksLikeJWT: /^eyJ[A-Za-z0-9_-]+\./.test(v),
          masked: v.length > 20 ? v.slice(0, 10) + '…' + v.slice(-6) : v
        };
      });
    } catch (e) { out.storages[n] = 'blocked: ' + e.message; }
  }

  // 2) Cookies visible to JavaScript (HttpOnly cookies will not appear - that is good).
  out.jsCookies = document.cookie ? document.cookie.split(';').map(c => c.trim().split('=')[0]) : [];

  // 3) Third-party origins loaded by this page (where data could flow to).
  const nodes = [...document.querySelectorAll('script[src],link[href],img[src],iframe[src],source[src]')];
  out.thirdPartyOrigins = [...new Set(nodes
    .map(e => e.src || e.href).filter(Boolean)
    .map(u => { try { return new URL(u, location.href).origin; } catch { return null; } })
    .filter(o => o && o !== location.origin))];

  // 4) PII-looking text currently rendered on screen.
  const txt = document.body ? (document.body.innerText || '') : '';
  out.renderedPII = {
    emails: [...new Set(txt.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || [])].slice(0, 10),
    phones: [...new Set(txt.match(/\+?\d[\d\-\s]{7,}\d/g) || [])].slice(0, 10)
  };

  // 5) Probe public endpoints with GET only, no credentials sent.
  const api = 'https://project-aeris.onrender.com';
  const paths = [
    '/api/schema/', '/api/docs/', '/api/redoc/', '/admin/', '/api/health/',
    '/internal/cameras/list/', '/api/ai/incidents/create/'
  ];
  out.probes = {};
  for (const p of paths) {
    try {
      const r = await fetch(api + p, { method: 'GET', credentials: 'omit' });
      const b = (await r.text()).slice(0, 200).replace(/\s+/g, ' ');
      out.probes[p] = {
        status: r.status,
        type: r.headers.get('content-type'),
        sensitiveWords: /password|secret|api[_-]?key|token/i.test(b),
        preview: b
      };
    } catch (e) { out.probes[p] = { error: String(e) }; }
  }

  // 6) Verdicts
  const verdicts = [];
  for (const n of ['localStorage', 'sessionStorage']) {
    const s = out.storages[n];
    if (Array.isArray(s) && s.some(x => x.looksLikeJWT)) {
      verdicts.push('JWT stored in ' + n + ' - XSS would be able to steal the session');
    }
  }
  if (out.probes['/internal/cameras/list/']?.status === 200) verdicts.push('INTERNAL ENDPOINT IS PUBLIC');
  if (out.probes['/api/schema/']?.status === 200) verdicts.push('API schema is publicly readable');
  if (out.probes['/admin/']?.status === 200) verdicts.push('Django admin is publicly reachable');
  if (out.renderedPII.emails.length || out.renderedPII.phones.length) verdicts.push('PII visible in rendered DOM');
  out.verdicts = verdicts.length ? verdicts : ['No obvious client-side leaks found'];

  console.table(out.storages);
  console.table(out.probes);
  console.log('AERIS data-leak check:', out);
  return out;
})();
