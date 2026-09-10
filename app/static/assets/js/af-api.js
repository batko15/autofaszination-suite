/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — API-Client (REST /api/v1)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};

(function () {
  'use strict';

  const API = '/api/v1';
  const TOKEN_KEY = 'af_token';
  const EMPLOYEE_KEY = 'af_employee';

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function getStoredEmployee() {
    try { return JSON.parse(localStorage.getItem(EMPLOYEE_KEY) || 'null'); }
    catch { return null; }
  }
  function setSession(token, employee) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(employee));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMPLOYEE_KEY);
  }

  async function request(method, path, body, isForm) {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (body && !isForm) headers['Content-Type'] = 'application/json';

    let res;
    try {
      res = await fetch(API + path, {
        method,
        headers,
        body: body === null || body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
      });
    } catch {
      throw new Error('Keine Verbindung zum Server — läuft der Server? (start.bat / start.sh)');
    }

    if (res.status === 401) {
      clearSession();
      window.dispatchEvent(new CustomEvent('af:logout'));
      throw new Error('Sitzung abgelaufen — bitte neu anmelden.');
    }
    if (!res.ok) {
      let detail = 'HTTP ' + res.status;
      try {
        const data = await res.json();
        if (typeof data.detail === 'string') detail = data.detail;
        else if (Array.isArray(data.detail)) detail = data.detail.map(d => d.msg || d).join('; ');
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    /* 204 No Content */
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res;
  }

  function toQuery(params) {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') q.set(k, v);
    });
    const s = q.toString();
    return s ? '?' + s : '';
  }

  /* PDF-Download mit Authorization-Header → Blob → Browser-Download */
  async function downloadPdf(quoteId, refNumber) {
    const res = await fetch(API + '/quotes/' + quoteId + '/pdf', {
      headers: { 'Authorization': 'Bearer ' + getToken() },
    });
    if (!res.ok) {
      let detail = 'PDF konnte nicht geladen werden (HTTP ' + res.status + ').';
      try {
        const data = await res.json();
        if (data && data.detail) detail = data.detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Offerte_' + refNumber + '_AutoFaszination.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }

  /* CSV-Download aus Array von Objekten */
  function downloadCsv(filename, rows) {
    if (!rows || !rows.length) return;
    const cols = Object.keys(rows[0]);
    const esc = v => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = [cols.join(';')].concat(rows.map(r => cols.map(c => esc(r[c])).join(';'))).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  AFN.api = {
    login: (username, password) => request('POST', '/auth/login', { username, password }),
    me: () => request('GET', '/auth/me'),

    vehicles: params => request('GET', '/vehicles' + toQuery(params)),
    brands: () => request('GET', '/vehicles/brands'),

    calculatePerformance: payload => request('POST', '/calculate-performance', payload),
    generateQuote: payload => request('POST', '/generate-quote', payload),
    quotes: params => request('GET', '/quotes' + toQuery(params)),
    quote: id => request('GET', '/quotes/' + id),
    patchQuote: (id, payload) => request('PATCH', '/quotes/' + id, payload),
    downloadPdf,

    customers: params => request('GET', '/customers' + toQuery(params)),
    customer: id => request('GET', '/customers/' + id),
    customerQuotes: id => request('GET', '/customers/' + id + '/quotes'),
    createCustomer: payload => request('POST', '/customers', payload),
    patchCustomer: (id, payload) => request('PATCH', '/customers/' + id, payload),

    partners: params => request('GET', '/partners' + toQuery(params)),
    partnerStats: () => request('GET', '/partners/stats'),
    routePartners: (zip, brand) => request('POST', '/partners/route', { zip, brand }),
    patchPartner: (id, payload) => request('PATCH', '/partners/' + id, payload),

    followups: params => request('GET', '/followups' + toQuery(params)),
    patchFollowup: (id, done) => request('PATCH', '/followups/' + id, { done }),

    appointments: params => request('GET', '/appointments' + toQuery(params)),
    createAppointment: payload => request('POST', '/appointments', payload),
    patchAppointment: (id, status) => request('PATCH', '/appointments/' + id, { status }),

    invoices: () => request('GET', '/invoices'),
    patchInvoice: (id, payload) => request('PATCH', '/invoices/' + id, payload),

    workshop: () => request('GET', '/workshop'),
    patchWorkshop: (id, payload) => request('PATCH', '/workshop/' + id, payload),

    reports: () => request('GET', '/reports'),
    search: q => request('GET', '/search' + toQuery({ q })),

    dashboardStats: () => request('GET', '/dashboard/stats'),
    settings: () => request('GET', '/settings'),
    employees: () => request('GET', '/settings/employees'),
    createEmployee: payload => request('POST', '/settings/employees', payload),
    patchEmployee: (id, payload) => request('PATCH', '/settings/employees/' + id, payload),

    importFile: (kind, file) => {
      const form = new FormData();
      form.append('file', file);
      return request('POST', '/import/' + kind, form, true);
    },

    downloadCsv,
    getToken, getStoredEmployee, setSession, clearSession,
  };
})();
