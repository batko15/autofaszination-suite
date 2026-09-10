/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — App-Router & Bootstrap
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};

(function () {
  'use strict';

  const { icons, el, els, html, roleLabel, initials, esc } = AFN.ui;
  const api = AFN.api;

  const ROUTES = [
    { hash: '#/cockpit',       view: 'cockpit',       label: 'Vertriebs-Cockpit',  icon: 'gauge',   sec: 'Vertrieb',  end: true },
    { hash: '#/konfigurator',  view: 'konfigurator',  label: 'Konfigurator',       icon: 'car',     sec: 'Vertrieb' },
    { hash: '#/offerten',      view: 'offerten',      label: 'Offerten',           icon: 'doc',     sec: 'Vertrieb' },
    { hash: '#/kunden',        view: 'kunden',        label: 'Kunden',             icon: 'users',   sec: 'Vertrieb' },
    { hash: '#/partner',       view: 'partner',       label: 'Partner-Netzwerk',   icon: 'network', sec: 'B2B' },
    { hash: '#/aufgaben',      view: 'aufgaben',      label: 'Aufgaben',           icon: 'check',   sec: 'Vertrieb' },
    { hash: '#/einstellungen', view: 'einstellungen', label: 'Einstellungen',      icon: 'settings', sec: 'System' },
  ];

  /* ── Shell (Sidebar + Topbar + Content) ─────────────────────────────────── */
  function renderShell(activeView) {
    const emp = api.getStoredEmployee();
    const sections = {};
    ROUTES.forEach(r => { (sections[r.sec] = sections[r.sec] || []).push(r); });

    const navMarkup = Object.entries(sections).map(([sec, routes]) => `
      <div class="nav-sec">${esc(sec)}</div>
      ${routes.map(r => `
        <a class="nav-link ${r.view === activeView ? 'active' : ''}" href="${r.hash}" data-view="${r.view}">
          <span class="navico">${icons[r.icon](17)}</span>${esc(r.label)}
        </a>`).join('')}
    `).join('');

    const crumb = ROUTES.find(r => r.view === activeView);

    el('#app').innerHTML = `
    <div class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <div class="brand-mark">AF</div>
          <div>
            <div class="brand-name">AUTOFASZINATION</div>
            <div class="brand-sub">Mitarbeiter-Portal</div>
          </div>
        </div>
        <nav>${navMarkup}</nav>
        <div class="foot">
          <div class="user-chip">
            <div class="avatar">${esc(initials(emp && emp.name))}</div>
            <div style="min-width:0;flex:1">
              <div class="nm">${esc(emp ? emp.name : '—')}</div>
              <div class="rl">${esc(roleLabel(emp && emp.role))}</div>
            </div>
            <button class="btn-icon" id="btnLogout" title="Abmelden">${icons.logout(16)}</button>
          </div>
          <p class="legal">LET26 · Motor- &amp; Gaspedaloptimierung<br>Swiss Made · V3 «Carbon Cockpit»</p>
        </div>
      </aside>

      <div class="shell-main">
        <header class="topbar">
          <button class="btn-icon hamburger" id="btnMenu" title="Menü">${icons.menu(20)}</button>
          <div class="crumb"><span>AutoFaszination</span><span class="sep">/</span><b>${esc(crumb ? crumb.label : '')}</b></div>
          <div class="spacer"></div>
          <span class="live"><span class="dot"></span>LET26 aktiv</span>
          <span class="clock" id="topClock"></span>
        </header>
        <main class="shell-content" id="viewRoot"></main>
      </div>
    </div>`;

    /* Uhr */
    tickClock();
    if (window._clockTimer) clearInterval(window._clockTimer);
    window._clockTimer = setInterval(tickClock, 30000);

    /* Events */
    el('#btnLogout').addEventListener('click', () => {
      api.clearSession();
      location.hash = '#/login';
      render();
    });
    el('#btnMenu').addEventListener('click', () => el('#sidebar').classList.toggle('open'));
    els('.nav-link').forEach(a => a.addEventListener('click', () => {
      const sb = el('#sidebar');
      if (sb) sb.classList.remove('open');
    }));
  }

  function tickClock() {
    const c = el('#topClock');
    if (!c) return;
    const now = new Date();
    c.textContent = now.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' + now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  }

  /* ── Router ────────────────────────────────────────────────────────────── */
  let currentView = null;

  function parseHash() {
    const h = location.hash || '#/cockpit';
    const [path, query] = h.split('?');
    const params = {};
    new URLSearchParams(query || '').forEach((v, k) => { params[k] = v; });
    return { path, params };
  }

  function render() {
    const { path, params } = parseHash();
    const authed = !!api.getToken();

    if (!authed || path === '#/login') {
      currentView = 'login';
      if (window._clockTimer) clearInterval(window._clockTimer);
      AFN.views.login.render(el('#app'));
      return;
    }

    const route = ROUTES.find(r => r.hash === path) || ROUTES[0];
    const root = el('#viewRoot');

    if (currentView !== route.view) {
      /* Offene Panels schliessen, bevor die neue Ansicht gerendert wird */
      try { AFN.ui.drawer.close(); AFN.ui.modal.close(); } catch (e) { /* ignore */ }
      renderShell(route.view);
    }
    currentView = route.view;

    const container = el('#viewRoot');
    if (container) {
      container.className = 'shell-content view-enter';
      const view = AFN.views[route.view];
      if (view && typeof view.render === 'function') {
        view.render(container, params);
      } else {
        container.innerHTML = `<div class="card"><div class="card-body">${AFN.ui.spinner('Modul wird geladen …')}</div></div>`;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  /* ── Globale Events ────────────────────────────────────────────────────── */
  window.addEventListener('hashchange', render);
  window.addEventListener('af:logout', () => { location.hash = '#/login'; });
  document.addEventListener('af:navigate', e => {
    if (e.detail && e.detail.hash) location.hash = e.detail.hash;
  });

  /* ── Start ─────────────────────────────────────────────────────────────── */
  if (!location.hash) location.hash = '#/cockpit';
  render();

  /* Öffentlich machen (z. B. für Login-Refresh) */
  AFN.app = { render, ROUTES };
})();
