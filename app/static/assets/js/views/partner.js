/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — B2B Partner-Netzwerk (415 Markenhäuser)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast, badge, PRIORITY_META, downloadCsv } = AFN.ui;

  const F = { search: '', canton: '', brand: '', priority: '', page: 1, perPage: 25 };
  let stats = null, allRows = [];

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">B2B Netzwerk</span>
        <h1>Partner-Netzwerk</h1>
        <p class="sub">415 Markenhäuser der Schweiz &amp; FL mit Priorität, Ansprechpersonen und Kapazität —
        inklusive PLZ-Routing zur nächstgelegenen Garage.</p>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" id="csvBtn">${icons.download(15)} CSV-Export</button>
        <a class="btn btn-primary" href="#/konfigurator">${icons.bolt(15)} Offerte</a>
      </div>
    </div>

    <!-- Statistiken -->
    <div class="kpi-grid stagger mb-4" id="partnerStats"></div>

    <!-- PLZ-Routing -->
    <div class="card mb-3">
      <div class="card-head"><div><div class="card-title">PLZ-Routing-Tool</div>
      <div class="card-sub">Nächstgelegene aktive Markenhäuser zu einer Kunden-PLZ — Marken-Match erhält 15 km Distanz-Bonus</div></div></div>
      <div class="card-body">
        <div class="row row-wrap" style="gap:10px">
          <input class="input" id="routeZip" placeholder="Kunden-PLZ (z. B. 8001)" maxlength="4" inputmode="numeric" style="max-width:170px">
          <select class="select" id="routeBrand" style="max-width:220px">
            <option value="">Marke: alle</option>
          </select>
          <button class="btn btn-primary" id="routeBtn">${icons.pin(15)} Routen</button>
          <div id="routeBox" class="mt-3" style="width:100%"></div>
        </div>
      </div>
    </div>

    <!-- Filter + Tabelle -->
    <div class="card mb-3">
      <div class="card-body" style="padding:14px 16px">
        <div class="row row-wrap" style="gap:10px">
          <div class="input-wrap" style="flex:1;min-width:220px">
            <span class="lead-ico">${icons.search(16)}</span>
            <input class="input" id="pSearch" placeholder="Firma, Ort oder PLZ suchen …" value="${esc(F.search)}">
          </div>
          <select class="select" id="pCanton" style="max-width:150px"><option value="">Alle Kantone</option></select>
          <select class="select" id="pBrand" style="max-width:160px"><option value="">Alle Marken</option></select>
          <div class="seg" id="prioSeg">
            <button data-p="" class="${!F.priority ? 'active' : ''}">Alle</button>
            <button data-p="A" class="${F.priority === 'A' ? 'active' : ''}">A</button>
            <button data-p="B" class="${F.priority === 'B' ? 'active' : ''}">B</button>
            <button data-p="C" class="${F.priority === 'C' ? 'active' : ''}">C</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body" id="partnerList">${AFN.ui.spinner('Partner-Netzwerk wird geladen …')}</div>
    </div>`;

    /* Statistiken + Filter-Optionen laden */
    AFN.api.partnerStats().then(s => {
      stats = s;
      el('#partnerStats').innerHTML = `
      <div class="kpi"><div class="glow"></div>
        <div class="head"><span class="lbl">Markenhäuser total</span><span class="ico">${icons.building(19)}</span></div>
        <div class="val">${fmt.num(s.total)}</div><div class="sub"><b>${fmt.num(s.active)}</b> aktiv im Netzwerk</div></div>
      <div class="kpi">
        <div class="head"><span class="lbl">Mit Ansprechperson</span><span class="ico green">${icons.users(19)}</span></div>
        <div class="val">${fmt.num(s.withContactPerson)}</div><div class="sub">direkt adressierbar für Akquise</div></div>
      <div class="kpi">
        <div class="head"><span class="lbl">Priorität A</span><span class="ico amber">${icons.star(19)}</span></div>
        <div class="val">${fmt.num((s.byPriority || {}).A || 0)}</div><div class="sub">Top-Kandidaten für Welle 1–2</div></div>
      <div class="kpi">
        <div class="head"><span class="lbl">Stärkste Kantone</span><span class="ico blue">${icons.pin(19)}</span></div>
        <div class="val" style="font-size:20px">${(s.byCanton ? Object.entries(s.byCanton).slice(0, 3).map(([k, v]) => k + ' ' + v).join(' · ') : '—')}</div>
        <div class="sub">Anzahl Häuser pro Kanton (Top 3)</div></div>`;
    }).catch(() => {});

    AFN.api.vehicles().then(vs => {
      const brands = [...new Set(vs.map(v => v.brand))].sort();
      const sel = el('#pBrand'), selR = el('#routeBrand');
      brands.forEach(b => {
        sel.insertAdjacentHTML('beforeend', `<option value="${esc(b)}">${esc(b)}</option>`);
        selR.insertAdjacentHTML('beforeend', `<option value="${esc(b)}">${esc(b)}</option>`);
      });
    }).catch(() => {});

    load().then(() => {
      /* Kantone in Select füllen */
      const cantons = [...new Set(allRows.map(p => p.canton).filter(Boolean))].sort();
      const selC = el('#pCanton');
      cantons.forEach(k => selC.insertAdjacentHTML('beforeend', `<option value="${esc(k)}" ${F.canton === k ? 'selected' : ''}>${esc(k)}</option>`));
    });

    /* Events */
    let timer = null;
    el('#pSearch').addEventListener('input', e => {
      F.search = e.target.value; F.page = 1;
      clearTimeout(timer); timer = setTimeout(load, 320);
    });
    el('#pCanton').addEventListener('change', e => { F.canton = e.target.value; F.page = 1; load(); });
    el('#pBrand').addEventListener('change', e => { F.brand = e.target.value; F.page = 1; load(); });
    els('#prioSeg button').forEach(b => b.addEventListener('click', () => {
      F.priority = b.getAttribute('data-p'); F.page = 1;
      els('#prioSeg button').forEach(x => x.classList.toggle('active', x === b));
      load();
    }));
    el('#routeBtn').addEventListener('click', doRoute);
    el('#csvBtn').addEventListener('click', exportCsv);
  }

  function load() {
    const box = el('#partnerList');
    return AFN.api.partners({
      search: F.search || undefined,
      canton: F.canton || undefined,
      brand: F.brand || undefined,
      priority: F.priority || undefined,
      page: F.page, perPage: F.perPage,
    }).then(res => {
      allRows = res.partners || [];
      const total = res.total || 0;
      const pages = Math.max(1, Math.ceil(total / F.perPage));

      if (!allRows.length) {
        box.innerHTML = AFN.ui.empty(icons.network(22), 'Keine Partner gefunden', 'Filter zurücksetzen oder Suchbegriff ändern.');
        return;
      }

      box.innerHTML = `
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Firma</th><th>Marken</th><th>Ort</th><th>Ansprechperson</th>
            <th>Prio.</th><th class="r">Kapazität</th><th>Status</th>
          </tr></thead>
          <tbody>
          ${allRows.map(p => `
            <tr>
              <td class="strong" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${esc(p.company)}</td>
              <td class="dim" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${esc((p.brands || []).join(', '))}</td>
              <td class="dim" style="white-space:nowrap">${esc(p.zip)} ${esc(p.city)}${p.canton ? ' <span class="dim">(' + esc(p.canton) + ')</span>' : ''}</td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${p.contactPerson ? esc(p.contactPerson) : '<span class="dim">—</span>'}</td>
              <td>${badge(PRIORITY_META[p.priority] || { label: p.priority, cls: 'badge-zinc' })}</td>
              <td class="r num">${p.capacityUsed}/${p.capacity}</td>
              <td>${p.active ? '<span class="badge badge-green">Aktiv</span>' : '<span class="badge badge-zinc">Inaktiv</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="pagination" id="pager"></div>`;

      /* Pagination */
      const pg = el('#pager');
      let buttons = `<button ${F.page <= 1 ? 'disabled' : ''} data-pg="${F.page - 1}">‹</button>`;
      const range = pageRange(F.page, pages);
      range.forEach(n => { buttons += `<button class="${n === F.page ? 'active' : ''}" data-pg="${n}">${n}</button>`; });
      buttons += `<button ${F.page >= pages ? 'disabled' : ''} data-pg="${F.page + 1}">›</button>`;
      buttons += `<span class="dim small" style="align-self:center;margin-left:10px">${fmt.num(total)} Häuser · Seite ${F.page}/${pages}</span>`;
      pg.innerHTML = buttons;
      els('[data-pg]', pg).forEach(b => b.addEventListener('click', () => {
        F.page = +b.getAttribute('data-pg'); load();
      }));
    }).catch(err => {
      box.innerHTML = `<div style="padding:20px;color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div>`;
    });
  }

  function pageRange(current, total) {
    const out = [];
    const start = Math.max(1, Math.min(current - 2, total - 4));
    const end = Math.min(total, start + 4);
    for (let n = start; n <= end; n++) out.push(n);
    return out;
  }

  function doRoute() {
    const zip = el('#routeZip').value.trim();
    const brand = el('#routeBrand').value;
    const box = el('#routeBox');
    if (!/^\d{4}$/.test(zip)) { toast('error', 'Ungültige PLZ', 'Bitte eine 4-stellige Schweizer PLZ eingeben.'); return; }
    box.innerHTML = AFN.ui.spinner('Partner werden geroutet …');
    AFN.api.routePartners(zip, brand || null)
      .then(rows => {
        if (!rows.length) {
          box.innerHTML = AFN.ui.empty(icons.pin(20), 'Keine Partner gefunden', 'Für diese PLZ ist keine aktive Partner-Garage hinterlegt.');
          return;
        }
        box.innerHTML = `
        <div class="grid grid-2" style="gap:10px">
          ${rows.map((r, i) => `
          <div style="display:flex;gap:14px;align-items:center;padding:14px 16px;border-radius:var(--r-md);
            border:1px solid ${i === 0 ? 'rgba(226,0,26,.5)' : 'var(--line)'};background:var(--bg-2);position:relative;overflow:hidden">
            ${i === 0 ? '<div style="position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--red);box-shadow:0 0 10px var(--red-glow)"></div>' : ''}
            <span style="flex-shrink:0;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;
              font-family:var(--font-d);font-weight:700;font-size:13px;background:var(--surface-2);color:var(--txt-2);border:1px solid var(--line)">${i + 1}</span>
            <span style="flex:1;min-width:0">
              <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <b style="font-size:13px;color:var(--txt)">${esc(r.partner.company)}</b>
                ${r.brandMatch ? '<span class="badge badge-green" style="padding:2px 8px;font-size:9.5px">Marken-Match</span>' : ''}
                ${i === 0 ? '<span class="badge badge-red" style="padding:2px 8px;font-size:9.5px">Empfohlen</span>' : ''}
              </span>
              <span class="dim" style="display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${esc(r.partner.zip)} ${esc(r.partner.city)}${r.partner.contactPerson ? ' · ' + esc(r.partner.contactPerson) : ''}</span>
            </span>
            <span style="flex-shrink:0;text-align:right">
              <span style="display:block;font-family:var(--font-d);font-size:16px;font-weight:700;color:${r.effectiveKm <= 15 ? 'var(--green)' : 'var(--txt)'}">${r.effectiveKm.toLocaleString('de-CH')} km</span>
              <span class="dim" style="font-size:10px">${r.distanceKm !== r.effectiveKm ? 'eff. (real ' + r.distanceKm.toLocaleString('de-CH') + ')' : 'Distanz'}</span>
            </span>
          </div>`).join('')}
        </div>`;
      })
      .catch(err => { box.innerHTML = `<div class="mt-2" style="color:#FF8C9B;font-size:12.5px">${icons.alert(14)} ${esc(err.message)}</div>`; });
  }

  function exportCsv() {
    AFN.api.partners({ page: 1, perPage: 200 })
      .then(res => {
        const rows = (res.partners || []).map(p => ({
          Firma: p.company, Marken: (p.brands || []).join('; '), PLZ: p.zip, Ort: p.city,
          Kanton: p.canton || '', Ansprechperson: p.contactPerson || '',
          Telefon: p.phone || '', EMail: p.email || '', Prioritaet: p.priority,
          Kapazitaet: p.capacity, Belegt: p.capacityUsed, Aktiv: p.active ? 'ja' : 'nein',
        }));
        downloadCsv('AutoFaszination_Partnernetzwerk.csv', rows);
        toast('success', 'CSV exportiert', rows.length + ' Partner-Garagen als CSV heruntergeladen.');
      })
      .catch(err => toast('error', 'Export fehlgeschlagen', err.message));
  }

  AFN.views.partner = { render };
})();
