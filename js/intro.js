// 首頁開場：首頁的 Reel 先放大成全螢幕播放，下方 AE 時間軸跟著影片跑。
// 一直播到訪客往下滑、按方向鍵或按「進入網站」，Reel 才縮回首頁的格子，其他內容依序擦出來。
// 開場用的就是首頁那支 Reel 本身（只改位置），所以縮回去時影片不會重新載入、會接著播。
(function () {
  var root = document.documentElement;
  var box = document.getElementById('intro');
  if (!box) return;
  if (!root.classList.contains('intro-playing')) { box.remove(); return; }

  var slot = box.querySelector('[data-frame]');           // 全螢幕時 Reel 要放的位置
  var reel = document.querySelector('[data-reel]');        // 首頁的 Reel
  var bg = reel && reel.querySelector('[data-reel-bg]');   // Vimeo 播放器
  var tile = document.getElementById('reel');
  var head = box.querySelector('[data-playhead]');
  var tc = box.querySelector('[data-tc]');
  var rows = box.querySelectorAll('.tl-row');
  var labels = box.querySelectorAll('.tl-labels li');
  var FPS = 24;
  var SIM = 60;        // 讀不到影片時間時，時間軸假裝的長度（秒）
  var left = false, start = performance.now();
  var vt = null;       // 最近一次從 Vimeo 收到的時間 { secs, dur, at }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function show(layer) {
    document.querySelectorAll('[data-layer="' + layer + '"]').forEach(function (el) { el.classList.add('in'); });
  }
  function setRect(el, r) {
    el.style.left = r.left + 'px';
    el.style.top = r.top + 'px';
    el.style.width = r.width + 'px';
    el.style.height = r.height + 'px';
  }
  function place() { if (!left) setRect(reel, slot.getBoundingClientRect()); }

  if (reel) {
    reel.classList.add('is-intro');
    place();
    window.addEventListener('resize', place);
  }

  // 跟 Vimeo 播放器要播放時間，讓時間軸和影片同步
  function vimeo(method, value) {
    if (!bg || !bg.contentWindow) return;
    var msg = { method: method };
    if (value !== undefined) msg.value = value;
    bg.contentWindow.postMessage(JSON.stringify(msg), 'https://player.vimeo.com');
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://player.vimeo.com') return;
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { return; } }
    if (!d) return;
    if (d.event === 'ready') { vimeo('addEventListener', 'timeupdate'); vimeo('addEventListener', 'playProgress'); }
    if ((d.event === 'timeupdate' || d.event === 'playProgress') && d.data && d.data.duration) {
      vt = { secs: d.data.seconds, dur: d.data.duration, at: performance.now() };
    }
  });
  if (bg) bg.addEventListener('load', function () { vimeo('addEventListener', 'timeupdate'); });

  function tick(now) {
    if (left) return;
    var secs, dur;
    if (vt) { dur = vt.dur; secs = Math.min(vt.secs + (now - vt.at) / 1000, dur); }
    else { dur = SIM; secs = ((now - start) / 1000) % SIM; }
    var p = secs / dur;
    head.style.left = (p * 100) + '%';
    var m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    tc.textContent = '0:' + pad(m) + ':' + pad(s) + ':' + pad(Math.floor((secs % 1) * FPS));
    rows.forEach(function (r, i) {
      var on = p >= parseFloat(r.getAttribute('data-from')) && p < parseFloat(r.getAttribute('data-to')) + (i === rows.length - 1 ? 0.01 : 0);
      r.classList.toggle('on', on);
      if (labels[i]) labels[i].classList.toggle('on', on);
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function enter() {
    if (left) return;
    left = true;
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
    window.scrollTo(0, 0);
    box.classList.add('leaving');
    if (reel && tile) {
      var target = tile.getBoundingClientRect();
      reel.classList.add('flying');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { setRect(reel, target); });
      });
      // 落定後放回格子裡，之後跟著頁面捲動
      setTimeout(function () {
        reel.classList.remove('is-intro', 'flying');
        reel.removeAttribute('style');
        window.removeEventListener('resize', place);
      }, 1000);
    }
    setTimeout(function () { show(1); }, 350);
    setTimeout(function () { show(2); }, 520);
    setTimeout(function () { show(4); }, 1100);
    setTimeout(function () { show(5); }, 1250);
    setTimeout(function () {
      box.remove();
      root.classList.remove('intro-playing');
    }, 2000);
  }

  // 只有訪客主動往下滑、按鍵或按按鈕才進入網站，影片播完會自己循環
  box.querySelector('[data-enter]').addEventListener('click', enter);
  window.addEventListener('wheel', function (e) { if (e.deltaY > 0) enter(); }, { passive: true });
  var touchY = null;
  window.addEventListener('touchstart', function (e) { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (touchY !== null && touchY - e.touches[0].clientY > 24) enter();   // 手指往上滑 = 頁面往下
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (['ArrowDown', 'PageDown', ' ', 'Enter', 'Escape'].indexOf(e.key) !== -1) enter();
  });
})();
