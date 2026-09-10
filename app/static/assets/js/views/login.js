/* ═══════════════════════════════════════════════════════════════════════════
   AutoFaszination Suite V3 — Login (Mitarbeiter-Portal)
   ═══════════════════════════════════════════════════════════════════════════ */
window.AFN = window.AFN || {};
window.AFN.views = window.AFN.views || {};

(function () {
  'use strict';

  const { icons, el } = AFN.ui;

  function render(root) {
    if (!root) return;
    root.innerHTML = `
    <div class="login-stage">

      <div class="login-hero">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="inner">
          <span class="eyebrow"><span class="dot"></span>LET26 Performance Platform</span>
          <h1>Auto<span class="accent">Faszination</span></h1>
          <p class="lead">
            Das Mitarbeiter-Portal für die LET26-Produktlinie: Fahrzeug-Konfigurator,
            Schweizer Offerten mit 8,1&nbsp;% MwSt., B2B-Partner-Routing über 415 Markenhäuser
            und das Vertriebs-Cockpit mit Follow-up-Automatik — alles in einem Cockpit.
          </p>
          <div class="facts">
            <div class="fact"><div class="v">415</div><div class="l">Markenhäuser</div></div>
            <div class="fact"><div class="v">68</div><div class="l">Fahrzeuge</div></div>
            <div class="fact"><div class="v"><em>8,1</em>%</div><div class="l">CH-MwSt.</div></div>
            <div class="fact"><div class="v">T1·3·7</div><div class="l">Follow-up</div></div>
          </div>
        </div>
        <div class="foot-note">Schnell &amp; Friends GmbH · Neuenhof AG · Swiss Made</div>
      </div>

      <div class="login-panel">
        <div class="login-card">
          <form id="loginForm" autocomplete="on" novalidate>
            <div class="card">
              <div class="card-body">
                <h2>Anmelden</h2>
                <p class="sub">Mitarbeiter-Portal · AutoFaszination <span class="ver-chip">V4.1</span></p>

                <div class="form-error" id="loginError">
                  ${icons.alert(16)}<span id="loginErrorText"></span>
                </div>

                <div class="field">
                  <label for="loginUser">Benutzername</label>
                  <div class="input-wrap">
                    <span class="lead-ico">${icons.users(16)}</span>
                    <input class="input" id="loginUser" name="username" type="text"
                      placeholder="z. B. admin" autocomplete="username" autofocus>
                  </div>
                </div>

                <div class="field">
                  <label for="loginPass">Passwort</label>
                  <div class="input-wrap">
                    <span class="lead-ico">${icons.key(16)}</span>
                    <input class="input" id="loginPass" name="password" type="password"
                      placeholder="••••••••" autocomplete="current-password">
                  </div>
                </div>

                <button type="submit" class="btn btn-primary btn-lg btn-block" id="loginSubmit">
                  ${icons.bolt(17)} Anmelden
                </button>

                <div class="demo-logins">
                  <div class="t">Demo-Zugänge (1-Klick)</div>
                  <div class="row">
                    <button type="button" data-demo="admin|admin123">admin · Geschäftsführung</button>
                    <button type="button" data-demo="mischa|mischa123">mischa · B2B-Vertrieb</button>
                    <button type="button" data-demo="uemit|uemit123">uemit · Verkauf</button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

    </div>`;

    const form = el('#loginForm');
    const errBox = el('#loginError');
    const errText = el('#loginErrorText');
    const submit = el('#loginSubmit');

    els('[data-demo]').forEach(btn => btn.addEventListener('click', () => {
      const [u, p] = btn.getAttribute('data-demo').split('|');
      el('#loginUser').value = u;
      el('#loginPass').value = p;
      form.requestSubmit();
    }));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const username = el('#loginUser').value.trim();
      const password = el('#loginPass').value;
      errBox.classList.remove('show');

      if (!username || !password) {
        errText.textContent = 'Bitte Benutzername und Passwort eingeben.';
        errBox.classList.add('show');
        return;
      }

      submit.disabled = true;
      submit.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2.5px;border-color:rgba(255,255,255,.3);border-top-color:#fff"></div> Anmelden …`;
      try {
        const res = await AFN.api.login(username, password);
        AFN.api.setSession(res.token, res.employee);
        AFN.ui.toast('success', 'Willkommen, ' + res.employee.name + '!', 'Angemeldet als ' + AFN.ui.roleLabel(res.employee.role) + '.');
        if (location.hash === '#/cockpit') { AFN.app.render(); }
        else { location.hash = '#/cockpit'; }
      } catch (err) {
        errText.textContent = err.message || 'Anmeldung fehlgeschlagen.';
        errBox.classList.add('show');
        submit.disabled = false;
        submit.innerHTML = `${icons.bolt(17)} Anmelden`;
      }
    });
  }

  /* el/els lokal verfügbar machen (im Strict-Modus ohne lokale Deklaration) */
  function els(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  AFN.views.login = { render };
})();
