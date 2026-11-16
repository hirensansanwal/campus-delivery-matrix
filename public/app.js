/* Parcel Collector – gate terminal UI
 * Plain JS, no build step. Served by Express from /public.
 *
 * API base:
 *   - served by the API itself     -> same origin, /api/v1
 *   - opened from disk (file://)   -> http://localhost:3000/api/v1
 *   - override with ?api=http://host:port
 */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const API_ROOT =
    (params.get('api') || (location.protocol === 'file:' ? 'http://localhost:3000' : '')).replace(/\/$/, '') + '/api/v1';

  /* ---------- small helpers ---------- */
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem('cdm:' + k)); } catch { return null; } },
    set(k, v) {
      try { v == null ? sessionStorage.removeItem('cdm:' + k) : sessionStorage.setItem('cdm:' + k, JSON.stringify(v)); } catch { /* storage off */ }
    },
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fmt = {
    short: (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    long: (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    weekday: (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short' }),
    time: (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
    dateTime: (d) => `${fmt.short(d)}, ${fmt.time(d)}`,
  };
  const daysAgo = (d) => {
    const a = new Date(); a.setHours(0, 0, 0, 0);
    const b = new Date(d); b.setHours(0, 0, 0, 0);
    return Math.round((a - b) / 864e5);
  };
  const waitingLabel = (d) => { const n = daysAgo(d); return n <= 0 ? 'Today' : n === 1 ? 'Since yesterday' : `${n} days`; };
  const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const firstName = (name) => String(name || '').split(/\s+/)[0] || 'the student';
  const byCreated = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const ICONS = {
    package: '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevrons-left': '<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>',
    'chevrons-right': '<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>',
  };
  const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* ---------- state ---------- */
  const state = {
    token: store.get('token'),
    user: store.get('user'),
    loginError: '', loginEmail: '', loginBusy: false,
    lastRoute: null,
  };

  /* ---------- API client ---------- */
  async function api(method, path, body) {
    try {
      let res;
      try {
        res = await fetch(API_ROOT + path, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch {
        throw Object.assign(new Error(`Can’t reach the server at ${API_ROOT}. Start it with “npm run dev”.`), { status: 0 });
      }
      let json;
      try { json = await res.json(); } catch { json = { success: false, message: `The server answered with status ${res.status}.` }; }
      if (!res.ok || !json.success) throw Object.assign(new Error(json.message || 'Request failed.'), { status: res.status });
      return json;
    } catch (e) {
      if (e.status === 401 && path !== '/auth/login' && state.token) {
        signOut();
        toast('Your session ended. Sign in again.', 'err');
      }
      throw e;
    }
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg, kind = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = `toast ${kind}`; }, 3400);
  }

  /* ---------- auth ---------- */
  async function signIn(email, password) {
    const { data } = await api('POST', '/auth/login', { email, password });
    state.token = data.token; state.user = data.user;
    store.set('token', data.token); store.set('user', data.user);
    state.lastRoute = null;
    state.loginError = ''; state.loginEmail = '';
    if (location.hash !== '#desk') location.hash = '#desk';
    render();
  }
  function signOut() {
    state.token = null; state.user = null;
    store.set('token', null); store.set('user', null);
    state.lastRoute = null;
    render();
  }

  /* ---------- routing ---------- */
  const ROUTES = { desk: 'Gate desk' };
  function currentRoute() {
    const r = location.hash.slice(1) || 'desk';
    if (!ROUTES[r]) return 'desk';
    return r;
  }

  /* ---------- rendering ---------- */
  function render() {
    const app = document.getElementById('app');
    const active = document.activeElement;
    const focusId = active && active.id;
    let sel = null;
    try { if (active && typeof active.selectionStart === 'number') sel = [active.selectionStart, active.selectionEnd]; } catch { /* not a text field */ }

    if (!state.token || !state.user) {
      document.title = 'Sign in – Parcel Collector';
      app.innerHTML = loginView();
    } else {
      const r = currentRoute();
      document.title = `${ROUTES[r]} – Parcel Collector`;
      app.innerHTML = shellView(r, pageView(r));
    }

    if (focusId) {
      const el = document.getElementById(focusId);
      if (el) {
        el.focus({ preventScroll: true });
        if (sel) { try { el.setSelectionRange(sel[0], sel[1]); } catch { /* ignore */ } }
      }
    }
  }

  const pageView = (r) => `<div class="page-head"><div><h1>${ROUTES[r]}</h1><p>${fmt.long(new Date())}</p></div></div>`;

  const brandView = () => `
    <a class="brand" href="#desk">
      <span class="brand-mark">${icon('package')}</span>
      <span class="brand-name"><b>Parcel Collector</b><span>Campus Delivery Matrix</span></span>
    </a>`;

  function shellView(r, body) {
    const u = state.user;
    const admin = u.role === 'ADMIN';
    const nav = [['desk', 'package', 'Gate desk']];
    return `
      <header class="topbar">
        ${brandView()}
        <div class="top-actions">
          <div class="avatar" title="${esc(u.name)}, ${admin ? 'Admin' : 'Guard'}">${esc(initials(u.name))}</div>
        </div>
      </header>
      <div class="shell">
        <nav class="rail" aria-label="Main">
          ${nav.map(([k, ic, label]) => `<a href="#${k}" aria-label="${label}" title="${label}" ${r === k ? 'aria-current="page"' : ''}>${icon(ic)}</a>`).join('')}
          <button class="push" type="button" data-action="sign-out" aria-label="Sign out" title="Sign out">${icon('logout')}</button>
        </nav>
        <main class="main" id="main">${body}</main>
      </div>`;
  }

  function loginView() {
    const busy = state.loginBusy;
    return `
      <div class="login">
        <header class="topbar">${brandView()}</header>
        <div class="login-main">
          <section class="login-card">
            <h1>Sign in to the gate desk</h1>
            <p>Use the account your campus admin set up for you.</p>
            <form data-form="login" novalidate>
              ${state.loginError ? `<div class="form-error" role="alert">${esc(state.loginError)}</div>` : ''}
              <div class="field">
                <label for="email">Email</label>
                <input class="input" id="email" name="email" type="email" autocomplete="username" required value="${esc(state.loginEmail)}">
              </div>
              <div class="field">
                <label for="password">Password</label>
                <input class="input" id="password" name="password" type="password" autocomplete="current-password" required>
              </div>
              <button class="btn btn-primary btn-lg btn-block" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Signing in…' : 'Sign in'}</button>
            </form>
          </section>
          <aside class="login-aside" aria-hidden="true">
            ${stampView('P-101', new Date())}
            <p>Log the parcel, write its tag on the box, and hand it over when the student comes to the gate.</p>
          </aside>
        </div>
      </div>`;
  }

  /* ----- shared bits ----- */
  const stampView = (code, date) => `
    <div class="stamp" role="img" aria-label="Tag ${esc(code)}, ${fmt.short(date)}">
      <span class="code">${esc(code)}</span><span class="date">${fmt.short(date)}</span>
    </div>`;
  /* ---------- actions ---------- */
  async function submitLogin(form) {
    const fd = new FormData(form);
    state.loginEmail = String(fd.get('email') || '');
    state.loginBusy = true; state.loginError = ''; render();
    try { await signIn(state.loginEmail, String(fd.get('password') || '')); }
    catch (e) { state.loginError = e.message; }
    state.loginBusy = false; render();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    switch (el.dataset.action) {
      case 'sign-out': signOut(); break;
      default: break;
    }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    ({ login: submitLogin })[f.dataset.form]?.(f);
  });

  window.addEventListener('hashchange', render);

  render();
})();
