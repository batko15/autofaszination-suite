/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V4.1 — Rechnungen (Forderungs-Management)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast, drawer, INVOICE_STATUS_META } = AFN.ui;
  const { barChart } = AFN.charts;

  let statusTab = '';

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">Finanzen</span>
        <h1>Rechnungen</h1>
        <p class="sub">Offerte → Rechnung: bezahlter Umsatz, offene Posten und überfällige Forderungen aus gewonnenen Offerten — inkl. MWST 8.1 %.</p>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" id="invCsvBtn">${icons.download(15)} CSV-Export</button>
      </div>
    </div>
    <div id="invRoot">${AFN.ui.spinner('Rechnungen werden geladen …')}</div>`;

    el('#invCsvBtn').addEventListener('click', () => {
      if (!lastData || !lastData.invoices.length) { toast('info', 'Keine Daten', 'Es gibt keine Rechnungen zum Exportieren.'); return; }
      AFN.api.downloadCsv('rechnungen.csv', lastData.invoices.map(i => ({
        Nummer: i.invoiceNumber, Kunde: i.customerName, Ort: i.customerCity,
        Total: i.total.toFixed(2), Status: i.invoiceStatusLabel || i.status,
        Ausgestellt: i.issuedAt.slice(0, 10), Fällig: i.dueAt.slice(0, 10),
        Bezahlt: i.paidAt ? i.paidAt.slice(0, 10) : '',
      })));
      toast('success', 'Export gestartet', 'rechnungen.csv wird heruntergeladen.');
    });

    load();
  }

  let lastData = null;

  function load() {
    AFN.api.invoices().then(data => {
      lastData = data;
      paint(data);
    }).catch(err => {
      el('#invRoot').innerHTML =
        `<div class="card"><div class="card-body" style="color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div></div>`;
    });
  }

  function paint(d) {
    const k = d.kpis;
    const overdueThere = k.overdueCount > 0;

    const filtered = d.invoices.filter(i => !statusTab ||
      (statusTab === 'ueberfaellig' ? (i.status === 'ueberfaellig' || i.overdue) : i.status === statusTab));

    el('#invRoot').innerHTML = `
    <div class="kpi-grid stagger">
      <div class="kpi">
        <div class="head"><span class="lbl">Bezahlter Umsatz</span><span class="ico green">${icons.euro(19)}</span></div>
        <div class="val">${fmt.chfShort(k.revenuePaid)}</div>
        <div class="sub">Ø Zahlungszeit <b>${k.avgPaymentDays === null ? '—' : k.avgPaymentDays + ' Tage'}</b></div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Offene Posten</span><span class="ico blue">${icons.doc(19)}</span></div>
        <div class="val">${fmt.chfShort(k.receivables)}</div>
        <div class="sub"><b>${fmt.num(k.openCount)}</b> Rechnung${k.openCount === 1 ? '' : 'en'} offen</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Überfällig</span><span class="ico ${overdueThere ? 'amber' : 'green'}">${icons.alert(19)}</span></div>
        <div class="val">${fmt.chfShort(k.overdueAmount)}</div>
        <div class="sub"><b>${fmt.num(k.overdueCount)}</b> Rechnung${k.overdueCount === 1 ? '' : 'en'} über Zahlungsfrist</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Rechnungen</span><span class="ico">${icons.file(19)}</span></div>
        <div class="val">${fmt.num(d.count)}</div>
        <div class="sub">Gesamt ausgestellt · 30 Tage Zahlungsfrist</div>
      </div>
    </div>

    <div class="grid grid-2 mt-4 stagger">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Umsatz nach Monat</div>
            <div class="card-sub">Rechnungstotale der letzten 6 Monate</div>
          </div>
        </div>
        <div class="card-body"><div class="chart-bars" id="invChart"></div></div>
      </div>
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Status-Verteilung</div>
            <div class="card-sub">Alle Rechnungen nach Zahlungsstand</div>
          </div>
        </div>
        <div class="card-body" id="invBars"></div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-body" style="padding:12px 16px">
        <div class="seg" id="invSeg">
          <button data-s="" class="${!statusTab ? 'active' : ''}">Alle (${d.count})</button>
          <button data-s="offen" class="${statusTab === 'offen' ? 'active' : ''}">Offen (${d.invoices.filter(i => i.status === 'offen' && !i.overdue).length})</button>
          <button data-s="ueberfaellig" class="${statusTab === 'ueberfaellig' ? 'active' : ''}">Überfällig (${d.invoices.filter(i => i.status === 'ueberfaellig' || (i.status === 'offen' && i.overdue)).length})</button>
          <button data-s="bezahlt" class="${statusTab === 'bezahlt' ? 'active' : ''}">Bezahlt (${d.invoices.filter(i => i.status === 'bezahlt').length})</button>
        </div>
      </div>
      <div class="card-body flush" id="invList"></div>
    </div>`;

    barChart(el('#invChart'), d.months.map(m => ({ label: m.label, value: m.revenue })), {
      formatValue: v => fmt.chfShort(v),
    });

    AFN.charts.hbars(el('#invBars'), [
      { label: 'Bezahlt', value: d.invoices.filter(i => i.status === 'bezahlt').length },
      { label: 'Offen', value: d.invoices.filter(i => i.status === 'offen' && !i.overdue).length },
      { label: 'Überfällig', value: d.invoices.filter(i => i.status === 'ueberfaellig' || (i.status === 'offen' && i.overdue)).length },
      { label: 'Storniert', value: d.invoices.filter(i => i.status === 'storniert').length },
    ], { formatValue: v => fmt.num(v) + '×' });

    els('#invSeg button').forEach(b => b.addEventListener('click', () => {
      statusTab = b.getAttribute('data-s');
      els('#invSeg button').forEach(x => x.classList.toggle('active', x === b));
      paintList(el('#invList'), d);
    }));

    paintList(el('#invList'), d);
  }

  function paintList(box, d) {
    const filtered = d.invoices.filter(i => !statusTab ||
      (statusTab === 'ueberfaellig' ? (i.status === 'ueberfaellig' || i.overdue) : i.status === statusTab));

    if (!filtered.length) {
      box.innerHTML = AFN.ui.empty(icons.file(22), 'Keine Rechnungen', 'In diesem Status gibt es aktuell keine Rechnungen.');
      return;
    }

    box.innerHTML = `
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr>
          <th>Rechnungsnr.</th><th>Kunde</th><th>Fahrzeug</th>
          <th class="r">Total</th><th>Status</th><th>Ausgestellt</th><th>Fällig</th>
        </tr></thead>
        <tbody>
          ${filtered.map(i => {
            const meta = INVOICE_STATUS_META[i.status] || { label: i.status, cls: 'badge-zinc' };
            const shown = i.overdue && i.status === 'offen'
              ? { label: 'Überfällig', cls: 'badge-red' } : meta;
            return `
            <tr class="clickable ${i.overdue ? 'row-overdue' : ''}" data-inv="${i.id}">
              <td class="ref">${esc(i.invoiceNumber)}</td>
              <td class="strong">${esc(i.customerName)}</td>
              <td class="dim">${i.vehicle ? esc(i.vehicle.brand + ' ' + i.vehicle.model) : '—'}</td>
              <td class="r strong num">${fmt.chf(i.total)}</td>
              <td><span class="badge ${shown.cls}"><span class="dot"></span>${esc(shown.label)}</span></td>
              <td class="dim num">${fmt.dateDE(i.issuedAt)}</td>
              <td class="dim num">${fmt.dateDE(i.dueAt)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

    els('[data-inv]', box).forEach(tr => tr.addEventListener('click', () =>
      openDetail(+tr.getAttribute('data-inv'), d)));
  }

  /* ── Rechnungs-Detail (Drawer) ─────────────────────────────────────────── */
  function openDetail(id, d) {
    const i = d.invoices.find(x => x.id === id);
    if (!i) return;
    const meta = INVOICE_STATUS_META[i.status] || { label: i.status, cls: 'badge-zinc' };
    const shown = i.overdue && i.status === 'offen' ? { label: 'Überfällig', cls: 'badge-red' } : meta;

    drawer.open(`
      <div class="drawer-head">
        <div>
          <div class="dt">${esc(i.invoiceNumber)}</div>
          <div class="dim small mt-1">${esc(i.customerName)} · ${esc(i.customerZip || '')} ${esc(i.customerCity || '')}</div>
        </div>
        <button class="btn-icon drawer-close" data-drawer-close title="Schliessen">${icons.x(18)}</button>
      </div>
      <div class="drawer-body">

        <div class="row" style="gap:8px;margin-bottom:16px">
          <span class="badge ${shown.cls}"><span class="dot"></span>${esc(shown.label)}</span>
          ${i.overdue ? '<span class="badge badge-red">Zahlungsfrist überschritten</span>' : ''}
          ${i.quote ? '<span class="badge badge-zinc">aus Offerte #' + i.quote.refNumber + '</span>' : ''}
        </div>

        <div class="card mb-3"><div class="card-body" style="padding:16px">
          <p class="mini-cap">Rekapitulation</p>
          <div class="kv">
            <span class="k">Fahrzeug</span><span class="v">${i.vehicle ? esc(i.vehicle.brand + ' ' + i.vehicle.model) + ' · ' + esc(i.vehicle.engine) : '—'}</span>
            <span class="k">Subtotal</span><span class="v num">${fmt.chf(i.subtotal)}</span>
            <span class="k">MWST 8.1 %</span><span class="v num">${fmt.chf(i.vatAmount)}</span>
          </div>
          <div class="recap-total mt-2">
            <span>Total inkl. MWST</span>
            <b class="num">${fmt.chf(i.total)}</b>
          </div>
        </div></div>

        <div class="grid grid-2 mb-3" style="gap:12px">
          <div class="card"><div class="card-body" style="padding:15px">
            <p class="mini-cap">Zahlungsziel</p>
            <div class="kv">
              <span class="k">Ausgestellt</span><span class="v num">${fmt.dateDE(i.issuedAt)}</span>
              <span class="k">Fällig am</span><span class="v num">${fmt.dateDE(i.dueAt)}</span>
              <span class="k">Frist</span><span class="v">${i.paymentTerms} Tage</span>
            </div>
          </div></div>
          <div class="card"><div class="card-body" style="padding:15px">
            <p class="mini-cap">Zahlungseingang</p>
            ${i.paidAt ? `
              <div style="padding:10px 12px;border-radius:var(--r-sm);background:rgba(47,216,124,.08);border:1px solid rgba(47,216,124,.25)">
                <div class="dim" style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:700">Bezahlt am</div>
                <b class="num" style="font-size:15px">${fmt.dateDE(i.paidAt)}</b>
              </div>` : `
              <div class="dim" style="font-size:12px">Noch keine Zahlung verbucht.</div>
              <button class="btn btn-primary btn-sm mt-2" id="payBtn">${icons.check(13)} Zahlung verbuchen</button>`}
          </div></div>
        </div>

        <div class="kv-card">
          <p class="mini-cap">Kunde</p>
          <div class="kv">
            <span class="k">E-Mail</span><span class="v">${esc(i.customerEmail || '—')}</span>
            <span class="k">Ort</span><span class="v">${esc(i.customerZip || '')} ${esc(i.customerCity || '')}</span>
          </div>
        </div>
      </div>
      <div class="drawer-foot">
        <button class="btn btn-ghost" data-drawer-close>Schliessen</button>
        <div class="spacer"></div>
        ${i.status !== 'bezahlt' && i.status !== 'storniert' ? `<button class="btn btn-primary" id="payBtnFoot">${icons.check(14)} Zahlung verbuchen</button>` : ''}
        ${i.status !== 'storniert' && i.status !== 'bezahlt' ? `<button class="btn btn-ghost" id="stornoBtn" style="color:#FF8C9B">Stornieren</button>` : ''}
      </div>`);

    const pay = () => AFN.api.patchInvoice(i.id, { status: 'bezahlt' })
      .then(() => {
        drawer.close();
        toast('success', 'Zahlung verbucht', i.invoiceNumber + ' · ' + fmt.chf(i.total) + ' als bezahlt erfasst.');
        load();
      }).catch(err => toast('error', 'Fehler beim Verbuchen', err.message));

    [el('#payBtn'), el('#payBtnFoot')].forEach(b => b && b.addEventListener('click', pay));
    const st = el('#stornoBtn');
    if (st) st.addEventListener('click', () => AFN.api.patchInvoice(i.id, { status: 'storniert' })
      .then(() => {
        drawer.close();
        toast('info', 'Rechnung storniert', i.invoiceNumber + ' wurde storniert.');
        load();
      }).catch(err => toast('error', 'Fehler', err.message)));
  }

  AFN.views.rechnungen = { render };
})();
