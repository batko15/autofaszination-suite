/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — Einstellungen
   Firmen-Stammdaten · Preisliste · Mitarbeiter · Datenimport · System
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast, badge, ROLE_META, modal } = AFN.ui;

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">System</span>
        <h1>Einstellungen</h1>
        <p class="sub">Firmen-Stammdaten, Preisliste 2026, Mitarbeiter-Verwaltung, Datenimport
        und System-Übersicht.</p>
      </div>
    </div>
    <div id="settingsRoot">${AFN.ui.spinner('Einstellungen werden geladen …')}</div>`;

    const emp = AFN.api.getStoredEmployee();
    AFN.api.settings().then(s => {
      el('#settingsRoot').innerHTML = paint(s, emp && emp.role === 'admin');
      bind(s, emp && emp.role === 'admin');
    }).catch(err => {
      el('#settingsRoot').innerHTML =
        `<div class="card"><div class="card-body" style="color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div></div>`;
    });
  }

  function paint(s, isAdmin) {
    const c = s.company || {};
    return `
    <div class="grid grid-2 stagger">

      <!-- Firmen-Stammdaten -->
      <div class="card">
        <div class="card-head"><div><div class="card-title">Firmen-Stammdaten</div>
        <div class="card-sub">Quelle: Offerten-Vorlage 10900 — erscheint auf jeder Offerte</div></div>
        <span class="badge badge-red">${esc(s.appVersion)}</span></div>
        <div class="card-body">
          <div class="kv">
            <span class="k">Firma</span><span class="v">${esc(c.name)}</span>
            <span class="k">Adresse</span><span class="v">${esc(c.street)} · ${esc(c.city)}</span>
            <span class="k">Telefon</span><span class="v">${esc(c.tel)}</span>
            <span class="k">E-Mail</span><span class="v">${esc(c.email)}</span>
            <span class="k">Web</span><span class="v">${esc(c.web)}</span>
            <span class="k">Verkauf</span><span class="v">${esc(c.salesContact)}</span>
            <span class="k">B2B-Kontakt</span><span class="v">${esc(c.b2bContact)}</span>
            <span class="k">Geschäftsführung</span><span class="v">${esc(c.management)}</span>
          </div>
        </div>
      </div>

      <!-- System -->
      <div class="card">
        <div class="card-head"><div><div class="card-title">System-Übersicht</div>
        <div class="card-sub">Lokale SQLite-Datenbank — alle Daten bleiben auf diesem Rechner</div></div></div>
        <div class="card-body">
          <div class="grid grid-2" style="gap:10px">
            <div class="stat-tile"><div class="v">${fmt.num(s.system.vehicles)}</div><div class="l">Fahrzeuge</div></div>
            <div class="stat-tile"><div class="v">${fmt.num(s.system.partners)}</div><div class="l">Markenhäuser</div></div>
            <div class="stat-tile"><div class="v">${fmt.num(s.system.customers)}</div><div class="l">Kunden</div></div>
            <div class="stat-tile"><div class="v">${fmt.num(s.system.quotes)}</div><div class="l">Offerten</div></div>
          </div>
          <div class="mt-3" style="padding:13px 15px;border-radius:var(--r-md);background:var(--bg-2);border:1px solid var(--line-soft);font-size:12px;color:var(--mut)">
            <b style="color:var(--txt-2)">Konditionen:</b> MwSt. ${(s.vatRate * 100).toLocaleString('de-CH')} % ·
            Porto ${fmt.chf(s.shippingChf)} · Suite V3 «Carbon Cockpit»
          </div>
        </div>
      </div>
    </div>

    <!-- Preisliste -->
    <div class="card mt-4">
      <div class="card-head"><div><div class="card-title">AF-Garagen-Preisliste CH/DE 2026</div>
      <div class="card-sub">LET26-Produkte mit EK netto (B2B-Staffeln) und UVP brutto (B2C)</div></div>
      <span class="badge badge-green">MwSt. 8,1 % separat</span></div>
      <div class="card-body flush">
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Code</th><th>Produkt</th><th class="r">EK netto</th><th class="r">UVP brutto</th><th>Staffeln (B2B)</th></tr></thead>
            <tbody>
              ${(s.priceList || []).map(p => `
                <tr>
                  <td><span class="pcode" style="font-size:9.5px;font-weight:700;letter-spacing:.14em;color:var(--red-2);padding:3px 8px;border-radius:6px;background:var(--red-tint)">${esc(p.code)}</span></td>
                  <td class="strong">${esc(p.name)}</td>
                  <td class="r num">${fmt.chf(p.ekNetto)}</td>
                  <td class="r strong num">${fmt.chf(p.uvpBrutto)}</td>
                  <td class="dim small">${esc(p.tiers ? Object.entries(p.tiers).map(([q, pr]) => 'ab ' + q + ': ' + fmt.chf(pr)).join(' · ') : '—')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="grid grid-2 mt-4 stagger">
      <!-- Garantie -->
      <div class="card">
        <div class="card-head"><div><div class="card-title">Garantie-Optionen</div>
        <div class="card-sub">Motorgarantie Zürich Versicherung (B2C)</div></div></div>
        <div class="card-body" style="display:grid;gap:10px">
          ${(s.warrantyOptions || []).map(w => `
            <div class="row" style="justify-content:space-between;padding:13px 16px;border-radius:var(--r-md);background:var(--bg-2);border:1px solid var(--line-soft)">
              <span style="font-size:13px;color:var(--txt-2)">${esc(w.label)}</span>
              <b style="font-family:var(--font-d);font-size:15px;color:var(--txt)">${w.price ? fmt.chf(w.price) : '—'}</b>
            </div>`).join('')}
        </div>
      </div>

      <!-- B2B-Staffeln -->
      <div class="card">
        <div class="card-head"><div><div class="card-title">B2B-Staffelrabatte</div>
        <div class="card-sub">auf EK netto — ab Stückzahl</div></div></div>
        <div class="card-body">
          ${(s.b2bTiers || []).map(t => `
            <div class="hbar-row" style="grid-template-columns:90px 1fr auto">
              <span class="hlab">ab ${t.abStueck} Stk.</span>
              <div class="htrack"><div class="hfill" style="width:${t.rabattPct * 3}%"></div></div>
              <span class="hval" style="color:var(--green)">−${t.rabattPct} %</span>
            </div>`).join('')}
          <p class="dim small mt-2">Beispiel: Benzinsatz LET26 (BA) ab 10 Stk. → EK CHF 790 − 30 % = <b style="color:var(--txt-2)">CHF 553.—</b> pro Stück.</p>
        </div>
      </div>
    </div>

    ${isAdmin ? `
    <!-- Mitarbeiter-Verwaltung -->
    <div class="card mt-4">
      <div class="card-head">
        <div><div class="card-title">Mitarbeiter-Verwaltung</div>
        <div class="card-sub">Rollen: Administration (voll), Vertrieb, Technik</div></div>
        <button class="btn btn-primary btn-sm" id="addEmpBtn">${icons.plus(14)} Mitarbeiter anlegen</button>
      </div>
      <div class="card-body flush" id="empList">${AFN.ui.spinner('Mitarbeiter werden geladen …')}</div>
    </div>

    <!-- Datenimport -->
    <div class="card mt-4">
      <div class="card-head"><div><div class="card-title">Datenimport</div>
      <div class="card-sub">Fahrzeuge &amp; Markenhäuser aus Excel (.xlsx) oder JSON — Beispiele liegen in data/beispiele/</div></div></div>
      <div class="card-body">
        <div class="grid grid-2" style="gap:16px">
          <div style="padding:18px;border-radius:var(--r-md);border:1px dashed var(--line-hover);background:var(--bg-2);text-align:center">
            <div style="display:flex;justify-content:center;margin-bottom:10px"><span class="ico" style="width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--blue-tint);color:var(--blue)">${icons.car(20)}</span></div>
            <div style="font-size:13px;font-weight:700;color:var(--txt)">Fahrzeuge importieren</div>
            <div class="dim small mt-1">68 LET26-Modelle · Felder: marke, modell, motor, ps, psGetunt, …</div>
            <label class="btn btn-dark btn-sm mt-3" style="cursor:pointer">
              ${icons.upload(13)} Datei wählen
              <input type="file" id="impVehicles" accept=".json,.xlsx" hidden>
            </label>
            <div class="small mt-2" id="impVehiclesRes"></div>
          </div>
          <div style="padding:18px;border-radius:var(--r-md);border:1px dashed var(--line-hover);background:var(--bg-2);text-align:center">
            <div style="display:flex;justify-content:center;margin-bottom:10px"><span class="ico" style="width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--green-tint);color:var(--green)">${icons.building(20)}</span></div>
            <div style="font-size:13px;font-weight:700;color:var(--txt)">Markenhäuser importieren</div>
            <div class="dim small mt-1">Felder: firma, marken, plz, ort, kanton, ansprechperson, …</div>
            <label class="btn btn-dark btn-sm mt-3" style="cursor:pointer">
              ${icons.upload(13)} Datei wählen
              <input type="file" id="impPartners" accept=".json,.xlsx" hidden>
            </label>
            <div class="small mt-2" id="impPartnersRes"></div>
          </div>
        </div>
      </div>
    </div>` : `
    <div class="card mt-4">
      <div class="card-body">
        ${AFN.ui.empty(icons.shield(22), 'Administrator-Rechte erforderlich',
        'Mitarbeiter-Verwaltung und Datenimport sind der Rolle «Administration» vorbehalten.')}
      </div>
    </div>`}`;
  }

  function bind(s, isAdmin) {
    if (!isAdmin) return;

    /* Mitarbeiter */
    loadEmployees();

    el('#addEmpBtn').addEventListener('click', () => {
      modal.open(`
      <div class="modal-head"><h3>Mitarbeiter anlegen</h3>
        <button class="btn-icon" data-modal-close>${icons.x(17)}</button></div>
      <div class="modal-body">
        <div class="field"><label>Name *</label><input class="input" id="neName" placeholder="Vor- und Nachname"></div>
        <div class="field"><label>Benutzername *</label><input class="input" id="neUser" placeholder="kleinbuchstaben"></div>
        <div class="field"><label>Passwort * <span class="opt">(min. 6 Zeichen)</span></label><input class="input" id="nePass" type="password" placeholder="••••••••"></div>
        <div class="field" style="margin-bottom:0"><label>Rolle</label>
          <select class="select" id="neRole">
            <option value="vertrieb">Vertrieb</option>
            <option value="technik">Technik</option>
            <option value="admin">Administration</option>
          </select>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-modal-close>Abbrechen</button>
        <button class="btn btn-primary" id="neSave">${icons.plus(15)} Anlegen</button>
      </div>`);
      el('#neSave').addEventListener('click', () => {
        const name = el('#neName').value.trim();
        const username = el('#neUser').value.trim().toLowerCase();
        const password = el('#nePass').value;
        const role = el('#neRole').value;
        if (!name || !username || password.length < 6) {
          toast('error', 'Eingaben unvollständig', 'Name, Benutzername und Passwort (min. 6 Zeichen) sind nötig.');
          return;
        }
        AFN.api.createEmployee({ name, username, password, role })
          .then(() => { modal.close(); toast('success', 'Mitarbeiter angelegt', name + ' kann sich jetzt anmelden.'); loadEmployees(); })
          .catch(err => toast('error', 'Anlegen fehlgeschlagen', err.message));
      });
    });

    /* Import */
    ['impVehicles', 'impPartners'].forEach(inputId => {
      const inp = el('#' + inputId);
      if (!inp) return;
      inp.addEventListener('change', () => {
        const file = inp.files && inp.files[0];
        if (!file) return;
        const kind = inputId === 'impVehicles' ? 'vehicles' : 'partners';
        const resBox = el('#' + inputId + 'Res');
        resBox.innerHTML = `<span class="dim">${AFN.ui.spinner ? '' : ''}Import läuft …</span>`;
        resBox.innerHTML = `<span style="color:var(--amber);font-size:11.5px">Import läuft …</span>`;
        AFN.api.importFile(kind, file)
          .then(rep => {
            resBox.innerHTML = `<span style="color:var(--green);font-size:11.5px;font-weight:600">
              ✓ ${rep.added} neu · ${rep.updated} aktualisiert · ${rep.skipped} übersprungen</span>`;
            toast('success', 'Import abgeschlossen', `${rep.added} hinzugefügt, ${rep.updated} aktualisiert.`);
          })
          .catch(err => {
            resBox.innerHTML = `<span style="color:#FF8C9B;font-size:11.5px">${esc(err.message)}</span>`;
            toast('error', 'Import fehlgeschlagen', err.message);
          });
      });
    });
  }

  function loadEmployees() {
    const box = el('#empList');
    if (!box) return;
    AFN.api.employees().then(rows => {
      box.innerHTML = `
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Name</th><th>Benutzername</th><th>Rolle</th><th>Seit</th><th>Status</th><th class="r">Aktion</th></tr></thead>
          <tbody>
          ${rows.map(e => `
            <tr>
              <td class="strong">${esc(e.name)}</td>
              <td class="dim">${esc(e.username)}</td>
              <td>${badge(ROLE_META[e.role] || { label: e.role, cls: 'badge-zinc' })}</td>
              <td class="dim num">${fmt.dateDE(e.createdAt)}</td>
              <td>${e.active ? '<span class="badge badge-green">Aktiv</span>' : '<span class="badge badge-zinc">Deaktiviert</span>'}</td>
              <td class="r">
                <button class="btn btn-ghost btn-sm" data-emp-toggle="${e.id}" data-active="${e.active ? 1 : 0}">
                  ${e.active ? 'Deaktivieren' : 'Aktivieren'}</button>
                <button class="btn btn-ghost btn-sm" data-emp-pass="${e.id}">Passwort</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

      els('[data-emp-toggle]').forEach(b => b.addEventListener('click', () => {
        const id = +b.getAttribute('data-emp-toggle');
        const active = b.getAttribute('data-active') === '1';
        AFN.api.patchEmployee(id, { active: !active })
          .then(() => { toast('success', 'Status geändert', active ? 'Mitarbeiter deaktiviert.' : 'Mitarbeiter aktiviert.'); loadEmployees(); })
          .catch(err => toast('error', 'Fehler', err.message));
      }));
      els('[data-emp-pass]').forEach(b => b.addEventListener('click', () => {
        const id = +b.getAttribute('data-emp-pass');
        modal.open(`
        <div class="modal-head"><h3>Passwort zurücksetzen</h3>
          <button class="btn-icon" data-modal-close>${icons.x(17)}</button></div>
        <div class="modal-body">
          <div class="field" style="margin-bottom:0"><label>Neues Passwort <span class="opt">(min. 6 Zeichen)</span></label>
          <input class="input" id="npPass" type="password" placeholder="••••••••"></div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-modal-close>Abbrechen</button>
          <button class="btn btn-primary" id="npSave">Speichern</button>
        </div>`);
        el('#npSave').addEventListener('click', () => {
          const pw = el('#npPass').value;
          if (pw.length < 6) { toast('error', 'Zu kurz', 'Das Passwort braucht mindestens 6 Zeichen.'); return; }
          AFN.api.patchEmployee(id, { password: pw })
            .then(() => { modal.close(); toast('success', 'Passwort gesetzt', 'Das neue Passwort ist ab sofort gültig.'); })
            .catch(err => toast('error', 'Fehler', err.message));
        });
      }));
    }).catch(err => {
      box.innerHTML = `<div style="padding:16px;color:#FF8C9B;font-size:12.5px">${icons.alert(14)} ${esc(err.message)}</div>`;
    });
  }

  AFN.views.einstellungen = { render };
})();
