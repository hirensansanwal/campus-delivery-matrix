/* Parcel Collector – gate terminal UI
 * Plain JS, no build step. Served by Express from /public.
 *
 * API base:
 *   - served by the API itself     -> same origin, /api/v1
 *   - opened from disk (file://)   -> http://localhost:3000/api/v1
 *   - override with ?api=http://host:port
 * Demo mode (?demo, or "Explore with demo data" on sign-in) runs an
 * in-memory copy of the API so the UI works without Postgres/Mongo.
 */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const API_ROOT =
    (params.get('api') || (location.protocol === 'file:' ? 'http://localhost:3000' : '')).replace(/\/$/, '') + '/api/v1';
  const CARRIERS = ['Amazon', 'Flipkart', 'Delhivery', 'Bluedart', 'Myntra'];
  const PAGE_SIZE = 10;
  const DEMO_USERS = [
    { email: 'admin@campus.edu', password: 'Admin@123', name: 'Campus Admin', role: 'Admin' },
    { email: 'guard1@campus.edu', password: 'Guard@123', name: 'Guard One', role: 'Guard' },
    { email: 'guard2@campus.edu', password: 'Guard@123', name: 'Guard Two', role: 'Guard' },
  ];

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
  if (params.has('demo')) store.set('demo', true);

  const freshDesk = () => ({
    tab: 'log', logStudent: null, carrier: 'Amazon', otherCarrier: '', tracking: '', notes: '',
    lastParcel: null, busy: false, error: '',
    pickupResult: null, pickupLoading: false, pickupError: '',
    day: dayKey(new Date()),
  });
  const freshAdmin = () => ({
    tab: 'overview', guards: null, webhooks: null, chats: null,
    showGuardForm: false, guardError: '', guardBusy: false,
    webhookFilter: '', webhookCarrier: 'Amazon', payload: SAMPLE_PAYLOAD, webhookError: '', webhookBusy: false,
    chatPhone: '', chatMessage: '', chatError: '', chatBusy: false,
  });
  const SAMPLE_PAYLOAD = JSON.stringify({ trackingNumber: 'AMZ1234567890', status: 'OUT_FOR_DELIVERY', location: 'Campus gate', eta: 'Today, 6 pm' }, null, 2);

  const state = {
    token: store.get('token'),
    user: store.get('user'),
    demo: store.get('demo') === true,
    loginError: '', loginEmail: '', loginBusy: false,
    inventory: [], inventoryLoaded: false,
    stats: null,
    desk: freshDesk(),
    shelf: { carrier: '', q: '', page: 1, searchOpen: false },
    students: { q: '', results: null, loading: false, error: '' },
    admin: freshAdmin(),
    pickers: { log: newPicker(), pickup: newPicker() },
    lastRoute: null,
  };
  function newPicker() { return { q: '', results: [], active: -1, seq: 0, searched: null, error: null }; }

  /* ---------- API client ---------- */
  async function api(method, path, body) {
    try {
      if (state.demo) return await mock.handle(method, path, body);
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
        throw Object.assign(new Error(`Can’t reach the server at ${API_ROOT}. Start it with “npm run dev”, or explore the demo instead.`), { status: 0 });
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

  /* ---------- in-memory demo API (mirrors the Express routes) ---------- */
  const mock = (() => {
    const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
    const users = [
      { id: 'demo-admin', name: 'Campus Admin', email: 'admin@campus.edu', password: 'Admin@123', role: 'ADMIN', createdAt: new Date(Date.now() - 40 * 864e5) },
      { id: 'demo-guard1', name: 'Guard One', email: 'guard1@campus.edu', password: 'Guard@123', role: 'GUARD', createdAt: new Date(Date.now() - 38 * 864e5) },
      { id: 'demo-guard2', name: 'Guard Two', email: 'guard2@campus.edu', password: 'Guard@123', role: 'GUARD', createdAt: new Date(Date.now() - 21 * 864e5) },
    ];
    const students = [
      ['RU2025CS001', 'Aarav Sharma', 'Aravali Hostel', 'A-101'],
      ['RU2025CS002', 'Ananya Verma', 'Aravali Hostel', 'A-102'],
      ['RU2025CS003', 'Rohan Gupta', 'Aravali Hostel', 'A-203'],
      ['RU2025CS004', 'Priya Singh', 'Shivalik Hostel', 'S-105'],
      ['RU2025CS005', 'Kabir Malhotra', 'Shivalik Hostel', 'S-210'],
      ['RU2025CS006', 'Isha Kapoor', 'Shivalik Hostel', 'S-211'],
      ['RU2025CS007', 'Vihaan Mehta', 'Aravali Hostel', 'A-305'],
      ['RU2025CS008', 'Diya Reddy', 'Shivalik Hostel', 'S-312'],
      ['RU2025CS009', 'Arjun Nair', 'Aravali Hostel', 'A-110'],
      ['RU2025CS010', 'Meera Joshi', 'Shivalik Hostel', 'S-118'],
    ].map(([enrollmentNo, name, hostel, room]) => ({
      id: uid(), enrollmentNo, name, hostel, room, phone: null, email: `${enrollmentNo.toLowerCase()}@campus.edu`,
    }));
    const parcels = [];
    const webhooks = [];
    const chats = [];

    const tagFor = (date) => `P-${101 + parcels.filter((p) => dayKey(p.createdAt) === dayKey(date)).length}`;
    const add = (enr, carrier, createdAt, pickedUp, loggedById = 'demo-guard1') => {
      const s = students.find((x) => x.enrollmentNo === enr);
      const p = {
        id: uid(), lookupNumber: tagFor(createdAt), carrier, trackingNumber: null, notes: null,
        status: pickedUp ? 'PICKED_UP' : 'RECEIVED', studentId: s.id, studentEnrollmentNo: s.enrollmentNo,
        loggedById, pickedUpAt: pickedUp ? new Date(createdAt.getTime() + 3 * 36e5) : null,
        createdAt, updatedAt: createdAt,
      };
      parcels.push(p);
      return p;
    };
    const daysBack = (n, h, m) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return d; };
    const minsAgo = (m) => new Date(Date.now() - m * 6e4);

    // Seeded so a student has two "P-101" parcels from different days: dates matter.
    add('RU2025CS004', 'Flipkart', daysBack(5, 11, 20));
    add('RU2025CS001', 'Amazon', daysBack(2, 10, 5));
    add('RU2025CS007', 'Delhivery', daysBack(2, 12, 40), true);
    add('RU2025CS002', 'Myntra', daysBack(2, 15, 10));
    add('RU2025CS009', 'Bluedart', daysBack(1, 9, 30), true);
    add('RU2025CS005', 'Amazon', daysBack(1, 13, 15));
    add('RU2025CS006', 'Flipkart', daysBack(1, 16, 45));
    add('RU2025CS001', 'Amazon', minsAgo(190));
    add('RU2025CS003', 'Flipkart', minsAgo(150), true);
    add('RU2025CS008', 'Delhivery', minsAgo(95));
    add('RU2025CS010', 'Amazon', minsAgo(40));

    webhooks.push({ _id: uid(), carrier: 'Delhivery', rawPayload: { awb: 'DL55120934', status: 'DELIVERED', receivedBy: 'Gate 1' }, receivedAt: minsAgo(96), processed: false });
    chats.push({
      _id: uid(), sessionId: 'chat_session_demo', driverPhone: '+91 98XXXXXX21', createdAt: minsAgo(70),
      messages: [
        { sender: 'driver', text: 'Which gate for parcel drop?', time: minsAgo(70) },
        { sender: 'bot', text: 'Please proceed to Gate 1 Main Security Office.', time: minsAgo(70) },
      ],
    });

    const err = (status, message) => Object.assign(new Error(message), { status });
    const ok = (data, message) => ({ success: true, ...(message ? { message } : {}), data });
    const pubUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt });
    const view = (p) => {
      const s = students.find((x) => x.id === p.studentId);
      return { ...p, student: s ? { name: s.name, hostel: s.hostel, room: s.room } : undefined };
    };
    const limitOf = (v) => { const n = parseInt(v, 10); return Number.isNaN(n) || n < 1 ? 50 : Math.min(n, 200); };

    async function handle(method, fullPath, body = {}) {
      await new Promise((r) => setTimeout(r, 160));
      body = body || {};
      const [path, query = ''] = fullPath.split('?');
      const q = new URLSearchParams(query);

      if (method === 'POST' && path === '/auth/login') {
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        if (!email || !password) throw err(400, 'email and password are required');
        const u = users.find((x) => x.email === email && x.password === password);
        if (!u) throw err(401, 'Invalid email or password');
        return ok({ token: `demo.${u.id}`, user: pubUser(u) }, 'Login successful');
      }

      const me = users.find((u) => `demo.${u.id}` === state.token);
      if (!me) throw err(401, 'Missing or malformed Authorization header');
      const adminOnly = () => { if (me.role !== 'ADMIN') throw err(403, 'You do not have permission to perform this action'); };

      if (method === 'GET' && path === '/auth/me') return ok(pubUser(me));

      if (method === 'POST' && path === '/parcels') {
        const enr = String(body.studentEnrollmentNo || '').trim().toUpperCase();
        const carrier = String(body.carrier || '').trim();
        if (!enr || !carrier) throw err(400, 'studentEnrollmentNo and carrier are required');
        const s = students.find((x) => x.enrollmentNo === enr);
        if (!s) throw err(404, `No student found with enrollment number ${enr}`);
        const p = add(enr, carrier, new Date(), false, me.id);
        p.trackingNumber = body.trackingNumber ? String(body.trackingNumber).trim() : null;
        p.notes = body.notes ? String(body.notes).trim() : null;
        return ok(view(p), `Parcel logged. Write "${p.lookupNumber}" on the box.`);
      }
      if (method === 'GET' && path === '/parcels/search') {
        const enr = String(q.get('enrollmentNo') || '').trim().toUpperCase();
        if (!enr) throw err(400, 'Query parameter "enrollmentNo" is required');
        const s = students.find((x) => x.enrollmentNo === enr);
        if (!s) throw err(404, `No student found with enrollment number ${enr}`);
        const list = parcels.filter((p) => p.studentEnrollmentNo === enr && p.status === 'RECEIVED').sort(byCreated).map(view);
        return ok({ student: { ...s }, pendingCount: list.length, lookupNumbers: list.map((p) => p.lookupNumber), parcels: list });
      }
      if (method === 'GET' && path === '/parcels/inventory') {
        const list = parcels.filter((p) => p.status === 'RECEIVED').sort(byCreated).map(view);
        return ok({ count: list.length, parcels: list });
      }
      const pickup = path.match(/^\/parcels\/([^/]+)\/pickup$/);
      if (method === 'PATCH' && pickup) {
        const p = parcels.find((x) => x.id === decodeURIComponent(pickup[1]));
        if (!p) throw err(404, 'Parcel not found');
        if (p.status !== 'RECEIVED') throw err(409, `Parcel ${p.lookupNumber} has already been picked up`);
        p.status = 'PICKED_UP'; p.pickedUpAt = new Date(); p.updatedAt = new Date();
        return ok(view(p), `Parcel ${p.lookupNumber} marked as picked up`);
      }
      if (method === 'GET' && path === '/students/search') {
        const term = String(q.get('q') || '').trim();
        if (term.length < 2) throw err(400, 'Query "q" must be at least 2 characters');
        const t = term.toLowerCase();
        const list = students
          .filter((s) => s.enrollmentNo.toLowerCase().includes(t) || s.name.toLowerCase().includes(t))
          .sort((a, b) => a.enrollmentNo.localeCompare(b.enrollmentNo))
          .slice(0, 10);
        return ok(list.map((s) => ({ ...s })));
      }

      if (path.startsWith('/admin/')) adminOnly();
      if (method === 'GET' && path === '/admin/stats') {
        const since = new Date(); since.setHours(0, 0, 0, 0);
        return ok({
          receivedToday: parcels.filter((p) => new Date(p.createdAt) >= since).length,
          pickedUpToday: parcels.filter((p) => p.status === 'PICKED_UP' && new Date(p.pickedUpAt) >= since).length,
          activeInventory: parcels.filter((p) => p.status === 'RECEIVED').length,
          generatedAt: new Date(),
        });
      }
      if (method === 'GET' && path === '/admin/guards') {
        return ok(users.filter((u) => u.role === 'GUARD').sort((a, b) => b.createdAt - a.createdAt).map(pubUser));
      }
      if (method === 'POST' && path === '/admin/guards') {
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        if (!name || !email || !password) throw err(400, 'name, email and password are required');
        if (password.length < 8) throw err(400, 'password must be at least 8 characters');
        if (users.some((u) => u.email === email)) throw err(409, 'A user with that email already exists');
        const u = { id: uid(), name, email, password, role: 'GUARD', createdAt: new Date() };
        users.push(u);
        return ok(pubUser(u), 'Guard account created');
      }
      if (method === 'POST' && path === '/admin/mock/webhook') {
        const carrier = String(body.carrier || '').trim();
        const raw = body.rawPayload;
        if (!carrier) throw err(400, 'carrier is required');
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw err(400, 'rawPayload must be a JSON object');
        const doc = { _id: uid(), carrier, rawPayload: raw, receivedAt: new Date(), processed: false };
        webhooks.push(doc);
        return ok(doc, 'Webhook stored in MongoDB');
      }
      if (method === 'POST' && path === '/admin/mock/chat') {
        let messages = body.messages;
        if (!Array.isArray(messages) || !messages.length) {
          const text = String(body.message || '').trim();
          if (!text) throw err(400, 'Provide either "message" or a non-empty "messages" array');
          messages = [
            { sender: 'driver', text, time: new Date() },
            { sender: 'bot', text: 'Please proceed to Gate 1 Main Security Office.', time: new Date() },
          ];
        }
        const doc = { _id: uid(), sessionId: body.sessionId || `chat_session_${Date.now()}`, driverPhone: body.driverPhone || null, messages, createdAt: new Date() };
        chats.push(doc);
        return ok(doc, 'Chat log stored in MongoDB');
      }
      if (method === 'POST' && path === '/admin/mock/seed') {
        const first = [...students].sort((a, b) => a.enrollmentNo.localeCompare(b.enrollmentNo)).slice(0, 5);
        const created = first.map((s, i) => {
          const p = add(s.enrollmentNo, CARRIERS[i], new Date(), false, me.id);
          p.trackingNumber = `DEMO${Date.now()}${i}`; p.notes = 'Demo seed';
          return view(p);
        });
        return ok(created, '5 demo parcels created');
      }
      if (method === 'GET' && path === '/admin/webhooks') {
        const c = q.get('carrier');
        const list = webhooks.filter((w) => !c || w.carrier === c).sort((a, b) => b.receivedAt - a.receivedAt).slice(0, limitOf(q.get('limit')));
        return ok({ count: list.length, webhooks: list });
      }
      if (method === 'GET' && path === '/admin/chat-logs') {
        const sid = q.get('sessionId');
        const list = chats.filter((c) => !sid || c.sessionId === sid).sort((a, b) => b.createdAt - a.createdAt).slice(0, limitOf(q.get('limit')));
        return ok({ count: list.length, chatLogs: list });
      }
      throw err(404, `Route not found: ${method} /api/v1${path}`);
    }
    return { handle };
  })();

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
    state.desk = freshDesk(); state.admin = freshAdmin(); state.stats = null;
    state.inventory = []; state.inventoryLoaded = false; state.lastRoute = null;
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

  /* ---------- data loading ---------- */
  async function loadInventory() {
    try {
      const { data } = await api('GET', '/parcels/inventory');
      state.inventory = data.parcels; state.inventoryLoaded = true;
    } catch (e) { if (e.status !== 401) toast(e.message, 'err'); }
    render();
  }
  async function loadStats() {
    if (state.user?.role !== 'ADMIN') return;
    try { const { data } = await api('GET', '/admin/stats'); state.stats = data; } catch { /* shown elsewhere */ }
    render();
  }
  async function loadGuards() {
    try { const { data } = await api('GET', '/admin/guards'); state.admin.guards = data; } catch (e) { toast(e.message, 'err'); }
    render();
  }
  async function loadWebhooks() {
    const c = state.admin.webhookFilter;
    try {
      const { data } = await api('GET', `/admin/webhooks?limit=50${c ? `&carrier=${encodeURIComponent(c)}` : ''}`);
      state.admin.webhooks = data.webhooks;
    } catch (e) { toast(e.message, 'err'); }
    render();
  }
  async function loadChats() {
    try { const { data } = await api('GET', '/admin/chat-logs?limit=50'); state.admin.chats = data.chatLogs; } catch (e) { toast(e.message, 'err'); }
    render();
  }
  function loadAdminTab() {
    const t = state.admin.tab;
    if (t === 'overview') loadStats();
    if (t === 'guards') loadGuards();
    if (t === 'updates') loadWebhooks();
    if (t === 'chat') loadChats();
  }
  function enter(r) {
    loadInventory();
    if (r === 'desk') loadStats();
    if (r === 'admin') loadAdminTab();
  }

  /* ---------- routing ---------- */
  const ROUTES = { desk: 'Gate desk', shelf: 'Shelf', students: 'Students', admin: 'Admin' };
  function currentRoute() {
    const r = location.hash.slice(1) || 'desk';
    if (!ROUTES[r]) return 'desk';
    if (r === 'admin' && state.user?.role !== 'ADMIN') return 'desk';
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
      if (r !== state.lastRoute) { state.lastRoute = r; queueMicrotask(() => enter(r)); }
    }

    if (focusId) {
      const el = document.getElementById(focusId);
      if (el) {
        el.focus({ preventScroll: true });
        if (sel) { try { el.setSelectionRange(sel[0], sel[1]); } catch { /* ignore */ } }
      }
    }
  }

  const pageView = (r) => ({ desk: deskView, shelf: shelfView, students: studentsView, admin: adminView }[r])();

  const brandView = () => `
    <a class="brand" href="#desk">
      <span class="brand-mark">${icon('package')}</span>
      <span class="brand-name"><b>Parcel Collector</b><span>Campus Delivery Matrix</span></span>
    </a>`;

  const demoBar = () => `
    <div class="demo-bar">Demo mode. Changes stay in this tab and reset when you reload.
      <button class="link" data-action="demo-off">Use the real server</button></div>`;

  function shellView(r, body) {
    const u = state.user;
    const admin = u.role === 'ADMIN';
    const n = state.inventory.length;
    const nav = [['desk', 'package', 'Gate desk'], ['shelf', 'layers', 'Shelf'], ['students', 'users', 'Students']];
    if (admin) nav.push(['admin', 'chart', 'Admin']);
    return `
      <header class="topbar">
        ${brandView()}
        <div class="top-actions">
          ${admin ? `<nav class="modes" aria-label="Workspace">
            <a href="#desk" ${r !== 'admin' ? 'aria-current="page"' : ''}>Gate desk</a>
            <a href="#admin" ${r === 'admin' ? 'aria-current="page"' : ''}>Admin</a>
          </nav>` : ''}
          <a class="icon-btn bare" href="#shelf" aria-label="${plural(n, 'parcel')} on the shelf" title="On the shelf">
            ${icon('bell')}${n ? `<span class="badge">${n > 9 ? '9+' : n}</span>` : ''}
          </a>
          <div class="avatar" title="${esc(u.name)}, ${admin ? 'Admin' : 'Guard'}">${esc(initials(u.name))}</div>
        </div>
      </header>
      ${state.demo ? demoBar() : ''}
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
        ${state.demo ? demoBar() : ''}
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
            <div class="or">or</div>
            ${state.demo
              ? `<span class="label">Sign in to the demo as</span>
                 <div class="quick">${DEMO_USERS.map((u) => `
                   <button class="student" type="button" data-action="demo-login" data-email="${esc(u.email)}" data-password="${esc(u.password)}">
                     <span class="av">${esc(initials(u.name))}</span>
                     <span class="who"><b>${esc(u.name)}</b><span>${u.role}, ${esc(u.email)}</span></span>
                     ${icon('chevron-right')}
                   </button>`).join('')}</div>`
              : `<button class="btn btn-lg btn-block" type="button" data-action="demo-on">Explore with demo data</button>
                 <p class="fine">Runs in your browser. Useful when the server isn’t running.</p>`}
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
  const tagView = (p, cls = '') => `<span class="tag ${cls}"><b>${esc(p.lookupNumber)}</b><small>${fmt.short(p.createdAt)}</small></span>`;
  const place = (s) => [s?.hostel, s?.room].filter(Boolean).join(', ');
  const studentCard = (s, action = '') => `
    <div class="student">
      <span class="av">${esc(initials(s.name))}</span>
      <span class="who"><b>${esc(s.name)}</b><span>${esc(s.enrollmentNo)}${place(s) ? `, ${esc(place(s))}` : ''}</span></span>
      ${action}
    </div>`;

  function pickerView(key, placeholder, { big = false, labelledBy = '' } = {}) {
    const p = state.pickers[key];
    return `
      <div class="picker">
        <div class="input-icon">${icon('search')}
          <input class="input ${big ? 'input-lg' : ''}" id="picker-${key}" data-picker-input="${key}" type="text"
            autocomplete="off" spellcheck="false" placeholder="${esc(placeholder)}" value="${esc(p.q)}"
            role="combobox" aria-expanded="false" aria-controls="picker-${key}-list" aria-autocomplete="list"
            ${labelledBy ? `aria-labelledby="${labelledBy}"` : 'aria-label="Student name or enrollment number"'}>
        </div>
        <ul class="options" id="picker-${key}-list" role="listbox" hidden></ul>
      </div>`;
  }

  /* ----- Gate desk ----- */
  function deskView() {
    const d = state.desk;
    return `
      <div class="page-head"><div><h1>Gate desk</h1><p>${fmt.long(new Date())}</p></div></div>
      <div class="desk">
        <section>
          <div class="tabs" role="tablist">
            <button role="tab" type="button" aria-selected="${d.tab === 'log'}" data-action="desk-tab" data-tab="log">Log a parcel</button>
            <button role="tab" type="button" aria-selected="${d.tab === 'handover'}" data-action="desk-tab" data-tab="handover">Hand over</button>
          </div>
          ${d.tab === 'log' ? logView() : handoverView()}
        </section>
        <aside class="desk-aside">${todayView()}${weekView()}</aside>
      </div>`;
  }

  function logView() {
    const d = state.desk;
    if (d.lastParcel) {
      const p = d.lastParcel;
      return `
        <div class="panel">
          ${stampView(p.lookupNumber, p.createdAt)}
          <p class="stamp-note">Write ${esc(p.lookupNumber)} and ${fmt.short(p.createdAt)} on the box</p>
          <p class="stamp-meta">For ${esc(p.student?.name)}${place(p.student) ? `, ${esc(place(p.student))}` : ''}.
            ${esc(p.carrier)} parcel logged at ${fmt.time(p.createdAt)}${p.trackingNumber ? `, tracking ${esc(p.trackingNumber)}` : ''}.</p>
          <div class="row">
            <button class="btn btn-primary" type="button" data-action="log-another">Log another parcel</button>
            <button class="btn" type="button" data-action="log-same">Another for ${esc(firstName(p.student?.name))}</button>
          </div>
        </div>`;
    }
    return `
      <form class="panel" data-form="log" novalidate>
        ${d.error ? `<div class="form-error" role="alert">${esc(d.error)}</div>` : ''}
        <div class="field">
          <span class="label" id="lbl-log">Student</span>
          ${d.logStudent
            ? studentCard(d.logStudent, '<button class="btn btn-sm btn-quiet" type="button" data-action="clear-log-student">Change</button>')
            : pickerView('log', 'Name or enrollment number', { labelledBy: 'lbl-log' })}
        </div>
        <div class="field">
          <span class="label" id="lbl-carrier">Carrier</span>
          <div class="choices" role="group" aria-labelledby="lbl-carrier">
            ${[...CARRIERS, 'Other'].map((c) => `<button type="button" class="choice" aria-pressed="${d.carrier === c}" data-action="carrier" data-carrier="${c}">${c}</button>`).join('')}
          </div>
          ${d.carrier === 'Other' ? `<input class="input" id="other-carrier" data-bind="desk.otherCarrier" placeholder="Carrier name" aria-label="Carrier name" value="${esc(d.otherCarrier)}">` : ''}
        </div>
        <div class="grid-2">
          <div class="field">
            <label for="tracking">Tracking number <span class="opt">(optional)</span></label>
            <input class="input" id="tracking" data-bind="desk.tracking" autocomplete="off" value="${esc(d.tracking)}">
          </div>
          <div class="field">
            <label for="notes">Note <span class="opt">(optional)</span></label>
            <input class="input" id="notes" data-bind="desk.notes" placeholder="Fragile, large box…" value="${esc(d.notes)}">
          </div>
        </div>
        <button class="btn btn-primary btn-lg" type="submit" ${d.busy ? 'disabled' : ''}>${d.busy ? 'Logging…' : 'Log parcel'}</button>
      </form>`;
  }

  function handoverView() {
    const d = state.desk;
    const r = d.pickupResult;
    let out = `
      <div class="field panel">
        ${pickerView('pickup', 'Name or enrollment number', { big: true })}
        <span class="hint">Check their ID card, pick the student, then find these tags on the shelf.</span>
      </div>`;
    if (d.pickupLoading) out += '<p class="empty-note">Looking up parcels…</p>';
    else if (d.pickupError) out += `<div class="form-error panel" role="alert">${esc(d.pickupError)}</div>`;
    else if (r) {
      const waiting = r.parcels.filter((p) => p.status === 'RECEIVED');
      out += `
        <div class="panel">
          ${studentCard(r.student, '<button class="btn btn-sm btn-quiet" type="button" data-action="clear-pickup">Clear</button>')}
          <div class="pending-head">
            <h2 class="section-title">${waiting.length ? `${waiting.length} waiting` : 'Nothing waiting'}</h2>
            ${waiting.length > 1 ? `<button class="btn btn-primary btn-sm" type="button" data-action="handover-all">Hand over all ${waiting.length}</button>` : ''}
          </div>
          ${r.parcels.length
            ? `<div class="pending">${r.parcels.map(pendingItem).join('')}</div>`
            : `<p class="empty-note">${esc(firstName(r.student.name))} has no parcels on the shelf.</p>`}
        </div>`;
    }
    return out;
  }

  function pendingItem(p) {
    const done = p.status === 'PICKED_UP';
    const detail = done
      ? `Handed over at ${fmt.time(p.pickedUpAt)}`
      : `Logged ${fmt.dateTime(p.createdAt)}${p.notes ? `. ${esc(p.notes)}` : ''}`;
    return `
      <div class="pending-item ${done ? 'done' : ''}">
        ${tagView(p, 'tag-lg')}
        <div class="meta"><b>${esc(p.carrier)}</b><span>${p.trackingNumber ? `${esc(p.trackingNumber)}. ` : ''}${detail}</span></div>
        ${done
          ? `<span class="status">${icon('check')}Handed over</span>`
          : `<button class="btn btn-sm" type="button" data-action="handover" data-id="${esc(p.id)}">Hand over</button>`}
      </div>`;
  }

  function todayView() {
    const s = state.stats;
    const inv = state.inventory;
    const loaded = state.inventoryLoaded;
    const today = dayKey(new Date());
    const items = s
      ? [[s.receivedToday, 'Logged today'], [s.pickedUpToday, 'Handed over'], [s.activeInventory, 'On the shelf']]
      : [[loaded ? inv.filter((p) => dayKey(p.createdAt) === today).length : '–', 'New today'], [loaded ? inv.length : '–', 'On the shelf']];
    return `
      <div class="aside-block">
        <h2>Today</h2>
        <div class="today">${items.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>
      </div>`;
  }

  function weekView() {
    const inv = state.inventory;
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    const keys = new Set(days.map(dayKey));
    const counts = {};
    inv.forEach((p) => { const k = keys.has(dayKey(p.createdAt)) ? dayKey(p.createdAt) : 'older'; counts[k] = (counts[k] || 0) + 1; });
    const sel = state.desk.day;
    const list = inv.filter((p) => (sel === 'older' ? !keys.has(dayKey(p.createdAt)) : dayKey(p.createdAt) === sel)).sort(byCreated);

    const older = counts.older
      ? `<button class="day" type="button" aria-pressed="${sel === 'older'}" data-action="pick-day" data-day="older" aria-label="Older than a week: ${counts.older} waiting">
           <span>Older</span><b>${icon('clock')}</b><i>${counts.older}</i></button>`
      : '';
    const chips = days.map((d) => {
      const k = dayKey(d);
      const n = counts[k] || 0;
      return `<button class="day ${n ? '' : 'empty'}" type="button" aria-pressed="${k === sel}" data-action="pick-day" data-day="${k}" aria-label="${fmt.long(d)}: ${n} waiting">
        <span>${fmt.weekday(d)}</span><b>${d.getDate()}</b>${n ? `<i>${n}</i>` : ''}</button>`;
    }).join('');

    let body;
    if (!state.inventoryLoaded) body = '<p class="empty-note">Loading the shelf…</p>';
    else if (!list.length) body = `<p class="empty-note">Nothing logged ${sel === dayKey(new Date()) ? 'today' : 'that day'} is still waiting.</p>`;
    else body = `<ol class="timeline">${list.map((p) => `
      <li><button class="tl-btn" type="button" data-action="lookup" data-enr="${esc(p.studentEnrollmentNo)}" title="Hand over to ${esc(p.student?.name)}">
        <span class="tl-time">${sel === 'older' ? fmt.short(p.createdAt) : fmt.time(p.createdAt)}</span>
        ${tagView(p)}
        <span class="tl-who"><b>${esc(p.student?.name)}</b><span>${esc(p.carrier)}${p.student?.room ? `, ${esc(p.student.room)}` : ''}</span></span>
      </button></li>`).join('')}</ol>`;

    return `
      <div class="aside-block">
        <h2>Waiting on the shelf <a href="#shelf">See all</a></h2>
        <div class="days" role="group" aria-label="Day logged">${older}${chips}</div>
        ${body}
      </div>`;
  }

  /* ----- Shelf ----- */
  function shelfView() {
    const s = state.shelf;
    const inv = state.inventory;
    const carriers = [...new Set([...CARRIERS, ...inv.map((p) => p.carrier)])];
    const q = s.q.trim().toLowerCase();
    const rows = inv
      .filter((p) => !s.carrier || p.carrier === s.carrier)
      .filter((p) => !q || [p.lookupNumber, p.student?.name, p.studentEnrollmentNo, p.trackingNumber].some((v) => String(v || '').toLowerCase().includes(q)))
      .sort(byCreated);
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (s.page > pages) s.page = pages;
    const start = (s.page - 1) * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);

    const emptyMsg = !state.inventoryLoaded ? 'Loading the shelf…'
      : inv.length ? 'No parcels match. Clear the search or pick another carrier.'
      : 'The shelf is empty. Parcels logged at the gate show up here.';

    return `
      <div class="page-head">
        <div><h1>Shelf</h1><p>Parcels waiting for pickup, oldest first</p></div>
        <select class="select pill" id="shelf-carrier" data-bind="shelf.carrier" aria-label="Carrier">
          <option value="">All carriers</option>
          ${carriers.map((c) => `<option value="${esc(c)}" ${c === s.carrier ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="table-tools">
        <h2 class="section-title">Waiting</h2>
        <div class="tools">
          ${s.searchOpen || s.q ? `<div class="input-icon">${icon('search')}<input class="input" id="shelf-q" data-bind="shelf.q" data-rerender placeholder="Tag, name or enrollment" aria-label="Search the shelf" value="${esc(s.q)}"></div>` : ''}
          <button class="icon-btn" type="button" data-action="toggle-shelf-search" aria-label="${s.searchOpen || s.q ? 'Close search' : 'Search the shelf'}">${icon(s.searchOpen || s.q ? 'x' : 'search')}</button>
          <button class="icon-btn" type="button" data-action="refresh-shelf" aria-label="Refresh">${icon('refresh')}</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Tag</th><th>Student</th><th>Room</th><th>Carrier</th><th>Waiting</th><th><span class="sr-only">Action</span></th></tr></thead>
          <tbody>
            ${pageRows.length ? pageRows.map((p) => `
              <tr>
                <td>${tagView(p)}</td>
                <td>${esc(p.student?.name)}<span class="sub">${esc(p.studentEnrollmentNo)}</span></td>
                <td>${esc(p.student?.room || '–')}<span class="sub">${esc(p.student?.hostel || '')}</span></td>
                <td>${esc(p.carrier)}${p.trackingNumber ? `<span class="sub">${esc(p.trackingNumber)}</span>` : ''}</td>
                <td class="${daysAgo(p.createdAt) >= 3 ? 'age-old' : ''}">${waitingLabel(p.createdAt)}</td>
                <td><button class="btn btn-sm" type="button" data-action="lookup" data-enr="${esc(p.studentEnrollmentNo)}">Hand over</button></td>
              </tr>`).join('') : `<tr><td colspan="6" class="table-empty">${emptyMsg}</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="pager">
        <span>Showing <b>${total ? start + 1 : 0} – ${start + pageRows.length}</b> of <b>${total}</b> entries</span>
        <div class="btns">
          <button type="button" data-action="page" data-page="1" aria-label="First page" ${s.page === 1 ? 'disabled' : ''}>${icon('chevrons-left')}</button>
          <button type="button" data-action="page" data-page="${s.page - 1}" aria-label="Previous page" ${s.page === 1 ? 'disabled' : ''}>${icon('chevron-left')}</button>
          <button type="button" data-action="page" data-page="${s.page + 1}" aria-label="Next page" ${s.page === pages ? 'disabled' : ''}>${icon('chevron-right')}</button>
          <button type="button" data-action="page" data-page="${pages}" aria-label="Last page" ${s.page === pages ? 'disabled' : ''}>${icon('chevrons-right')}</button>
        </div>
      </div>`;
  }

  /* ----- Students ----- */
  function studentsView() {
    const st = state.students;
    let body;
    if (st.q.trim().length < 2) body = '<p class="empty-note">Type at least 2 characters of a name or enrollment number.</p>';
    else if (st.error) body = `<div class="form-error" role="alert">${esc(st.error)}</div>`;
    else if (!st.results) body = '<p class="empty-note">Searching…</p>';
    else {
      const waiting = (enr) => state.inventory.filter((p) => p.studentEnrollmentNo === enr).length;
      body = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Enrollment no.</th><th>Name</th><th>Hostel</th><th>Room</th><th>Contact</th><th>On the shelf</th></tr></thead>
            <tbody>
              ${st.results.length ? st.results.map((s) => {
                const n = waiting(s.enrollmentNo);
                return `<tr>
                  <td>${esc(s.enrollmentNo)}</td>
                  <td>${esc(s.name)}</td>
                  <td>${esc(s.hostel || '–')}</td>
                  <td>${esc(s.room || '–')}</td>
                  <td>${esc(s.phone || s.email || '–')}</td>
                  <td>${n ? `<button class="btn btn-sm" type="button" data-action="lookup" data-enr="${esc(s.enrollmentNo)}">${plural(n, 'parcel')}</button>` : '<span class="muted">None</span>'}</td>
                </tr>`;
              }).join('') : `<tr><td colspan="6" class="table-empty">No student matches “${esc(st.q.trim())}”.</td></tr>`}
            </tbody>
          </table>
        </div>
        ${st.results.length === 10 ? '<p class="empty-note">Showing the first 10 matches. Type more to narrow it down.</p>' : ''}`;
    }
    return `
      <div class="page-head"><div><h1>Students</h1><p>Look someone up to see what’s waiting for them</p></div></div>
      <div class="field panel">
        <div class="input-icon">${icon('search')}<input class="input input-lg" id="students-q" placeholder="Name or enrollment number" aria-label="Search students" autocomplete="off" value="${esc(st.q)}"></div>
      </div>
      ${body}`;
  }

  /* ----- Admin ----- */
  function adminView() {
    const a = state.admin;
    const tabs = [['overview', 'Overview'], ['guards', 'Guards'], ['updates', 'Carrier updates'], ['chat', 'Driver chat']];
    const sub = {
      overview: 'How the gate is doing today',
      guards: 'People who can sign in to the gate desk',
      updates: 'Try how carrier status updates are stored',
      chat: 'Try the directions chat for delivery drivers',
    }[a.tab];
    const body = { overview: adminOverview, guards: adminGuards, updates: adminUpdates, chat: adminChat }[a.tab]();
    return `
      <div class="page-head"><div><h1>Admin</h1><p>${sub}</p></div></div>
      <div class="tabs" role="tablist">
        ${tabs.map(([k, l]) => `<button role="tab" type="button" aria-selected="${a.tab === k}" data-action="admin-tab" data-tab="${k}">${l}</button>`).join('')}
      </div>
      ${body}`;
  }

  function adminOverview() {
    const s = state.stats;
    const stale = state.inventory.filter((p) => daysAgo(p.createdAt) >= 3).sort(byCreated);
    return `
      <div class="stat-row">
        ${[[s?.receivedToday, 'Logged today'], [s?.pickedUpToday, 'Handed over today'], [s?.activeInventory, 'On the shelf']]
          .map(([n, l]) => `<div class="stat"><b>${n ?? '–'}</b><span>${l}</span></div>`).join('')}
      </div>
      <p class="stat-note">${s ? `Updated at ${fmt.time(s.generatedAt)}.` : 'Loading…'} <button class="link" type="button" data-action="refresh-stats">Refresh</button></p>
      <div class="split">
        <div class="card-form">
          <h3>Demo parcels</h3>
          <p>Adds a parcel for each of the first five students, so you can try the desk. Each one gets the next tag for today.</p>
          <button class="btn" type="button" data-action="seed">${icon('plus')}Add 5 demo parcels</button>
        </div>
        <div>
          <div class="table-tools"><h2 class="section-title">Waiting 3 days or more</h2></div>
          ${stale.length ? `<div class="stack">${stale.map((p) => `
            <div class="pending-item">
              ${tagView(p)}
              <div class="meta"><b>${esc(p.student?.name)}</b><span>${esc(p.carrier)}, ${esc(place(p.student))}</span></div>
              <span class="age-old">${waitingLabel(p.createdAt)}</span>
            </div>`).join('')}</div>`
            : '<p class="empty-note">Nothing has been waiting that long.</p>'}
        </div>
      </div>`;
  }

  function adminGuards() {
    const a = state.admin;
    const form = a.showGuardForm ? `
      <form class="card-form inline" data-form="guard" novalidate>
        <h3>Add a guard</h3>
        <p>They sign in with this email and password. Share the password with them in person.</p>
        ${a.guardError ? `<div class="form-error" role="alert">${esc(a.guardError)}</div>` : ''}
        <div class="grid-2">
          <div class="field"><label for="g-name">Name</label><input class="input" id="g-name" name="name" autocomplete="off" required></div>
          <div class="field"><label for="g-email">Email</label><input class="input" id="g-email" name="email" type="email" autocomplete="off" required></div>
        </div>
        <div class="field"><label for="g-pass">Password</label><input class="input" id="g-pass" name="password" type="text" autocomplete="new-password" minlength="8" required><span class="hint">At least 8 characters.</span></div>
        <div class="row">
          <button class="btn btn-primary" type="submit" ${a.guardBusy ? 'disabled' : ''}>${a.guardBusy ? 'Creating…' : 'Create guard account'}</button>
          <button class="btn btn-quiet" type="button" data-action="toggle-guard-form">Cancel</button>
        </div>
      </form>` : '';
    const g = a.guards;
    return `
      <div class="table-tools">
        <h2 class="section-title">Guards</h2>
        ${a.showGuardForm ? '' : `<button class="btn btn-primary btn-sm" type="button" data-action="toggle-guard-form">${icon('plus')}Add guard</button>`}
      </div>
      ${form}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Added</th></tr></thead>
          <tbody>
            ${!g ? '<tr><td colspan="3" class="table-empty">Loading…</td></tr>'
              : g.length ? g.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${fmt.short(u.createdAt)} ${new Date(u.createdAt).getFullYear()}</td></tr>`).join('')
              : '<tr><td colspan="3" class="table-empty">No guards yet. Add one so the gate desk can be staffed.</td></tr>'}
          </tbody>
        </table>
      </div>`;
  }

  function adminUpdates() {
    const a = state.admin;
    const list = a.webhooks;
    return `
      <div class="split">
        <form class="card-form" data-form="webhook" novalidate>
          <h3>Send a test update</h3>
          <p>Stores the payload the way a carrier’s status callback would arrive.</p>
          ${a.webhookError ? `<div class="form-error" role="alert">${esc(a.webhookError)}</div>` : ''}
          <div class="field"><label for="wh-carrier">Carrier</label>
            <select class="select" id="wh-carrier" data-bind="admin.webhookCarrier">${CARRIERS.map((c) => `<option ${c === a.webhookCarrier ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label for="wh-payload">Payload (JSON)</label>
            <textarea class="textarea" id="wh-payload" data-bind="admin.payload" spellcheck="false">${esc(a.payload)}</textarea></div>
          <button class="btn btn-primary" type="submit" ${a.webhookBusy ? 'disabled' : ''}>${a.webhookBusy ? 'Saving…' : 'Save test update'}</button>
        </form>
        <div>
          <div class="table-tools">
            <h2 class="section-title">Received</h2>
            <select class="select pill" id="wh-filter" data-bind="admin.webhookFilter" aria-label="Filter by carrier">
              <option value="">All carriers</option>${CARRIERS.map((c) => `<option ${c === a.webhookFilter ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          ${!list ? '<p class="empty-note">Loading…</p>'
            : list.length ? `<div class="stack">${list.map((w) => `
              <article class="entry">
                <header><b>${esc(w.carrier)}</b><span>${fmt.dateTime(w.receivedAt)} <span class="pill-status">${w.processed ? 'Processed' : 'Not processed'}</span></span></header>
                <details><summary>Payload</summary><pre class="code">${esc(JSON.stringify(w.rawPayload, null, 2))}</pre></details>
              </article>`).join('')}</div>`
            : '<p class="empty-note">No updates yet. Send a test one to see it here.</p>'}
        </div>
      </div>`;
  }

  function adminChat() {
    const a = state.admin;
    const list = a.chats;
    return `
      <div class="split">
        <form class="card-form" data-form="chat" novalidate>
          <h3>Send a test message</h3>
          <p>Writes as a delivery driver. The bot replies with directions to Gate 1.</p>
          ${a.chatError ? `<div class="form-error" role="alert">${esc(a.chatError)}</div>` : ''}
          <div class="field"><label for="ch-phone">Driver phone <span class="opt">(optional)</span></label>
            <input class="input" id="ch-phone" data-bind="admin.chatPhone" inputmode="tel" value="${esc(a.chatPhone)}"></div>
          <div class="field"><label for="ch-msg">Message</label>
            <input class="input" id="ch-msg" data-bind="admin.chatMessage" placeholder="Where do I drop parcels?" value="${esc(a.chatMessage)}"></div>
          <button class="btn btn-primary" type="submit" ${a.chatBusy ? 'disabled' : ''}>${a.chatBusy ? 'Sending…' : 'Send test message'}</button>
        </form>
        <div>
          <div class="table-tools"><h2 class="section-title">Conversations</h2></div>
          ${!list ? '<p class="empty-note">Loading…</p>'
            : list.length ? `<div class="stack">${list.map((c) => `
              <article class="entry">
                <header><b>${esc(c.driverPhone || 'Unknown driver')}</b><span>${fmt.dateTime(c.createdAt)}</span></header>
                ${(c.messages || []).map((m) => `<div class="bubble ${m.sender === 'bot' ? 'bot' : 'driver'}">${esc(m.text)}${m.time ? `<time>${fmt.time(m.time)}</time>` : ''}</div>`).join('')}
              </article>`).join('')}</div>`
            : '<p class="empty-note">No conversations yet. Send a test message to see one here.</p>'}
        </div>
      </div>`;
  }

  /* ---------- student picker ---------- */
  const pickerTimers = {};
  function onPickerInput(key, el) {
    const p = state.pickers[key];
    p.q = el.value; p.active = -1;
    clearTimeout(pickerTimers[key]);
    const q = p.q.trim();
    if (q.length < 2) { p.results = []; drawOptions(key); return; }
    drawOptions(key);
    pickerTimers[key] = setTimeout(async () => {
      const seq = ++p.seq;
      try {
        const { data } = await api('GET', `/students/search?q=${encodeURIComponent(q)}`);
        if (seq !== p.seq) return;
        p.results = data; p.searched = q;
      } catch (e) {
        if (seq !== p.seq) return;
        p.results = []; p.error = e.message; p.searched = q;
      }
      drawOptions(key);
    }, 180);
  }

  function drawOptions(key) {
    const p = state.pickers[key];
    const list = document.getElementById(`picker-${key}-list`);
    const input = document.getElementById(`picker-${key}`);
    if (!list || !input) return;
    const q = p.q.trim();
    if (q.length < 2 || document.activeElement !== input) {
      list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
      return;
    }
    if (p.error) list.innerHTML = `<li class="empty">${esc(p.error)}</li>`;
    else if (p.searched !== q) list.innerHTML = '<li class="empty">Searching…</li>';
    else if (!p.results.length) list.innerHTML = `<li class="empty">No student matches “${esc(q)}”.</li>`;
    else {
      list.innerHTML = p.results.map((s, i) => `
        <li class="option" role="option" id="picker-${key}-opt-${i}" aria-selected="${i === p.active}" data-pick="${key}" data-index="${i}">
          <span><b>${esc(s.name)}</b><br><small>${esc(place(s))}</small></span><small>${esc(s.enrollmentNo)}</small>
        </li>`).join('');
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (p.active >= 0) input.setAttribute('aria-activedescendant', `picker-${key}-opt-${p.active}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function onPickerKey(key, e) {
    const p = state.pickers[key];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!p.results.length) return;
      e.preventDefault();
      const n = p.results.length;
      p.active = e.key === 'ArrowDown' ? (p.active + 1) % n : (p.active - 1 + n) % n;
      drawOptions(key);
      document.getElementById(`picker-${key}-opt-${p.active}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const q = p.q.trim().toUpperCase();
      if (p.active >= 0) return pick(key, p.active);
      const exact = p.results.findIndex((s) => s.enrollmentNo === q);
      if (exact >= 0) return pick(key, exact);
      if (p.results.length === 1) return pick(key, 0);
      if (key === 'pickup' && /^[A-Z0-9]{5,}$/.test(q)) return lookupParcels(q);
    } else if (e.key === 'Escape') {
      p.q = ''; p.results = []; e.target.value = ''; drawOptions(key);
    }
  }

  function pick(key, i) {
    const p = state.pickers[key];
    const s = p.results[i];
    if (!s) return;
    state.pickers[key] = newPicker();
    if (key === 'log') {
      state.desk.logStudent = s; state.desk.error = '';
      render();
      document.querySelector('[data-action="carrier"][aria-pressed="true"]')?.focus();
    } else {
      lookupParcels(s.enrollmentNo);
    }
  }

  /* ---------- actions ---------- */
  async function lookupParcels(enr) {
    const d = state.desk;
    d.tab = 'handover'; d.pickupLoading = true; d.pickupError = ''; d.pickupResult = null;
    state.pickers.pickup = newPicker();
    if (location.hash !== '#desk' && location.hash !== '') location.hash = '#desk';
    render();
    try {
      const { data } = await api('GET', `/parcels/search?enrollmentNo=${encodeURIComponent(enr)}`);
      d.pickupResult = data;
    } catch (e) { d.pickupError = e.message; }
    d.pickupLoading = false;
    render();
  }

  async function handover(id) {
    const { data } = await api('PATCH', `/parcels/${encodeURIComponent(id)}/pickup`);
    const list = state.desk.pickupResult?.parcels;
    if (list) { const i = list.findIndex((p) => p.id === id); if (i >= 0) list[i] = data; }
    state.inventory = state.inventory.filter((p) => p.id !== id);
    return data;
  }

  async function handoverOne(id) {
    try {
      const p = await handover(id);
      toast(`${p.lookupNumber} handed over to ${firstName(p.student?.name)}`);
    } catch (e) {
      toast(e.message, 'err');
      if (e.status === 409) loadInventory();
    }
    render(); loadStats();
  }

  async function handoverAll() {
    const r = state.desk.pickupResult;
    if (!r) return;
    const ids = r.parcels.filter((p) => p.status === 'RECEIVED').map((p) => p.id);
    let done = 0;
    for (const id of ids) {
      try { await handover(id); done++; } catch (e) { toast(e.message, 'err'); }
      render();
    }
    if (done) toast(`${plural(done, 'parcel')} handed over to ${firstName(r.student.name)}`);
    loadStats();
  }

  async function submitLog() {
    const d = state.desk;
    const carrier = d.carrier === 'Other' ? d.otherCarrier.trim() : d.carrier;
    if (!d.logStudent) { d.error = 'Pick the student this parcel is for.'; render(); document.getElementById('picker-log')?.focus(); return; }
    if (!carrier) { d.error = 'Enter the carrier’s name.'; render(); document.getElementById('other-carrier')?.focus(); return; }
    d.busy = true; d.error = ''; render();
    try {
      const { data } = await api('POST', '/parcels', {
        studentEnrollmentNo: d.logStudent.enrollmentNo,
        carrier,
        trackingNumber: d.tracking.trim() || undefined,
        notes: d.notes.trim() || undefined,
      });
      d.lastParcel = data; d.tracking = ''; d.notes = ''; d.day = dayKey(data.createdAt);
      state.inventory = [...state.inventory, data];
    } catch (e) { d.error = e.message; }
    d.busy = false;
    render(); loadStats();
  }

  async function submitLogin(form) {
    const fd = new FormData(form);
    state.loginEmail = String(fd.get('email') || '');
    state.loginBusy = true; state.loginError = ''; render();
    try { await signIn(state.loginEmail, String(fd.get('password') || '')); }
    catch (e) { state.loginError = e.message; }
    state.loginBusy = false; render();
  }

  async function submitGuard(form) {
    const a = state.admin;
    const fd = new FormData(form);
    const body = { name: fd.get('name'), email: fd.get('email'), password: fd.get('password') };
    if (String(body.password || '').length < 8) { a.guardError = 'The password needs at least 8 characters.'; render(); return; }
    a.guardBusy = true; a.guardError = '';
    form.querySelector('button[type="submit"]').disabled = true;
    try {
      const { data } = await api('POST', '/admin/guards', body);
      a.showGuardForm = false;
      toast(`Guard account created for ${data.name}`);
      a.guardBusy = false;
      loadGuards();
    } catch (e) {
      a.guardBusy = false; a.guardError = e.message;
      // keep what was typed: patch the error in instead of re-rendering the form
      form.querySelector('.form-error')?.remove();
      form.querySelector('h3 + p').insertAdjacentHTML('afterend', `<div class="form-error" role="alert">${esc(e.message)}</div>`);
      form.querySelector('button[type="submit"]').disabled = false;
    }
  }

  async function submitWebhook() {
    const a = state.admin;
    let payload;
    try { payload = JSON.parse(a.payload); } catch (e) { a.webhookError = `The payload isn’t valid JSON: ${e.message}`; render(); return; }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) { a.webhookError = 'The payload must be a JSON object, like { "status": "DELIVERED" }.'; render(); return; }
    a.webhookBusy = true; a.webhookError = ''; render();
    try {
      await api('POST', '/admin/mock/webhook', { carrier: a.webhookCarrier, rawPayload: payload });
      toast(`${a.webhookCarrier} update saved`);
      await loadWebhooks();
    } catch (e) { a.webhookError = e.message; }
    a.webhookBusy = false; render();
  }

  async function submitChat() {
    const a = state.admin;
    if (!a.chatMessage.trim()) { a.chatError = 'Type a message to send.'; render(); return; }
    a.chatBusy = true; a.chatError = ''; render();
    try {
      await api('POST', '/admin/mock/chat', { message: a.chatMessage.trim(), driverPhone: a.chatPhone.trim() || undefined });
      a.chatMessage = '';
      toast('Test message sent');
      await loadChats();
    } catch (e) { a.chatError = e.message; }
    a.chatBusy = false; render();
  }

  function setPath(path, value) {
    const [group, key] = path.split('.');
    state[group][key] = value;
  }

  /* ---------- events ---------- */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const d = state.desk;
    switch (el.dataset.action) {
      case 'sign-out': signOut(); break;
      case 'demo-on': state.demo = true; store.set('demo', true); state.loginError = ''; render(); break;
      case 'demo-off': state.demo = false; store.set('demo', null); state.loginError = ''; signOut(); break;
      case 'demo-login':
        try { await signIn(el.dataset.email, el.dataset.password); } catch (err) { state.loginError = err.message; render(); }
        break;
      case 'desk-tab': d.tab = el.dataset.tab; render(); break;
      case 'carrier':
        d.carrier = el.dataset.carrier; render();
        if (d.carrier === 'Other') document.getElementById('other-carrier')?.focus();
        break;
      case 'clear-log-student': d.logStudent = null; render(); document.getElementById('picker-log')?.focus(); break;
      case 'log-another': d.lastParcel = null; d.logStudent = null; render(); document.getElementById('picker-log')?.focus(); break;
      case 'log-same': d.lastParcel = null; render(); document.getElementById('tracking')?.focus(); break;
      case 'clear-pickup': d.pickupResult = null; d.pickupError = ''; render(); document.getElementById('picker-pickup')?.focus(); break;
      case 'lookup': lookupParcels(el.dataset.enr); break;
      case 'handover': el.disabled = true; handoverOne(el.dataset.id); break;
      case 'handover-all': el.disabled = true; handoverAll(); break;
      case 'pick-day': d.day = el.dataset.day; render(); break;
      case 'page': state.shelf.page = Math.max(1, parseInt(el.dataset.page, 10) || 1); render(); break;
      case 'toggle-shelf-search': {
        const s = state.shelf;
        const open = s.searchOpen || s.q;
        s.searchOpen = !open; if (open) s.q = '';
        s.page = 1; render();
        if (!open) document.getElementById('shelf-q')?.focus();
        break;
      }
      case 'refresh-shelf': loadInventory(); break;
      case 'admin-tab': state.admin.tab = el.dataset.tab; render(); loadAdminTab(); break;
      case 'refresh-stats': loadStats(); break;
      case 'toggle-guard-form':
        state.admin.showGuardForm = !state.admin.showGuardForm; state.admin.guardError = ''; render();
        if (state.admin.showGuardForm) document.getElementById('g-name')?.focus();
        break;
      case 'seed':
        el.disabled = true;
        try { const { message } = await api('POST', '/admin/mock/seed'); toast(message || 'Demo parcels added'); }
        catch (err) { toast(err.message, 'err'); }
        loadInventory(); loadStats();
        break;
      default: break;
    }
  });

  let studentTimer;
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.pickerInput) { onPickerInput(t.dataset.pickerInput, t); return; }
    if (t.id === 'students-q') {
      const st = state.students;
      st.q = t.value; st.results = null; st.error = '';
      clearTimeout(studentTimer);
      const q = st.q.trim();
      render();
      if (q.length < 2) return;
      studentTimer = setTimeout(async () => {
        try { const { data } = await api('GET', `/students/search?q=${encodeURIComponent(q)}`); if (st.q.trim() === q) st.results = data; }
        catch (err) { st.error = err.message; }
        render();
      }, 200);
      return;
    }
    if (t.dataset.bind && t.tagName !== 'SELECT') {
      setPath(t.dataset.bind, t.value);
      if (t.dataset.bind.startsWith('shelf.')) state.shelf.page = 1;
      if ('rerender' in t.dataset) render();
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.tagName !== 'SELECT' || !t.dataset.bind) return;
    setPath(t.dataset.bind, t.value);
    if (t.dataset.bind === 'admin.webhookFilter') { loadWebhooks(); return; }
    if (t.dataset.bind.startsWith('shelf.')) state.shelf.page = 1;
    render();
  });

  document.addEventListener('keydown', (e) => {
    const k = e.target.dataset?.pickerInput;
    if (k) onPickerKey(k, e);
  });
  document.addEventListener('focusin', (e) => {
    const k = e.target.dataset?.pickerInput;
    if (k) drawOptions(k);
  });
  document.addEventListener('focusout', (e) => {
    const k = e.target.dataset?.pickerInput;
    if (k) setTimeout(() => drawOptions(k), 120);
  });
  document.addEventListener('mousedown', (e) => {
    const o = e.target.closest('[data-pick]');
    if (!o) return;
    e.preventDefault();
    pick(o.dataset.pick, Number(o.dataset.index));
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    ({ login: submitLogin, log: submitLog, guard: submitGuard, webhook: submitWebhook, chat: submitChat })[f.dataset.form]?.(f);
  });

  window.addEventListener('hashchange', render);

  // Keep the shelf fresh when several guards share the desk. Skips while someone is typing.
  setInterval(() => {
    const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (state.token && document.visibilityState === 'visible' && !typing) loadInventory();
  }, 60000);

  render();
})();
