/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — LET26 Fahrzeug-Konfigurator (3-Schritt-Wizard)
   01 Fahrzeug → 02 Leistung & Konditionen → 03 Offerte erstellen
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast, badge, FUEL_META } = AFN.ui;

  /* Wizard-Zustand */
  const W = {
    step: 1,
    vehicles: [],
    brands: [],
    filterBrand: '',
    filterFuel: '',
    search: '',
    vehicleId: null,
    calc: null,            /* Ergebnis von /calculate-performance */
    channel: 'b2c',
    warranty: 'none',
    install: 'self',
    b2bQty: 1,
    customerMode: 'new',  /* new | existing */
    customerId: null,
    customerSearch: '',
    customerResults: [],
    routing: [],           /* PLZ-Routing-Ergebnisse */
    partnerId: null,
    note: '',
    cust: { name: '', street: '', zip: '', city: '', email: '', phone: '' },
  };

  function resetWizard() {
    Object.assign(W, {
      step: 1, vehicleId: null, calc: null, channel: 'b2c', warranty: 'none',
      install: 'self', b2bQty: 1, customerMode: 'new', customerId: null,
      customerSearch: '', customerResults: [], routing: [], partnerId: null,
      note: '', cust: { name: '', street: '', zip: '', city: '', email: '', phone: '' },
    });
  }

  /* ── Hauptrrender ──────────────────────────────────────────────────────── */
  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">LET26 Konfigurator</span>
        <h1>Fahrzeug-Konfigurator</h1>
        <p class="sub">Fahrzeug wählen, Leistungssteigerung berechnen und in drei Schritten eine
        schweizerische Offerte mit 8,1&nbsp;% MwSt. erstellen — inklusive PDF und Follow-up-Plan.</p>
      </div>
    </div>

    <div class="wiz-steps" id="wizSteps">
      <div class="wiz-step" data-step="1">
        <div class="n">01</div>
        <div><div class="t">Fahrzeug</div><div class="s">Aus 68 Modellen wählen</div></div>
      </div>
      <div class="wiz-step" data-step="2">
        <div class="n">02</div>
        <div><div class="t">Leistung &amp; Konditionen</div><div class="s">Berechnen &amp; konfigurieren</div></div>
      </div>
      <div class="wiz-step" data-step="3">
        <div class="n">03</div>
        <div><div class="t">Offerte</div><div class="s">Kunde &amp; Partner erfassen</div></div>
      </div>
    </div>

    <div id="wizRoot"></div>`;

    if (W.step === 1) renderStep1();
    else if (W.step === 2) renderStep2();
    else renderStep3();
    syncSteps();
  }

  function syncSteps() {
    els('.wiz-step').forEach(elx => {
      const n = +elx.getAttribute('data-step');
      elx.classList.toggle('active', n === W.step);
      elx.classList.toggle('done', n < W.step);
    });
  }

  /* ══ Schritt 1: Fahrzeugauswahl ═══════════════════════════════════════ */
  function renderStep1() {
    const root = el('#wizRoot');
    root.innerHTML = `${AFN.ui.spinner('Fahrzeugdaten werden geladen …')}`;

    Promise.all([AFN.api.vehicles(), AFN.api.brands()])
      .then(([vehicles, brands]) => {
        W.vehicles = vehicles; W.brands = brands;
        paintStep1();
      })
      .catch(err => {
        root.innerHTML = `<div class="card"><div class="card-body" style="color:#FF8C9B">${icons.alert(16)} ${esc(err.message)}</div></div>`;
      });
  }

  function paintStep1() {
    const root = el('#wizRoot');
    const list = W.vehicles.filter(v => {
      if (W.filterBrand && v.brand !== W.filterBrand) return false;
      if (W.filterFuel && v.fuel !== W.filterFuel) return false;
      if (W.search) {
        const t = W.search.toLowerCase();
        if (!(v.brand + ' ' + v.model + ' ' + v.engine).toLowerCase().includes(t)) return false;
      }
      return true;
    });

    root.innerHTML = `
    <div class="card mb-3">
      <div class="card-body" style="padding:16px 20px">
        <div class="row row-wrap" style="gap:10px">
          <div class="input-wrap" style="flex:1;min-width:220px">
            <span class="lead-ico">${icons.search(16)}</span>
            <input class="input" id="vSearch" placeholder="Marke, Modell oder Motor suchen …" value="${esc(W.search)}">
          </div>
          <div class="seg" id="fuelSeg">
            <button data-fuel="" class="${!W.filterFuel ? 'active' : ''}">Alle</button>
            <button data-fuel="diesel" class="${W.filterFuel === 'diesel' ? 'active' : ''}">Diesel</button>
            <button data-fuel="benzin" class="${W.filterFuel === 'benzin' ? 'active' : ''}">Benzin</button>
            <button data-fuel="hybrid" class="${W.filterFuel === 'hybrid' ? 'active' : ''}">Hybrid</button>
          </div>
        </div>
        <div class="row row-wrap mt-2" style="gap:8px" id="brandChips">
          <button class="chip ${!W.filterBrand ? 'active' : ''}" data-brand=""><span class="count">${W.vehicles.length}</span> Alle Marken</button>
          ${W.brands.map(b => {
            const count = W.vehicles.filter(v => v.brand === b).length;
            return `<button class="chip ${W.filterBrand === b ? 'active' : ''}" data-brand="${esc(b)}"><span class="count">${count}</span> ${esc(b)}</button>`;
          }).join('')}
        </div>
      </div>
    </div>

    ${list.length === 0 ? `<div class="card"><div class="card-body">${AFN.ui.empty(icons.search(22), 'Keine Fahrzeuge gefunden', 'Suchbegriff oder Filter anpassen.')}</div></div>` : `
    <div class="vehicle-grid stagger">
      ${list.map(v => `
        <button class="v-card ${W.vehicleId === v.id ? 'active' : ''}" data-vehicle="${v.id}">
          <div class="brandline">
            <span class="vbrand">${esc(v.brand)}</span>
            <span class="fuel">${esc((FUEL_META[v.fuel] || {}).label || v.fuel)}</span>
          </div>
          <div class="vmodel">${esc(v.model)}</div>
          <div class="vengine">${esc(v.engine)}${v.years ? ' · Bj. ' + esc(v.years) : ''}</div>
          <div class="perf">
            <div class="pbox"><div class="pv">${v.hpOrig} <em>» ${v.hpTuned}</em></div><div class="pl">PS</div></div>
            <div class="pbox"><div class="pv">${v.nmOrig} <em>» ${v.nmTuned}</em></div><div class="pl">Nm</div></div>
          </div>
          <div class="pricerow">
            <span class="price">${fmt.chf(v.price)}</span>
            <span class="pcode">${esc(v.productCode)}</span>
          </div>
        </button>`).join('')}
    </div>`}

    <div class="row mt-4" style="justify-content:flex-end">
      <button class="btn btn-primary btn-lg" id="toStep2" ${W.vehicleId ? '' : 'disabled'}>
        Weiter — Leistung berechnen ${icons.arrowR(16)}
      </button>
    </div>`;

    /* Events */
    el('#vSearch').addEventListener('input', e => {
      W.search = e.target.value; refreshCards();
    });
    els('#fuelSeg button').forEach(b => b.addEventListener('click', () => {
      W.filterFuel = b.getAttribute('data-fuel'); paintStep1();
    }));
    els('#brandChips .chip').forEach(b => b.addEventListener('click', () => {
      W.filterBrand = b.getAttribute('data-brand'); paintStep1();
    }));
    els('[data-vehicle]').forEach(c => c.addEventListener('click', () => {
      W.vehicleId = +c.getAttribute('data-vehicle');
      els('[data-vehicle]').forEach(x => x.classList.toggle('active', +x.getAttribute('data-vehicle') === W.vehicleId));
      el('#toStep2').disabled = false;
    }));
    el('#toStep2').addEventListener('click', () => { W.step = 2; render(el('#viewRoot')); });

    function refreshCards() {
      /* Nur die Karten neu filtern — Input-Fokus behalten */
      const keep = document.activeElement && document.activeElement.id === 'vSearch' ? document.activeElement.value : null;
      paintStep1();
      if (keep !== null) { const inp = el('#vSearch'); inp.focus(); inp.setSelectionRange(keep.length, keep.length); }
    }
  }

  /* ══ Schritt 2: Leistung & Konditionen ═════════════════════════════════ */
  function renderStep2() {
    const root = el('#wizRoot');
    root.innerHTML = AFN.ui.spinner('Leistungsdaten werden berechnet …');
    recalc().then(() => paintStep2()).catch(err => {
      root.innerHTML = `<div class="card"><div class="card-body" style="color:#FF8C9B">${icons.alert(16)} ${esc(err.message)}</div></div>`;
    });
  }

  function recalc() {
    return AFN.api.calculatePerformance({
      vehicleId: W.vehicleId,
      warranty: W.warranty,
      install: W.install,
      channel: W.channel,
      b2bQty: W.b2bQty,
    }).then(res => { W.calc = res; return res; });
  }

  function paintStep2() {
    const root = el('#wizRoot');
    const v = W.calc.vehicle;
    const p = W.calc.performance;
    const t = W.calc.totals;
    const prod = W.calc.product;

    const tierInfo = (() => {
      if (W.channel !== 'b2b') return '';
      const tiers = [[10, 30], [5, 27], [3, 19], [1, 0]];
      let next = null;
      for (const [mq, d] of tiers) { if (W.b2bQty >= mq) { break; } next = [mq, d]; }
      const current = tiers.find(([mq]) => W.b2bQty >= mq);
      return `
      <div style="margin-top:12px;padding:12px 14px;border-radius:var(--r-sm);background:var(--bg-2);border:1px solid var(--line-soft);font-size:11.5px;color:var(--mut)">
        Aktueller Staffelrabatt: <b style="color:var(--green)">−${current ? current[1] : 0} %</b>
        ${next ? ` · ab <b style="color:var(--txt-2)">${next[0]} Stk.</b> → <b style="color:var(--green)">−${next[1]} %</b>` : ' · beste Staffel erreicht'}
      </div>`;
    })();

    root.innerHTML = `
    <div class="grid" style="grid-template-columns: 1fr 380px; gap:16px">

      <!-- Linke Spalte -->
      <div>
        <!-- Fahrzeug-Summary -->
        <div class="card mb-3">
          <div class="card-head">
            <div>
              <div class="card-title">${esc(v.brand)} ${esc(v.model)}</div>
              <div class="card-sub">${esc(v.engine)}${v.years ? ' · Bj. ' + esc(v.years) : ''} · ${esc((FUEL_META[v.fuel] || {}).label || v.fuel)} · Einbau ca. ${v.installMin} Min.</div>
            </div>
            <button class="btn btn-ghost btn-sm" id="backToVeh">${icons.arrowL(13)} Wechseln</button>
          </div>
          <div class="card-body">
            <div class="grid grid-2" style="gap:14px">
              <div class="delta-band">
                <div><span class="from">${v.hpOrig}</span><span class="arrow">${icons.arrowR(18)}</span><span class="to">${v.hpTuned}</span><span class="unit">PS</span></div>
              </div>
              <div class="delta-band">
                <div><span class="from">${v.nmOrig}</span><span class="arrow">${icons.arrowR(18)}</span><span class="to">${v.nmTuned}</span><span class="unit">Nm</span></div>
              </div>
            </div>
            <div class="grid grid-3 mt-2" style="gap:10px">
              <div class="stat-tile"><div class="v" style="color:var(--red-2)">+${p.hpGainPct} %</div><div class="l">Mehr Leistung</div></div>
              <div class="stat-tile"><div class="v" style="color:var(--red-2)">+${p.nmGainPct} %</div><div class="l">Mehr Drehmoment</div></div>
              <div class="stat-tile"><div class="v" style="color:var(--green)">−${p.fuelSavingPct} %</div><div class="l">Kraftstoff*</div></div>
            </div>
            <p style="font-size:10.5px;color:var(--mut-2);margin-top:12px">* Kraftstoffersparnis bei angepasster Fahrweise. Produkt: ${esc(prod.name)} (${esc(prod.code)}) · UVP ${fmt.chf(prod.uvpBrutto)}</p>
          </div>
        </div>

        <!-- Konditionen -->
        <div class="card">
          <div class="card-head"><div><div class="card-title">Konditionen wählen</div>
          <div class="card-sub">Verkaufskanal, Garantie und Einbau — der Preis aktualisiert sich live</div></div></div>
          <div class="card-body">

            <div class="field" style="margin-bottom:14px">
              <label>Verkaufskanal</label>
              <div class="seg red" id="channelSeg">
                <button data-ch="b2c" class="${W.channel === 'b2c' ? 'active' : ''}">B2C — Endkunde (UVP brutto)</button>
                <button data-ch="b2b" class="${W.channel === 'b2b' ? 'active' : ''}">B2B — Markenhaus (EK netto)</button>
              </div>
            </div>

            ${W.channel === 'b2b' ? `
            <div class="field" style="margin-bottom:14px">
              <label>Stückzahl (B2B-Staffel)</label>
              <div class="row" style="gap:14px">
                <div class="stepper">
                  <button id="qtyMinus">−</button><span class="val">${W.b2bQty} Stk.</span><button id="qtyPlus">+</button>
                </div>
                <input class="input" id="qtyInput" type="number" min="1" max="500" value="${W.b2bQty}" style="width:110px">
              </div>
              ${tierInfo}
            </div>` : `
            <div class="field">
              <label>Motorgarantie (optional, Zürich Versicherung)</label>
              <div class="grid" style="gap:10px" id="warrantyOpts">
                ${W.calc.warrantyOptions.map(w => `
                  <button class="opt-card ${W.warranty === w.id ? 'active' : ''}" data-w="${w.id}">
                    <span class="radio"></span>
                    <span><span class="t">${esc(w.label)}</span><span class="d" style="display:block">${w.months ? 'Laufzeit ' + w.months + ' Monate' : 'Ohne Zusatzgarantie'}</span></span>
                    <span class="p">${w.price ? fmt.chf(w.price) : '—'}</span>
                  </button>`).join('')}
              </div>
            </div>`}

            <div class="field" style="margin-bottom:0">
              <label>Einbau</label>
              <div class="grid" style="gap:10px" id="installOpts">
                <button class="opt-card ${W.install === 'self' ? 'active' : ''}" data-i="self">
                  <span class="radio"></span>
                  <span><span class="t">Selbsteinbau — Plug &amp; Play</span><span class="d" style="display:block">Original-Steckverbinder, ca. ${v.installMin} Minuten, IP65</span></span>
                  <span class="p">CHF 0.—</span>
                </button>
                <button class="opt-card ${W.install === 'partner' ? 'active' : ''}" data-i="partner">
                  <span class="radio"></span>
                  <span><span class="t">Einbau bei Partner-Garage vor Ort</span><span class="d" style="display:block">CHF 180/Std., min. CHF 60 — Garage wird in Schritt 3 geroutet</span></span>
                  <span class="p">${fmt.chf(t.installPrice || 0)}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Rechte Spalte: Live-Preis -->
      <div>
        <div class="card price-summary">
          <div class="card-head"><div><div class="card-title">Live-Preisberechnung</div>
          <div class="card-sub">${W.channel === 'b2b' ? 'B2B · EK netto abzgl. Staffelrabatt' : 'B2C · UVP brutto inkl. Optionen'}</div></div></div>
          <div class="card-body" id="priceBox">
            ${priceBoxMarkup(t)}
          </div>
        </div>
        <div class="row mt-3" style="gap:10px">
          <button class="btn btn-ghost" id="backToStep1">${icons.arrowL(15)} Zurück</button>
          <button class="btn btn-primary btn-lg" style="flex:1" id="toStep3">Weiter — Offerte erstellen ${icons.arrowR(16)}</button>
        </div>
      </div>
    </div>`;

    bindStep2();
  }

  function priceBoxMarkup(t) {
    return `
      <div class="rowline"><span class="lab">${W.channel === 'b2b' ? 'Warenwert (' + W.b2bQty + ' Stk. netto)' : 'Warenwert (UVP)'}</span><b>${fmt.chf(t.basePrice)}</b></div>
      ${t.warrantyPrice ? `<div class="rowline"><span class="lab">Motorgarantie Zürich</span><b>${fmt.chf(t.warrantyPrice)}</b></div>` : ''}
      ${t.installPrice ? `<div class="rowline"><span class="lab">Einbau Partner-Garage</span><b>${fmt.chf(t.installPrice)}</b></div>` : ''}
      <div class="rowline"><span class="lab">Porto &amp; Verpackung</span><b>${fmt.chf(t.shipping)}</b></div>
      <div class="rowline"><span class="lab">MwSt. 8,1 %</span><b>${fmt.chf(t.vatAmount)}</b></div>
      <div class="divider"></div>
      <div class="total-row"><span class="tl">Gesamtbetrag</span><span class="tv" id="priceTotal">${fmt.chf(t.total)}</span></div>
      <div class="vat-note">Total inkl. ${fmt.chf(t.shipping)} Porto und 8,1 % CH-MwSt.</div>`;
  }

  function bindStep2() {
    el('#backToVeh').addEventListener('click', () => { W.step = 1; render(el('#viewRoot')); });
    el('#backToStep1').addEventListener('click', () => { W.step = 1; render(el('#viewRoot')); });
    el('#toStep3').addEventListener('click', () => { W.step = 3; render(el('#viewRoot')); });

    els('#channelSeg button').forEach(b => b.addEventListener('click', () => {
      if (W.channel === b.getAttribute('data-ch')) return;
      W.channel = b.getAttribute('data-ch');
      renderStep2();
    }));

    els('#warrantyOpts .opt-card').forEach(c => c.addEventListener('click', () => {
      W.warranty = c.getAttribute('data-w');
      recalc().then(updatePrice).catch(() => {});
      els('#warrantyOpts .opt-card').forEach(x => x.classList.toggle('active', x === c));
    }));

    els('#installOpts .opt-card').forEach(c => c.addEventListener('click', () => {
      W.install = c.getAttribute('data-i');
      recalc().then(updatePrice).catch(() => {});
      els('#installOpts .opt-card').forEach(x => x.classList.toggle('active', x === c));
    }));

    const qm = el('#qtyMinus'), qp = el('#qtyPlus'), qi = el('#qtyInput');
    if (qm && qp && qi) {
      const setQty = n => {
        W.b2bQty = Math.max(1, Math.min(500, Math.round(n) || 1));
        qi.value = W.b2bQty;
        renderStep2();
      };
      qm.addEventListener('click', () => setQty(W.b2bQty - 1));
      qp.addEventListener('click', () => setQty(W.b2bQty + 1));
      qi.addEventListener('change', () => setQty(+qi.value));
    }
  }

  function updatePrice() {
    const box = el('#priceBox');
    if (box && W.calc) box.innerHTML = priceBoxMarkup(W.calc.totals);
  }

  /* ══ Schritt 3: Kunde & Offerte ═══════════════════════════════════════ */
  function renderStep3() {
    const root = el('#wizRoot');
    const v = W.calc.vehicle;
    const t = W.calc.totals;

    root.innerHTML = `
    <div class="grid" style="grid-template-columns: 1fr 380px; gap:16px">
      <div>
        <!-- Kunde -->
        <div class="card mb-3">
          <div class="card-head"><div><div class="card-title">Kunde</div>
          <div class="card-sub">Bestehenden Kunden wählen oder Neukunden erfassen</div></div>
          <div class="seg" id="custMode">
            <button data-m="existing" class="${W.customerMode === 'existing' ? 'active' : ''}">Bestehend</button>
            <button data-m="new" class="${W.customerMode === 'new' ? 'active' : ''}">Neukunde</button>
          </div></div>
          <div class="card-body" id="custBox">${W.customerMode === 'new' ? newCustMarkup() : existingCustMarkup()}</div>
        </div>

        <!-- Partner-Routing (nur bei Einbau partner) -->
        ${W.install === 'partner' ? `
        <div class="card mb-3">
          <div class="card-head"><div><div class="card-title">Partner-Garage routen</div>
          <div class="card-sub">Nächstgelegene Markenhäuser zur Kunden-PLZ — Marken-Match wird mit 15 km Bonus belohnt</div></div></div>
          <div class="card-body">
            <div class="row" style="gap:10px">
              <input class="input" id="routeZip" placeholder="Kunden-PLZ (z. B. 5432)" maxlength="4" inputmode="numeric" value="${esc(W.cust.zip || '')}" style="max-width:180px">
              <button class="btn btn-dark" id="routeBtn">${icons.pin(15)} Routen</button>
              <span class="dim small" style="flex:1">Automatisch auch bei der Offerten-Erstellung, sofern nicht manuell gewählt.</span>
            </div>
            <div id="routeResults" class="mt-3">${W.routing.length ? routeMarkup() : ''}</div>
          </div>
        </div>` : ''}

        <!-- Notiz -->
        <div class="card">
          <div class="card-head"><div><div class="card-title">Notiz zur Offerte <span class="dim" style="font-weight:400">(optional)</span></div></div></div>
          <div class="card-body">
            <textarea class="textarea" id="noteBox" placeholder="Interne Notiz, z. B. Kundenwünsche, Termine, Besonderheiten …">${esc(W.note)}</textarea>
          </div>
        </div>
      </div>

      <!-- Zusammenfassung -->
      <div>
        <div class="card price-summary">
          <div class="card-head"><div><div class="card-title">Zusammenfassung</div>
          <div class="card-sub">Schritt 3 von 3 · Erstellung mit PDF &amp; Follow-ups</div></div></div>
          <div class="card-body">
            <div class="kv mb-3">
              <span class="k">Fahrzeug</span><span class="v">${esc(v.brand)} ${esc(v.model)}</span>
              <span class="k">Motor</span><span class="v">${esc(v.engine)}</span>
              <span class="k">Leistung</span><span class="v">${v.hpOrig} → <b style="color:var(--red-2)">${v.hpTuned} PS</b> / ${v.nmOrig} → ${v.nmTuned} Nm</span>
              <span class="k">Kanal</span><span class="v">${W.channel === 'b2b' ? 'B2B · ' + W.b2bQty + ' Stk.' : 'B2C — Endkunde'}</span>
              <span class="k">Garantie</span><span class="v">${esc((W.calc.warrantyOptions.find(w => w.id === W.warranty) || { label: 'Keine' }).label)}</span>
              <span class="k">Einbau</span><span class="v">${W.install === 'partner' ? 'Partner-Garage vor Ort' : 'Selbsteinbau (Plug & Play)'}</span>
            </div>
            ${priceBoxMarkup(t)}
          </div>
        </div>

        <div class="row mt-3" style="gap:10px">
          <button class="btn btn-ghost" id="backToStep2">${icons.arrowL(15)} Zurück</button>
          <button class="btn btn-primary btn-lg" style="flex:1" id="createQuoteBtn">${icons.bolt(16)} Offerte erstellen</button>
        </div>
      </div>
    </div>`;

    bindStep3();
  }

  function newCustMarkup() {
    return `
    <div class="grid grid-2" style="gap:0 16px">
      <div class="field"><label>Name / Firma *</label><input class="input" id="cName" value="${esc(W.cust.name)}" placeholder="z. B. Anna Muster"></div>
      <div class="field"><label>Strasse</label><input class="input" id="cStreet" value="${esc(W.cust.street)}" placeholder="Musterstrasse 12"></div>
      <div class="field"><label>PLZ *</label><input class="input" id="cZip" value="${esc(W.cust.zip)}" maxlength="8" placeholder="5432"></div>
      <div class="field"><label>Ort *</label><input class="input" id="cCity" value="${esc(W.cust.city)}" placeholder="Neuenhof"></div>
      <div class="field"><label>E-Mail</label><input class="input" id="cEmail" type="email" value="${esc(W.cust.email)}" placeholder="anna@muster.ch"></div>
      <div class="field" style="margin-bottom:0"><label>Telefon</label><input class="input" id="cPhone" value="${esc(W.cust.phone)}" placeholder="+41 79 000 00 00"></div>
    </div>
    <p class="dim small mt-2">* Pflichtfelder. Die PLZ steuert das automatische Partner-Routing.</p>`;
  }

  function existingCustMarkup() {
    const sel = W.customerResults.find(c => c.id === W.customerId);
    return `
    <div class="row" style="gap:10px">
      <div class="input-wrap" style="flex:1">
        <span class="lead-ico">${icons.search(16)}</span>
        <input class="input" id="custSearch" placeholder="Kunde suchen (Name, Ort, PLZ) …" value="${esc(W.customerSearch)}">
      </div>
    </div>
    ${W.customerResults.length ? `
    <div class="mt-3" style="max-height:260px;overflow-y:auto;border:1px solid var(--line-soft);border-radius:var(--r-md)">
      ${W.customerResults.map(c => `
        <button data-cust="${c.id}" style="display:flex;width:100%;text-align:left;gap:12px;padding:12px 14px;align-items:center;
          border-bottom:1px solid var(--line-soft);transition:background .15s;${W.customerId === c.id ? 'background:var(--red-tint)' : ''}"
          onmouseover="this.style.background='${W.customerId === c.id ? 'var(--red-tint)' : 'rgba(255,255,255,.03)'}'"
          onmouseout="this.style.background='${W.customerId === c.id ? 'var(--red-tint)' : 'transparent'}'">
          <span class="avatar" style="width:32px;height:32px;font-size:11px;border-radius:9px">${esc(AFN.ui.initials(c.name))}</span>
          <span style="flex:1;min-width:0">
            <span style="display:block;font-size:13px;font-weight:600;color:var(--txt)">${esc(c.name)}</span>
            <span class="dim" style="display:block;font-size:11px">${esc(c.zip || '')} ${esc(c.city || '')} · Nr. ${c.customerNr}</span>
          </span>
          ${c.channel === 'b2b' ? '<span class="badge badge-violet">B2B</span>' : '<span class="badge badge-blue">B2C</span>'}
        </button>`).join('')}
    </div>` : W.customerSearch ? `<p class="dim small mt-2">Keine Treffer — als Neukunden erfassen?</p>` : `<p class="dim small mt-2">Mindestens 2 Zeichen eingeben, um zu suchen.</p>`}
    ${sel ? `<div class="mt-3" style="padding:12px 14px;border-radius:var(--r-md);background:var(--green-tint);border:1px solid rgba(47,216,124,.25);font-size:12.5px;color:var(--green)">Gewählt: <b>${esc(sel.name)}</b> · ${esc(sel.street || '')} ${esc(sel.zip || '')} ${esc(sel.city || '')}</div>` : ''}`;
  }

  function routeMarkup() {
    return `
    <div style="display:grid;gap:8px">
      ${W.routing.map((r, i) => `
        <button data-partner="${r.partner.id}" style="display:flex;width:100%;text-align:left;gap:14px;align-items:center;padding:13px 16px;
          border-radius:var(--r-md);border:1px solid ${W.partnerId === r.partner.id ? 'rgba(226,0,26,.55)' : 'var(--line)'};
          background:${W.partnerId === r.partner.id ? 'linear-gradient(180deg,rgba(226,0,26,.10),rgba(226,0,26,.03))' : 'var(--bg-2)'};
          transition:all .18s">
          <span style="flex-shrink:0;width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;
            font-family:var(--font-d);font-weight:700;font-size:12px;background:var(--surface-2);color:var(--txt-2);border:1px solid var(--line)">${i + 1}</span>
          <span style="flex:1;min-width:0">
            <span style="display:flex;align-items:center;gap:8px">
              <span style="font-size:13px;font-weight:600;color:var(--txt)">${esc(r.partner.company)}</span>
              ${r.brandMatch ? '<span class="badge badge-green" style="padding:2px 8px;font-size:9.5px">Marken-Match</span>' : ''}
            </span>
            <span class="dim" style="display:block;font-size:11px">${esc(r.partner.zip)} ${esc(r.partner.city)}${r.partner.canton ? ' (' + esc(r.partner.canton) + ')' : ''} · ${esc(r.partner.primaryBrand || (r.partner.brands || [])[0] || '')}</span>
          </span>
          <span style="flex-shrink:0;text-align:right">
            <span style="display:block;font-family:var(--font-d);font-size:15px;font-weight:700;color:${r.effectiveKm <= 15 ? 'var(--green)' : 'var(--txt)'}">${r.effectiveKm.toLocaleString('de-CH')} km</span>
            <span class="dim" style="font-size:10px">${r.distanceKm !== r.effectiveKm ? 'effektiv (real ' + r.distanceKm.toLocaleString('de-CH') + ' km)' : 'Distanz'}</span>
          </span>
        </button>`).join('')}
    </div>`;
  }

  function bindStep3() {
    el('#backToStep2').addEventListener('click', () => { W.step = 2; render(el('#viewRoot')); });
    els('#custMode button').forEach(b => b.addEventListener('click', () => {
      W.customerMode = b.getAttribute('data-m');
      const box = el('#custBox');
      box.innerHTML = W.customerMode === 'new' ? newCustMarkup() : existingCustMarkup();
      bindStep3();
    }));

    if (W.customerMode === 'new') {
      ['cName', 'cStreet', 'cZip', 'cCity', 'cEmail', 'cPhone'].forEach(id => {
        const f = el('#' + id);
        if (f) f.addEventListener('input', () => {
          W.cust[id.slice(1).toLowerCase()] = f.value;
          if (id === 'cZip') { const rz = el('#routeZip'); if (rz) rz.value = f.value; }
        });
      });
    } else {
      const cs = el('#custSearch');
      let timer = null;
      cs.addEventListener('input', () => {
        W.customerSearch = cs.value;
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (W.customerSearch.trim().length < 2) { W.customerResults = []; repaintCustBox(); return; }
          AFN.api.customers({ search: W.customerSearch.trim() })
            .then(rows => { W.customerResults = rows.slice(0, 8); repaintCustBox(); })
            .catch(() => {});
        }, 300);
      });
    }

    els('[data-cust]').forEach(b => b.addEventListener('click', () => {
      W.customerId = +b.getAttribute('data-cust');
      if (W.install === 'partner') {
        const z = W.customerResults.find(c => c.id === W.customerId);
        if (z && z.zip) { const rz = el('#routeZip'); if (rz) rz.value = z.zip; }
      }
      repaintCustBox();
    }));

    const routeBtn = el('#routeBtn');
    if (routeBtn) routeBtn.addEventListener('click', () => {
      const zip = el('#routeZip').value.trim();
      if (!/^\d{4}$/.test(zip)) { toast('error', 'Ungültige PLZ', 'Bitte eine 4-stellige Schweizer PLZ eingeben.'); return; }
      const v = W.calc.vehicle;
      routeBtn.disabled = true;
      AFN.api.routePartners(zip, v.brand)
        .then(rows => {
          W.routing = rows;
          if (rows.length && W.partnerId === null) W.partnerId = rows[0].partner.id;
          el('#routeResults').innerHTML = routeMarkup();
          els('[data-partner]').forEach(pb => pb.addEventListener('click', () => {
            W.partnerId = +pb.getAttribute('data-partner');
            el('#routeResults').innerHTML = routeMarkup();
            bindPartnerClicks();
          }));
          toast('info', rows.length + ' Partner-Garagen gefunden', 'Nächstgelegene für PLZ ' + zip + ' geroutet.');
        })
        .catch(err => toast('error', 'Routing fehlgeschlagen', err.message))
        .finally(() => { routeBtn.disabled = false; });
    });
    bindPartnerClicks();

    function bindPartnerClicks() {
      els('[data-partner]').forEach(pb => pb.addEventListener('click', () => {
        W.partnerId = +pb.getAttribute('data-partner');
        el('#routeResults').innerHTML = routeMarkup();
        bindPartnerClicks();
      }));
    }

    function repaintCustBox() {
      const box = el('#custBox');
      box.innerHTML = W.customerMode === 'new' ? newCustMarkup() : existingCustMarkup();
      bindStep3();
    }

    /* Offerte erstellen */
    el('#createQuoteBtn').addEventListener('click', createQuote);
    const nb = el('#noteBox');
    if (nb) nb.addEventListener('input', () => { W.note = nb.value; });
  }

  function createQuote() {
    const btn = el('#createQuoteBtn');
    let payload;

    if (W.customerMode === 'existing') {
      if (!W.customerId) { toast('error', 'Kunde fehlt', 'Bitte einen bestehenden Kunden auswählen oder als Neukunden erfassen.'); return; }
      payload = { customerId: W.customerId };
    } else {
      if (!W.cust.name.trim() || !W.cust.zip.trim() || !W.cust.city.trim()) {
        toast('error', 'Pflichtfelder fehlen', 'Name, PLZ und Ort des Kunden sind erforderlich.'); return;
      }
      payload = {
        customer: {
          name: W.cust.name.trim(), street: W.cust.street.trim() || null,
          zip: W.cust.zip.trim(), city: W.cust.city.trim(),
          email: W.cust.email.trim() || null, phone: W.cust.phone.trim() || null,
          channel: W.channel, notes: null,
        },
      };
    }

    Object.assign(payload, {
      vehicleId: W.vehicleId,
      warranty: W.warranty,
      install: W.install,
      channel: W.channel,
      b2bQty: W.b2bQty,
      partnerId: W.install === 'partner' ? W.partnerId : null,
      note: W.note.trim() || null,
    });

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2.5px;border-color:rgba(255,255,255,.3);border-top-color:#fff"></div> Offerte wird erstellt …`;

    AFN.api.generateQuote(payload)
      .then(quote => {
        showSuccess(quote);
        resetWizard();
      })
      .catch(err => {
        toast('error', 'Erstellung fehlgeschlagen', err.message);
        btn.disabled = false;
        btn.innerHTML = `${icons.bolt(16)} Offerte erstellen`;
      });
  }

  function showSuccess(q) {
    AFN.ui.modal.open(`
      <div class="modal-head">
        <h3 style="display:flex;align-items:center;gap:10px;color:var(--green)">${icons.checkCircle(22)} Offerte erstellt</h3>
        <button class="btn-icon" data-modal-close>${icons.x(17)}</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13.5px;color:var(--txt-2)">
          Die Offerte <b class="ref" style="color:var(--red-2)">#${q.refNumber}</b> für
          <b style="color:var(--txt)">${esc(q.customer ? q.customer.name : '')}</b> wurde erfolgreich erstellt.
        </p>
        <div class="grid grid-3 mt-3" style="gap:10px">
          <div class="stat-tile"><div class="v">${fmt.chf(q.total).replace('CHF ', '')}</div><div class="l">Total CHF</div></div>
          <div class="stat-tile"><div class="v">${fmt.num((q.followups || []).length)}</div><div class="l">Follow-ups geplant</div></div>
          <div class="stat-tile"><div class="v" style="color:var(--green)">PDF</div><div class="l">Bereit zum Download</div></div>
        </div>
        <div class="mt-3" style="padding:14px 16px;border-radius:var(--r-md);background:var(--bg-2);border:1px solid var(--line-soft);font-size:12px;color:var(--mut)">
          <b style="color:var(--txt-2)">Nächste Schritte:</b> Follow-ups Tag 1 / 3 / 7 sind automatisch in
          <a href="#/aufgaben" style="color:var(--red-2);font-weight:600">Aufgaben</a> geplant —
          mit Skripten aus dem «Leitfaden Mischa».
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="dlPdfBtn">${icons.download(15)} PDF herunterladen</button>
        <button class="btn btn-primary" id="toListBtn">${icons.doc(15)} Offerten öffnen</button>
      </div>`, { onClose: null });

    el('#dlPdfBtn').addEventListener('click', () => {
      AFN.api.downloadPdf(q.id, q.refNumber)
        .then(() => toast('success', 'PDF heruntergeladen', 'Offerte_' + q.refNumber + '_AutoFaszination.pdf'))
        .catch(err => toast('error', 'Download fehlgeschlagen', err.message));
    });
    el('#toListBtn').addEventListener('click', () => {
      AFN.ui.modal.close();
      location.hash = '#/offerten?focus=' + q.id;
    });
  }

  AFN.views.konfigurator = { render };
})();
