/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V4.1 — Fahrzeug-Datenbank (68 Tuning-Fahrzeuge)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast, drawer, FUEL_META, PRODUCT_META } = AFN.ui;

  const F = { search: '', brand: '', fuel: '' };
  let lastRows = [];

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">Stammdaten</span>
        <h1>Fahrzeug-Datenbank</h1>
        <p class="sub">Alle 68 LET26-Fahrzeuge mit Original- und Tuning-Werten — die Datenbasis für Konfigurator und Offerten.</p>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" id="vehCsvBtn">${icons.download(15)} CSV-Export</button>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body" style="padding:12px 16px">
        <div class="row row-wrap" style="gap:10px">
          <div class="seg" id="brandSeg"></div>
          <div class="seg" id="fuelSeg">
            <button data-f="" class="${!F.fuel ? 'active' : ''}">Alle</button>
            <button data-f="diesel" class="${F.fuel === 'diesel' ? 'active' : ''}">Diesel</button>
            <button data-f="benzin" class="${F.fuel === 'benzin' ? 'active' : ''}">Benzin</button>
            <button data-f="hybrid" class="${F.fuel === 'hybrid' ? 'active' : ''}">Hybrid</button>
          </div>
          <div class="spacer"></div>
          <div class="input-wrap" style="min-width:210px">
            <span class="lead-ico">${icons.search(16)}</span>
            <input class="input" id="vehSearchInput" placeholder="Modell oder Motor suchen …" value="${esc(F.search)}">
          </div>
        </div>
      </div>
    </div>

    <div id="vehStats">${AFN.ui.spinner('Statistiken werden geladen …')}</div>
    <div class="veh-grid mt-3" id="vehList">${AFN.ui.spinner('Fahrzeuge werden geladen …')}</div>`;

    el('#vehCsvBtn').addEventListener('click', () => {
      if (!lastRows.length) { toast('info', 'Keine Daten', 'Keine Fahrzeuge im aktuellen Filter.'); return; }
      AFN.api.downloadCsv('fahrzeuge.csv', lastRows.map(v => ({
        Marke: v.brand, Modell: v.model, Motor: v.engine, Kraftstoff: (FUEL_META[v.fuel] || {}).label || v.fuel,
        PS_Original: v.hpOrig, PS_Tuning: v.hpTuned, Nm_Original: v.nmOrig, Nm_Tuning: v.nmTuned,
        Preis_CHF: v.price, Produkt: PRODUCT_META[v.productCode] || v.productCode,
      })));
      toast('success', 'Export gestartet', 'fahrzeuge.csv wird heruntergeladen.');
    });

    let timer = null;
    el('#vehSearchInput').addEventListener('input', e => {
      F.search = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(load, 300);
    });
    els('#fuelSeg button').forEach(b => b.addEventListener('click', () => {
      F.fuel = b.getAttribute('data-f');
      els('#fuelSeg button').forEach(x => x.classList.toggle('active', x === b));
      load();
    }));

    loadBrands();
    load();
  }

  function loadBrands() {
    AFN.api.brands().then(brands => {
      const seg = el('#brandSeg');
      if (!seg) return;
      seg.innerHTML = `<button data-b="" class="${!F.brand ? 'active' : ''}">Alle Marken</button>` +
        brands.map(b => `<button data-b="${esc(b)}" class="${F.brand === b ? 'active' : ''}">${esc(b)}</button>`).join('');
      els('#brandSeg button').forEach(btn => btn.addEventListener('click', () => {
        F.brand = btn.getAttribute('data-b');
        els('#brandSeg button').forEach(x => x.classList.toggle('active', x === btn));
        load();
      }));
    }).catch(() => { /* Segment bleibt leer */ });
  }

  function load() {
    AFN.api.vehicles({
      search: F.search || undefined,
      brand: F.brand || undefined,
      fuel: F.fuel || undefined,
    }).then(rows => {
      lastRows = rows;
      paintStats(rows);
      paintList(rows);
    }).catch(err => {
      const box = el('#vehList');
      if (box) box.innerHTML =
        `<div style="padding:20px;color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div>`;
    });
  }

  function paintStats(rows) {
    const box = el('#vehStats');
    if (!box) return;
    const gains = rows.map(v => v.hpTuned - v.hpOrig);
    const avgGain = gains.length ? Math.round(gains.reduce((s, g) => s + g, 0) / gains.length) : 0;
    const maxGain = gains.length ? Math.max.apply(null, gains) : 0;
    const brands = new Set(rows.map(v => v.brand)).size;
    const avgNm = rows.length ? Math.round(rows.reduce((s, v) => s + (v.nmTuned - v.nmOrig), 0) / rows.length) : 0;

    box.innerHTML = `
    <div class="kpi-grid stagger">
      <div class="kpi">
        <div class="head"><span class="lbl">Fahrzeuge</span><span class="ico blue">${icons.car(19)}</span></div>
        <div class="val">${fmt.num(rows.length)}</div>
        <div class="sub"><b>${fmt.num(brands)}</b> Marken im Datenbestand</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Ø PS-Steigerung</span><span class="ico">${icons.bolt(19)}</span></div>
        <div class="val">+${fmt.num(avgGain)} PS</div>
        <div class="sub">Durchschnitt über alle Modelle</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Max. Steigerung</span><span class="ico amber">${icons.trend(19)}</span></div>
        <div class="val">+${fmt.num(maxGain)} PS</div>
        <div class="sub">Das stärkste LET26-Ergebnis im Bestand</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Ø Drehmoment</span><span class="ico green">${icons.gauge(19)}</span></div>
        <div class="val">+${fmt.num(avgNm)} Nm</div>
        <div class="sub">Drehmomentzuwachs im Schnitt</div>
      </div>
    </div>`;
  }

  function paintList(rows) {
    const box = el('#vehList');
    if (!box) return;
    if (!rows.length) {
      box.innerHTML = AFN.ui.empty(icons.car(22), 'Keine Fahrzeuge gefunden', 'Suchbegriff oder Filter anpassen.');
      return;
    }

    box.innerHTML = rows.map(v => {
      const gain = v.hpTuned - v.hpOrig;
      const gainPct = v.hpOrig ? Math.round(gain / v.hpOrig * 100) : 0;
      return `
      <div class="vcard clickable" data-veh="${v.id}">
        <div class="row" style="justify-content:space-between;align-items:flex-start">
          <div style="min-width:0">
            <span class="badge badge-zinc">${esc(v.brand)}</span>
            <b style="display:block;font-size:13.5px;margin-top:6px;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(v.model)}">${esc(v.model)}</b>
            <span class="dim" style="display:block;font-size:10.5px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(v.engine)}">${esc(v.engine)}</span>
          </div>
          <div class="num" style="text-align:right;flex-shrink:0">
            <div style="font-family:var(--font-d);font-size:16px;font-weight:700;color:var(--txt)">${fmt.num(v.hpTuned)} <span class="dim" style="font-size:10px">PS</span></div>
            <div class="dim" style="font-size:10px">von ${fmt.num(v.hpOrig)} PS</div>
          </div>
        </div>
        <div class="ptrack mt-2"><div class="pfill" style="width:${Math.min(100, gainPct)}%"></div></div>
        <div class="row" style="justify-content:space-between;margin-top:7px">
          <span class="dim num" style="font-size:10.5px">+${fmt.num(gain)} PS · +${fmt.num(v.nmTuned - v.nmOrig)} Nm</span>
          <b class="num" style="font-size:12px;color:var(--red-2)">${fmt.chf(v.price)}</b>
        </div>
      </div>`;
    }).join('');

    els('[data-veh]', box).forEach(c => c.addEventListener('click', () =>
      openDetail(+c.getAttribute('data-veh'), rows)));
  }

  function openDetail(id, rows) {
    const v = rows.find(x => x.id === id);
    if (!v) return;
    const gain = v.hpTuned - v.hpOrig;
    const gainNm = v.nmTuned - v.nmOrig;

    drawer.open(`
      <div class="drawer-head">
        <div>
          <div class="dt">${esc(v.brand)} ${esc(v.model)}</div>
          <div class="dim small mt-1">${esc(v.engine)} · ${esc((FUEL_META[v.fuel] || {}).label || v.fuel)}${v.euroNorm ? ' · ' + esc(v.euroNorm) : ''}</div>
        </div>
        <button class="btn-icon drawer-close" data-drawer-close title="Schliessen">${icons.x(18)}</button>
      </div>
      <div class="drawer-body">

        <div class="grid grid-2 mb-3" style="gap:12px">
          <div class="card"><div class="card-body" style="padding:15px">
            <p class="mini-cap">Leistung</p>
            <div class="kv">
              <span class="k">Original</span><span class="v num">${fmt.num(v.hpOrig)} PS · ${fmt.num(v.nmOrig)} Nm</span>
              <span class="k">LET26-Tuning</span><span class="v num"><b style="color:var(--red-2)">${fmt.num(v.hpTuned)} PS · ${fmt.num(v.nmTuned)} Nm</b></span>
              <span class="k">Steigerung</span><span class="v num">+${fmt.num(gain)} PS (+${v.hpOrig ? Math.round(gain / v.hpOrig * 100) : 0} %) · +${fmt.num(gainNm)} Nm</span>
            </div>
          </div></div>
          <div class="card"><div class="card-body" style="padding:15px">
            <p class="mini-cap">Produkt &amp; Preis</p>
            <div class="kv">
              <span class="k">Produkt</span><span class="v">${esc(PRODUCT_META[v.productCode] || v.productCode)} (${esc(v.productCode)})</span>
              <span class="k">UVP brutto</span><span class="v num"><b style="color:var(--red-2)">${fmt.chf(v.price)}</b></span>
              <span class="k">Einbauzeit</span><span class="v num">ca. ${v.installMin} Min.</span>
            </div>
          </div></div>
        </div>

        ${v.fuelSaving ? `<div class="note-amber"><b>Mehrwert:</b> Bis zu <b class="num">${v.fuelSaving} %</b> Kraftstoffeinsparung durch die LET26-Motor- und Gaspedaloptimierung.</div>` : ''}
      </div>
      <div class="drawer-foot">
        <button class="btn btn-ghost" data-drawer-close>Schliessen</button>
        <div class="spacer"></div>
        <a class="btn btn-primary" href="#/konfigurator">${icons.bolt(15)} Offerte erstellen</a>
      </div>`);
  }

  AFN.views.fahrzeuge = { render };
})();
