/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V4.1 — Werkstatt (Auftrags-Kanban)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast, drawer, WS_STATUS_META } = AFN.ui;

  const CHAIN = ['geplant', 'in_arbeit', 'qualitaet', 'abgeschlossen'];

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">Operationen</span>
        <h1>Werkstatt</h1>
        <p class="sub">Auftrags-Steuerung nach dem Status-Flow Geplant → In Arbeit → Qualitätskontrolle → Abgeschlossen — mit Bühnen-Auslastung und Fortschritt je Auftrag.</p>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" id="wsRefresh">${icons.refresh(15)} Aktualisieren</button>
      </div>
    </div>
    <div id="wsRoot">${AFN.ui.spinner('Aufträge werden geladen …')}</div>`;

    el('#wsRefresh').addEventListener('click', load);
    load();
  }

  function load() {
    AFN.api.workshop().then(paint).catch(err => {
      el('#wsRoot').innerHTML =
        `<div class="card"><div class="card-body" style="color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div></div>`;
    });
  }

  function paint(d) {
    const k = d.kpis;

    el('#wsRoot').innerHTML = `
    <div class="kpi-grid stagger">
      <div class="kpi">
        <div class="head"><span class="lbl">Aktive Aufträge</span><span class="ico">${icons.wrench(19)}</span></div>
        <div class="val">${fmt.num(k.active)}</div>
        <div class="sub">In Arbeit &amp; in Qualitätskontrolle</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Heute geplant</span><span class="ico blue">${icons.calendar(19)}</span></div>
        <div class="val">${fmt.num(k.todayCount)}</div>
        <div class="sub"><b>${fmt.num(k.bookedMinToday)}</b> von ${k.capacityMinPerDay} Min. Bühnenzeit</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Bühnen-Auslastung</span><span class="ico ${k.utilizationPct > 85 ? 'amber' : 'green'}">${icons.trend(19)}</span></div>
        <div class="val">${k.utilizationPct} %</div>
        <div class="sub">2 Hebebühnen × 8 Stunden pro Tag</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Offene Werkzeit</span><span class="ico amber">${icons.clock(19)}</span></div>
        <div class="val">${Math.round(k.openWorkMin / 60 * 10) / 10} h</div>
        <div class="sub">${fmt.num(k.done)} abgeschlossen · ${fmt.num(k.planned)} geplant</div>
      </div>
    </div>

    <div class="kanban mt-4">
      ${CHAIN.map(status => {
        const meta = WS_STATUS_META[status];
        const orders = d.orders.filter(o => o.status === status);
        return `
        <div class="kanban-col">
          <div class="kanban-head">
            <span class="kdot ${status}"></span>
            <b>${esc(meta.label)}</b>
            <span class="kcount num">${orders.length}</span>
          </div>
          <div class="kanban-body">
            ${orders.length === 0 ? '<div class="kanban-empty">Keine Aufträge</div>' : orders.map(o => `
              <div class="kcard clickable" data-wo="${o.id}">
                <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
                  <b style="font-size:12px">${esc(o.orderNumber)}</b>
                  <span class="dim num" style="font-size:10.5px">${fmt.dateDE(o.scheduledAt)}</span>
                </div>
                <div style="font-size:11.5px;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(o.customerName)}">${esc(o.customerName)}</div>
                <div class="dim" style="font-size:10.5px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${o.vehicle ? esc(o.vehicle.brand + ' ' + o.vehicle.model) : '—'}">
                  ${o.vehicle ? esc(o.vehicle.brand + ' ' + o.vehicle.model) : '—'}
                </div>
                ${o.vehicle ? `<div class="dim num" style="font-size:10.5px;margin-top:2px">${o.vehicle.hpOrig} → <b style="color:var(--red)">${o.vehicle.hpTuned}</b> PS</div>` : ''}
                <div class="mt-2">
                  <div class="dim" style="display:flex;justify-content:space-between;font-size:9.5px;margin-bottom:4px">
                    <span>${esc(o.mechanic || '—')}</span><span class="num">${o.progress}%</span>
                  </div>
                  <div class="ptrack"><div class="pfill" style="width:${o.progress}%"></div></div>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;

    els('[data-wo]').forEach(c => c.addEventListener('click', () =>
      openDetail(+c.getAttribute('data-wo'), d)));
  }

  /* ── Auftrags-Detail (Drawer mit Workflow-Stepper) ─────────────────────── */
  function openDetail(id, d) {
    const o = d.orders.find(x => x.id === id);
    if (!o) return;
    const meta = WS_STATUS_META[o.status] || { label: o.status };
    const stepIdx = CHAIN.indexOf(o.status);

    drawer.open(`
      <div class="drawer-head">
        <div>
          <div class="dt">${esc(o.orderNumber)} — ${esc(o.customerName)}</div>
          <div class="dim small mt-1">${o.vehicle ? esc(o.vehicle.brand + ' ' + o.vehicle.model) : '—'} · geplant am ${fmt.dateTimeDE(o.scheduledAt)}</div>
        </div>
        <button class="btn-icon drawer-close" data-drawer-close title="Schliessen">${icons.x(18)}</button>
      </div>
      <div class="drawer-body">

        <div class="wsteps mb-3">
          ${CHAIN.map((s, i) => `
            <div class="wstep ${i < stepIdx ? 'done' : ''} ${i === stepIdx ? 'now' : ''}">
              <span class="wstep-dot">${i < stepIdx ? icons.check(11) : i + 1}</span>
              <span class="wstep-lbl">${esc(WS_STATUS_META[s].label)}</span>
            </div>
            ${i < CHAIN.length - 1 ? `<span class="wstep-bar ${i < stepIdx ? 'done' : ''}"></span>` : ''}
          `).join('')}
        </div>

        <div class="grid grid-2 mb-3" style="gap:12px">
          <div class="card"><div class="card-body" style="padding:15px">
            <p class="mini-cap">Auftrag</p>
            <div class="kv">
              <span class="k">Status</span><span class="v">${esc(meta.label)}</span>
              <span class="k">Mechaniker</span><span class="v">${esc(o.mechanic || '—')}</span>
              <span class="k">Werkzeit</span><span class="v num">${o.installMin} Min.</span>
            </div>
          </div></div>
          <div class="card"><div class="card-body" style="padding:15px">
            <p class="mini-cap">Fahrzeug / Offerte</p>
            <div class="kv">
              <span class="k">Modell</span><span class="v">${o.vehicle ? esc(o.vehicle.brand + ' ' + o.vehicle.model) : '—'}</span>
              <span class="k">Leistung</span><span class="v num">${o.vehicle ? o.vehicle.hpOrig + ' → <b style="color:var(--red)">' + o.vehicle.hpTuned + '</b> PS' : '—'}</span>
              <span class="k">Offerte</span><span class="v">${o.quote ? '#' + o.quote.refNumber + ' · ' + fmt.chf(o.quote.total) : '—'}</span>
            </div>
          </div></div>
        </div>

        <div class="card mb-3"><div class="card-body" style="padding:15px">
          <p class="mini-cap">Fortschritt</p>
          <div class="row" style="justify-content:space-between;margin-bottom:7px">
            <span class="dim" style="font-size:11px">${esc(o.mechanic || 'Werkstatt')}</span>
            <b class="num" style="font-size:15px;color:var(--red)">${o.progress} %</b>
          </div>
          <div class="ptrack" style="height:10px"><div class="pfill" style="width:${o.progress}%"></div></div>
          <div class="row" style="gap:6px;margin-top:12px">
            ${[25, 50, 75, 100].map(p => `<button class="btn btn-ghost btn-sm num ${o.progress === p ? 'active' : ''}" data-prog="${p}">${p} %</button>`).join('')}
          </div>
        </div></div>

        ${o.partner ? `
        <div class="kv-card">
          <p class="mini-cap">Partner-Garage</p>
          <div class="kv"><span class="k">Einbau bei</span><span class="v">${esc(o.partner.company)} · ${esc(o.partner.city)}</span></div>
        </div>` : ''}

        ${o.notes ? `<div class="note-amber mt-3"><b>Notiz:</b> ${esc(o.notes)}</div>` : ''}
      </div>
      <div class="drawer-foot">
        <button class="btn btn-ghost" data-drawer-close>Schliessen</button>
        <div class="spacer"></div>
        ${o.status !== 'abgeschlossen' ? `<button class="btn btn-primary" id="woAdvance">${icons.arrowR(14)} Weiterstellen → ${esc(WS_STATUS_META[CHAIN[Math.min(stepIdx + 1, 3)]].label)}</button>` : '<span class="badge badge-green"><span class="dot"></span>Abgeschlossen</span>'}
      </div>`);

    els('[data-prog]', el('#drawer')).forEach(b => b.addEventListener('click', () => {
      AFN.api.patchWorkshop(o.id, { action: 'set-progress', progress: +b.getAttribute('data-prog') })
        .then(() => { drawer.close(); toast('success', 'Fortschritt gesetzt', o.orderNumber + ' → ' + b.getAttribute('data-prog') + ' %.'); load(); })
        .catch(err => toast('error', 'Fehler', err.message));
    }));

    const adv = el('#woAdvance');
    if (adv) adv.addEventListener('click', () => {
      AFN.api.patchWorkshop(o.id, { action: 'advance' })
        .then(() => {
          drawer.close();
          const next = WS_STATUS_META[CHAIN[Math.min(stepIdx + 1, 3)]].label;
          toast('success', 'Auftrag weitergestellt', o.orderNumber + ' → ' + next + '.');
          load();
        }).catch(err => toast('error', 'Fehler beim Weiterstellen', err.message));
    });
  }

  AFN.views.werkstatt = { render };
})();
