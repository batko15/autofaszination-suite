/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — Chart-Komponenten (reines SVG/CSS, offline-fähig)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};

(function () {
  'use strict';

  const { esc } = AFN.ui;

  /* ── Säulendiagramm (Monatsvolumen) ────────────────────────────────────── */
  function barChart(container, data, opts) {
    const o = Object.assign({ formatValue: v => String(v), max: null }, opts || {});
    if (!container) return;
    const values = data.map(d => d.value);
    const max = o.max || Math.max.apply(null, values.concat([1])) * 1.12;
    const lastIndex = data.length - 1;
    const maxIdx = values.indexOf(Math.max.apply(null, values));

    container.innerHTML = data.map((d, i) => {
      const hPct = Math.max(2, Math.round(d.value / max * 100));
      const isHot = i === maxIdx && d.value > 0;
      return `
      <div class="bcol">
        <div class="bval">${o.formatValue(d.value)}</div>
        <div class="bar ${isHot ? 'hot' : ''}" style="height:${hPct}%; animation-delay:${i * 0.07}s" title="${esc(d.label)}: ${esc(o.formatValue(d.value))}"></div>
        <div class="blbl">${esc(d.label)}</div>
      </div>`;
    }).join('');
  }

  /* ── Horizontale Balken (Pipeline, Marken) ─────────────────────────────── */
  function hbars(container, data, opts) {
    const o = Object.assign({ formatValue: v => String(v), colors: {} }, opts || {});
    if (!container) return;
    const values = data.map(d => d.value);
    const max = Math.max.apply(null, values.concat([1]));
    container.innerHTML = data.map((d, i) => {
      const wPct = Math.max(2, Math.round(d.value / max * 100));
      const colorCls = o.colors[d.label] || '';
      return `
      <div class="hbar-row">
        <div class="hlab">${esc(d.label)}</div>
        <div class="htrack"><div class="hfill ${colorCls}" style="width:${wPct}%; animation-delay:${i * 0.08}s"></div></div>
        <div class="hval">${esc(o.formatValue(d.value))}</div>
      </div>`;
    }).join('');
  }

  /* ── Donut (SVG, mit Mittenzahl) ───────────────────────────────────────── */
  function donut(container, parts, opts) {
    const o = Object.assign({
      size: 150, thickness: 16, centerValue: '', centerLabel: '',
      colors: ['#E2001A', '#3D4763', '#5AA7FF', '#9D7BFF', '#2FD87C'],
    }, opts || {});
    if (!container) return;
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    const r = (o.size - o.thickness) / 2;
    const cx = o.size / 2, cy = o.size / 2;
    const circ = 2 * Math.PI * r;

    let acc = 0;
    const segs = parts.filter(p => p.value > 0).map((p, i) => {
      const frac = p.value / total;
      const dash = frac * circ;
      const seg = `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${o.colors[i % o.colors.length]}"
          stroke-width="${o.thickness}" stroke-linecap="butt"
          stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-acc}"
          transform="rotate(-90 ${cx} ${cy})" opacity="0">
          <title>${esc(p.label)}: ${esc(String(p.value))}</title>
        </circle>`;
      acc += dash;
      return seg;
    }).join('');

    container.innerHTML = `
      <div style="position:relative;width:${o.size}px;height:${o.size}px;margin:0 auto">
        <svg width="${o.size}" height="${o.size}" viewBox="0 0 ${o.size} ${o.size}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="${o.thickness}"/>
          ${segs}
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-family:var(--font-d);font-size:26px;font-weight:700;color:var(--txt);line-height:1">${esc(o.centerValue)}</div>
          <div style="font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);margin-top:4px">${esc(o.centerLabel)}</div>
        </div>
      </div>`;

    /* Segmente einblenden (Animation) */
    const circles = container.querySelectorAll('circle[stroke-dasharray]');
    circles.forEach((c, i) => {
      c.style.transition = 'opacity .6s ' + (0.25 + i * 0.15) + 's';
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.opacity = '1'; }));
    });
  }

  /* ── Legende für Donut ─────────────────────────────────────────────────── */
  function donutLegend(parts, colors) {
    const cl = colors || ['#E2001A', '#3D4763', '#5AA7FF', '#9D7BFF'];
    return `<div class="row row-wrap" style="justify-content:center;gap:14px;margin-top:14px">` +
      parts.map((p, i) =>
        `<span class="row" style="gap:7px;font-size:11.5px;color:var(--mut)">
           <span style="width:9px;height:9px;border-radius:3px;background:${cl[i % cl.length]};display:inline-block"></span>
           ${esc(p.label)} <b style="color:var(--txt-2)">${esc(String(p.value))}</b>
         </span>`).join('') + `</div>`;
  }

  AFN.charts = { barChart, hbars, donut, donutLegend };
})();
