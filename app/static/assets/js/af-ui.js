/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — UI-Bibliothek: Icons, Formatierung, Toast, Drawer, Modal
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};

(function () {
  'use strict';

  /* ── Icons (Inline-SVG, stroke-basiert — 24×24, konsistent) ─────────────── */
  const I = (paths, opts) => {
    const o = Object.assign({ size: 18, fill: 'none', sw: 1.8 }, opts || {});
    return `<svg width="${o.size}" height="${o.size}" viewBox="0 0 24 24" fill="${o.fill}" stroke="currentColor" stroke-width="${o.sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  };

  const icons = {
    gauge:   s => I('<path d="M12 14l3.5-3.5"/><path d="M20.6 15.5a9 9 0 1 0-17.2 0"/><circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none"/>', { size: s }),
    car:     s => I('<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M3 11h18v6a1 1 0 0 1-1 1h-1.5"/><path d="M4.5 18H4a1 1 0 0 1-1-1v-6"/><circle cx="7.5" cy="15" r="1.6"/><circle cx="16.5" cy="15" r="1.6"/><path d="M9.1 15h5.8"/>', { size: s }),
    doc:     s => I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>', { size: s }),
    users:   s => I('<circle cx="9" cy="8" r="3.4"/><path d="M3.5 20c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><path d="M16 5.5a3.4 3.4 0 0 1 0 6.4"/><path d="M17.5 15.4c2.1.6 3.4 2.2 3.8 4.6"/>', { size: s }),
    network: s => I('<circle cx="5" cy="6" r="2.4"/><circle cx="19" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M7 7.4L10.6 16M17 7.4L13.4 16M7.4 6h9.2"/>', { size: s }),
    check:   s => I('<path d="M4.5 12.8l4.6 4.6L19.5 7"/>', { size: s }),
    checkCircle: s => I('<circle cx="12" cy="12" r="9"/><path d="M8.2 12.4l2.6 2.6 5-5.4"/>', { size: s }),
    clock:   s => I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.4 2"/>', { size: s }),
    settings:s => I('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10.1 3.1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03z"/>', { size: s }),
    logout:  s => I('<path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>', { size: s }),
    menu:    s => I('<path d="M4 6h16M4 12h16M4 18h16"/>', { size: s }),
    x:       s => I('<path d="M6 6l12 12M18 6L6 18"/>', { size: s }),
    bolt:    s => I('<path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5z"/>', { size: s }),
    euro:    s => I('<path d="M16.5 5.5a7 7 0 1 0 0 13"/><path d="M4 10h8M4 14h8"/>', { size: s }),
    trend:   s => I('<path d="M3 17l6-6 4 4 7-7"/><path d="M14 8h6v6"/>', { size: s }),
    arrowR:  s => I('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>', { size: s }),
    arrowL:  s => I('<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>', { size: s }),
    download:s => I('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/>', { size: s }),
    upload:  s => I('<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M4 5h16"/>', { size: s }),
    search:  s => I('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', { size: s }),
    plus:    s => I('<path d="M12 5v14M5 12h14"/>', { size: s }),
    pin:     s => I('<path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/>', { size: s }),
    phone:   s => I('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', { size: s }),
    mail:    s => I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', { size: s }),
    copy:    s => I('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', { size: s }),
    external:s => I('<path d="M14 4h6v6"/><path d="M20 4L10 14"/><path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>', { size: s }),
    filter:  s => I('<path d="M4 5h16l-6.5 8v5l-3 2v-7z"/>', { size: s }),
    calendar:s => I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>', { size: s }),
    shield:  s => I('<path d="M12 2l8 3.5V11c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V5.5z"/><path d="M8.8 12l2.2 2.2 4.2-4.6"/>', { size: s }),
    wrench:  s => I('<path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6 6.4 21l5.7-5.7a4.5 4.5 0 0 0 5.6-6l-3 3-2.8-.7-.7-2.8z"/>', { size: s }),
    box:     s => I('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', { size: s }),
    chart:   s => I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', { size: s }),
    star:    s => I('<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.7 6.6 19.6l1.1-6L3.2 9.4l6.1-.8z"/>', { size: s }),
    building:s => I('<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/>', { size: s }),
    info:    s => I('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.8" fill="currentColor" stroke="none"/>', { size: s }),
    alert:   s => I('<path d="M12 3l10 17H2z"/><path d="M12 10v4"/><circle cx="12" cy="17.2" r="0.8" fill="currentColor" stroke="none"/>', { size: s }),
    refresh: s => I('<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 4v5h-5"/>', { size: s }),
    file:    s => I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>', { size: s }),
    key:     s => I('<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M17 6l3 3M14.5 8.5l2.5 2.5"/>', { size: s }),
    globe:   s => I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>', { size: s }),
  };

  /* ── Formatierung (Schweizer Konventionen) ─────────────────────────────── */
  const fmt = {
    chf(n) {
      if (n === null || n === undefined || isNaN(n)) return '—';
      const s = Number(n).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return 'CHF ' + s;
    },
    chfShort(n) {
      if (n === null || n === undefined || isNaN(n)) return '—';
      const v = Number(n);
      if (Math.abs(v) >= 1e6) return 'CHF ' + (v / 1e6).toLocaleString('de-CH', { maximumFractionDigits: 1 }) + ' Mio.';
      if (Math.abs(v) >= 1e3) return 'CHF ' + Math.round(v / 1e3).toLocaleString('de-CH') + 'k';
      return 'CHF ' + v.toLocaleString('de-CH', { maximumFractionDigits: 0 });
    },
    num(n) {
      if (n === null || n === undefined || isNaN(n)) return '—';
      return Number(n).toLocaleString('de-CH');
    },
    pct(n) {
      if (n === null || n === undefined || isNaN(n)) return '—';
      return String(n).replace('.', ',') + ' %';
    },
    dateDE(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
    dateTimeDE(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    },
    relDay(iso) {
      if (!iso) return '—';
      const d = new Date(iso), now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diff = Math.round((due - start) / 86400000);
      if (diff < -1) return Math.abs(diff) + ' Tage überfällig';
      if (diff === -1) return 'gestern';
      if (diff === 0) return 'heute';
      if (diff === 1) return 'morgen';
      if (diff <= 7) return 'in ' + diff + ' Tagen';
      return fmt.dateDE(iso);
    },
  };

  const STATUS_META = {
    offen:     { label: 'Offen',     cls: 'badge-blue' },
    versendet: { label: 'Versendet', cls: 'badge-amber' },
    gewonnen:  { label: 'Gewonnen',  cls: 'badge-green' },
    verloren:  { label: 'Verloren',  cls: 'badge-zinc' },
  };
  const LEAD_META = {
    neu:               { label: 'Neu',                cls: 'badge-blue' },
    interessiert:      { label: 'Interessiert',       cls: 'badge-violet' },
    offerte_erstellt:  { label: 'Offerte erstellt',   cls: 'badge-amber' },
    offerte_versendet: { label: 'Offerte versendet',  cls: 'badge-amber' },
    verhandlung:       { label: 'In Verhandlung',     cls: 'badge-violet' },
    gewonnen:          { label: 'Gewonnen',           cls: 'badge-green' },
    verloren:          { label: 'Verloren',           cls: 'badge-zinc' },
  };
  const ROLE_META = {
    admin:    { label: 'Administration', cls: 'badge-red' },
    vertrieb: { label: 'Vertrieb',       cls: 'badge-blue' },
    technik:  { label: 'Technik',        cls: 'badge-zinc' },
  };
  const PRIORITY_META = {
    A: { label: 'A — Top',    cls: 'badge-green' },
    B: { label: 'B — Solide', cls: 'badge-amber' },
    C: { label: 'C — Basis',  cls: 'badge-zinc' },
  };
  const FUEL_META = {
    diesel:  { label: 'Diesel' },
    benzin:  { label: 'Benzin' },
    hybrid:  { label: 'Hybrid' },
  };
  const PRODUCT_META = {
    DA: 'Diesel-Satz LET26', BA: 'Benzin-Satz LET26', K: 'LETx Hybrid', GA: 'Gaspedal',
  };

  function roleLabel(role) { return (ROLE_META[role] || {}).label || role; }

  /* ── DOM-Helfer ────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function html(container, markup) {
    const c = typeof container === 'string' ? el(container) : container;
    if (c) c.innerHTML = markup;
    return c;
  }
  function badge(meta) {
    return `<span class="badge ${meta.cls || 'badge-zinc'}"><span class="dot"></span>${esc(meta.label || '—')}</span>`;
  }
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(resolve => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove(); resolve();
    });
  }

  /* ── Toast ─────────────────────────────────────────────────────────────── */
  function toast(kind, title, detail) {
    const rack = el('#toastRack');
    if (!rack) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || 'info');
    const ico = kind === 'success' ? icons.checkCircle(18) : kind === 'error' ? icons.alert(18) : icons.info(18);
    t.innerHTML = `<div class="tico">${ico}</div><div><div class="tt">${esc(title)}</div>${detail ? `<div class="td">${esc(detail)}</div>` : ''}</div>`;
    rack.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 4200);
    t.addEventListener('click', () => { t.classList.add('out'); setTimeout(() => t.remove(), 350); });
  }

  /* ── Drawer (rechts) ───────────────────────────────────────────────────── */
  const drawer = {
    open(contentMarkup, opts) {
      const o = Object.assign({ onClose: null }, opts || {});
      const veil = el('#drawerVeil'), box = el('#drawer');
      if (!veil || !box) return;
      box.innerHTML = contentMarkup;
      veil.classList.add('open');
      box.classList.add('open');
      box._onClose = o.onClose;
      document.body.style.overflow = 'hidden';
      els('[data-drawer-close]', box).forEach(b => b.addEventListener('click', () => drawer.close()));
    },
    close() {
      const veil = el('#drawerVeil'), box = el('#drawer');
      if (veil) veil.classList.remove('open');
      if (box) box.classList.remove('open');
      document.body.style.overflow = '';
      if (box && box._onClose) { const cb = box._onClose; box._onClose = null; cb(); }
    },
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { drawer.close(); modal.close(); }
  });
  document.addEventListener('click', e => {
    if (e.target && e.target.id === 'drawerVeil') drawer.close();
    if (e.target && e.target.id === 'modalVeil') modal.close();
  });

  /* ── Modal (zentriert) ─────────────────────────────────────────────────── */
  const modal = {
    open(contentMarkup, opts) {
      const o = Object.assign({ onClose: null }, opts || {});
      const veil = el('#modalVeil'), box = el('#modal');
      if (!veil || !box) return;
      box.innerHTML = contentMarkup;
      veil.classList.add('open');
      box._onClose = o.onClose;
      els('[data-modal-close]', box).forEach(b => b.addEventListener('click', () => modal.close()));
    },
    close() {
      const veil = el('#modalVeil'), box = el('#modal');
      if (veil) veil.classList.remove('open');
      if (box) box.classList.remove('open');
      if (box && box._onClose) { const cb = box._onClose; box._onClose = null; cb(); }
    },
  };

  /* ── Lade-/Leerzustände ────────────────────────────────────────────────── */
  function spinner(label) {
    return `<div class="loading-block"><div class="spinner"></div><div>${esc(label || 'Wird geladen …')}</div></div>`;
  }
  function skeletonRows(n, cols) {
    let out = '';
    for (let i = 0; i < (n || 5); i++) {
      out += `<tr>${'<td>'.repeat(0)}${Array.from({ length: cols || 5 }, () => '<td><div class="skel skel-line" style="width:' + (55 + Math.random() * 40) + '%"></div></td>').join('')}</tr>`;
    }
    return out;
  }
  function empty(iconSvg, title, hint) {
    return `<div class="empty"><div class="eico">${iconSvg}</div><div class="et">${esc(title)}</div>${hint ? `<div class="ed">${esc(hint)}</div>` : ''}</div>`;
  }

  /* ── Zahl-Hochzähl-Animation ───────────────────────────────────────────── */
  function countUp(node, target, render, duration) {
    if (!node) return;
    const dur = duration || 900;
    const start = performance.now();
    const from = 0;
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * eased;
      node.textContent = render(val);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  AFN.ui = {
    icons, fmt, esc, el, els, html, badge,
    STATUS_META, LEAD_META, ROLE_META, PRIORITY_META, FUEL_META, PRODUCT_META,
    roleLabel, initials, copyText,
    toast, drawer, modal,
    spinner, skeletonRows, empty, countUp,
  };
})();
