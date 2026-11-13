/* ==================================================================
   CivicWave server client.

   The website is served by the CivicWave server, so every call goes to
   the same origin. To host the page somewhere else, define
   window.CIVIC_API_BASE = "https://server.example.az" before this file.

   Reports, photos and their history live in the server's database.
   Changes arrive as Server-Sent Events; the page then reloads the list.
   ================================================================== */
(function () {
  'use strict';

  const BASE = String(window.CIVIC_API_BASE || '').replace(/\/+$/, '');

  class ApiError extends Error {
    constructor(status, code, message) {
      super(message || code);
      this.status = status;
      this.code = code;
    }
  }

  async function request(method, path, { json, form } = {}) {
    const init = { method, credentials: BASE ? 'include' : 'same-origin', cache: 'no-store', headers: {} };
    if (json !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(json);
    } else if (form) {
      init.body = form;
    }
    let res;
    try {
      res = await fetch(BASE + path, init);
    } catch {
      throw new ApiError(0, 'offline', 'Serverlə əlaqə qurulmadı');
    }
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      throw new ApiError(res.status, (body && body.error) || `http_${res.status}`, (body && body.message) || 'Sorğu alınmadı');
    }
    return body || {};
  }

  function form(fields, files) {
    const fd = new FormData();
    for (const [key, value] of Object.entries(fields || {})) {
      if (value == null) continue;
      fd.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    for (const [key, file] of Object.entries(files || {})) {
      if (file) fd.append(key, file, file.name || `${key}.jpg`);
    }
    return fd;
  }

  /** Photo paths come back relative ("/uploads/…"); make them absolute only when
   *  the page is hosted away from the server. */
  function url(path) {
    if (!path) return null;
    if (/^(https?:|data:|blob:)/.test(path)) return path;
    return BASE + path;
  }

  /**
   * Live updates. `onChange` runs after every change on the server (and after each
   * reconnect, since changes may have been missed while away); `onState` gets
   * "live" or "offline". The browser reconnects on its own.
   */
  function subscribe({ onChange, onState }) {
    if (!window.EventSource) {
      onState('offline');
      const t = setInterval(() => onChange({ kind: 'poll' }), 15000);
      return () => clearInterval(t);
    }
    const source = new EventSource(BASE + '/api/events', { withCredentials: Boolean(BASE) });
    source.addEventListener('hello', () => {
      onState('live');
      onChange({ kind: 'hello' });
    });
    source.addEventListener('change', (event) => {
      let data = {};
      try {
        data = JSON.parse(event.data);
      } catch {
        /* keep the empty object */
      }
      onChange(data);
    });
    source.onerror = () => onState('offline');
    return () => source.close();
  }

  window.CivicAPI = {
    ApiError,
    url,
    subscribe,
    meta: () => request('GET', '/api/meta'),
    login: (key) => request('POST', '/api/session', { json: { key } }),
    logout: () => request('DELETE', '/api/session'),
    reports: () => request('GET', '/api/reports'),
    feedbacks: () => request('GET', '/api/feedbacks'),
    patch: (id, body) => request('PATCH', `/api/reports/${encodeURIComponent(id)}`, { json: body }),
    proof: (id, { before, after, actor }) =>
      request('POST', `/api/reports/${encodeURIComponent(id)}/proof`, { form: form({ actor }, { before, after }) }),
    resolve: (id, { photo, actor, verdict }) =>
      request('POST', `/api/reports/${encodeURIComponent(id)}/resolve`, { form: form({ actor, verdict }, { photo }) }),
    verifyFix: (id, photo) =>
      request('POST', `/api/reports/${encodeURIComponent(id)}/verify-fix`, { form: form({}, { photo }) }),
    /** HarAI for staff: { mode: 'staff', messages: [{ role, text }], context } -> { reply } */
  };
})();
