// 1. 圖片還沒放進 images/ 時，隱藏破圖，露出斜線底。
document.querySelectorAll('.media img').forEach(function (img) {
  function hide() { img.remove(); }
  if (img.complete && img.naturalWidth === 0) hide();
  else img.addEventListener('error', hide);
});

// 2. 作品卡片：滑鼠移上去才載入並播放短循環（手機上只顯示圖片）。
var canHover = window.matchMedia('(hover: hover)').matches;
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.card[data-loop], .w[data-loop]').forEach(function (card) {
  if (!canHover || reduceMotion) return;
  var media = card.querySelector('.media');
  var video;
  card.addEventListener('mouseenter', function () {
    if (!video) {
      video = document.createElement('video');
      video.src = card.getAttribute('data-loop');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('aria-hidden', 'true');
      video.addEventListener('error', function () { video.remove(); });
      media.appendChild(video);
    }
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
    card.classList.add('is-playing');
  });
  card.addEventListener('mouseleave', function () {
    if (video) video.pause();
    card.classList.remove('is-playing');
  });
});

// 3. 影片：點了才載入 Vimeo 播放器，頁面開啟比較快。
document.querySelectorAll('.player[data-vimeo]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var id = btn.getAttribute('data-vimeo');
    if (!id || btn.querySelector('iframe')) return;
    // 首頁 Reel：先拿掉靜音循環的那支，換成有聲音、有控制列的完整播放器
    btn.parentNode.querySelectorAll('[data-reel-bg]').forEach(function (f) { f.remove(); });
    var frame = document.createElement('iframe');
    frame.src = 'https://player.vimeo.com/video/' + encodeURIComponent(id) + '?autoplay=1&title=0&byline=0&portrait=0';
    frame.allow = 'autoplay; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    frame.title = btn.getAttribute('aria-label') || '影片';
    btn.parentNode.appendChild(frame);
    btn.remove();
  });
});

// 4. 篩選按鈕（作品列表、LAB）：按鈕 data-filter，項目 data-tags（空白分隔）。
document.querySelectorAll('.filters').forEach(function (bar) {
  var target = document.querySelector(bar.getAttribute('data-target'));
  if (!target) return;
  var items = target.querySelectorAll('[data-tags]');
  var buttons = bar.querySelectorAll('button[data-filter]');
  buttons.forEach(function (btn) {
    var f = btn.getAttribute('data-filter');
    var n = f === 'all' ? items.length : Array.prototype.filter.call(items, function (it) { return it.getAttribute('data-tags').split(' ').indexOf(f) !== -1; }).length;
    var c = document.createElement('span'); c.className = 'count'; c.textContent = n; btn.appendChild(c);
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      items.forEach(function (it) {
        it.hidden = !(f === 'all' || it.getAttribute('data-tags').split(' ').indexOf(f) !== -1);
      });
    });
  });
});

// 5. LAB 點開放大：複製該則的畫面與文字到對話框。
var box = document.querySelector('dialog.lightbox');
if (box) {
  var boxMedia = box.querySelector('.lightbox-media');
  var boxText = box.querySelector('.lightbox-body');
  function openEntry(entry) {
    boxMedia.innerHTML = '';
    var m = entry.querySelector('.media').cloneNode(true);
    m.classList.remove('ratio-1x1');
    var loop = entry.getAttribute('data-loop');
    if (loop) {
      var v = document.createElement('video');
      v.src = loop; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      v.addEventListener('error', function () { v.remove(); });
      m.appendChild(v);
    }
    boxMedia.appendChild(m);
    boxText.innerHTML = '';
    boxText.appendChild(entry.querySelector('.lab-meta').cloneNode(true));
    boxText.appendChild(entry.querySelector('h3').cloneNode(true));
    var note = entry.querySelector('.lab-note');
    if (note) { var p = document.createElement('p'); p.textContent = note.textContent; boxText.appendChild(p); }
    boxText.appendChild(entry.querySelector('.tags').cloneNode(true));
    if (box.showModal) box.showModal(); else box.setAttribute('open', '');
  }
  document.querySelectorAll('.lab-card[data-entry]').forEach(function (entry) {
    entry.addEventListener('click', function () { openEntry(entry); });
  });
  box.querySelector('.lightbox-close').addEventListener('click', function () { box.close(); });
  box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  box.addEventListener('close', function () { boxMedia.innerHTML = ''; });
  // 從首頁點進來（#lab-005）就直接打開那一則
  if (location.hash) {
    var hit = document.getElementById(location.hash.slice(1));
    if (hit && hit.hasAttribute('data-entry')) openEntry(hit);
  }
}

// 6. 首頁的台灣時間
document.querySelectorAll('[data-clock]').forEach(function (el) {
  function tick() {
    try {
      el.textContent = new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) { el.textContent = ''; }
  }
  tick();
  setInterval(tick, 30000);
});
