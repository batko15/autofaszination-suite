/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V4.1 — Termine (Wochenplanung)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast, drawer, APPT_TYPE_META, APPT_STATUS_META } = AFN.ui;

  const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  let weekOffset = 0;
  let typeFilter = '';

  function mondayOf(d) {
    const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = (m.getDay() + 6) % 7; /* 0 = Montag */
    m.setDate(m.getDate() - dow);
    return m;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">Kalender</span>
        <h1>Termine</h1>
        <p class="sub">Testfahrten, Einbautermine, Beratungen und Follow-ups — zwei Wochen im Überblick, direkt vom LET26-Vertriebskalender.</p>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="newAptBtn">${icons.plus(15)} Neuer Termin</button>
      </div>
    </div>

    <div id="termineRoot">${AFN.ui.spinner('Termine werden geladen …')}</div>`;

    el('#newAptBtn').addEventListener('click', () => openCreate());
    load();
  }

  function load() {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const ws = mondayOf(base);

    AFN.api.appointments({ week: ws.toISOString().slice(0, 10) }).then(data => {
      paint(ws, data);
    }).catch(err => {
      el('#termineRoot').innerHTML =
        `<div class="card"><div class="card-body" style="color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div></div>`;
    });
  }

  function paint(ws, data) {
    const today = new Date();
    const weekLabel = 'KW ' + isoWeek(ws) + ' · ' +
      ws.getDate() + '.' + (ws.getMonth() + 1) + '. — ' + (ws.getDate() + 13) + '.' + (ws.getMonth() + 1) + '.';

    /* Termine nach Tag gruppieren (14 Tage) */
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + i);
      days.push({
        date: d,
        items: data.appointments.filter(a => sameDay(new Date(a.startAt), d)),
      });
    }

    const shown = days.flatMap(d => d.items).filter(a => !typeFilter || a.type === typeFilter);

    const markup = `
    <div class="kpi-grid stagger">
      <div class="kpi">
        <div class="head"><span class="lbl">Termine (2 Wochen)</span><span class="ico blue">${icons.calendar(19)}</span></div>
        <div class="val">${fmt.num(data.count)}</div>
        <div class="sub">${data.byType.map(t => `<b>${t.count}</b> ${esc((APPT_TYPE_META[t.type] || {}).label || t.type)}`).join(' · ')}</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Heute</span><span class="ico ${data.today > 0 ? 'amber' : 'green'}">${icons.clock(19)}</span></div>
        <div class="val">${fmt.num(data.today)}</div>
        <div class="sub">Termine am heutigen Tag</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Bestätigt</span><span class="ico green">${icons.checkCircle(19)}</span></div>
        <div class="val">${fmt.num(data.appointments.filter(a => a.status === 'bestaetigt').length)}</div>
        <div class="sub">Kunden haben zugesagt</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Testfahrten</span><span class="ico">${icons.car(19)}</span></div>
        <div class="val">${fmt.num((data.byType.find(t => t.type === 'testfahrt') || {}).count || 0)}</div>
        <div class="sub">Der wirksamste LET26-Verkaufsschritt</div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-body" style="padding:12px 16px">
        <div class="row row-wrap" style="gap:10px">
          <div class="row" style="gap:6px">
            <button class="btn btn-ghost btn-sm" id="weekPrev" title="Vorherige Woche">${icons.arrowL(14)}</button>
            <button class="btn btn-ghost btn-sm" id="weekToday">Heute</button>
            <button class="btn btn-ghost btn-sm" id="weekNext" title="Nächste Woche">${icons.arrowR(14)}</button>
          </div>
          <b style="font-size:12.5px;color:var(--txt)">${esc(weekLabel)}${weekOffset !== 0 ? ' <span class="dim">(±' + Math.abs(weekOffset) + ' Woche' + (Math.abs(weekOffset) > 1 ? 'n' : '') + ')</span>' : ''}</b>
          <div class="spacer"></div>
          <div class="seg" id="typeSeg">
            <button data-t="" class="${!typeFilter ? 'active' : ''}">Alle</button>
            <button data-t="testfahrt" class="${typeFilter === 'testfahrt' ? 'active' : ''}">Testfahrten</button>
            <button data-t="einbau" class="${typeFilter === 'einbau' ? 'active' : ''}">Einbauten</button>
            <button data-t="beratung" class="${typeFilter === 'beratung' ? 'active' : ''}">Beratungen</button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-2 mt-3 week-grid">
      ${days.map((d, di) => {
        const items = typeFilter ? d.items.filter(a => a.type === typeFilter) : d.items;
        const isToday = sameDay(d.date, today);
        const isWeekend = d.date.getDay() === 0 || d.date.getDay() === 6;
        return `
        <div class="card week-day ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}">
          <div class="card-body" style="padding:12px 14px">
            <div class="row" style="justify-content:space-between;align-items:baseline;margin-bottom:8px">
              <b style="font-size:12px;color:${isToday ? 'var(--red)' : 'var(--txt)'}">${DAY_NAMES[(d.date.getDay() + 6) % 7]}</b>
              <span class="dim num" style="font-size:11px">${String(d.date.getDate()).padStart(2, '0')}.${String(d.date.getMonth() + 1).padStart(2, '0')}.</span>
            </div>
            ${items.length === 0 ? `<div class="dim" style="font-size:11px;padding:6px 0">—</div>` : items.map(a => `
              <div class="apt-item t-${a.type} clickable" data-apt="${a.id}">
                <span class="apt-time num">${new Date(a.startAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</span>
                <span style="min-width:0;flex:1">
                  <span style="display:block;font-size:11.5px;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.title)}</span>
                  <span class="dim" style="display:block;font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.customerName)}${a.durationMin ? ' · ' + a.durationMin + ' Min.' : ''}</span>
                </span>
                <span class="apt-dot"></span>
              </div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;

    el('#termineRoot').innerHTML = markup;

    el('#weekPrev').addEventListener('click', () => { weekOffset--; load(); });
    el('#weekNext').addEventListener('click', () => { weekOffset++; load(); });
    el('#weekToday').addEventListener('click', () => { weekOffset = 0; load(); });
    els('#typeSeg button').forEach(b => b.addEventListener('click', () => {
      typeFilter = b.getAttribute('data-t');
      els('#typeSeg button').forEach(x => x.classList.toggle('active', x === b));
      load();
    }));
    els('[data-apt]').forEach(n => n.addEventListener('click', () =>
      openDetail(+n.getAttribute('data-apt'), data.appointments)));
  }

  function isoWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  /* ── Termin-Detail (Drawer) ────────────────────────────────────────────── */
  function openDetail(id, list) {
    const a = list.find(x => x.id === id);
    if (!a) return;
    const t = APPT_TYPE_META[a.type] || { label: a.type };
    const s = APPT_STATUS_META[a.status] || { label: a.status, cls: 'badge-zinc' };

    drawer.open(`
      <div class="drawer-head">
        <div>
          <div class="dt">${esc(a.title)}</div>
          <div class="dim small mt-1">${fmt.dateTimeDE(a.startAt)} · ${a.durationMin} Min. · ${esc(a.location)}</div>
        </div>
        <button class="btn-icon drawer-close" data-drawer-close title="Schliessen">${icons.x(18)}</button>
      </div>
      <div class="drawer-body">
        <div class="row" style="gap:8px;margin-bottom:16px">
          <span class="badge ${t.cls || 'badge-zinc'}">${esc(t.label)}</span>
          <span class="badge ${s.cls}"><span class="dot"></span>${esc(s.label)}</span>
        </div>

        <div class="grid grid-2 mb-3" style="gap:12px">
          <div class="card"><div class="card-body" style="padding:15px">
            <p class="mini-cap">Kunde</p>
            <div class="kv">
              <span class="k">Name</span><span class="v">${esc(a.customerName)}</span>
              <span class="k">E-Mail</span><span class="v">${esc(a.customerEmail || '—')}</span>
              <span class="k">Telefon</span><span class="v">${esc(a.customerPhone || '—')}</span>
            </div>
          </div></div>
          <div class="card"><div class="card-body" style="padding:15px">
            <p class="mini-cap">Verknüpfung</p>
            <div class="kv">
              <span class="k">Fahrzeug</span><span class="v">${a.vehicle ? esc(a.vehicle.brand + ' ' + a.vehicle.model) : '—'}</span>
              <span class="k">Offerte</span><span class="v">${a.quote ? '#' + a.quote.refNumber + ' · ' + fmt.chf(a.quote.total) : '—'}</span>
              <span class="k">Ort</span><span class="v">${esc(a.location)}</span>
            </div>
          </div></div>
        </div>

        ${a.notes ? `<div class="mb-3 note-amber"><b>Notiz:</b> ${esc(a.notes)}</div>` : ''}
      </div>
      <div class="drawer-foot">
        <button class="btn btn-ghost" data-drawer-close>Schliessen</button>
        <div class="spacer"></div>
        ${a.status === 'geplant' ? `<button class="btn btn-ghost" data-act="bestaetigt">${icons.check(14)} Bestätigen</button>` : ''}
        ${a.status !== 'abgeschlossen' && a.status !== 'abgesagt' ? `<button class="btn btn-primary" data-act="abgeschlossen">${icons.checkCircle(14)} Abschliessen</button>` : ''}
        ${a.status !== 'abgesagt' && a.status !== 'abgeschlossen' ? `<button class="btn btn-ghost" data-act="abgesagt" style="color:#FF8C9B">Absagen</button>` : ''}
      </div>`);

    els('[data-act]', el('#drawer')).forEach(b => b.addEventListener('click', () => {
      AFN.api.patchAppointment(a.id, b.getAttribute('data-act'))
        .then(() => {
          drawer.close();
          toast('success', 'Termin aktualisiert', a.title + ' → ' + b.getAttribute('data-act') + '.');
          load();
        })
        .catch(err => toast('error', 'Fehler beim Speichern', err.message));
    }));
  }

  /* ── Neuer Termin (Modal) ──────────────────────────────────────────────── */
  function openCreate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = tomorrow.toISOString().slice(0, 10);

    AFN.ui.modal.open(`
      <div class="modal-head">
        <h3>Neuen Termin anlegen</h3>
        <button class="btn-icon" data-modal-close>${icons.x(17)}</button>
      </div>
      <div class="modal-body">
        <div class="field"><label>Titel *</label><input class="input" id="naTitle" placeholder="z. B. Testfahrt Toyota Corolla"></div>
        <div class="grid grid-2" style="gap:0 14px">
          <div class="field"><label>Typ</label>
            <select class="select" id="naType">
              <option value="beratung">Beratung</option>
              <option value="testfahrt">Testfahrt</option>
              <option value="einbau">Einbau</option>
              <option value="followup">Follow-up</option>
            </select>
          </div>
          <div class="field"><label>Dauer (Min.)</label>
            <select class="select" id="naDur">
              <option value="30">30 Minuten</option>
              <option value="45">45 Minuten</option>
              <option value="60" selected>60 Minuten</option>
              <option value="90">90 Minuten</option>
              <option value="120">2 Stunden</option>
              <option value="240">4 Stunden</option>
            </select>
          </div>
        </div>
        <div class="grid grid-2" style="gap:0 14px">
          <div class="field"><label>Datum *</label><input class="input" id="naDate" type="date" value="${iso}"></div>
          <div class="field"><label>Zeit *</label><input class="input" id="naTime" type="time" value="10:00"></div>
        </div>
        <div class="field"><label>Kunde *</label><input class="input" id="naCust" placeholder="Name des Kunden"></div>
        <div class="grid grid-2" style="gap:0 14px">
          <div class="field"><label>Telefon</label><input class="input" id="naPhone" placeholder="+41 79 000 00 00"></div>
          <div class="field" style="margin-bottom:0"><label>E-Mail</label><input class="input" id="naEmail" type="email" placeholder="name@beispiel.ch"></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-modal-close>Abbrechen</button>
        <button class="btn btn-primary" id="naSave">${icons.calendar(15)} Termin anlegen</button>
      </div>`);

    el('#naSave').addEventListener('click', () => {
      const title = el('#naTitle').value.trim();
      const cust = el('#naCust').value.trim();
      const date = el('#naDate').value;
      const time = el('#naTime').value;
      if (!title || !cust || !date || !time) {
        toast('error', 'Pflichtfelder fehlen', 'Titel, Datum, Zeit und Kunde sind erforderlich.');
        return;
      }
      AFN.api.createAppointment({
        title, type: el('#naType').value,
        startAt: date + 'T' + time + ':00',
        durationMin: +el('#naDur').value,
        customerName: cust,
        customerPhone: el('#naPhone').value.trim() || null,
        customerEmail: el('#naEmail').value.trim() || null,
        location: 'Neuenhof',
      }).then(() => {
        AFN.ui.modal.close();
        toast('success', 'Termin angelegt', title + ' am ' + date + ' um ' + time + ' Uhr.');
        weekOffset = 0;
        load();
      }).catch(err => toast('error', 'Anlegen fehlgeschlagen', err.message));
    });
  }

  AFN.views.termine = { render };
})();
