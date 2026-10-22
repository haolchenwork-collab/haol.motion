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
    var h = btn.getAttribute('data-vimeo-h');  // 不公開影片需要的私人連結碼
    frame.src = 'https://player.vimeo.com/video/' + encodeURIComponent(id) + '?autoplay=1&title=0&byline=0&portrait=0' + (h ? '&h=' + encodeURIComponent(h) : '') +
      (btn.getAttribute('data-t') ? '#t=' + parseInt(btn.getAttribute('data-t'), 10) + 's' : '');
    frame.allow = 'autoplay; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    frame.title = btn.getAttribute('aria-label') || '影片';
    btn.parentNode.appendChild(frame);
    btn.remove();
  });
});

// 3a. 作品頁資訊欄的負責段落：點了捲到影片，從那一秒開始播
document.querySelectorAll('.pj-part[data-t]').forEach(function (part) {
  part.addEventListener('click', function () {
    var t = part.getAttribute('data-t');
    var film = document.querySelector('.pj-film');
    if (!film) return;
    film.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var btn = film.querySelector('.player[data-vimeo]');
    var frame = film.querySelector('iframe');
    var video = film.querySelector('video');
    if (btn) { btn.setAttribute('data-t', t); btn.click(); }
    else if (frame) { frame.src = frame.src.split('#')[0] + '#t=' + parseInt(t, 10) + 's'; }
    else if (video) { video.currentTime = +t; video.play(); }
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

// 4. 篩選按鈕（作品列表）：按鈕 data-filter，項目 data-tags（空白分隔）。
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
      filterItems(target, items, function (it) {
        return f === 'all' || it.getAttribute('data-tags').split(' ').indexOf(f) !== -1;
      });
    });
  });
});

// 篩選切換動畫：留下的項目從舊位置滑到新位置，被篩掉的在原地淡出，新出現的淡入。
// 做法是 FLIP：先記下舊位置，套用新的 hidden，再用 transform 從舊位置補間回來。
function filterItems(target, items, keep) {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate;
  // 上一次切換還沒播完就又點：先把動畫停掉、把淡出中的項目立刻收好（onfinish 是非同步的，不能等它）
  items.forEach(function (it) {
    it.getAnimations().forEach(function (a) { a.cancel(); });
    if (it._leave) it._leave();
  });
  if (reduce || target._stack) { items.forEach(function (it) { it.hidden = !keep(it); }); if (target._stack) target._stack(); return; }

  var EASE = 'cubic-bezier(.2,.7,.2,1)', DUR = 480;
  var box = target.getBoundingClientRect();
  var first = new Map();
  items.forEach(function (it) { if (!it.hidden) first.set(it, it.getBoundingClientRect()); });
  if (getComputedStyle(target).position === 'static') target.style.position = 'relative';

  var leaving = [], entering = [];
  items.forEach(function (it) {
    var show = keep(it);
    if (!show && !it.hidden) leaving.push(it);
    else if (show && it.hidden) { it.hidden = false; entering.push(it); }
  });
  // 要離開的先拿出排版、釘在原本的位置，等淡出完才真的藏起來
  leaving.forEach(function (it) {
    var r = first.get(it);
    Object.assign(it.style, { position: 'absolute', left: (r.left - box.left) + 'px', top: (r.top - box.top) + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', pointerEvents: 'none' });
    it._leave = function () {
      it._leave = null; it.hidden = true;
      it.getAnimations().forEach(function (a) { a.cancel(); });
      ['position', 'left', 'top', 'width', 'height', 'margin', 'pointerEvents'].forEach(function (k) { it.style[k] = ''; });
    };
    it.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }], { duration: DUR * 0.6, easing: EASE, fill: 'forwards' })
      .onfinish = function () { if (it._leave) it._leave(); };
  });
  first.forEach(function (r, it) {
    if (leaving.indexOf(it) !== -1) return;
    var now = it.getBoundingClientRect();
    var dx = r.left - now.left, dy = r.top - now.top;
    if (dx || dy) it.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: DUR, easing: EASE });
  });
  entering.forEach(function (it, i) {
    it.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: DUR, delay: 120 + i * 30, easing: EASE, fill: 'backwards' });
  });
}

// 4a. Work 堆疊瀏覽：卡片在 3D 透視裡上下疊成一疊，捲動時一張張往前翻；正中間那張最大、平放，
//     上下的越遠越小、越暗（全部維持正面，不傾斜）。旁邊顯示目前這張的分類、名稱和專案數。
//     捲動距離決定翻到第幾張（每張 STEP px），停下來會吸到最近的一張。減少動態時維持原本的格狀。
var stackList = document.getElementById('work-list');
if (stackList && !matchMedia('(prefers-reduced-motion: reduce)').matches) (function () {
  var cards = Array.prototype.slice.call(stackList.querySelectorAll('.card'));
  var stage = document.createElement('div');
  stage.className = 'stack-stage';
  cards.forEach(function (c) { stage.appendChild(c); });
  var meta = document.createElement('div');
  meta.className = 'stack-meta';
  meta.innerHTML = '<div class="sm-l"><span class="mono muted sm-cat"></span><b class="sm-title"></b></div>' +
    '<div class="sm-r"><b class="sm-count"></b><span class="mono muted">projects</span></div>' +
    '<div class="sm-b mono muted"><span class="sm-idx"></span><span class="sm-bar"><i></i></span><span>SCROLL ↓</span></div>';
  stage.appendChild(meta);
  stackList.appendChild(stage);
  stackList.classList.add('is-stack');
  stackList.classList.remove('tiles');

  var STEP = 260;
  var list = [], cur = 0, target = 0, front = -1, raf = 0, snapT = 0, top0 = 0, H = 300, U = 300;
  var $ = function (q) { return meta.querySelector(q); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  function measure() {
    list = cards.filter(function (c) { return !c.hidden; });
    STEP = Math.max(180, Math.round(innerHeight * 0.32));
    stackList.style.height = (Math.max(list.length - 1, 0) * STEP + stage.offsetHeight) + 'px';
    top0 = stackList.getBoundingClientRect().top + scrollY;
    H = list.length ? list[0].offsetHeight : 300;
    // 外圈的疊距：手機卡片矮，至少用舞台高度的 25%，整疊才撐得開
    U = Math.max(H, stage.offsetHeight * 0.25);
    $('.sm-count').textContent = list.length;
    onScroll();
  }
  function onScroll() {
    target = Math.min(Math.max((scrollY - top0) / STEP, 0), Math.max(list.length - 1, 0));
    kick();
    clearTimeout(snapT);
    snapT = setTimeout(function () {
      var i = Math.round(target);
      if (Math.abs(i - target) > 0.01 && scrollY > top0 - 2 && scrollY < top0 + (list.length - 1) * STEP + 2) scrollTo({ top: top0 + i * STEP, behavior: 'smooth' });
    }, 160);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick() {
    raf = 0;
    cur += (target - cur) * 0.14;
    if (Math.abs(target - cur) < 0.001) cur = target; else kick();
    list.forEach(function (c, i) {
      var d = i - cur, a = Math.abs(d), s = d < 0 ? -1 : 1, near = Math.min(a, 1), far = Math.max(a - 1, 0);
      if (a > 7.5) { c.style.visibility = 'hidden'; return; }
      // 全部正面不傾斜：往外每張縮小一點、往上（下）錯開，露出一條邊，越外圈越密
      var y = s * (near * H * 0.36 + Math.min(far, 6) * U * 0.12);
      var sc = 1 - near * 0.12 - Math.min(far, 6) * 0.06;
      c.style.visibility = '';
      c.style.zIndex = 100 - Math.round(a * 10);
      c.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,' + (-a * 70).toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
      c.style.filter = a < 0.02 ? '' : 'brightness(' + Math.max(0.18, 1 - a * 0.2).toFixed(3) + ')';
      c.style.opacity = a > 6.5 ? (7.5 - a).toFixed(2) : '';
    });
    var f = Math.round(cur);
    if (f !== front && list[f]) {
      if (list[front]) list[front].classList.remove('is-front');
      front = f;
      var c = list[f];
      c.classList.add('is-front');
      var tag = c.querySelector('.tags span');
      $('.sm-cat').textContent = tag ? tag.textContent : '';
      $('.sm-title').textContent = c.querySelector('h3').textContent;
      $('.sm-idx').textContent = pad(f + 1) + ' / ' + pad(list.length);
    }
    $('.sm-bar i').style.transform = 'scaleX(' + (list.length > 1 ? cur / (list.length - 1) : 1).toFixed(3) + ')';
  }
  // 點到後面的卡片：先翻到那張；點正中間那張才打開
  stage.addEventListener('click', function (e) {
    var c = e.target.closest('.card');
    if (!c || c.classList.contains('is-front')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    scrollTo({ top: top0 + list.indexOf(c) * STEP, behavior: 'smooth' });
  }, true);
  stage.addEventListener('focusin', function (e) {
    var c = e.target.closest('.card');
    if (c && list.indexOf(c) !== -1) scrollTo({ top: top0 + list.indexOf(c) * STEP });
  });
  stackList._stack = function () {
    front = -1;
    cards.forEach(function (c) { c.classList.remove('is-front'); });
    measure();
    if (scrollY > top0) scrollTo({ top: top0 });
    target = cur = 0;
    tick();
    stage.animate && stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease' });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  measure();
  cur = target;
  tick();
})();

// 4b. Work 卡片景深：滑過（或鍵盤移到）一張時，其他卡片依離它的距離設 --depth（0 近～1 遠），CSS 用它決定退後多少。
var depthGrid = document.querySelector('#work-list:not(.is-stack)');
if (depthGrid && matchMedia('(hover: hover)').matches) {
  var setDepth = function (e) {
    var on = e.target.closest && e.target.closest('.card');
    if (!on || !depthGrid.contains(on)) return;
    var a = on.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    // 以畫面寬度的 70% 當「最遠」，畫面內看得到的卡片就會用到完整的遠近範圍
    var far = Math.max(window.innerWidth * 0.7, 1);
    depthGrid.querySelectorAll('.card').forEach(function (c) {
      var b = c.getBoundingClientRect();
      var d = Math.hypot(b.left + b.width / 2 - ax, b.top + b.height / 2 - ay);
      c.style.setProperty('--depth', Math.min(1, d / far).toFixed(3));
    });
  };
  depthGrid.addEventListener('pointerover', setDepth);
  depthGrid.addEventListener('focusin', setDepth);
}

// 4c. 首頁作品區分割變形：兩層疊加。
//     ① 格線跟著游標連續微動：游標靠近哪一欄／列，那一欄／列就稍微變寬／變高。
//     ② 停在哪一張，就再把那張所在的欄與列明顯撐大，選中的是哪張一眼就看得出來。
//     只在桌機（可懸停、寬度 > 1000px）啟用；減少動態時不啟用，維持原本固定格線。
var splitGrid = document.querySelector('.home .works');
if (splitGrid && !reduceMotion) {
  var splitMq = matchMedia('(hover: hover) and (min-width: 1001px)');
  var FLOW_X = 0.2, FLOW_Y = 0.15, SPREAD = 0.3, PICK_X = 0.5, PICK_Y = 0.4, EASE_K = 0.12;
  // 每張卡片佔的欄、列（跟 home.css 的 .works.is-split 一致）
  var cells = [[[0, 1], [0, 1]], [[2], [0]], [[2], [1]], [[0], [2]], [[1], [2]], [[2], [2]]];
  var cards = Array.prototype.slice.call(splitGrid.querySelectorAll('.w'));
  var tx = null, ty = null, picked = -1, cur = [1, 1, 1, 1, 1, 1], raf = 0;
  var flow = function (p, k) {
    return [0, 1, 2].map(function (i) {
      if (p === null) return 1;
      var d = (p - (i + 0.5) / 3) / SPREAD;
      return 1 + k * Math.exp(-d * d);
    });
  };
  var tick = function () {
    var goal = flow(tx, FLOW_X).concat(flow(ty, FLOW_Y)), moving = false;
    if (picked >= 0) {
      var c = cells[picked];
      // 大張跨兩欄兩列，撐大的量分給兩條，整體放大的感覺跟小張差不多
      c[0].forEach(function (i) { goal[i] += PICK_X / c[0].length; });
      c[1].forEach(function (i) { goal[3 + i] += PICK_Y / c[1].length; });
    }
    for (var i = 0; i < 6; i++) {
      cur[i] += (goal[i] - cur[i]) * EASE_K;
      if (Math.abs(goal[i] - cur[i]) > 0.002) moving = true; else cur[i] = goal[i];
    }
    ['--c1', '--c2', '--c3', '--r1', '--r2', '--r3'].forEach(function (name, i) {
      splitGrid.style.setProperty(name, cur[i].toFixed(4) + 'fr');
    });
    raf = moving ? requestAnimationFrame(tick) : 0;
  };
  var kick = function () { if (!raf) raf = requestAnimationFrame(tick); };
  splitGrid.addEventListener('pointermove', function (e) {
    var r = splitGrid.getBoundingClientRect();
    tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    kick();
  });
  // 只在換到另一張時才改「選中」，同一張裡移動不會跳
  var pick = function (e) {
    var on = e.target.closest && e.target.closest('.w');
    var idx = on ? cards.indexOf(on) : -1;
    if (idx >= 0 && idx !== picked) { picked = idx; kick(); }
  };
  splitGrid.addEventListener('pointerover', pick);
  splitGrid.addEventListener('focusin', pick);
  splitGrid.addEventListener('pointerleave', function () { tx = ty = null; picked = -1; kick(); });
  splitGrid.addEventListener('focusout', function (e) {
    if (!splitGrid.contains(e.relatedTarget) && !splitGrid.matches(':hover')) { picked = -1; kick(); }
  });
  var applySplit = function () { splitGrid.classList.toggle('is-split', splitMq.matches); };
  applySplit();
  if (splitMq.addEventListener) splitMq.addEventListener('change', applySplit);
}

// 5. CREATIVE 點開放大：複製該件的畫面與文字到對話框。
var box = document.querySelector('dialog.lightbox');
if (box) {
  var boxMedia = box.querySelector('.lightbox-media');
  var boxText = box.querySelector('.lightbox-body');
  function openEntry(entry) {
    boxMedia.innerHTML = '';
    var m = entry.querySelector('.media').cloneNode(true);
    m.querySelectorAll('.cr-play').forEach(function (n) { n.remove(); });
    if (entry.classList.contains('cr-wide')) m.classList.add('is-wide');
    if (entry.classList.contains('cr-tall')) m.classList.add('is-tall');
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
    var meta = entry.querySelector('.lab-meta');
    if (meta) { var d = document.createElement('p'); d.className = 'mono muted'; d.textContent = 'PERSONAL WORK · ' + meta.textContent; boxText.appendChild(d); }
    boxText.appendChild(entry.querySelector('h3').cloneNode(true));
    var note = entry.querySelector('.lab-note');
    if (note) { var p = document.createElement('p'); p.textContent = note.textContent; boxText.appendChild(p); }
    var tags = entry.querySelector('.tags');
    if (tags) boxText.appendChild(tags.cloneNode(true));
    if (box.showModal) box.showModal(); else box.setAttribute('open', '');
  }
  document.querySelectorAll('.lab-card[data-entry]').forEach(function (entry) {
    entry.addEventListener('click', function () { openEntry(entry); });
  });
  // 格子裡每一件都自動靜音循環播放：捲到附近才載入，mp4 離開畫面就暫停
  var plays = [];
  document.querySelectorAll('.lab-card[data-film]').forEach(function (entry) {
    var film = entry.getAttribute('data-film');
    var el;
    if (film.indexOf('vimeo:') === 0) {
      el = document.createElement('iframe');
      el.setAttribute('data-src', 'https://player.vimeo.com/video/' + encodeURIComponent(film.slice(6)) + '?background=1&autoplay=1&muted=1&loop=1&dnt=1');
      el.allow = 'autoplay';
      el.tabIndex = -1;
      el.title = entry.querySelector('h3').textContent;
    } else {
      el = document.createElement('video');
      el.setAttribute('data-src', film);
      el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true;
      el.setAttribute('muted', ''); el.setAttribute('playsinline', '');
      el.addEventListener('error', function () { el.remove(); });
      el.addEventListener('playing', function () { el.classList.add('is-on'); });
    }
    el.className = 'cr-play';
    el.setAttribute('aria-hidden', 'true');
    if (entry.classList.contains('cr-wide')) el.style.setProperty('--ar', 16 / 9);
    if (entry.classList.contains('cr-tall')) el.style.setProperty('--ar', 9 / 16);
    entry.querySelector('.media').appendChild(el);
    plays.push(el);
  });
  // Vimeo 讀取時是黑畫面：等它真的開始播才蓋上去，播不了就一直顯示原本的圖
  window.addEventListener('message', function (e) {
    if (!/^https:\/\/player\.vimeo\.com$/.test(e.origin)) return;
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { return; } }
    if (!d || !d.event) return;
    plays.forEach(function (el) {
      if (el.tagName !== 'IFRAME' || el.contentWindow !== e.source) return;
      if (d.event === 'ready') {
        ['play', 'timeupdate'].forEach(function (ev) { el.contentWindow.postMessage(JSON.stringify({ method: 'addEventListener', value: ev }), e.origin); });
      } else if (d.event === 'play' || d.event === 'timeupdate') el.classList.add('is-on');
    });
  });
  function playOn(el) {
    if (!el.src) el.src = el.getAttribute('data-src');
    if (el.play) { var p = el.play(); if (p && p.catch) p.catch(function () {}); }
  }
  if (!('IntersectionObserver' in window)) plays.forEach(playOn);
  else {
    var playIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) playOn(e.target);
        else if (e.target.pause && e.target.src) e.target.pause();
      });
    }, { rootMargin: '300px 0px' });
    plays.forEach(function (el) { playIo.observe(el); });
  }
  box.querySelector('.lightbox-close').addEventListener('click', function () { box.close(); });
  box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  box.addEventListener('close', function () { boxMedia.innerHTML = ''; });
  // 從首頁點進來（#lab-005）就直接打開那一件
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
  var sel = '.tile:not(.t-reel), .ab-tile, #work-list:not(.is-stack) .card, .lab-card, .lab-tile, .pj-hero > *, .pj-sec, .pj-row, .site-footer .wrap > *, .page-head > *, .work-bar';
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

  // 換頁轉場：快速淡出淡入（選單不動）
  var incoming = null;
  try { incoming = sessionStorage.getItem('pt'); sessionStorage.removeItem('pt'); } catch (err) {}
  if (incoming !== null) root.classList.add('pt-enter');
  root.classList.remove('pt-in');
  setTimeout(function () { root.classList.remove('pt-enter'); }, 500);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('data-film') || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.protocol.indexOf('http') !== 0) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    try { sessionStorage.setItem('pt', '1'); } catch (err) {}
    root.classList.add('pt-leave');
    setTimeout(function () { location.href = url.href; }, 220);
  });
  addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('pt-leave'); });
})();

