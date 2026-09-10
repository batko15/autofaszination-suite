/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — Cockpit (Vertriebs-Dashboard)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, badge, STATUS_META, countUp, spinner, empty } = AFN.ui;
  const { barChart, hbars, donut, donutLegend } = AFN.charts;

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">Vertriebs-Cockpit</span>
        <h1>Guten Tag, ${esc((AFN.api.getStoredEmployee() || {}).name || '')} 👋</h1>
        <p class="sub">Ihr Tagesüberblick über Offerten, Pipeline, B2B-Potenzial und anstehende Follow-ups — alles in Echtzeit aus der lokalen Datenbank.</p>
      </div>
      <div class="actions">
        <a class="btn btn-ghost" href="#/aufgaben">${icons.check(15)} Aufgaben</a>
        <a class="btn btn-primary" href="#/konfigurator">${icons.bolt(16)} Neue Offerte</a>
      </div>
    </div>

    <div id="cockpitRoot">${spinner('Cockpit wird geladen …')}</div>`;

    AFN.api.dashboardStats()
      .then(stats => paint(root, stats))
      .catch(err => {
        el('#cockpitRoot').innerHTML =
          `<div class="card"><div class="card-body" style="color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div></div>`;
      });
  }

  function paint(root, s) {
    const b2b = s.b2bPotential || {};
    const winRateGood = (s.winRate || 0) >= 50;

    const markup = `
    <!-- KPI-Band -->
    <div class="kpi-grid stagger">
      <div class="kpi">
        <div class="glow"></div>
        <div class="head"><span class="lbl">Offertvolumen</span><span class="ico">${icons.euro(19)}</span></div>
        <div class="val" id="kpiVolume">—</div>
        <div class="sub"><b>${fmt.num(s.quotesTotal)}</b> Offerten insgesamt · Ø ${fmt.chfShort(s.avgQuoteValue)}</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Abschlussquote</span><span class="ico ${winRateGood ? 'green' : 'amber'}">${icons.trend(19)}</span></div>
        <div class="val" id="kpiWin">—</div>
        <div class="sub"><b>${fmt.num(s.quotesWon)}</b> gewonnen · ${fmt.num(s.quotesLost)} verloren</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Ø Offertenwert</span><span class="ico blue">${icons.doc(19)}</span></div>
        <div class="val" id="kpiAvg">—</div>
        <div class="sub">Offen <b>${fmt.num(s.quotesOpen)}</b> · Versendet <b>${fmt.num(s.quotesSent)}</b></div>
      </div>
      <div class="kpi" style="cursor:pointer" onclick="location.hash='#/aufgaben'">
        <div class="head"><span class="lbl">Offene Aufgaben</span><span class="ico ${s.followupsOverdue > 0 ? 'amber' : 'green'}">${icons.clock(19)}</span></div>
        <div class="val" id="kpiTasks">—</div>
        <div class="sub"><b>${fmt.num(s.followupsOverdue)}</b> überfällig · ${fmt.num(s.followupsToday)} heute fällig</div>
      </div>
    </div>

    <!-- Charts-Reihe -->
    <div class="grid grid-2 mt-4 stagger">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Offertvolumen nach Monat</div>
            <div class="card-sub">Letzte 6 Monate · Total inkl. MwSt. und Porto</div>
          </div>
          <span class="badge badge-green">${fmt.chfShort(s.volumeWon)} gewonnen</span>
        </div>
        <div class="card-body">
          <div class="chart-bars" id="chartMonthly"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Pipeline nach Status</div>
            <div class="card-sub">Alle Offerten nach Bearbeitungsstand</div>
          </div>
        </div>
        <div class="card-body">
          <div id="pipeBars"></div>
          <div class="mt-3" style="border-top:1px solid var(--line-soft);padding-top:16px">
            <p style="font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:4px">Kanal-Verteilung</p>
            <div id="channelDonut"></div>
            <div id="channelLegend"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Marken + B2B-Potenzial -->
    <div class="grid grid-3 mt-4 stagger">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Top-Marken</div>
            <div class="card-sub">Fahrzeuge in Offerten</div>
          </div>
        </div>
        <div class="card-body" id="brandBars"></div>
      </div>

      <div class="card" style="grid-column: span 2">
        <div class="card-head">
          <div>
            <div class="card-title">LET26-Vertriebs-Roadmap — B2B-Potenzial</div>
            <div class="card-sub">Markenhäuser-Netzwerk (Schweiz &amp; FL) nach Akquise-Wellen</div>
          </div>
          <a class="btn btn-ghost btn-sm" href="#/partner">${icons.network(14)} Netzwerk öffnen</a>
        </div>
        <div class="card-body">
          <div class="grid grid-4" style="gap:10px">
            <div class="stat-tile dark"><div class="v">${fmt.num(b2b.markenhaeuserTotal)}</div><div class="l">Markenhäuser</div></div>
            <div class="stat-tile red"><div class="v">${fmt.num(b2b.mitAnsprechperson)}</div><div class="l">Mit Ansprechperson</div></div>
            <div class="stat-tile"><div class="v">${(b2b.adressierbareFahrzeuge / 1000).toLocaleString('de-CH')}k</div><div class="l">Fahrzeuge adressierbar</div></div>
            <div class="stat-tile"><div class="v">CHF ${(b2b.endkundenPotenzialChf / 1e6).toLocaleString('de-CH')} Mio.</div><div class="l">Potenzial p. a.</div></div>
          </div>
          <div class="grid grid-4 mt-2" style="gap:10px">
            ${(b2b.wellen || []).map(w => `
              <div style="border-radius:var(--r-md);border:1px solid var(--line);background:var(--bg-2);padding:14px 14px;position:relative;overflow:hidden">
                <div style="position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--red);box-shadow:0 0 10px var(--red-glow)"></div>
                <div style="font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--red-2)">Welle ${w.welle}</div>
                <div style="font-size:12px;font-weight:600;color:var(--txt-2);margin-top:2px">${esc(w.regionen)}</div>
                <div style="font-family:var(--font-d);font-size:20px;font-weight:700;color:var(--txt);margin-top:6px" class="num">${fmt.num(w.actualHaeuser)}</div>
                <div style="font-size:9.5px;color:var(--mut)">Häuser im Bestand</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Letzte Offerten + Follow-ups -->
    <div class="grid grid-3 mt-4 stagger">
      <div class="card" style="grid-column: span 2">
        <div class="card-head">
          <div>
            <div class="card-title">Letzte Offerten</div>
            <div class="card-sub">Die 8 neuesten Erfassungen</div>
          </div>
          <a class="btn btn-ghost btn-sm" href="#/offerten">Alle ansehen ${icons.arrowR(13)}</a>
        </div>
        <div class="card-body flush">
          <div class="tbl-wrap">
            <table class="tbl">
              <thead><tr>
                <th>Referenz</th><th>Kunde</th><th>Fahrzeug</th>
                <th class="r">Total</th><th>Status</th><th>Datum</th>
              </tr></thead>
              <tbody>
                ${(s.recentQuotes || []).map(q => `
                  <tr class="clickable" data-quote="${q.id}">
                    <td class="ref">#${q.refNumber}</td>
                    <td class="strong" style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(q.customerName)}</td>
                    <td class="dim" style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(q.vehicleLabel)}</td>
                    <td class="r strong num">${fmt.chf(q.total)}</td>
                    <td>${badge(STATUS_META[q.status] || { label: q.status, cls: 'badge-zinc' })}</td>
                    <td class="dim num">${fmt.dateDE(q.createdAt)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Nächste Follow-ups</div>
            <div class="card-sub">Tag 1 / 3 / 7 gem. LET26-Vertriebs-Guide</div>
          </div>
          <a class="btn btn-ghost btn-sm" href="#/aufgaben">${icons.check(13)}</a>
        </div>
        <div class="card-body flush">
          ${(s.upcomingFollowups || []).length === 0 ? empty(icons.checkCircle(22), 'Alles erledigt!', 'Keine offenen Follow-ups — starke Leistung.') : `
          <ul>
            ${s.upcomingFollowups.map(f => {
              const overdue = f.dueAt && new Date(f.dueAt) < new Date();
              return `
              <li style="display:flex;gap:12px;align-items:flex-start;padding:13px 18px;border-bottom:1px solid var(--line-soft)">
                <span style="flex-shrink:0;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;
                  font-family:var(--font-d);font-weight:700;font-size:11px;
                  background:${overdue ? 'var(--red-tint);color:var(--red-2)' : 'var(--surface-2);color:var(--txt-2)'}">T${f.dayOffset}</span>
                <div style="min-width:0;flex:1">
                  <div style="font-size:12.5px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    ${esc(f.customerName)} <span class="dim">· #${f.quoteRef}</span></div>
                  <div style="font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.action)}</div>
                </div>
                <span style="flex-shrink:0;font-size:10.5px;font-weight:700;${overdue ? 'color:var(--red-2)' : 'color:var(--mut)'}">${fmt.relDay(f.dueAt)}</span>
              </li>`;
            }).join('')}
          </ul>`}
          <div style="padding:11px 18px;font-size:10.5px;color:var(--mut);border-top:1px solid var(--line-soft)">
            <span style="color:var(--red-2);font-weight:700">${icons.bolt(11)}</span>
            Skripte aus «Leitfaden Mischa» in der Aufgaben-Ansicht.
          </div>
        </div>
      </div>
    </div>`;

    el('#cockpitRoot').innerHTML = markup;

    /* KPI-Zähler animieren */
    countUp(el('#kpiVolume'), s.volumeTotal || 0, v => fmt.chf(v));
    countUp(el('#kpiWin'), s.winRate || 0, v => fmt.pct(Math.round(v * 10) / 10));
    countUp(el('#kpiAvg'), s.avgQuoteValue || 0, v => fmt.chf(v));
    countUp(el('#kpiTasks'), (s.followupsOverdue || 0) + (s.followupsToday || 0), v => fmt.num(Math.round(v)));

    /* Charts */
    barChart(el('#chartMonthly'),
      (s.monthly || []).map(m => ({ label: m.label, value: m.volume })),
      { formatValue: v => fmt.chfShort(v).replace('CHF ', '') });

    hbars(el('#pipeBars'), [
      { label: 'Offen', value: s.quotesOpen },
      { label: 'Versendet', value: s.quotesSent },
      { label: 'Gewonnen', value: s.quotesWon },
      { label: 'Verloren', value: s.quotesLost },
    ], {
      formatValue: v => fmt.num(v),
      colors: { Offen: 'blue', Versendet: 'amber', Gewonnen: 'green', Verloren: 'zinc' },
    });

    const parts = (s.channelSplit || []).map(c => ({ label: c.label, value: c.value }));
    donut(el('#channelDonut'), parts, {
      centerValue: fmt.num(s.quotesTotal), centerLabel: 'Offerten',
      colors: ['#E2001A', '#5AA7FF'],
    });
    el('#channelLegend').innerHTML = donutLegend(parts, ['#E2001A', '#5AA7FF']);

    hbars(el('#brandBars'),
      (s.topBrands || []).map(b => ({ label: b.brand, value: b.count })),
      { formatValue: v => fmt.num(v) + '×' });

    /* Zeilen-Klick → Offerten-Detail */
    AFN.ui.els('[data-quote]', root).forEach(tr =>
      tr.addEventListener('click', () => {
        location.hash = '#/offerten?focus=' + tr.getAttribute('data-quote');
      }));
  }

  AFN.views.cockpit = { render };
})();
