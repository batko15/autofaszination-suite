/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — Offerten-Verwaltung mit Detail-Drawer
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast, badge, drawer, STATUS_META } = AFN.ui;

  const F = { status: '', channel: '', search: '' };

  function render(root, params) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">Offerten-Verwaltung</span>
        <h1>Offerten</h1>
        <p class="sub">Alle LET26-Offerten mit Statusverwaltung, PDF-Download, E-Mail-Entwürfen
        und Follow-up-Plan — Details per Klick auf eine Zeile.</p>
      </div>
      <div class="actions">
        <a class="btn btn-primary" href="#/konfigurator">${icons.plus(15)} Neue Offerte</a>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body" style="padding:14px 16px">
        <div class="row row-wrap" style="gap:10px">
          <div class="seg" id="statusSeg">
            <button data-s="" class="${!F.status ? 'active' : ''}">Alle</button>
            <button data-s="offen" class="${F.status === 'offen' ? 'active' : ''}">Offen</button>
            <button data-s="versendet" class="${F.status === 'versendet' ? 'active' : ''}">Versendet</button>
            <button data-s="gewonnen" class="${F.status === 'gewonnen' ? 'active' : ''}">Gewonnen</button>
            <button data-s="verloren" class="${F.status === 'verloren' ? 'active' : ''}">Verloren</button>
          </div>
          <div class="seg" id="channelSeg">
            <button data-c="" class="${!F.channel ? 'active' : ''}">Beide Kanäle</button>
            <button data-c="b2c" class="${F.channel === 'b2c' ? 'active' : ''}">B2C</button>
            <button data-c="b2b" class="${F.channel === 'b2b' ? 'active' : ''}">B2B</button>
          </div>
          <div class="spacer"></div>
          <div class="input-wrap" style="min-width:240px">
            <span class="lead-ico">${icons.search(16)}</span>
            <input class="input" id="qSearch" placeholder="Kunde oder Referenz-Nr. suchen …" value="${esc(F.search)}">
          </div>
        </div>
      </div>
    </div>

    <div class="card" id="quoteListCard">
      <div class="card-body" id="quoteList">${AFN.ui.spinner('Offerten werden geladen …')}</div>
    </div>`;

    /* Filter-Events */
    els('#statusSeg button').forEach(b => b.addEventListener('click', () => {
      F.status = b.getAttribute('data-s'); rerenderFilters(); load();
    }));
    els('#channelSeg button').forEach(b => b.addEventListener('click', () => {
      F.channel = b.getAttribute('data-c'); rerenderFilters(); load();
    }));
    let timer = null;
    el('#qSearch').addEventListener('input', e => {
      F.search = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(load, 320);
    });

    function rerenderFilters() {
      els('#statusSeg button').forEach(b => b.classList.toggle('active', b.getAttribute('data-s') === F.status));
      els('#channelSeg button').forEach(b => b.classList.toggle('active', b.getAttribute('data-c') === F.channel));
    }

    load().then(() => {
      if (params && params.focus) openDetail(+params.focus);
    });
  }

  function load() {
    const box = el('#quoteList');
    return AFN.api.quotes({
      status: F.status || undefined,
      channel: F.channel || undefined,
      search: F.search || undefined,
    }).then(rows => {
      if (!rows.length) {
        box.innerHTML = AFN.ui.empty(icons.doc(22), 'Keine Offerten gefunden',
          'Filter zurücksetzen oder eine neue Offerte im Konfigurator erstellen.');
        return;
      }
      const volume = rows.reduce((s, q) => s + (q.total || 0), 0);
      box.innerHTML = `
      <div class="row row-wrap" style="padding:0 20px 14px;gap:16px;border-bottom:1px solid var(--line-soft)">
        <span class="dim small"><b style="color:var(--txt)">${fmt.num(rows.length)}</b> Offerten · Gesamtvolumen <b style="color:var(--txt)">${fmt.chf(volume)}</b></span>
      </div>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Referenz</th><th>Kunde</th><th>Fahrzeug</th><th>Kanal</th>
            <th class="r">Total</th><th>Status</th><th>Datum</th><th class="r">Aktion</th>
          </tr></thead>
          <tbody>
          ${rows.map(q => `
            <tr class="clickable" data-quote="${q.id}">
              <td class="ref">#${q.refNumber}</td>
              <td class="strong" style="max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(q.customer ? q.customer.name : '?')}</td>
              <td class="dim" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(q.vehicle ? q.vehicle.brand + ' ' + q.vehicle.model : '?')}</td>
              <td>${q.channel === 'b2b' ? '<span class="badge badge-violet">B2B</span>' : '<span class="badge badge-blue">B2C</span>'}</td>
              <td class="r strong num">${fmt.chf(q.total)}</td>
              <td>${badge(STATUS_META[q.status] || { label: q.status, cls: 'badge-zinc' })}</td>
              <td class="dim num">${fmt.dateDE(q.createdAt)}</td>
              <td class="r">
                <button class="btn-icon" data-pdf="${q.id}" data-ref="${q.refNumber}" title="PDF herunterladen" style="display:inline-flex">${icons.download(16)}</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

      els('[data-quote]', box).forEach(tr => tr.addEventListener('click', e => {
        if (e.target.closest('[data-pdf]')) return;
        openDetail(+tr.getAttribute('data-quote'));
      }));
      els('[data-pdf]', box).forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        AFN.api.downloadPdf(+b.getAttribute('data-pdf'), b.getAttribute('data-ref'))
          .then(() => toast('success', 'PDF heruntergeladen', 'Offerte_' + b.getAttribute('data-ref') + '_AutoFaszination.pdf'))
          .catch(err => toast('error', 'Download fehlgeschlagen', err.message));
      }));
    }).catch(err => {
      box.innerHTML = `<div style="padding:20px;color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div>`;
    });
  }

  /* ── Detail-Drawer ─────────────────────────────────────────────────────── */
  function openDetail(id) {
    AFN.api.quote(id).then(q => {
      const items = q.items || [];
      const emailTabs = q.emails ? Object.keys(q.emails) : [];

      drawer.open(`
        <div class="drawer-head">
          <div>
            <div class="dt"><span class="ref">#${q.refNumber}</span>
              ${badge(STATUS_META[q.status] || { label: q.status, cls: 'badge-zinc' })}</div>
            <div class="dim small mt-1">${fmt.dateTimeDE(q.createdAt)} · ${esc(q.employee ? q.employee.name : '')} ·
              ${q.channel === 'b2b' ? 'B2B (' + q.b2bQty + ' Stk.)' : 'B2C'}</div>
          </div>
          <button class="btn-icon drawer-close" data-drawer-close title="Schliessen">${icons.x(18)}</button>
        </div>
        <div class="drawer-body">

          <!-- Kunde + Fahrzeug -->
          <div class="grid grid-2 mb-3" style="gap:12px">
            <div class="card"><div class="card-body" style="padding:16px">
              <p style="font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:10px">Kunde</p>
              <div class="kv">
                <span class="k">Name</span><span class="v">${esc(q.customer ? q.customer.name : '?')}</span>
                <span class="k">Kundennr.</span><span class="v num">${q.customer ? q.customer.customerNr : '—'}</span>
                <span class="k">Adresse</span><span class="v">${esc(q.customer ? (q.customer.street || '') : '')}<br>${esc(q.customer ? (q.customer.zip || '') : '')} ${esc(q.customer ? (q.customer.city || '') : '')}</span>
                <span class="k">Kontakt</span><span class="v">${esc(q.customer ? (q.customer.email || '—') : '—')}<br>${esc(q.customer ? (q.customer.phone || '—') : '—')}</span>
              </div>
            </div></div>
            <div class="card"><div class="card-body" style="padding:16px">
              <p style="font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:10px">Fahrzeug &amp; Einbau</p>
              <div class="kv">
                <span class="k">Modell</span><span class="v">${esc(q.vehicle ? q.vehicle.brand + ' ' + q.vehicle.model : '?')}</span>
                <span class="k">Motor</span><span class="v">${esc(q.vehicle ? q.vehicle.engine : '?')}</span>
                <span class="k">Leistung</span><span class="v">${q.vehicle ? q.vehicle.hpOrig + ' → <b style="color:var(--red-2)">' + q.vehicle.hpTuned + ' PS</b> / ' + q.vehicle.nmOrig + ' → ' + q.vehicle.nmTuned + ' Nm' : '—'}</span>
                <span class="k">Einbau</span><span class="v">${q.installMode === 'partner'
                  ? 'Partner-Garage: <b>' + esc(q.partner ? q.partner.company : '?') + '</b>, ' + esc(q.partner ? (q.partner.zip + ' ' + q.partner.city) : '')
                  : 'Selbsteinbau (Plug &amp; Play)'}</span>
              </div>
            </div></div>
          </div>

          ${q.note ? `<div class="mb-3" style="padding:13px 16px;border-radius:var(--r-md);background:var(--amber-tint);border:1px solid rgba(255,178,36,.22);font-size:12.5px;color:var(--txt-2)"><b style="color:var(--amber)">Notiz:</b> ${esc(q.note)}</div>` : ''}

          <!-- Positionen -->
          <div class="card mb-3">
            <div class="card-head"><div class="card-title">Positionen</div></div>
            <div class="card-body flush">
              <div class="tbl-wrap">
                <table class="tbl">
                  <thead><tr><th>Art.-Nr.</th><th>Beschreibung</th><th class="r">Anzahl</th><th class="r">Preis</th><th class="r">Rab%</th><th class="r">Wert</th></tr></thead>
                  <tbody>
                    ${items.map(it => `
                      <tr>
                        <td class="dim num" style="white-space:nowrap">${esc(it.artNo)}</td>
                        <td style="white-space:pre-line;max-width:280px;font-size:12.5px">${esc(it.description)}</td>
                        <td class="r num">${it.qty}</td>
                        <td class="r num">${fmt.chf(it.price)}</td>
                        <td class="r num">${it.discountPct ? '<span style="color:var(--green)">−' + it.discountPct + '</span>' : '—'}</td>
                        <td class="r strong num">${fmt.chf(it.total)}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>
              <div style="padding:16px 20px;border-top:1px solid var(--line);background:rgba(255,255,255,.012)">
                <div style="max-width:300px;margin-left:auto">
                  <div class="rowline"><span class="lab">Warenwert</span><b>${fmt.chf(q.basePrice)}</b></div>
                  ${q.warrantyPrice ? `<div class="rowline"><span class="lab">Garantie-Option</span><b>${fmt.chf(q.warrantyPrice)}</b></div>` : ''}
                  ${q.installPrice ? `<div class="rowline"><span class="lab">Einbau (Partner)</span><b>${fmt.chf(q.installPrice)}</b></div>` : ''}
                  <div class="rowline"><span class="lab">Porto</span><b>${fmt.chf(q.shipping)}</b></div>
                  <div class="rowline"><span class="lab">MwSt. 8,1 %</span><b>${fmt.chf(q.vatAmount)}</b></div>
                  <div class="divider"></div>
                  <div class="total-row" style="margin-top:2px">
                    <span class="tl">Gesamtbetrag</span><span class="tv">${fmt.chf(q.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Follow-up-Plan -->
          <div class="card mb-3">
            <div class="card-head"><div><div class="card-title">Follow-up-Plan</div>
            <div class="card-sub">Tag 1 / 3 / 7 gem. LET26-Vertriebs-Guide</div></div></div>
            <div class="card-body" style="display:grid;gap:10px">
              ${(q.followups || []).map(f => {
                const done = f.done;
                const overdue = !done && f.dueAt && new Date(f.dueAt) < new Date();
                return `
                <div class="task ${done ? 'done' : overdue ? 'overdue' : ''}">
                  <span class="tag">T${f.dayOffset}</span>
                  <div class="mid">
                    <div class="act">${esc(f.action)}</div>
                    <div class="meta"><span>${icons.calendar(12)} ${fmt.dateTimeDE(f.dueAt)}</span><span>${esc(f.channel)}</span></div>
                  </div>
                  ${done
                    ? `<span class="badge badge-green" style="align-self:center">Erledigt</span>`
                    : overdue ? `<span class="badge badge-red" style="align-self:center">Überfällig</span>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>

          <!-- E-Mail-Entwürfe -->
          ${emailTabs.length ? `
          <div class="card">
            <div class="card-head"><div><div class="card-title">E-Mail-Entwürfe</div>
            <div class="card-sub">Bereit zum Kopieren — Betreff &amp; Text</div></div></div>
            <div class="card-body">
              <div class="seg mb-2" id="emailTabs">
                ${emailTabs.map((k, i) => `<button data-tab="${esc(k)}" class="${i === 0 ? 'active' : ''}">${esc(emailTabLabel(k))}</button>`).join('')}
              </div>
              <div id="emailBody"></div>
            </div>
          </div>` : ''}

        </div>

        <div class="drawer-foot">
          <div class="spacer"></div>
          <select class="select" id="statusSelect" style="width:auto;min-width:170px">
            <option value="offen" ${q.status === 'offen' ? 'selected' : ''}>Status: Offen</option>
            <option value="versendet" ${q.status === 'versendet' ? 'selected' : ''}>Status: Versendet</option>
            <option value="gewonnen" ${q.status === 'gewonnen' ? 'selected' : ''}>Status: Gewonnen</option>
            <option value="verloren" ${q.status === 'verloren' ? 'selected' : ''}>Status: Verloren</option>
          </select>
          <button class="btn btn-dark" id="drawerPdf">${icons.download(15)} PDF</button>
        </div>`);

      /* E-Mail-Tabs */
      function paintEmail(tabKey) {
        const e = q.emails[tabKey] || {};
        const body = el('#emailBody');
        body.innerHTML = `
          <div class="email-pre" id="emailPre">Betreff: ${esc(e.subject || '')}

${esc(e.body || '')}</div>
          <div class="row mt-2" style="justify-content:flex-end">
            <button class="btn btn-ghost btn-sm" id="copyEmail">${icons.copy(13)} Text kopieren</button>
          </div>`;
        el('#copyEmail').addEventListener('click', () => {
          AFN.ui.copyText('Betreff: ' + (e.subject || '') + '\n\n' + (e.body || ''))
            .then(() => toast('success', 'Kopiert', 'E-Mail-Entwurf in der Zwischenablage.'))
            .catch(() => toast('error', 'Kopieren fehlgeschlagen', 'Bitte Text manuell markieren.'));
        });
      }
      if (emailTabs.length) {
        paintEmail(emailTabs[0]);
        els('#emailTabs button').forEach(b => b.addEventListener('click', () => {
          els('#emailTabs button').forEach(x => x.classList.toggle('active', x === b));
          paintEmail(b.getAttribute('data-tab'));
        }));
      }

      /* Status-Änderung */
      el('#statusSelect').addEventListener('change', e => {
        AFN.api.patchQuote(q.id, { status: e.target.value })
          .then(updated => {
            toast('success', 'Status aktualisiert', 'Offerte #' + q.refNumber + ' → ' + (STATUS_META[e.target.value] || { label: e.target.value }).label + '.');
            drawer.close();
            load();
          })
          .catch(err => toast('error', 'Fehler beim Speichern', err.message));
      });

      /* PDF */
      el('#drawerPdf').addEventListener('click', () => {
        AFN.api.downloadPdf(q.id, q.refNumber)
          .then(() => toast('success', 'PDF heruntergeladen', 'Offerte_' + q.refNumber + '_AutoFaszination.pdf'))
          .catch(err => toast('error', 'Download fehlgeschlagen', err.message));
      });
    }).catch(err => toast('error', 'Detail nicht verfügbar', err.message));
  }

  function emailTabLabel(k) {
    return { customer: 'An Kunde', sales: 'An Vertrieb', partner: 'An Partner-Garage' }[k] || k;
  }

  AFN.views.offerten = { render };
})();
