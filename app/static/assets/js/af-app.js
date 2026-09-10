/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V4.1 — App-Router, Shell & Command-Palette
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};

(function () {
  'use strict';

  const { icons, el, els, html, roleLabel, initials, esc } = AFN.ui;
  const api = AFN.api;

  const ROUTES = [
    { hash: '#/cockpit',       view: 'cockpit',       label: 'Vertriebs-Cockpit',  icon: 'gauge',    sec: 'Vertrieb' },
    { hash: '#/konfigurator',  view: 'konfigurator',  label: 'Konfigurator',       icon: 'car',      sec: 'Vertrieb' },
    { hash: '#/offerten',      view: 'offerten',      label: 'Offerten',           icon: 'doc',      sec: 'Vertrieb' },
    { hash: '#/kunden',        view: 'kunden',        label: 'Kunden',             icon: 'users',    sec: 'Vertrieb' },
    { hash: '#/partner',       view: 'partner',       label: 'Partner-Netzwerk',   icon: 'network',  sec: 'Vertrieb' },
    { hash: '#/aufgaben',      view: 'aufgaben',      label: 'Aufgaben',           icon: 'check',    sec: 'Vertrieb' },
    { hash: '#/termine',       view: 'termine',       label: 'Termine',            icon: 'calendar', sec: 'Operationen' },
    { hash: '#/werkstatt',     view: 'werkstatt',     label: 'Werkstatt',          icon: 'wrench',   sec: 'Operationen' },
    { hash: '#/rechnungen',    view: 'rechnungen',    label: 'Rechnungen',         icon: 'euro',     sec: 'Operationen' },
    { hash: '#/berichte',      view: 'berichte',      label: 'Berichte',           icon: 'chart',    sec: 'Analyse & Daten' },
    { hash: '#/fahrzeuge',     view: 'fahrzeuge',     label: 'Fahrzeug-Datenbank', icon: 'box',      sec: 'Analyse & Daten' },
    { hash: '#/einstellungen', view: 'einstellungen', label: 'Einstellungen',      icon: 'settings', sec: 'System' },
  ];

  /* ── Live-Badges (überfällige Aufgaben + heutige Termine) ───────────────── */
  const live = { overdue: 0, todayAppts: 0 };

  function refreshBadges() {
    if (!api.getToken()) return;
    api.followups({ status: 'ueberfaellig' }).then(rows => {
      live.overdue = Array.isArray(rows) ? rows.length : 0;
      paintBadgeIfReady();
    }).catch(() => { live.overdue = 0; paintBadgeIfReady(); });
    api.appointments().then(d => {
      live.todayAppts = d && d.today ? d.today : 0;
      paintBadgeIfReady();
    }).catch(() => { live.todayAppts = 0; paintBadgeIfReady(); });
  }

  function paintBadgeIfReady() {
    const b1 = el('[data-badge="aufgaben"]');
    if (b1) paintBadge(b1, live.overdue);
    const b2 = el('[data-badge="termine"]');
    if (b2) paintBadge(b2, live.todayAppts);
  }

  function paintBadge(node, n) {
    node.textContent = n;
    node.classList.toggle('zero', n === 0);
    node.title = n === 0 ? 'Alles erledigt' : n + ' offen';
  }

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
          ${r.view === 'aufgaben' ? '<span class="nav-badge zero" data-badge="aufgaben">0</span>' : ''}
          ${r.view === 'termine' ? '<span class="nav-badge zero" data-badge="termine">0</span>' : ''}
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
            <div class="brand-sub">Mitarbeiter-Portal <span class="ver-chip">V4.1</span></div>
          </div>
        </div>
        <nav>${navMarkup}</nav>
        <div class="foot">
          <div class="user-chip">
            <div class="avatar" title="${esc(emp ? emp.name : '')}">${esc(initials(emp && emp.name))}</div>
            <div style="min-width:0;flex:1">
              <div class="nm" title="${esc(emp ? emp.name : '')}">${esc(emp ? emp.name : '—')}</div>
              <div class="rl" title="${esc(roleLabel(emp && emp.role))}">${esc(roleLabel(emp && emp.role))}</div>
            </div>
            <button class="btn-icon" id="btnLogout" title="Abmelden">${icons.logout(16)}</button>
          </div>
          <p class="legal">LET26 · Motor- &amp; Gaspedaloptimierung<br>Swiss Made · V4.1 «Carbon Cockpit»</p>
        </div>
      </aside>

      <div class="shell-main">
        <header class="topbar">
          <button class="btn-icon hamburger" id="btnMenu" title="Menü">${icons.menu(20)}</button>
          <div class="crumb"><span>AutoFaszination</span><span class="sep">/</span><b>${esc(crumb ? crumb.label : '')}</b></div>
          <div class="spacer"></div>
          <div class="topbar-search" id="btnPalette" title="Globale Suche öffnen (Strg + K)">
            <span>${icons.search(15)}</span>
            <span class="ts-label">Suchen …</span>
            <span class="palette-kbd">STRG K</span>
          </div>
          <span class="live"><span class="dot"></span>LET26 aktiv</span>
          <span class="clock" id="topClock"></span>
        </header>
        <main class="shell-content" id="viewRoot"></main>
      </div>
    </div>
    <div class="palette-veil" id="paletteVeil">
      <div class="palette" role="dialog" aria-modal="true">
        <div class="palette-input-row">
          <span style="color:var(--mut)">${icons.search(18)}</span>
          <input id="paletteInput" placeholder="Fahrzeuge, Kunden, Partner, Termine, Rechnungen suchen …" autocomplete="off">
          <span class="palette-kbd">ESC</span>
        </div>
        <div class="palette-body" id="paletteBody"></div>
        <div class="palette-foot">
          <span>↑ ↓ navigieren</span><span>↵ öffnen</span><span>Strg K öffnen/schliessen</span>
        </div>
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
    el('#btnPalette').addEventListener('click', () => palette.open());
    els('.nav-link').forEach(a => a.addEventListener('click', () => {
      const sb = el('#sidebar');
      if (sb) sb.classList.remove('open');
    }));

    refreshBadges();
    if (window._badgeTimer) clearInterval(window._badgeTimer);
    window._badgeTimer = setInterval(refreshBadges, 60000);
  }

  function tickClock() {
    const c = el('#topClock');
    if (!c) return;
    const now = new Date();
    c.textContent = now.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' + now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  }

  /* ── Command-Palette (Ctrl+K) ───────────────────────────────────────────── */
  const palette = {
    selIdx: 0,
    flatItems: [],

    open() {
      const veil = el('#paletteVeil');
      if (!veil) return;
      veil.classList.add('open');
      const input = el('#paletteInput');
      if (input) { input.value = ''; setTimeout(() => input.focus(), 30); }
      this.renderQuickActions();
    },

    close() {
      const veil = el('#paletteVeil');
      if (veil) veil.classList.remove('open');
    },

    renderQuickActions() {
      const body = el('#paletteBody');
      if (!body) return;
      this.flatItems = QUICK_ACTIONS.map(qa => ({
        ico: qa.icon, title: qa.label, sub: qa.hint, go: () => { location.hash = qa.hash; },
      }));
      this.selIdx = 0;
      this.paint(body, this.flatItems.map((it, i) => this.itemMarkup(it, i)), 'Schnellaktionen');
    },

    search(term) {
      const body = el('#paletteBody');
      if (!body) return;
      const t = term.trim();
      if (t.length < 2) { this.renderQuickActions(); return; }

      clearTimeout(this._timer);
      this._timer = setTimeout(() => {
        api.search(t).then(data => {
          this.flatItems = [];
          let htmlOut = '';
          (data.groups || []).forEach(g => {
            htmlOut += `<div class="palette-group-cap">${esc(g.label)}</div>`;
            g.items.forEach(item => {
              const route = ROUTES.find(r => r.view === item.view);
              const viewLabel = route ? route.label : item.view;
              this.flatItems.push({
                ico: route ? route.icon : 'doc',
                title: item.title, sub: item.subtitle + ' · ' + viewLabel,
                go: () => { location.hash = route ? route.hash : '#/cockpit'; },
              });
            });
            htmlOut += g.items.map((item, i) => {
              const fi = this.flatItems.length - g.items.length + i;
              return this.itemMarkup(this.flatItems[fi], fi);
            }).join('');
          });
          if (!this.flatItems.length) {
            htmlOut = `<div class="palette-empty">Keine Treffer für «${esc(t)}» — mindestens 2 Zeichen suchen.</div>`;
          }
          this.selIdx = 0;
          this.paint(body, htmlOut, null);
        }).catch(() => {
          body.innerHTML = `<div class="palette-empty">Suche momentan nicht verfügbar.</div>`;
        });
      }, 220);
    },

    itemMarkup(it, i) {
      return `
      <div class="palette-item ${i === this.selIdx ? 'sel' : ''}" data-pi="${i}">
        <span class="pi-ico">${(icons[it.ico] || icons.doc)(16)}</span>
        <span class="pi-main">
          <span class="pi-title">${esc(it.title)}</span>
          <span class="pi-sub">${esc(it.sub || '')}</span>
        </span>
      </div>`;
    },

    paint(body, itemsHtml, cap) {
      body.innerHTML = (cap ? `<div class="palette-group-cap">${esc(cap)}</div>` : '') + itemsHtml;
      els('[data-pi]', body).forEach(n => {
        n.addEventListener('click', () => this.pick(+n.getAttribute('data-pi')));
        n.addEventListener('mousemove', () => {
          this.selIdx = +n.getAttribute('data-pi');
          els('.palette-item', body).forEach(x => x.classList.remove('sel'));
          n.classList.add('sel');
        });
      });
    },

    pick(i) {
      const it = this.flatItems[i];
      if (!it) return;
      this.close();
      drawerSafeClose();
      it.go();
    },

    move(dir) {
      if (!this.flatItems.length) return;
      this.selIdx = (this.selIdx + dir + this.flatItems.length) % this.flatItems.length;
      const body = el('#paletteBody');
      if (!body) return;
      els('.palette-item', body).forEach(x => x.classList.remove('sel'));
      const target = body.querySelector('[data-pi="' + this.selIdx + '"]');
      if (target) { target.classList.add('sel'); target.scrollIntoView({ block: 'nearest' }); }
    },
  };

  const QUICK_ACTIONS = [
    { label: 'Neue Offerte erstellen',   hint: '3-Schritt-Konfigurator',       hash: '#/konfigurator', icon: 'bolt' },
    { label: 'Vertriebs-Cockpit öffnen', hint: 'KPIs & Pipeline',              hash: '#/cockpit',       icon: 'gauge' },
    { label: 'Termine (Kalender)',       hint: 'Testfahrten & Einbauten',      hash: '#/termine',       icon: 'calendar' },
    { label: 'Offerten-Verwaltung',      hint: 'Status & Detail-Drawer',       hash: '#/offerten',      icon: 'doc' },
    { label: 'Werkstatt-Kanban',         hint: 'Auftrags-Status-Flow',         hash: '#/werkstatt',     icon: 'wrench' },
    { label: 'Rechnungen & Forderungen', hint: 'Zahlungen verbuchen',          hash: '#/rechnungen',    icon: 'euro' },
    { label: 'Berichte & Analysen',      hint: 'Trichter, Velocity, Kanäle',   hash: '#/berichte',      icon: 'chart' },
    { label: 'Fahrzeug-Datenbank',       hint: '68 Modelle mit Tuning-Werten',  hash: '#/fahrzeuge',     icon: 'car' },
    { label: 'Kunden-CRM',               hint: 'Leads & Historie',             hash: '#/kunden',        icon: 'users' },
    { label: 'Partner-Netzwerk',         hint: '415 Markenhäuser (B2B)',       hash: '#/partner',       icon: 'network' },
    { label: 'Aufgaben-Center',          hint: 'LET26-Follow-ups Tag 1/3/7',   hash: '#/aufgaben',      icon: 'check' },
    { label: 'Einstellungen',            hint: 'Firma, Team & System',         hash: '#/einstellungen', icon: 'settings' },
  ];

  function drawerSafeClose() {
    try { AFN.ui.drawer.close(); AFN.ui.modal.close(); } catch (e) { /* ignore */ }
  }

  /* Globale Tastatur-Events: Ctrl+K / Esc */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      const veil = el('#paletteVeil');
      if (veil && veil.classList.contains('open')) palette.close();
      else palette.open();
      return;
    }
    const veil = el('#paletteVeil');
    if (!veil || !veil.classList.contains('open')) return;
    if (e.key === 'Escape') { palette.close(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); palette.move(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); palette.move(-1); }
    if (e.key === 'Enter') { e.preventDefault(); palette.pick(palette.selIdx); }
  });

  document.addEventListener('input', e => {
    if (e.target && e.target.id === 'paletteInput') palette.search(e.target.value);
  });
  document.addEventListener('click', e => {
    if (e.target && e.target.id === 'paletteVeil') palette.close();
  });

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
      if (window._badgeTimer) clearInterval(window._badgeTimer);
      palette.close();
      AFN.views.login.render(el('#app'));
      return;
    }

    const route = ROUTES.find(r => r.hash === path) || ROUTES[0];
    const root = el('#viewRoot');

    if (currentView !== route.view) {
      /* Offene Panels schliessen, bevor die neue Ansicht gerendert wird */
      drawerSafeClose();
      palette.close();
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
  AFN.app = { render, ROUTES, palette };
})();
