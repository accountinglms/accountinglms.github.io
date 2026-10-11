/* Shared update checks for browser tabs and Home Screen launches. */
(() => {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;

  const workers = navigator.serviceWorker;
  let controller = workers.controller;
  let registration = null;
  let checking = null;
  let lastCheck = null;
  let wasHidden = document.visibilityState === 'hidden';

  function showUpdate() {
    let banner = document.getElementById('app-update-banner');
    if (!banner) {
      banner = document.createElement('aside');
      banner.id = 'app-update-banner';
      banner.className = 'app-update-banner';
      banner.setAttribute('aria-label', 'Cập nhật ứng dụng');
      banner.innerHTML = '<span role="status">Có bản cập nhật mới</span><div class="app-update-actions"><button type="button" class="app-update-apply">Cập nhật</button><button type="button" class="app-update-later">Để sau</button></div>';
      banner.querySelector('.app-update-apply').addEventListener('click', () => {
        location.reload();
      });
      banner.querySelector('.app-update-later').addEventListener('click', () => {
        banner.hidden = true;
      });
      document.body.appendChild(banner);
    }
    banner.hidden = false;
  }

  // A new worker updates cached files, but the document still runs its old JS.
  // Let the user choose when to reload their current form or learning session.
  workers.addEventListener('controllerchange', () => {
    const next = workers.controller;
    if (controller && next && next !== controller) showUpdate();
    controller = next;
  });

  function checkUpdate(force = false) {
    if (checking) return checking;
    if (navigator.onLine === false || document.visibilityState === 'hidden') return;
    if (!force && lastCheck !== null && Date.now() - lastCheck < 60_000) return;
    lastCheck = Date.now();
    checking = (async () => {
      if (!registration) {
        registration = await workers.register('sw.js', { scope: './', updateViaCache: 'none' });
      } else {
        await registration.update();
      }
    })().catch(error => {
      lastCheck = null;
      console.warn('App update check:', error);
    }).finally(() => { checking = null; });
    return checking;
  }

  window.addEventListener('pageshow', event => checkUpdate(event.persisted === true || wasHidden));
  window.addEventListener('pagehide', () => { wasHidden = true; });
  document.addEventListener('visibilitychange', () => {
    const hidden = document.visibilityState === 'hidden';
    if (!hidden) checkUpdate(wasHidden);
    wasHidden = hidden;
  });
  window.addEventListener('online', () => checkUpdate(true));
  if (document.readyState === 'complete') checkUpdate();
  else window.addEventListener('load', () => checkUpdate(), { once: true });
})();
