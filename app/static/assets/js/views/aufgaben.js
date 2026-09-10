/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — Aufgaben (Follow-up-Automatik Tag 1/3/7)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast, copyText } = AFN.ui;

  let tasks = [];

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">LET26 Vertriebs-Guide</span>
        <h1>Folgeaufgaben</h1>
        <p class="sub">Follow-up-Sequenz Tag 1 / 3 / 7 je Offerte — mit Telefon- und E-Mail-Skripten
        aus dem «Leitfaden Mischa». Überfällige zuerst.</p>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" id="reloadBtn">${icons.refresh(15)} Aktualisieren</button>
      </div>
    </div>
    <div id="tasksRoot">${AFN.ui.spinner('Aufgaben werden geladen …')}</div>`;

    el('#reloadBtn').addEventListener('click', () => load());
    load();
  }

  function load() {
    AFN.api.followups({ status: 'offen' })
      .then(openRows => {
        return AFN.api.followups({ status: 'erledigt' }).then(doneRows => {
          tasks = openRows.concat(doneRows.slice(0, 12));
          paint();
        });
      })
      .catch(err => {
        el('#tasksRoot').innerHTML =
          `<div class="card"><div class="card-body" style="color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div></div>`;
      });
  }

  function classify(f) {
    if (f.done) return 'done';
    if (!f.dueAt) return 'upcoming';
    const now = new Date();
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    if (new Date(f.dueAt) < now) return 'overdue';
    if (new Date(f.dueAt) <= endToday) return 'today';
    return 'upcoming';
  }

  function paint() {
    const root = el('#tasksRoot');
    const groups = {
      overdue: { title: 'Überfällig', ico: icons.alert(15), hint: 'Sofort nachfassen — Priorität höchste' },
      today:   { title: 'Heute fällig', ico: icons.clock(15), hint: 'Noch heute erledigen' },
      upcoming:{ title: 'Geplant', ico: icons.calendar(15), hint: 'Die nächsten Tage' },
      done:    { title: 'Kürzlich erledigt', ico: icons.checkCircle(15), hint: 'Letzte 12 Abschlussaktionen' },
    };

    const buckets = { overdue: [], today: [], upcoming: [], done: [] };
    tasks.forEach(f => buckets[classify(f)].push(f));
    buckets.overdue.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

    const totalOpen = buckets.overdue.length + buckets.today.length + buckets.upcoming.length;

    if (totalOpen === 0) {
      root.innerHTML = `
      <div class="kpi-grid mb-4">
        <div class="kpi"><div class="head"><span class="lbl">Offene Aufgaben</span><span class="ico green">${icons.checkCircle(19)}</span></div>
        <div class="val" style="color:var(--green)">0</div><div class="sub">Alles erledigt — starke Leistung!</div></div>
      </div>
      <div class="card"><div class="card-body">${AFN.ui.empty(icons.checkCircle(22), 'Inbox Zero!', 'Keine offenen Follow-ups. Neue Offerten erzeugen automatisch die T1/T3/T7-Sequenz.')}</div></div>`;
      return;
    }

    root.innerHTML = `
    <div class="kpi-grid mb-4 stagger">
      <div class="kpi"><div class="glow"></div>
        <div class="head"><span class="lbl">Überfällig</span><span class="ico">${icons.alert(19)}</span></div>
        <div class="val" style="${buckets.overdue.length ? 'color:#FF8C9B' : ''}">${buckets.overdue.length}</div>
        <div class="sub">sofort nachfassen</div></div>
      <div class="kpi">
        <div class="head"><span class="lbl">Heute fällig</span><span class="ico amber">${icons.clock(19)}</span></div>
        <div class="val">${buckets.today.length}</div><div class="sub">bis 23:59 Uhr</div></div>
      <div class="kpi">
        <div class="head"><span class="lbl">Geplant</span><span class="ico blue">${icons.calendar(19)}</span></div>
        <div class="val">${buckets.upcoming.length}</div><div class="sub">kommende Tage</div></div>
      <div class="kpi">
        <div class="head"><span class="lbl">Offen gesamt</span><span class="ico green">${icons.check(19)}</span></div>
        <div class="val">${totalOpen}</div><div class="sub"><b>${buckets.done.length}</b> kürzlich erledigt</div></div>
    </div>

    ${['overdue', 'today', 'upcoming', 'done'].map(key => {
      const g = groups[key];
      const rows = buckets[key];
      if (!rows.length) return '';
      return `
      <div class="card mb-3">
        <div class="card-head">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="color:${key === 'overdue' ? 'var(--red-2)' : key === 'today' ? 'var(--amber)' : key === 'done' ? 'var(--green)' : 'var(--blue)'}">${g.ico}</span>
            <div>
              <div class="card-title">${g.title} <span class="dim" style="font-weight:400">(${rows.length})</span></div>
              <div class="card-sub">${g.hint}</div>
            </div>
          </div>
        </div>
        <div class="card-body" style="display:grid;gap:10px">
          ${rows.map(f => taskMarkup(f, key)).join('')}
        </div>
      </div>`;
    }).join('')}`;

    /* Events: erledigt / Skript kopieren */
    els('[data-done]').forEach(b => b.addEventListener('click', () => {
      const id = +b.getAttribute('data-done');
      const wasDone = b.getAttribute('data-was-done') === '1';
      b.disabled = true;
      AFN.api.patchFollowup(id, !wasDone)
        .then(() => { toast('success', wasDone ? 'Wieder geöffnet' : 'Als erledigt markiert', 'Aufgabe aktualisiert.'); load(); })
        .catch(err => { toast('error', 'Fehler', err.message); b.disabled = false; });
    }));
    els('[data-copy-script]').forEach(b => b.addEventListener('click', () => {
      copyText(b.getAttribute('data-copy-script') || '')
        .then(() => toast('success', 'Skript kopiert', 'Telefon-Skript in der Zwischenablage.'))
        .catch(() => toast('error', 'Kopieren fehlgeschlagen', 'Bitte manuell markieren.'));
    }));
  }

  function taskMarkup(f, groupKey) {
    const scriptHtml = f.script ? `
      <div class="script-box">
        <button class="btn-icon copy" data-copy-script="${esc(f.script)}" title="Skript kopieren">${icons.copy(14)}</button>
        ${esc(f.script)}
      </div>` : '';
    return `
    <div class="task ${groupKey}">
      <span class="tag">T${f.dayOffset}</span>
      <div class="mid">
        <div class="act">${esc(f.action)}</div>
        <div class="meta">
          <span>${icons.users(12)} ${esc(f.customerName || '?')}</span>
          <span class="ref">#${f.quoteRef}</span>
          <span>${f.channel === 'telefon' ? icons.phone(12) + ' Telefon' : icons.mail(12) + ' ' + esc(f.channel)}</span>
        </div>
        ${groupKey !== 'done' ? `<button class="btn btn-ghost btn-sm mt-2" data-toggle-script style="font-size:11px">${icons.doc(12)} Skript anzeigen</button>
        <div class="script-hidden" style="display:none">${scriptHtml}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
        <span class="due">${fmt.relDay(f.dueAt)}</span>
        <button class="btn ${f.done ? 'btn-ghost' : 'btn-dark'} btn-sm" data-done="${f.id}" data-was-done="${f.done ? 1 : 0}">
          ${f.done ? icons.refresh(13) + ' Öffnen' : icons.check(13) + ' Erledigt'}
        </button>
      </div>
    </div>`;
  }

  /* Delegation für Skript-Toggle */
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-toggle-script]');
    if (!btn) return;
    const hidden = btn.parentElement.querySelector('.script-hidden');
    if (hidden) {
      const open = hidden.style.display !== 'none';
      hidden.style.display = open ? 'none' : 'block';
      btn.innerHTML = open ? icons.doc(12) + ' Skript anzeigen' : icons.x(12) + ' Skript schliessen';
    }
  });

  AFN.views.aufgaben = { render };
})();
