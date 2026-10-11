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

// 3b. 首頁 Reel：先從 jsDelivr 讀，失敗就讀本站的 videos/reel.mp4，再不行換成 Vimeo 的靜音循環播放器
document.querySelectorAll('video[data-vimeo-fallback]').forEach(function (v) {
  function fallback() {
    if (!v.parentNode) return;
    var f = document.createElement('iframe');
    f.className = 'reel-bg';
    f.setAttribute('data-reel-bg', '');
    f.src = 'https://player.vimeo.com/video/' + encodeURIComponent(v.getAttribute('data-vimeo-fallback')) +
      '?background=1&autoplay=1&loop=1&muted=1&autopause=0&playsinline=1&dnt=1';
    f.allow = 'autoplay; fullscreen; picture-in-picture';
    f.title = 'Reel 2024（靜音播放中）';
    f.tabIndex = -1;
    v.parentNode.replaceChild(f, v);
    document.dispatchEvent(new CustomEvent('reel-fallback', { detail: f }));
  }
  function onError() {
    var local = v.getAttribute('data-local-src');
    if (local) { v.removeAttribute('data-local-src'); v.src = local; v.play && v.play().catch(function () {}); return; }
    fallback();
  }
  v.addEventListener('error', onError);
  if (v.error) onError();
  var p = v.play && v.play();
  if (p && p.catch) p.catch(function () {});
});

// 3c. 沒有案例頁的作品：點卡片在本頁跳出完整影片。data-film="vimeo:編號" 或 mp4 網址
var filmBox;
function filmNode(src, title) {
  var el;
  if (src.indexOf('vimeo:') === 0) {
    el = document.createElement('iframe');
    el.src = 'https://player.vimeo.com/video/' + encodeURIComponent(src.slice(6)) + '?autoplay=1&title=0&byline=0&portrait=0&dnt=1';
    el.allow = 'autoplay; fullscreen; picture-in-picture';
    el.allowFullscreen = true;
    el.title = title;
  } else {
    el = document.createElement('video');
    el.src = src; el.controls = true; el.autoplay = true; el.playsInline = true;
  }
  return el;
}
function openFilm(src, title) {
  if (!filmBox) {
    filmBox = document.createElement('dialog');
    filmBox.className = 'film-box';
    filmBox.innerHTML = '<div class="film-inner"><div class="film-bar"><span class="film-title mono"></span><button type="button" class="film-close">關閉 ✕</button></div><div class="media ratio-16x9 film-media"></div></div>';
    document.body.appendChild(filmBox);
    filmBox.querySelector('.film-close').addEventListener('click', function () { filmBox.close(); });
    filmBox.addEventListener('click', function (e) { if (e.target === filmBox) filmBox.close(); });
    filmBox.addEventListener('close', function () { filmBox.querySelector('.film-media').innerHTML = ''; });
  }
  var m = filmBox.querySelector('.film-media');
  m.innerHTML = '';
  m.appendChild(filmNode(src, title));
  filmBox.querySelector('.film-title').textContent = title;
  if (filmBox.showModal) filmBox.showModal(); else filmBox.setAttribute('open', '');
}
document.querySelectorAll('a[data-film]').forEach(function (el) {
  el.addEventListener('click', function (e) {
    e.preventDefault();
    var h = el.querySelector('h3');
    openFilm(el.getAttribute('data-film'), h ? h.textContent : '影片');
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
    var film = entry.getAttribute('data-film');
    var loop = entry.getAttribute('data-loop');
    if (film) {
      m.appendChild(filmNode(film, entry.querySelector('h3').textContent));
    } else if (loop) {
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

// 7. 作品頁的循環影片和 GIF 動畫：捲到附近才載入，離開畫面就暫停
(function () {
  var vids = document.querySelectorAll('video[data-lazy-src]');
  if (!vids.length) return;
  function on(v) {
    if (!v.src) v.src = v.getAttribute('data-lazy-src');
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  if (!('IntersectionObserver' in window)) { vids.forEach(on); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) on(e.target);
      else if (e.target.src) e.target.pause();
    });
  }, { rootMargin: '300px 0px' });
  vids.forEach(function (v) { io.observe(v); });
})();


// 8. 記下選單列高度（作品頁的背景要延伸到選單後面）
(function () {
  var h = document.querySelector('.site-header');
  if (!h) return;
  function set() { document.documentElement.style.setProperty('--hh', h.offsetHeight + 'px'); }
  set();
  window.addEventListener('resize', set);
})();

// 10. 全站動態：內容依序滑入、滑鼠光暈、數字跳動、換頁淡出
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var root = document.documentElement;
  root.classList.add('motion');


  // 內容依序滑入（同一層的兄弟元素錯開時間）
  var sel = '.tile:not(.t-reel), .ab-tile, #work-list .card, .lab-card, .lab-tile, .pj-hero > *, .pj-sec, .pj-row, .site-footer .wrap > *, .page-head > *, .work-bar';
  var items = document.querySelectorAll(sel);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var sib = Array.prototype.indexOf.call(e.target.parentNode.children, e.target);
        e.target.style.transitionDelay = Math.min(sib, 6) * 70 + 'ms';
        e.target.classList.add('in');
        setTimeout(function () { e.target.style.transitionDelay = ''; }, 1400);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { el.classList.add('rv'); io.observe(el); });
  }

  // 滑鼠光暈：格子跟著游標亮一圈
  if (matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.tile:not(.t-reel), .ab-tile, .lab-tile').forEach(function (el) {
      el.classList.add('spot');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    // 導覽和篩選按鈕：微微被游標吸過去
    document.querySelectorAll('.nav a, .filters button').forEach(function (el) {
      el.classList.add('magnet');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  // 數字跳動：<b data-count>
  var nums = document.querySelectorAll('[data-count]');
  if (nums.length && 'IntersectionObserver' in window) {
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        nio.unobserve(e.target);
        var el = e.target, to = +el.getAttribute('data-count'), from = to > 1000 ? to - 25 : 0, t0 = performance.now();
        (function step(t) {
          var k = Math.min(1, (t - t0) / 1300);
          el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { nio.observe(n); });
  }

  // 換頁轉場：翻頁。舊頁以左邊為軸往左翻走，新頁以右邊為軸翻進來
  function pivot() {
    var m = document.querySelector('main');
    var top = m ? m.getBoundingClientRect().top : 0;
    root.style.setProperty('--pt-y', (innerHeight / 2 - top) + 'px');
  }
  var incoming = null;
  try { incoming = sessionStorage.getItem('pt'); sessionStorage.removeItem('pt'); } catch (err) {}
  if (incoming !== null) { pivot(); root.classList.add('pt-enter'); }
  root.classList.remove('pt-in');
  setTimeout(function () { root.classList.remove('pt-enter'); }, 1000);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('data-film') || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.protocol.indexOf('http') !== 0) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    try { sessionStorage.setItem('pt', '1'); } catch (err) {}
    pivot();
    root.classList.add('pt-leave');
    setTimeout(function () { location.href = url.href; }, 520);
  });
  addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('pt-leave'); });
})();

