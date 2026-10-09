// 首頁開場：全螢幕先播 Reel 片段，下方 AE 時間軸跟著影片跑。
// 片段播完、往下捲、按鍵或按「進入網站」時，畫面縮進首頁的 Reel 格子，其他內容依序擦出來。
(function () {
  var root = document.documentElement;
  var box = document.getElementById('intro');
  if (!box) return;
  if (!root.classList.contains('intro-playing')) { box.remove(); return; }

  var frame = box.querySelector('[data-frame]');
  var video = box.querySelector('[data-teaser]');
  var head = box.querySelector('[data-playhead]');
  var tc = box.querySelector('[data-tc]');
  var rows = box.querySelectorAll('.tl-row');
  var labels = box.querySelectorAll('.tl-labels li');
  var SIM = 4500;      // 還沒放影片時，假裝播放的長度（毫秒）
  var FPS = 24;
  var hasVideo = false, start = performance.now(), left = false;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function show(layer) {
    document.querySelectorAll('[data-layer="' + layer + '"]').forEach(function (el) { el.classList.add('in'); });
  }

  // 影片載不到（還沒放檔案）就用斜線底和模擬時間
  if (video) {
    video.addEventListener('playing', function () { hasVideo = true; });
    video.addEventListener('ended', enter);
    video.addEventListener('error', function () { video.remove(); video = null; });
    var pr = video.play && video.play();
    if (pr && pr.catch) pr.catch(function () {});
  }

  function tick(now) {
    if (left) return;
    var p, secs;
    if (hasVideo && video && video.duration) { p = video.currentTime / video.duration; secs = video.currentTime; }
    else { p = Math.min((now - start) / SIM, 1); secs = p * SIM / 1000; }
    head.style.left = (p * 100) + '%';
    tc.textContent = '0:00:' + pad(Math.floor(secs)) + ':' + pad(Math.floor((secs % 1) * FPS));
    rows.forEach(function (r, i) {
      var on = p >= parseFloat(r.getAttribute('data-from')) && p < parseFloat(r.getAttribute('data-to')) + (i === rows.length - 1 ? 0.01 : 0);
      r.classList.toggle('on', on);
      if (labels[i]) labels[i].classList.toggle('on', on);
    });
    if (!hasVideo && p >= 1) { setTimeout(enter, 300); return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function enter() {
    if (left) return;
    left = true;
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
    window.scrollTo(0, 0);
    var target = document.querySelector('[data-layer="3"] .media').getBoundingClientRect();
    var from = frame.getBoundingClientRect();
    // 把畫面固定在目前的位置，下一格再移到首頁 Reel 格子的位置（用 left/top/width/height，影片不會被拉扁）
    frame.style.left = from.left + 'px';
    frame.style.top = from.top + 'px';
    frame.style.width = from.width + 'px';
    frame.style.height = from.height + 'px';
    frame.classList.add('flying');
    box.classList.add('leaving');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        frame.style.left = target.left + 'px';
        frame.style.top = target.top + 'px';
        frame.style.width = target.width + 'px';
        frame.style.height = target.height + 'px';
      });
    });
    setTimeout(function () { show(1); }, 350);
    setTimeout(function () { show(2); }, 520);
    setTimeout(function () { show(3); }, 980);   // Reel 格子在畫面落定的同時出現
    setTimeout(function () { show(4); }, 1100);
    setTimeout(function () { show(5); }, 1250);
    setTimeout(function () {
      box.remove();
      root.classList.remove('intro-playing');
    }, 1450);
  }

  box.querySelector('[data-enter]').addEventListener('click', enter);
  window.addEventListener('wheel', function (e) { if (e.deltaY > 0) enter(); }, { passive: true });
  window.addEventListener('touchmove', enter, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (['ArrowDown', 'PageDown', ' ', 'Enter', 'Escape'].indexOf(e.key) !== -1) enter();
  });
  setTimeout(enter, 15000); // 保險：最久 15 秒一定進入網站
})();
