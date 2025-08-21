/* global navigator, localStorage, fetch */

(() => {
  const COOLDOWN_MS = 60_000; // 60 seconds

  // Your Apps Script Web App URL
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLbHLHw5FZYk2Vff3tTItLprtAhloiQOsYSe2RfYbWrFRkYcOItxKPY1aZv8aB9Uuy3w/exec';

  const KEYS = {
    name: 'runner.name',
    course: 'runner.course',
    category: 'runner.category',
    team: 'runner.team',
    registered: 'runner.registered',
    laps: 'laps.count',
    lastAt: 'laps.lastAt',
    lastTag: 'laps.lastTag',
    queue: 'sync.queue'
  };

  let _lapInFlight = false;

  const CTR = {
    get: k => localStorage.getItem(k),
    set: (k, v) => localStorage.setItem(k, v),
    remove: k => localStorage.removeItem(k),
    getInt: k => parseInt(localStorage.getItem(k) || '0', 10),
    qs: () => Object.fromEntries(new URL(window.location.href).searchParams.entries()),

    toast: (msg, ms = 1400) => {
      const el = document.getElementById('toast');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), ms);
    },

    vibe: (pattern = [150]) => { if (navigator.vibrate) navigator.vibrate(pattern); },

    // --- queue helpers ---
    _readQueue: () => {
      try { return JSON.parse(localStorage.getItem(KEYS.queue) || '[]'); } catch { return []; }
    },
    _writeQueue: arr => localStorage.setItem(KEYS.queue, JSON.stringify(arr)),

    queueEvent: evt => {
      const q = CTR._readQueue();
      q.push(evt);
      CTR._writeQueue(q);
      CTR.updateSyncBadge();
    },

    // --- sync ---
    trySync: async () => {
      if (!navigator.onLine || !APPS_SCRIPT_URL) return;
      let q = CTR._readQueue();
      if (q.length === 0) return;

      const payload = q[0];

      // ✅ Send without JSON header (prevents CORS preflight in Chrome)
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          body: new URLSearchParams(payload).toString()
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        q.shift();
        CTR._writeQueue(q);
      } catch {
        return; // keep in queue
      }

      if (CTR._readQueue().length > 0) {
        setTimeout(CTR.trySync, 700);
      }
    },

    trySyncLoop: () => {
      CTR.trySync();
      setInterval(CTR.trySync, 10000);
    },

    handleLapScan: ({ tagId = '', urlCourse = '' } = {}) => {
      if (CTR.get(KEYS.registered) !== '1') {
        CTR.toast('Register before running');
        return;
      }

      const now = Date.now();
      const lastAt = CTR.get(KEYS.lastAt);
      if (lastAt && (now - Date.parse(lastAt)) < COOLDOWN_MS) {
        CTR.toast('Cooldown active');
        return;
      }

      const nextLap = CTR.getInt(KEYS.laps) + 1;
      CTR.set(KEYS.laps, String(nextLap));
      CTR.set(KEYS.lastAt, new Date().toISOString());
      CTR.set(KEYS.lastTag, tagId);

      CTR.vibe();
      CTR.toast('+1 Lap');

      CTR.queueEvent({
        type: 'lap',
        name: CTR.get(KEYS.name),
        course: CTR.get(KEYS.course) || urlCourse,
        category: CTR.get(KEYS.category),
        teamName: CTR.get(KEYS.team) || '',
        lap: nextLap,
        tagId: tagId,
        clientTime: new Date().toISOString()
      });

      CTR.trySync();
    },

    updateSyncBadge: () => {
      const el = document.getElementById('sync-badge');
      if (!el) return;
      if (!navigator.onLine) {
        el.className = 'badge badge--pending'; el.title = 'Offline';
        return;
      }
      const q = CTR._readQueue();
      el.className = (q.length === 0 ? 'badge badge--ok' : 'badge badge--pending');
      el.title = (q.length === 0 ? 'Synced' : `Pending sync: ${q.length}`);
    },

    enableWakeLock: () => {
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').catch(() => {});
      }
    },

    // Manual final send (from results.html)
    sendFinalManually: async () => {
      console.log('sendFinalManually called');
      console.log('APPS_SCRIPT_URL:', APPS_SCRIPT_URL);
      
      const payload = {
        type: 'final',
        name: CTR.get('runner.name'),
        course: CTR.get('runner.course'),
        category: CTR.get('runner.category'),
        teamName: CTR.get('runner.team') || '',
        totalLaps: CTR.getInt('laps.count'),
        clientTime: new Date().toISOString()
      };
      
      console.log('Payload:', payload);
      
      try {
        console.log('Sending fetch request...');
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          body: new URLSearchParams(payload).toString()
        });
        console.log('Response status:', res.status);
        if (res.ok) {
          console.log('✅ Success!');
          CTR.toast('✅ Sent!');
        } else {
          console.log('❌ HTTP Error:', res.status);
          CTR.toast('❌ Failed (' + res.status + ')');
        }
      } catch(e) {
        console.error('❌ Fetch error:', e);
        CTR.toast('❌ Failed to send: ' + e.message);
      }
    }
  };

  window.CTR = CTR;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    });
  }

  window.addEventListener('online', CTR.updateSyncBadge);
  window.addEventListener('offline', CTR.updateSyncBadge);
})(); 
