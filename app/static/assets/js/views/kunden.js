/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — Kunden (CRM)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast, badge, drawer, LEAD_META } = AFN.ui;

  const F = { search: '', channel: '', lead: '' };

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">CRM</span>
        <h1>Kunden</h1>
        <p class="sub">Kundenverwaltung mit Lead-Status, Kanal und vollständiger Offerten-Historie pro Kunde.</p>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="newCustBtn">${icons.plus(15)} Neuer Kunde</button>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body" style="padding:14px 16px">
        <div class="row row-wrap" style="gap:10px">
          <div class="seg" id="leadSeg">
            <button data-l="" class="${!F.lead ? 'active' : ''}">Alle Status</button>
            <button data-l="neu" class="${F.lead === 'neu' ? 'active' : ''}">Neu</button>
            <button data-l="offerte_erstellt" class="${F.lead === 'offerte_erstellt' ? 'active' : ''}">Offerte erstellt</button>
            <button data-l="verhandlung" class="${F.lead === 'verhandlung' ? 'active' : ''}">Verhandlung</button>
            <button data-l="gewonnen" class="${F.lead === 'gewonnen' ? 'active' : ''}">Gewonnen</button>
          </div>
          <div class="seg" id="chanSeg">
            <button data-c="" class="${!F.channel ? 'active' : ''}">Beide</button>
            <button data-c="b2c" class="${F.channel === 'b2c' ? 'active' : ''}">B2C</button>
            <button data-c="b2b" class="${F.channel === 'b2b' ? 'active' : ''}">B2B</button>
          </div>
          <div class="spacer"></div>
          <div class="input-wrap" style="min-width:230px">
            <span class="lead-ico">${icons.search(16)}</span>
            <input class="input" id="custSearchInput" placeholder="Name, Ort oder PLZ suchen …" value="${esc(F.search)}">
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body" id="custList">${AFN.ui.spinner('Kunden werden geladen …')}</div>
    </div>`;

    els('#leadSeg button').forEach(b => b.addEventListener('click', () => {
      F.lead = b.getAttribute('data-l');
      els('#leadSeg button').forEach(x => x.classList.toggle('active', x === b));
      load();
    }));
    els('#chanSeg button').forEach(b => b.addEventListener('click', () => {
      F.channel = b.getAttribute('data-c');
      els('#chanSeg button').forEach(x => x.classList.toggle('active', x === b));
      load();
    }));
    let timer = null;
    el('#custSearchInput').addEventListener('input', e => {
      F.search = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(load, 320);
    });
    el('#newCustBtn').addEventListener('click', openCreateModal);

    load();
  }

  function load() {
    const box = el('#custList');
    AFN.api.customers({
      search: F.search || undefined,
      channel: F.channel || undefined,
      leadStatus: F.lead || undefined,
    }).then(rows => {
      if (!rows.length) {
        box.innerHTML = AFN.ui.empty(icons.users(22), 'Keine Kunden gefunden',
          'Filter anpassen oder einen neuen Kunden anlegen.');
        return;
      }
      box.innerHTML = `
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Kundennr.</th><th>Name / Firma</th><th>Ort</th><th>Kontakt</th>
            <th>Kanal</th><th>Lead-Status</th><th>Seit</th>
          </tr></thead>
          <tbody>
          ${rows.map(c => `
            <tr class="clickable" data-cust="${c.id}">
              <td class="dim num">${c.customerNr}</td>
              <td class="strong">${esc(c.name)}</td>
              <td class="dim">${esc(c.zip || '')} ${esc(c.city || '')}</td>
              <td class="dim" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.email || '—')}${c.phone ? ' · ' + esc(c.phone) : ''}</td>
              <td>${c.channel === 'b2b' ? '<span class="badge badge-violet">B2B</span>' : '<span class="badge badge-blue">B2C</span>'}</td>
              <td>${badge(LEAD_META[c.leadStatus] || { label: c.leadStatus, cls: 'badge-zinc' })}</td>
              <td class="dim num">${fmt.dateDE(c.createdAt)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
      els('[data-cust]', box).forEach(tr => tr.addEventListener('click', () => openDetail(+tr.getAttribute('data-cust'))));
    }).catch(err => {
      box.innerHTML = `<div style="padding:20px;color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div>`;
    });
  }

  /* ── Neuer Kunde (Modal) ───────────────────────────────────────────────── */
  function openCreateModal() {
    AFN.ui.modal.open(`
      <div class="modal-head">
        <h3>Neuen Kunden anlegen</h3>
        <button class="btn-icon" data-modal-close>${icons.x(17)}</button>
      </div>
      <div class="modal-body">
        <div class="field"><label>Name / Firma *</label><input class="input" id="ncName" placeholder="z. B. Muster AG oder Anna Muster"></div>
        <div class="grid grid-2" style="gap:0 14px">
          <div class="field"><label>Strasse</label><input class="input" id="ncStreet" placeholder="Musterstrasse 12"></div>
          <div class="field"><label>Ort *</label><input class="input" id="ncCity" placeholder="Neuenhof"></div>
        </div>
        <div class="grid grid-2" style="gap:0 14px">
          <div class="field"><label>PLZ *</label><input class="input" id="ncZip" maxlength="8" placeholder="5432"></div>
          <div class="field"><label>Kanal</label>
            <select class="select" id="ncChannel">
              <option value="b2c">B2C — Endkunde</option>
              <option value="b2b">B2B — Markenhaus / Gewerbe</option>
            </select>
          </div>
        </div>
        <div class="grid grid-2" style="gap:0 14px">
          <div class="field"><label>E-Mail</label><input class="input" id="ncEmail" type="email" placeholder="name@beispiel.ch"></div>
          <div class="field" style="margin-bottom:0"><label>Telefon</label><input class="input" id="ncPhone" placeholder="+41 79 000 00 00"></div>
        </div>
        <div class="field" style="margin-bottom:0"><label>Notizen</label><textarea class="textarea" id="ncNotes" placeholder="Interne Notizen zum Kunden …"></textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-modal-close>Abbrechen</button>
        <button class="btn btn-primary" id="ncSave">${icons.plus(15)} Kunde anlegen</button>
      </div>`);

    el('#ncSave').addEventListener('click', () => {
      const name = el('#ncName').value.trim();
      const zip = el('#ncZip').value.trim();
      const city = el('#ncCity').value.trim();
      if (!name || !zip || !city) {
        toast('error', 'Pflichtfelder fehlen', 'Name, PLZ und Ort sind erforderlich.');
        return;
      }
      AFN.api.createCustomer({
        name, street: el('#ncStreet').value.trim() || null, zip, city,
        email: el('#ncEmail').value.trim() || null, phone: el('#ncPhone').value.trim() || null,
        channel: el('#ncChannel').value, notes: el('#ncNotes').value.trim() || null,
      }).then(c => {
        AFN.ui.modal.close();
        toast('success', 'Kunde angelegt', c.name + ' (Nr. ' + c.customerNr + ') wurde erstellt.');
        load();
      }).catch(err => toast('error', 'Anlegen fehlgeschlagen', err.message));
    });
  }

  /* ── Kunden-Detail (Drawer) ────────────────────────────────────────────── */
  function openDetail(id) {
    Promise.all([AFN.api.customer(id), AFN.api.customerQuotes(id)])
      .then(([c, quotes]) => {
        const volume = quotes.reduce((s, q) => s + (q.total || 0), 0);
        drawer.open(`
        <div class="drawer-head">
          <div>
            <div class="dt">
              <span class="avatar" style="width:40px;height:40px;font-size:14px">${esc(AFN.ui.initials(c.name))}</span>
              ${esc(c.name)}
            </div>
            <div class="dim small mt-1">Kunde Nr. ${c.customerNr} · seit ${fmt.dateDE(c.createdAt)}</div>
          </div>
          <button class="btn-icon drawer-close" data-drawer-close title="Schliessen">${icons.x(18)}</button>
        </div>
        <div class="drawer-body">

          <div class="grid grid-2 mb-3" style="gap:12px">
            <div class="card"><div class="card-body" style="padding:16px">
              <p style="font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:10px">Stammdaten</p>
              <div class="kv">
                <span class="k">Adresse</span><span class="v">${esc(c.street || '—')}<br>${esc(c.zip || '')} ${esc(c.city || '')}</span>
                <span class="k">E-Mail</span><span class="v">${esc(c.email || '—')}</span>
                <span class="k">Telefon</span><span class="v">${esc(c.phone || '—')}</span>
                <span class="k">Kanal</span><span class="v">${c.channel === 'b2b' ? 'B2B — Gewerbe' : 'B2C — Endkunde'}</span>
              </div>
            </div></div>
            <div class="card"><div class="card-body" style="padding:16px">
              <p style="font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:10px">Lead-Status</p>
              <div class="mb-2">${badge(LEAD_META[c.leadStatus] || { label: c.leadStatus, cls: 'badge-zinc' })}</div>
              <label style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);display:block;margin:12px 0 7px">Status ändern</label>
              <select class="select" id="leadSelect">
                ${Object.entries(LEAD_META).map(([k, m]) => `<option value="${k}" ${c.leadStatus === k ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}
              </select>
              <div class="mt-3" style="padding:11px 13px;border-radius:var(--r-sm);background:var(--bg-2);border:1px solid var(--line-soft)">
                <div class="dim" style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Offerten-Volumen</div>
                <div style="font-family:var(--font-d);font-size:20px;font-weight:700;color:var(--txt)" class="num mt-1">${fmt.chf(volume)}</div>
                <div class="dim" style="font-size:11px">${fmt.num(quotes.length)} Offerten</div>
              </div>
            </div></div>
          </div>

          ${c.notes ? `<div class="mb-3" style="padding:13px 16px;border-radius:var(--r-md);background:var(--amber-tint);border:1px solid rgba(255,178,36,.22);font-size:12.5px;color:var(--txt-2)"><b style="color:var(--amber)">Notiz:</b> ${esc(c.notes)}</div>` : ''}

          <div class="card">
            <div class="card-head"><div><div class="card-title">Offerten-Historie</div>
            <div class="card-sub">Chronologisch — neueste zuerst</div></div></div>
            <div class="card-body flush">
              ${quotes.length === 0 ? AFN.ui.empty(icons.doc(20), 'Noch keine Offerten', 'Im Konfigurator die erste Offerte für diesen Kunden erstellen.') : `
              <div class="tbl-wrap">
                <table class="tbl">
                  <thead><tr><th>Referenz</th><th>Fahrzeug</th><th class="r">Total</th><th>Status</th><th>Datum</th></tr></thead>
                  <tbody>
                    ${quotes.map(q => `
                      <tr class="clickable" data-q="${q.id}">
                        <td class="ref">#${q.refNumber}</td>
                        <td class="dim">${esc(q.vehicle ? q.vehicle.brand + ' ' + q.vehicle.model : '?')}</td>
                        <td class="r strong num">${fmt.chf(q.total)}</td>
                        <td>${badge(STATUS_META_LABEL(q.status))}</td>
                        <td class="dim num">${fmt.dateDE(q.createdAt)}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>`}
            </div>
          </div>
        </div>
        <div class="drawer-foot">
          <button class="btn btn-ghost" data-drawer-close>Schliessen</button>
          <div class="spacer"></div>
          <a class="btn btn-primary" href="#/konfigurator">${icons.bolt(15)} Offerte erstellen</a>
        </div>`);

        el('#leadSelect').addEventListener('change', e => {
          AFN.api.patchCustomer(c.id, { leadStatus: e.target.value })
            .then(() => { toast('success', 'Status aktualisiert', c.name + ' → ' + e.target.selectedOptions[0].text + '.'); })
            .catch(err => toast('error', 'Fehler beim Speichern', err.message));
        });

        els('[data-q]').forEach(tr => tr.addEventListener('click', () => {
          drawer.close();
          location.hash = '#/offerten?focus=' + tr.getAttribute('data-q');
        }));
      })
      .catch(err => toast('error', 'Detail nicht verfügbar', err.message));
  }

  function STATUS_META_LABEL(s) { return AFN.ui.STATUS_META[s] || { label: s, cls: 'badge-zinc' }; }

  AFN.views.kunden = { render };
})();
