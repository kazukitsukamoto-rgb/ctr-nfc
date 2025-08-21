/* global navigator, localStorage, fetch */
(() => {
  'use strict';

  // =================== CONFIG ===================
  const COOLDOWN_MS = 60_000; // anti-cheat: 60s
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLbHLHw5FZYk2Vff3tTItLprtAhloiQOsYSe2RfYbWrFRkYcOItxKPY1aZv8aB9Uuy3w/exec';

  // localStorage keys
  const KEYS = {
    name: 'runner.name',
    course: 'runner.course',         // 'fun' | 'serious'
    category: 'runner.category',     // 'individual' | 'team'
    team: 'runner.team',
    registered: 'runner.registered', // '1' when registered

    laps: 'laps.count',
    lastAt: 'laps.lastAt',
    lastTag: 'laps.lastTag',

    queue: 'sync.queue'              // JSON array of pending lap events
  };

  // =================== CTR ===================
  const CTR = {
    // ------------- storage -------------
    get: (k) => localStorage.getItem(k),
    set: (k, v) => localStorage.setItem(k, v),
    remove: (k) => localStorage.removeItem(k),
    getInt: (k) => parseInt(localStorage.getItem(k) || '0', 10),

    // ------------- qs -------------
    qs: () => Object.fromEntries(new URL(window.location.href).searchParams.entries()),

    // ------------- toast -------------
    toast: (msg, ms = 1400) => {
      const el = document.getElementById('toast');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), ms);
    },

    // ------------- vibe -------------
    vibe: (pattern = [150]) => { if (navigator.vibrate) navigator.vibrate(pattern); },

    // ------------- wakelock -------------
    enableWakeLock: async () => {
      try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch { }
    },

    // ------------- sync badge -------------
    updateSyncBadge: () => {
      const el = document.getElementById('sync-badge');
      if (!el) return;
      if (!navigator.onLine) { el.className = 'badge badge--pending'; el.title = 'Offline'; return; }
      const q = CTR._readQueue();
      if (q.length === 0) { el.className = 'badge badge--ok'; el.title = 'Synced'; }
      else { el.className = 'badge badge--pending'; el.title = `Pending sync: ${q.length}`; }
    },

    // ------------- queue -------------
    _readQueue: () => { try { return JSON.parse(localStorage.getItem(KEYS.queue) || '[]'); } catch { return []; } },
    _writeQueue: (arr) => localStorage.setItem(KEYS.queue, JSON.stringify(arr)),
    queueEvent: (evt) => { const q = CTR._readQueue(); q.push(evt); CTR._writeQueue(q); CTR.updateSyncBadge(); },

    // ------------- sync (form-urlencoded) -------------
    trySync: async () => {
      if (!navigator.onLine || !APPS_SCRIPT_URL) { CTR.updateSyncBadge(); return; }
      let q = CTR._readQueue();
      if (q.length === 0) { CTR.updateSyncBadge(); return; }

      const next = q[0];
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: new URLSearchParams(next).toString()
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json || json.ok !== true) throw new Error('Send failed');
        q.shift(); CTR._writeQueue(q);
      } catch {
        CTR.updateSyncBadge(); return;
      }
      CTR.updateSyncBadge();
      if (CTR._readQueue().length > 0) setTimeout(CTR.trySync, 600);
    },

    trySyncLoop: () => { CTR.trySync(); setInterval(CTR.trySync, 10_000); },

    // ------------- LAP COUNT (one-tap ready) -------------
    handleLapScan: ({ tagId = '', urlCourse = '' } = {}) => {
      // require prior registration in localStorage
      if (CTR.get(KEYS.registered) !== '1') {
        CTR.toast('Please register first');
        return;
      }

      const now = Date.now();
      const lastAt = CTR.get(KEYS.lastAt);
      if (lastAt && (now - Date.parse(lastAt)) < COOLDOWN_MS) {
        CTR.toast('Too soon');
        return;
      }

      // increment & persist
      const nextLap = CTR.getInt(KEYS.laps) + 1;
      CTR.set(KEYS.laps, String(nextLap));
      CTR.set(KEYS.lastAt, new Date().toISOString());
      CTR.set(KEYS.lastTag, tagId || '');

      // UI
      CTR.vibe([180]);
      CTR.toast('+1 Lap');
      const lapEl = document.getElementById('lap-count');
      if (lapEl) lapEl.textContent = String(nextLap);

      // queue lap event
      const payload = {
        type: 'lap',
        name: CTR.get(KEYS.name) || '',
        course: (CTR.get(KEYS.course) || urlCourse || '').toLowerCase(),
        category: (CTR.get(KEYS.category) || '').toLowerCase(),
        teamName: CTR.get(KEYS.team) || '',
        lap: nextLap,
        tagId: tagId || '',
        clientTime: new Date().toISOString()
      };
      CTR.queueEvent(payload);
      CTR.trySync();
    },

    // ----- Results: manual send (button) -----
    sendFinalManually: async () => {
      const payload = {
        type: 'final',
        name: CTR.get(KEYS.name) || '',
        course: (CTR.get(KEYS.course) || '').toLowerCase(),
        category: (CTR.get(KEYS.category) || '').toLowerCase(),
        teamName: CTR.get(KEYS.team) || '',
        totalLaps: CTR.getInt(KEYS.laps),
        clientTime: new Date().toISOString()
      };

      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: new URLSearchParams(payload).toString()
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json && json.ok) {
          CTR.toast('Result sent!');
          const btn = document.getElementById('send-btn') || document.getElementById('sendResultBtn');
          if (btn) { btn.disabled = true; btn.textContent = 'Sent ✓'; }
        } else {
          CTR.toast('Send failed');
        }
      } catch {
        CTR.toast('Network error');
      }
    },

    // ------------- screen initializers -------------
    initIndexScreen: () => {
      // prefill fields if you like (optional)…
      const form = document.getElementById('register-form');
      const startBtn = document.getElementById('start-run-btn');
      if (!form || !startBtn) return;

      startBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const name = (form.querySelector('#fullName')?.value || '').trim();
        const course = form.querySelector('input[name="course"]:checked')?.value || '';
        const category = form.querySelector('input[name="category"]:checked')?.value || '';
        const team = (form.querySelector('#teamName')?.value || '').trim();

        if (!name || !course || !category || (category === 'team' && !team)) {
          CTR.toast('Please complete registration');
          return;
        }
        // Save registration
        CTR.set(KEYS.name, name);
        CTR.set(KEYS.course, course);
        CTR.set(KEYS.category, category);
        CTR.set(KEYS.team, team);
        CTR.set(KEYS.registered, '1');

        // Reset run stats for a fresh race
        CTR.set(KEYS.laps, '0');
        CTR.remove(KEYS.lastAt);
        CTR.remove(KEYS.lastTag);

        // Go to run screen (no NFC needed yet)
        location.href = 'run.html';
      });
    },

    initRunScreen: () => {
      CTR.enableWakeLock();
      CTR.updateSyncBadge();

      // show runner info
      const who = document.getElementById('runner-who');
      if (who) {
        const n = CTR.get(KEYS.name) || '-';
        const c = (CTR.get(KEYS.course) || '-');
        const k = (CTR.get(KEYS.category) || '-');
        const t = CTR.get(KEYS.team) || '';
        who.textContent = t ? `${n} · ${c} · ${k} · ${t}` : `${n} · ${c} · ${k}`;
      }
      // show current laps
      const lapEl = document.getElementById('lap-count');
      if (lapEl) lapEl.textContent = String(CTR.getInt(KEYS.laps));

      // End Race button
      const endBtn = document.getElementById('end-btn');
      if (endBtn) {
        endBtn.addEventListener('click', () => {
          // go to results with summary in URL too (optional)
          const params = new URLSearchParams({
            name: CTR.get(KEYS.name) || '',
            course: CTR.get(KEYS.course) || '',
            category: CTR.get(KEYS.category) || '',
            team: CTR.get(KEYS.team) || '',
            laps: String(CTR.getInt(KEYS.laps))
          });
          location.href = `results.html?${params.toString()}`;
        });
      }

      // -------- One-tap NFC: auto-count on first open --------
      // If URL has lap=1, count immediately using localStorage runner info.
      const q = CTR.qs();
      if (q.lap === '1') {
        // tiny delay to ensure DOM settled; then count
        setTimeout(() => {
          CTR.handleLapScan({ tagId: q.tag || '', urlCourse: q.course || '' });

          // Silently update the URL to remove query params after operation
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, "", newUrl);
        }, 200);
      }
    },

    initResultsScreen: () => {
      CTR.updateSyncBadge();
      // Printable summary (optional)
      const nameEl = document.getElementById('res-name');
      const courseEl = document.getElementById('res-course');
      const catEl = document.getElementById('res-category');
      const teamEl = document.getElementById('res-team');
      const lapsEl = document.getElementById('res-laps');
      if (nameEl) nameEl.textContent = CTR.get(KEYS.name) || '';
      if (courseEl) courseEl.textContent = CTR.get(KEYS.course) || '';
      if (catEl) catEl.textContent = CTR.get(KEYS.category) || '';
      if (teamEl) teamEl.textContent = CTR.get(KEYS.team) || '-';
      if (lapsEl) lapsEl.textContent = String(CTR.getInt(KEYS.laps));

      const sendBtn = document.getElementById('send-btn') || document.getElementById('sendResultBtn');
      if (sendBtn) {
        sendBtn.addEventListener('click', () => CTR.sendFinalManually());
      }

      const restartBtn = document.getElementById('restart-btn');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => { location.href = 'index.html'; });
      }
    }
  };

  // expose
  window.CTR = CTR;

  // (optional) service worker; safe if sw.js missing
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { });
    });
  }

  // keep badge state
  window.addEventListener('online', CTR.updateSyncBadge);
  window.addEventListener('offline', CTR.updateSyncBadge);

  // ====== page boot ======
  document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.getAttribute('data-page'); // set data-page in each HTML
    if (pageId === 'index') CTR.initIndexScreen();
    if (pageId === 'run') CTR.initRunScreen();
    if (pageId === 'results') CTR.initResultsScreen();
  });
})(); 