/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V4.1 — Berichte (Vertriebs- & Finanzanalysen)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, fmt, esc, el, els, toast } = AFN.ui;
  const { barChart, hbars } = AFN.charts;

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="page-head">
      <div>
        <span class="kicker">Analyse</span>
        <h1>Berichte</h1>
        <p class="sub">Konversions-Trichter, Deal-Velocity, Kanal-Performance und Follow-up-Effektivität — die entscheidenden Kennzahlen für die LET26-Vertriebssteuerung.</p>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" id="repCsvBtn">${icons.download(15)} Top-Fahrzeuge CSV</button>
      </div>
    </div>
    <div id="repRoot">${AFN.ui.spinner('Berichte werden berechnet …')}</div>`;

    el('#repCsvBtn').addEventListener('click', () => {
      if (!lastData || !lastData.topVehicles.length) { toast('info', 'Keine Daten', 'Keine Fahrzeug-Statistiken vorhanden.'); return; }
      AFN.api.downloadCsv('top-fahrzeuge.csv', lastData.topVehicles.map(v => ({
        Fahrzeug: v.name, Offerten: v.count, Volumen: v.volume.toFixed(2), Gewonnen: v.won,
      })));
      toast('success', 'Export gestartet', 'top-fahrzeuge.csv wird heruntergeladen.');
    });

    load();
  }

  let lastData = null;

  function load() {
    AFN.api.reports().then(data => {
      lastData = data;
      paint(data);
    }).catch(err => {
      el('#repRoot').innerHTML =
        `<div class="card"><div class="card-body" style="color:#FF8C9B;font-size:13px">${icons.alert(16)} ${esc(err.message)}</div></div>`;
    });
  }

  function paint(d) {
    const k = d.kpis;
    const maxFunnel = d.funnel[0].count || 1;

    el('#repRoot').innerHTML = `
    <div class="kpi-grid stagger">
      <div class="kpi">
        <div class="head"><span class="lbl">Abschlussquote</span><span class="ico ${k.winRate >= 50 ? 'green' : 'amber'}">${icons.trend(19)}</span></div>
        <div class="val">${k.winRate} %</div>
        <div class="sub">${fmt.num(k.quotesTotal)} Offerten entschieden bewertet</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Deal-Velocity</span><span class="ico blue">${icons.clock(19)}</span></div>
        <div class="val">${k.dealVelocityDays === null ? '—' : k.dealVelocityDays + ' T.'}</div>
        <div class="sub">Ø Zeit von Offerte bis Entscheidung</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Ø Offertenwert</span><span class="ico">${icons.doc(19)}</span></div>
        <div class="val">${fmt.chfShort(k.avgQuote)}</div>
        <div class="sub">Über alle Kanäle (B2C + B2B)</div>
      </div>
      <div class="kpi">
        <div class="head"><span class="lbl">Rechnungs-Umsatz</span><span class="ico green">${icons.euro(19)}</span></div>
        <div class="val">${fmt.chfShort(k.revenueTotal)}</div>
        <div class="sub">${fmt.num(k.vehiclesTotal)} Fahrzeuge · ${fmt.num(k.partnersTotal)} Partner</div>
      </div>
    </div>

    <div class="grid grid-2 mt-4 stagger">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Konversions-Trichter</div>
            <div class="card-sub">Vom Erstkontakt bis zum Abschluss</div>
          </div>
        </div>
        <div class="card-body">
          ${d.funnel.map((f, i) => {
            const pct = Math.round(f.count / maxFunnel * 100);
            const conv = i === 0 ? null : Math.round(f.count / (d.funnel[i - 1].count || 1) * 100);
            return `
            <div class="funnel-row">
              <span class="flab">${esc(f.stage)}</span>
              <div class="ftrack">
                <div class="ffill" style="width:${Math.max(4, pct)}%; animation-delay:${i * 0.1}s"></div>
              </div>
              <b class="fval num">${fmt.num(f.count)}</b>
              ${conv !== null ? `<span class="fconv ${conv >= 50 ? 'good' : conv >= 30 ? 'ok' : 'bad'} num">${conv} %</span>` : '<span class="fconv num">—</span>'}
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Volumen &amp; Umsatz</div>
            <div class="card-sub">Offerten-Volumen (Balken) vs. Rechnungs-Umsatz</div>
          </div>
        </div>
        <div class="card-body">
          <div class="chart-bars" id="repVolume"></div>
          <div class="mt-3" style="border-top:1px solid var(--line-soft);padding-top:12px">
            <div id="repRevenue"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-2 mt-4 stagger">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Top-Fahrzeuge</div>
            <div class="card-sub">Nach Offertvolumen (CHF)</div>
          </div>
        </div>
        <div class="card-body" id="repVehicles"></div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Top-Partner-Garagen</div>
            <div class="card-sub">Nach geroutetem Offertvolumen</div>
          </div>
        </div>
        <div class="card-body" id="repPartners"></div>
      </div>
    </div>

    <div class="grid grid-2 mt-4 stagger">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Kanal-Performance</div>
            <div class="card-sub">B2C-Direktgeschäft vs. B2B-Markenhäuser</div>
          </div>
        </div>
        <div class="card-body">
          ${d.channels.map(c => `
          <div class="channel-block">
            <div class="row" style="justify-content:space-between;margin-bottom:8px">
              <b style="font-size:12.5px">${c.channel === 'b2b' ? 'B2B — Markenhäuser' : 'B2C — Endkunden'}</b>
              <span class="badge ${c.channel === 'b2b' ? 'badge-violet' : 'badge-blue'}">${c.winRate} % Win-Rate</span>
            </div>
            <div class="row row-wrap" style="gap:16px;font-size:11.5px">
              <span class="dim">Offerten <b class="num" style="color:var(--txt)">${fmt.num(c.count)}</b></span>
              <span class="dim">Volumen <b class="num" style="color:var(--txt)">${fmt.chfShort(c.volume)}</b></span>
              <span class="dim">Gewonnen <b class="num" style="color:var(--txt)">${fmt.num(c.won)}</b></span>
              <span class="dim">Ø Offerte <b class="num" style="color:var(--txt)">${fmt.chfShort(c.avgQuote)}</b></span>
            </div>
          </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Follow-up-Effektivität</div>
            <div class="card-sub">Erledigungsquote nach Offerten-Ausgang (Tag 1 / 3 / 7)</div>
          </div>
        </div>
        <div class="card-body">
          ${(() => {
            const f = d.followupEffectiveness;
            const gap = f.doneRateWon - f.doneRateOthers;
            return `
            <div class="row" style="gap:12px;margin-bottom:16px">
              <div style="flex:1;text-align:center;padding:14px 8px;border-radius:var(--r-md);background:var(--bg-2);border:1px solid var(--line-soft)">
                <div class="dim mini-cap" style="margin-bottom:6px">Gesamt</div>
                <b class="num" style="font-size:22px;font-family:var(--font-d)">${f.doneRate} %</b>
                <div class="dim" style="font-size:10.5px">${fmt.num(f.total)} Aufgaben</div>
              </div>
              <div style="flex:1;text-align:center;padding:14px 8px;border-radius:var(--r-md);background:rgba(47,216,124,.07);border:1px solid rgba(47,216,124,.25)">
                <div class="dim mini-cap" style="margin-bottom:6px">Gewonnene Offerten</div>
                <b class="num" style="font-size:22px;font-family:var(--font-d);color:#2FD87C">${f.doneRateWon} %</b>
                <div class="dim" style="font-size:10.5px">Follow-ups erledigt</div>
              </div>
              <div style="flex:1;text-align:center;padding:14px 8px;border-radius:var(--r-md);background:var(--bg-2);border:1px solid var(--line-soft)">
                <div class="dim mini-cap" style="margin-bottom:6px">Verlorene / andere</div>
                <b class="num" style="font-size:22px;font-family:var(--font-d);color:#FF8C9B">${f.doneRateOthers} %</b>
                <div class="dim" style="font-size:10.5px">Follow-ups erledigt</div>
              </div>
            </div>
            <div class="note-amber">
              <b>Kernerkenntnis:</b> Bei gewonnenen Offerten wurden <b class="num">${gap} Prozentpunkte</b> mehr Follow-ups erledigt als bei übrigen. Die LET26-Nachverfolgung (Tag 1 / 3 / 7) ist ein direkter Treiber des Abschlusses.
            </div>`;
          })()}
        </div>
      </div>
    </div>`;

    barChart(el('#repVolume'), d.months.map(m => ({ label: m.label, value: m.quoteVolume })), {
      formatValue: v => fmt.chfShort(v),
    });
    hbars(el('#repRevenue'), d.months.map(m => ({
      label: m.label, value: m.revenue,
    })).filter(m => m.value > 0), { formatValue: v => fmt.chfShort(v) });

    hbars(el('#repVehicles'), d.topVehicles.slice(0, 6).map(v => ({
      label: v.name.length > 22 ? v.name.slice(0, 21) + '…' : v.name, value: v.volume,
    })), { formatValue: v => fmt.chfShort(v) });

    hbars(el('#repPartners'), d.topPartners.slice(0, 6).map(p => ({
      label: p.company.length > 24 ? p.company.slice(0, 23) + '…' : p.company, value: p.volume,
    })), { formatValue: v => fmt.chfShort(v) });
  }

  AFN.views.berichte = { render };
})();
