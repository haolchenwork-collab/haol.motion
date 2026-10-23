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
  // 先載好但不播：堆疊模式翻到正中間（和下一張）就先叫這個，滑上去時不用等
  card._warm = function () {
    if (video) return;
    video = document.createElement('video');
    video.src = card.getAttribute('data-loop');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    video.addEventListener('error', function () { video.remove(); });
    media.appendChild(video);
  };
  card.addEventListener('mouseenter', function () {
    card._warm();
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
    card.classList.add('is-playing');
  });
  card.addEventListener('mouseleave', function () {
    if (video) video.pause();
    card.classList.remove('is-playing');
  });
});

// 2b. 沒有短循環檔的卡片：直接播作品內頁那支 Vimeo（背景模式：靜音、無控制列），從 data-t 那秒開始（自己負責的段落）。
// 第一次滑上去（或堆疊翻到它時先預載）才載入；離開時用 Vimeo 的 postMessage 暫停，再滑上去接著播。真的開始播了才淡入，載入中先看封面。
document.querySelectorAll('.card[data-vimeo-loop]').forEach(function (card) {
  if (!canHover || reduceMotion) return;
  var media = card.querySelector('.media'), frame, playing = false;
  function send(method, value) {
    if (frame && frame.contentWindow) frame.contentWindow.postMessage(JSON.stringify(value === undefined ? { method: method } : { method: method, value: value }), 'https://player.vimeo.com');
  }
  window.addEventListener('message', function (e) {
    if (!frame || e.source !== frame.contentWindow) return;
    var d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (err) { return; }
    if (d.event === 'ready') { send('addEventListener', 'playing'); if (!card.matches(':hover')) send('pause'); }
    if (d.event === 'playing') { playing = true; if (card.matches(':hover')) card.classList.add('is-playing'); }
  });
  card._warm = function () {
    if (frame) return;
    var h = card.getAttribute('data-vimeo-h'), t = parseInt(card.getAttribute('data-t'), 10);
    frame = document.createElement('iframe');
    frame.className = 'card-vimeo';
    frame.src = 'https://player.vimeo.com/video/' + encodeURIComponent(card.getAttribute('data-vimeo-loop')) + '?background=1&muted=1&loop=1&dnt=1' + (h ? '&h=' + encodeURIComponent(h) : '') + (t ? '#t=' + t + 's' : '');
    frame.allow = 'autoplay; fullscreen';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    media.appendChild(frame);
  };
  card.addEventListener('mouseenter', function () {
    if (!frame) { card._warm(); return; }
    send('play');
    if (playing) card.classList.add('is-playing');
  });
  card.addEventListener('mouseleave', function () {
    send('pause');
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
  var stacked = target._stack && target.classList.contains('is-stack');
  if (reduce || stacked) { items.forEach(function (it) { it.hidden = !keep(it); }); if (stacked) target._stack(); return; }

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
//     篩選列右邊的切換鈕可以換回九宮格（setMode），選擇記在 localStorage。
var stackList = document.getElementById('work-list');
if (stackList && !matchMedia('(prefers-reduced-motion: reduce)').matches) (function () {
  var cards = Array.prototype.slice.call(stackList.querySelectorAll('.card'));
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  // 遠近的明暗用一層黑色疊上去調 opacity，不用 filter（filter 每格都要重畫整張圖，會卡）
  cards.forEach(function (c) { var sh = document.createElement('i'); sh.className = 'stack-shade'; c.appendChild(sh); c._shade = sh; });
  // 光澤（gloss 樣式）：卡片表面一道斜光，跟著卡片離中間的距離左右滑；只動 transform，不會每格重畫
  cards.forEach(function (c) {
    var g = document.createElement('span'); g.className = 'cs-sheen'; g.setAttribute('aria-hidden', 'true');
    g.innerHTML = '<i></i>'; c.querySelector('.media').appendChild(g); c._sheen = g.firstChild;
  });
  // 卡片樣式（style.css 的 [data-card]）：browser 瀏覽器視窗框、viewfinder 觀景窗、print 相紙、glass 毛玻璃框、gloss 光澤＋光暈（目前用這個，在 work/index.html 設定）。網址加 ?card=… 可以預覽別的樣式
  var cardStyle = (location.search.match(/[?&]card=(\w+)/) || [])[1] || stackList.getAttribute('data-card') || '';
  if (cardStyle) stackList.setAttribute('data-card', cardStyle);
  cards.forEach(function (c, i) {
    var name = c.querySelector('h3').textContent, yr = c.querySelector('.card-title .mono');
    var slug = (c.getAttribute('href') || '').replace(/\.html$/, '').replace(/^#$/, '');
    var bar = document.createElement('span');
    bar.className = 'cs-bar'; bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<i></i><i></i><i></i><em>haol.motion/work/' + slug + '</em>';
    c.insertBefore(bar, c.firstChild);
    var vf = document.createElement('span');
    vf.className = 'cs-vf'; vf.setAttribute('aria-hidden', 'true');
    vf.innerHTML = '<b>● REC</b><b>' + (yr ? yr.textContent : '') + ' · 16:9</b><b>00:00:' + pad(i + 1) + ':00</b><b>' + name + '</b>';
    c.querySelector('.media').appendChild(vf);
    var lab = document.createElement('span');
    lab.className = 'cs-label'; lab.setAttribute('aria-hidden', 'true');
    lab.innerHTML = '<b>' + pad(i + 1) + '</b><em>' + name + '</em><b>' + (yr ? yr.textContent : '') + '</b>';
    c.appendChild(lab);
    var go = document.createElement('span');
    go.className = 'cs-go'; go.setAttribute('aria-hidden', 'true');
    go.textContent = c.hasAttribute('data-film') ? 'PLAY ▶' : 'VIEW PROJECT ↗';
    c.querySelector('.media').appendChild(go);
  });
  var stage = document.createElement('div');
  stage.className = 'stack-stage';
  cards.forEach(function (c) { stage.appendChild(c); });
  var meta = document.createElement('div');
  meta.className = 'stack-meta';
  // 資訊全部放左側：分類・年份／名稱／中文副標／客戶
  meta.innerHTML = '<div class="sm-l"><span class="mono muted sm-cat"><span class="sm-year"></span> · <span class="sm-tag"></span></span>' +
    '<b class="sm-title"></b><span class="muted sm-zh"></span><span class="mono muted sm-client"></span><span class="sm-role"></span></div>' +
    '<div class="sm-b mono muted"><span class="sm-idx"></span><span class="sm-bar" title="拖曳或點一下跳到那張"><i></i></span>' +
    '<button type="button" class="sm-skip mono">SKIP ↓</button></div>';
  stage.appendChild(meta);
  // 正中間那張後面的光暈：用它自己的封面模糊放大，兩層交替淡入淡出
  var glows = [0, 1].map(function () { var g = document.createElement('div'); g.className = 'stack-glow'; g.setAttribute('aria-hidden', 'true'); stage.insertBefore(g, stage.firstChild); return g; });
  var glowOn = 0, glowShown = null, glowTimer = 0;
  // 預覽影片播放時，光暈跟著影片畫面變：把影片縮成很小的圖每幀畫進 canvas，再交給同一套模糊
  // （只有網站裡的 mp4 做得到；Vimeo 是別的網域，讀不到畫面，光暈維持封面）
  var live = document.createElement('canvas'), lctx = live.getContext('2d'), liveOn = false, liveT = 0;
  live.className = 'stack-glow live'; live.width = 64; live.height = 30; live.setAttribute('aria-hidden', 'true');
  stage.insertBefore(live, glows[0].nextSibling);
  (function liveLoop(t) {
    requestAnimationFrame(liveLoop);
    if (!on || !list) return;
    var c = list[front], v = c && c.classList.contains('is-playing') && c.querySelector('video');
    var ok = !!(v && v.readyState >= 2 && !v.paused);
    if (ok && t - liveT > 40) { liveT = t; try { lctx.drawImage(v, 0, 0, live.width, live.height); } catch (err) { ok = false; } }
    if (ok !== liveOn) { liveOn = ok; stage.classList.toggle('is-live', ok); }
  })(0);
  // 連續翻好幾張時先不換光暈，停下來才換：不然半透明的那層會被直接換圖，顏色一下跳掉
  function setGlow(c) {
    clearTimeout(glowTimer);
    glowTimer = setTimeout(function () { showGlow(c); }, glowShown ? 180 : 0);
  }
  function showGlow(c) {
    var img = c.querySelector('.media img');
    if (!img || c === glowShown) return;
    glowShown = c;
    glowOn = 1 - glowOn;
    glows[glowOn].style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
    glows[glowOn].classList.add('on'); glows[1 - glowOn].classList.remove('on');
  }
  stackList.appendChild(stage);
  stackList.classList.add('is-stack');
  document.body.classList.add('has-stack');
  stackList.classList.remove('tiles');

  var STEP = 260;
  var list = [], cur = 0, target = 0, front = -1, raf = 0, snapT = 0, top0 = 0, H = 300, U = 300;
  var $ = function (q) { return meta.querySelector(q); };

  var on = true;
  var hero = document.querySelector('.page-hero'), wb = document.querySelector('.work-bar'), wbTop = 0, wbStick = 0;
  wb.style.transition = 'opacity .8s ease';  // 篩選列的滑入動畫原本也補間 transform，會拖慢跟隨
  function measure() {
    if (!on) return;
    list = cards.filter(function (c) { return !c.hidden; });
    // 每張捲多少：固定值，不跟視窗高度走（手機網址列伸縮會觸發 resize，跟著變的話會跳到別張）
    STEP = 160;
    // 舞台往上拉到頁面最頂：一打開第一張就在畫面正中間，標題和篩選列疊在它上面。
    // 用目前的 margin 反推原本的位置，不先清掉再量（清掉那一下版面會動，捲動位置會被瀏覽器拉走）
    var mt = parseFloat(stackList.style.marginTop) || 0;
    stackList.style.marginTop = -(stackList.getBoundingClientRect().top + scrollY - mt) + 'px';
    stackList.style.height = (Math.max(list.length - 1, 0) * STEP + stage.offsetHeight) + 'px';
    top0 = stackList.getBoundingClientRect().top + scrollY;
    H = list.length ? list[0].offsetHeight : 300;
    // 外圈的疊距：手機卡片矮，至少用舞台高度的 25%，整疊才撐得開
    U = Math.max(H, stage.offsetHeight * 0.25);
    wbTop = wb.parentNode.getBoundingClientRect().top + scrollY;
    wbStick = parseFloat(getComputedStyle(wb).top) || 0;
    onScroll();
  }
  var spinUntil = 0, morph = null;
  // cubic-bezier 緩動曲線（給 JS 逐格算的轉場用）
  function bezier(x1, y1, x2, y2) {
    function b(t, a, c) { return 3 * a * t * (1 - t) * (1 - t) + 3 * c * t * t * (1 - t) + t * t * t; }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var n = 0; n < 24; n++) { t = (lo + hi) / 2; if (b(t, x1, x2) < x) lo = t; else hi = t; }
      return b(t, y1, y2);
    };
  }
  function onScroll() {
    if (!on || performance.now() < spinUntil) return;
    target = Math.min(Math.max((scrollY - top0) / STEP, 0), Math.max(list.length - 1, 0));
    kick();
    clearTimeout(snapT);
    snapT = setTimeout(function () {
      if (!on) return;
      var i = Math.round(target);
      // 直接把捲動位置對齊；畫面本來就是緩動追上去的，所以看起來是順順滑到那張
      if (Math.abs(i - target) > 0.01 && scrollY > top0 - 2 && scrollY < top0 + (list.length - 1) * STEP + 2) scrollTo({ top: top0 + i * STEP, behavior: 'instant' });
    }, 200);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  var last = 0, glint = 0.1;
  function tick(t) {
    raf = 0;
    if (!on) return;
    // 跟幀率無關的緩動：每 16.7ms 追上剩下距離的 9%
    var dt = last && t ? Math.min(t - last, 64) : 16.7;
    last = t || 0;
    if (morph) morph.pre();
    cur += (target - cur) * (1 - Math.pow(0.91, dt / 16.7));
    // 反射光的強度跟著翻動速度：動得越快越亮，停下來只剩一點點。強度本身也緩動（亮起來慢、退得更慢），不會一閃一閃
    var want = Math.min(0.6, 0.1 + Math.abs(target - cur) * 1.4);
    glint += (want - glint) * (1 - Math.pow(want > glint ? 0.88 : 0.94, dt / 16.7));
    if (!morph && Math.abs(target - cur) < 0.0005 && Math.abs(want - glint) < 0.005) { cur = target; last = 0; } else kick();
    list.forEach(function (c, i) {
      var d = i - cur, a = Math.abs(d), s = d < 0 ? -1 : 1, near = Math.min(a, 1), far = Math.max(a - 1, 0);
      // 全部正面不傾斜：往外每張縮小一點、往上（下）錯開，露出一條邊，越外圈越密
      var y = s * (near * H * 0.46 + Math.min(far, 6) * U * 0.15);
      var sc = 1 - near * 0.12 - Math.min(far, 6) * 0.06;
      // 太遠的藏起來，但位置照算：九宮格切過來時，它們才有地方可以飛
      c.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,' + (-a * 70).toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
      c._y = y; c._z = -a * 70; c._sc = sc;
      c.style.visibility = a > 5 ? 'hidden' : '';
      if (a > 5) return;
      c.style.zIndex = 1000 - Math.round(a * 100);
      // 變暗用 smoothstep 曲線：離開中間時慢慢暗下去，沒有一離開就掉一階的感覺。
      // 兩段疊起來：離開正中間一張的距離內先暗到約 4 成亮（後面的卡片一直都這麼暗），再往外圈越來越暗
      var k = Math.min(a / 4, 1), sk = k * k * (3 - 2 * k), sn = near * near * (3 - 2 * near);
      c._shade.style.opacity = (1 - (1 - 0.8 * sk) * (1 - 0.6 * sn)).toFixed(3);
      c._sheen.style.transform = 'translate3d(' + (Math.max(-3, Math.min(3, d)) * -24).toFixed(2) + '%,0,0)';
      c._sheen.style.opacity = glint.toFixed(3);
      c.style.opacity = a > 4 ? (5 - a).toFixed(2) : '';
    });
    if (morph) morph.step();
    // 轉場時卷軸在滾：最前面那張直接認定是要停的那張，左側文字不會跟著一路換
    var f = morph ? morph.land : Math.round(cur);
    if (f !== front && list[f]) {
      if (list[front]) {
        list[front].classList.remove('is-front', 'is-playing'); list[front].tabIndex = -1;
        // 換張時停掉上一張的預覽影片（滑鼠沒移動的話 mouseleave 不會觸發）
        var pv = list[front].querySelector('video'); if (pv) pv.pause();
        if (list[front].querySelector('.card-vimeo')) list[front].dispatchEvent(new Event('mouseleave'));
      }
      front = f;
      var c = list[f];
      c.classList.add('is-front');
      c.tabIndex = 0;
      setGlow(c);
      // 預覽影片先載好：正中間這張和前後各一張
      [c, list[f + 1], list[f - 1]].forEach(function (w) { if (w && w._warm) w._warm(); });
      // 滑鼠停在原地、卡片換到它底下時不會有 mouseenter，補一下讓預覽影片接著播
      setTimeout(function () { if (c.classList.contains('is-front') && !c.classList.contains('is-playing') && c.matches(':hover')) c.dispatchEvent(new Event('mouseenter')); }, 150);
      var tags = c.querySelectorAll('.tags span'), zh = c.querySelector('.zh'), yr = c.querySelector('.card-title .mono');
      $('.sm-tag').textContent = tags[0] ? tags[0].textContent : '';
      $('.sm-title').textContent = c.querySelector('h3').textContent;
      $('.sm-zh').textContent = zh ? zh.textContent : '';
      $('.sm-year').textContent = yr ? yr.textContent : '';
      $('.sm-client').textContent = tags[1] ? tags[1].textContent : '';
      // MY ROLE：一行，用 / 隔開（卡片 data-role，用 | 分隔）
      $('.sm-role').innerHTML = '';
      (c.getAttribute('data-role') || '').split('|').forEach(function (r) { if (!r) return; var t = document.createElement('span'); t.textContent = r; $('.sm-role').appendChild(t); });
      // 換張時左側文字一行一行錯開淡入上移（分類 → 標題 → 中文 → 客戶，每行晚 60ms）
      if (meta.animate) [].forEach.call($('.sm-l').children, function (el, i) {
        el.animate([{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }], { duration: 520, delay: i * 60, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      });
      $('.sm-idx').textContent = pad(f + 1) + ' / ' + pad(list.length);
    }
    $('.sm-bar i').style.transform = 'scaleX(' + (list.length > 1 ? cur / (list.length - 1) : 1).toFixed(3) + ')';
    // 標題和篩選列：捲動位置是一下跳到下一張的，它們如果跟著捲就會一格一格跳。
    // 改成跟卡片同一條緩動：看起來的捲動量 = 實際捲動 − (目標 − 目前) × 每張距離
    var lag = morph ? 0 : (Math.min(Math.max(scrollY - top0, 0), (list.length - 1) * STEP) - cur * STEP);
    var seen = scrollY - lag;
    hero.style.transform = Math.abs(lag) < 0.5 ? '' : 'translate3d(0,' + lag.toFixed(1) + 'px,0)';
    var dBar = Math.max(wbStick, wbTop - seen) - Math.max(wbStick, wbTop - scrollY);
    wb.style.transform = Math.abs(dBar) < 0.5 ? '' : 'translate3d(0,' + dBar.toFixed(1) + 'px,0)';
  }
  // 只有正前方那張能點、能滑過（其他張 CSS 設 pointer-events: none、tabIndex -1）。

  // 翻幾張由滾動量決定：滾輪一格（約 100）翻一張，連續滾就照總量一路翻；觸控板的小幅事件打六折，免得輕輕一推就飛很遠。
  // 一個手勢的第一下只要有感覺的量就先翻一張，回應才不會鈍。手機上手指每滑 80px 翻一張。
  // 在第一張往上、最後一張往下時不攔，交給頁面正常捲到標題或頁尾。
  function inStack() { return on && scrollY >= top0 - 2 && scrollY <= top0 + (list.length - 1) * STEP + 2; }
  var idx = 0, lastMove = 0;
  function step(dir) {
    // 停一下之後重新以目前的位置為準；連續滾的時候用自己記的 idx，不等捲動事件回來
    if (performance.now() - lastMove > 400) idx = Math.round(target);
    var i = idx + dir;
    if (i < 0 || i >= list.length) return false;
    idx = i; lastMove = performance.now();
    scrollTo({ top: top0 + i * STEP, behavior: 'instant' });
    return true;
  }
  function canStep(dir) { var base = performance.now() - lastMove > 400 ? Math.round(target) : idx; return base + dir >= 0 && base + dir < list.length; }
  var acc = 0, lastWheel = 0, moved = false;
  addEventListener('wheel', function (e) {
    if (!inStack() || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    var dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
    var dir = dy > 0 ? 1 : -1;
    if (!canStep(dir)) return;
    e.preventDefault();
    var now = performance.now();
    if (now - lastWheel > 220 || (acc && (acc > 0) !== (dy > 0))) { acc = 0; moved = false; }
    lastWheel = now;
    acc += Math.abs(dy) >= 50 ? dy : dy * 0.6;
    if (!moved && Math.abs(acc) >= 24) { moved = true; acc = 0; step(dir); return; }
    while (Math.abs(acc) >= 100) { acc -= dir * 100; if (!step(dir)) { acc = 0; break; } }
  }, { passive: false });
  var tx = null, ty = null, used = 0;
  addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; used = 0; }, { passive: true });
  addEventListener('touchmove', function (e) {
    if (ty === null || !inStack()) return;
    var dx = tx - e.touches[0].clientX, dy = ty - e.touches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy)) return;
    var dir = dy > 0 ? 1 : -1;
    if (!canStep(dir)) return;
    e.preventDefault();
    var want = Math.abs(dy) < 36 ? 0 : 1 + Math.floor((Math.abs(dy) - 36) / 80);
    while (used < want) { used++; if (!step(dir)) break; }
  }, { passive: false });
  addEventListener('touchend', function () { ty = null; });
  addEventListener('keydown', function (e) {
    if (!inStack() || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
    var k = e.key, dir = k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey) ? 1 : k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey) ? -1 : 0;
    if (!dir || !canStep(dir)) return;
    e.preventDefault();
    step(dir);
  });
  stackList._stack = function () {
    front = -1;
    cards.forEach(function (c) { c.classList.remove('is-front'); c.tabIndex = -1; });
    measure();
    lastMove = 0;
    if (scrollY > top0) scrollTo({ top: top0 });
    target = cur = 0;
    tick();
    stage.animate && stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease' });
  };
  // 進度條：點或拖曳直接跳到那張
  var bar = $('.sm-bar');
  function scrub(e) {
    var r = bar.getBoundingClientRect();
    var i = Math.round(Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * Math.max(list.length - 1, 0));
    lastMove = 0;
    scrollTo({ top: top0 + i * STEP, behavior: 'instant' });
  }
  bar.addEventListener('pointerdown', function (e) { bar.setPointerCapture(e.pointerId); bar.classList.add('is-drag'); scrub(e); });
  bar.addEventListener('pointermove', function (e) { if (bar.hasPointerCapture(e.pointerId)) scrub(e); });
  bar.addEventListener('pointerup', function () { bar.classList.remove('is-drag'); });
  // SKIP：跳過整疊，直接到頁尾
  $('.sm-skip').addEventListener('click', function () {
    scrollTo({ top: top0 + stackList.offsetHeight - stage.offsetHeight + 1, behavior: 'instant' });
    document.querySelector('.site-footer').scrollIntoView({ behavior: 'smooth' });
  });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);

  // 堆疊／九宮格切換：九宮格就是原本的格狀列表，卡片搬回 #work-list、清掉堆疊加的樣式。
  // 切換時用 FLIP：先記下每張在畫面上的位置，換好版面再從舊位置補間到新位置，看起來是卡片自己飛過去。
  // 正中間那張（或九宮格裡最靠近畫面中間那張）會對齊到另一種模式的同一張，捲動位置才接得上。
  // 封面都是 lazy：九宮格裡在畫面外的，飛進堆疊時還沒載，會是一張空白卡。堆疊看得到的前後幾張先載
  function eager(at) {
    list.slice(Math.max(0, at - 6), at + 7).forEach(function (c) { var im = c.querySelector('.media img'); if (im) im.loading = 'eager'; });
  }
  // 切回九宮格：標題不要同時出來，照畫面上由左到右、由上到下一張接一張
  function capsIn() {
    var vis = cards.filter(function (c) { var r = c.getBoundingClientRect(); return !c.hidden && r.bottom > 0 && r.top < innerHeight; });
    vis.sort(function (a, b) { var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return Math.round(ra.top - rb.top) || ra.left - rb.left; });
    vis.forEach(function (c, i) { c.style.setProperty('--cap-d', (i * 0.07).toFixed(2) + 's'); });
    stackList.classList.add('cap-in');
    stackList.classList.remove('cap-hide');
    clearTimeout(stackList._ciT);
    stackList._ciT = setTimeout(function () {
      stackList.classList.remove('cap-in');
      cards.forEach(function (c) { c.style.removeProperty('--cap-d'); });
    }, vis.length * 70 + 700);
  }
  // 九宮格 → 卷軸，逐格用 JS 算：每一格先讓 tick 算出卷軸（正在滾）裡的位置，再把卡片從九宮格的位置往那裡補間。
  // 卷軸在動、卡片也在飛，同一條時間線，中間不會停
  function flyIn(DUR, EASE, sr, scs, po, first, shade0, op0, pos0, land, sp) {
    var m = /cubic-bezier\(([^)]+)\)/.exec(EASE), ez = bezier.apply(null, (m ? m[1] : '.6,0,.2,1').split(',').map(parseFloat));
    var spin = bezier(.25, .1, .2, 1);
    var d = parseFloat(scs.perspective) || 1600, px = sr.left + parseFloat(po[0]), py = sr.top + parseFloat(po[1]);
    var t0 = performance.now(), SPIN = DUR + 300, maxWait = 0;
    var items = [];
    cards.forEach(function (c, k) {
      if (c.hidden) return;
      var f = first.get(c), i = list.indexOf(c), depth = Math.abs(i - land);
      if (!f && Math.abs(i - land) > 5 && Math.abs(i - sp) > 5) return;
      var wait = f ? Math.min(depth, 6) * 60 : 120 + Math.min(depth, 6) * 40;
      maxWait = Math.max(maxWait, wait);
      items.push({ c: c, f: f, wait: wait, fade: depth >= 3, o0: f ? op0.get(c) : 0, s0: shade0.get(c) || 0,
        ox: sr.left + c.offsetLeft + c.offsetWidth / 2, oy: sr.top + c.offsetTop + c.offsetHeight / 2, w: c.offsetWidth, h: c.offsetHeight });
      // 封面裁切：九宮格對齊下方、堆疊置中，跟著卡片一起補間
      var im = c.querySelector('.media > img'), p0 = pos0.get(c), p1 = im && getComputedStyle(im).objectPosition;
      if (f && p0 && p1 && p0 !== p1) im.animate([{ objectPosition: p0 }, { objectPosition: p1 }], { duration: DUR, delay: wait, easing: EASE, fill: 'backwards' });
    });
    morph = {
      land: Math.round(land),
      pre: function () {
        var p = Math.min((performance.now() - t0) / SPIN, 1);
        cur = target = sp + (land - sp) * spin(p);
      },
      step: function () {
        var now = performance.now() - t0;
        items.forEach(function (it) {
          var c = it.c, e = ez((now - it.wait) / DUR);
          var oT = c.style.visibility === 'hidden' ? 0 : parseFloat(c.style.opacity || 1);
          var o;
          if (!it.f) o = oT * e;
          else if (it.fade || oT === 0) o = e < 0.35 ? it.o0 * (1 - e / 0.35) : e < 0.7 ? 0 : oT * (e - 0.7) / 0.3;
          else o = it.o0 + (oT - it.o0) * e;
          c.style.opacity = o.toFixed(3);
          c.style.visibility = o > 0.005 ? 'visible' : 'hidden';
          var sT = parseFloat(c._shade.style.opacity) || 0;
          c._shade.style.opacity = (it.s0 + (sT - it.s0) * Math.min(1, e * 2.5)).toFixed(3);
          if (!it.f || e >= 1) return;
          // 卷軸裡此刻的位置（含透視）：位移／縮放放在最前面，畫面上會乘上 k = d / (d - z)，先換回沒透視的平面再補間
          var k = d / (d - c._z), f = it.f;
          var fcx = px + (f.left + f.width / 2 - px) / k, fcy = py + (f.top + f.height / 2 - py) / k;
          var sx = f.width / (it.w * c._sc * k), sy = f.height / (it.h * c._sc * k);
          var tx = fcx - it.ox, ty = fcy - it.oy - sy * c._y, q = 1 - e;
          c.style.transform = 'translate(' + (tx * q).toFixed(1) + 'px,' + (ty * q).toFixed(1) + 'px) scale(' + (sx + (1 - sx) * e).toFixed(4) + ',' + (sy + (1 - sy) * e).toFixed(4) + ') ' + c.style.transform;
        });
        if (now > Math.max(SPIN, DUR + maxWait) + 20) { morph = null; spinUntil = 0; cur = target = land; kick(); }
      }
    };
    morph.step();
    kick();
  }
  function setMode(mode, animate) {
    var first = new Map(), shade0 = new Map(), op0 = new Map(), pos0 = new Map(), focus = null, best = Infinity;
    if (animate) cards.forEach(function (c) {
      if (c.hidden) return;
      shade0.set(c, parseFloat(c._shade.style.opacity) || 0);
      var r = c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      first.set(c, r);
      op0.set(c, c.style.visibility === 'hidden' ? 0 : parseFloat(getComputedStyle(c).opacity));
      var im0 = c.querySelector('.media > img'); if (im0) pos0.set(c, getComputedStyle(im0).objectPosition);
      var dc = Math.abs(r.top + r.height / 2 - innerHeight / 2);
      if (!on && dc < best) { best = dc; focus = c; }
    });
    if (animate && on) focus = list[Math.round(cur)] || null;
    if (animate && animate.first) focus = cards.filter(function (c) { return !c.hidden; })[0] || focus;
    // 量完起點才交棒（例如首頁進場：卡片正浮到一半，從當下的位置接著飛，不會先跳回定位）
    if (animate && animate.measured) animate.measured();

    // 切到九宮格：左側資訊和底部進度列不要瞬間消失。複製一份蓋在原位（要在版面變成格狀前量），
    // 文字一行一行往左滑出畫面、進度列往下滑出，光暈跟著收掉
    if (animate && on && mode !== 'stack' && Element.prototype.animate) {
      var sr0 = stage.getBoundingClientRect(), cs = getComputedStyle(stage);
      var ghost = document.createElement('div');
      ghost.className = 'stack-stage';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.style.cssText = 'position:fixed;left:' + sr0.left + 'px;top:' + sr0.top + 'px;width:' + sr0.width + 'px;height:' + sr0.height + 'px;pointer-events:none;z-index:50;' +
        ['--sw', '--cy', '--cx'].map(function (k) { return k + ':' + cs.getPropertyValue(k); }).join(';');
      var gm = meta.cloneNode(true);
      ghost.appendChild(gm);
      glows.forEach(function (g) { if (g.classList.contains('on')) ghost.insertBefore(g.cloneNode(true), ghost.firstChild); });
      stackList.appendChild(ghost);
      var OUT = 'cubic-bezier(.55,0,.8,.2)';
      [].forEach.call(gm.querySelector('.sm-l').children, function (el, i) {
        el.animate([{ translate: '0 0' }, { translate: '-75vw 0' }], { duration: 620, delay: i * 50, easing: OUT, fill: 'forwards' });
      });
      gm.querySelector('.sm-b').animate([{ translate: '0 0' }, { translate: '0 90px' }], { duration: 520, easing: OUT, fill: 'forwards' });
      [].forEach.call(ghost.querySelectorAll('.stack-glow'), function (g) { g.animate([{ opacity: getComputedStyle(g).opacity }, { opacity: 0 }], { duration: 500, fill: 'forwards' }); });
      setTimeout(function () { ghost.remove(); }, 900);
    }

    on = mode === 'stack';
    toggle.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
    try { localStorage.setItem('work-view', mode); } catch (err) {}
    stackList.classList.toggle('is-stack', on);
    stackList.classList.toggle('tiles', !on);
    document.body.classList.toggle('has-stack', on);
    if (on) {
      cards.forEach(function (c) { stage.insertBefore(c, meta); c.tabIndex = -1; });
      stage.hidden = false;
      front = -1;
      measure();
      var fi = focus ? list.indexOf(focus) : -1;
      if (fi > -1) scrollTo({ top: top0 + fi * STEP, behavior: 'instant' });
      target = cur = fi > -1 ? fi : target;
      // 九宮格 → 卷軸：卷軸從往後幾張的位置開始滾，卡片一邊飛、卷軸一邊轉，一起停在要看的那張
      var land = target, sp = Math.min(Math.round(land) + 4, list.length - 1);
      if (animate && Element.prototype.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        target = cur = sp;
        spinUntil = performance.now() + 5000;
      }
      eager(Math.round(target));
      tick();
    } else {
      cards.forEach(function (c) {
        stackList.insertBefore(c, stage);
        c.classList.remove('is-front');
        c.removeAttribute('tabindex');
        ['transform', 'zIndex', 'opacity', 'visibility'].forEach(function (k) { c.style[k] = ''; });
        c._shade.style.opacity = '';
      });
      stage.hidden = true;
      stackList.classList.remove('cap-in');
      stackList.classList.toggle('cap-hide', !!animate);
      stackList.style.height = stackList.style.marginTop = '';
      hero.style.transform = wb.style.transform = '';
      clearTimeout(glowTimer); glowShown = null;
      glows.forEach(function (g) { g.classList.remove('on'); });
      if (focus) focus.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    if (!animate || !Element.prototype.animate) return;

    var EASE = animate.ease || 'cubic-bezier(.6,0,.2,1)', DUR = 1100;
    stackList.classList.add('morphing');
    clearTimeout(stackList._mT);
    stackList._mT = setTimeout(function () { stackList.classList.remove('morphing'); if (!on) capsIn(); }, on ? DUR + 460 : DUR - 350);
    var sr = stage.getBoundingClientRect(), scs = getComputedStyle(stage), po = scs.perspectiveOrigin.split(' ');
    if (on) { flyIn(DUR, EASE, sr, scs, po, first, shade0, op0, pos0, land, cur); }
    else cards.forEach(function (c, k) {
      var gone = c.style.visibility === 'hidden', f = first.get(c);
      if (c.hidden || (gone && !f)) return;
      var r = c.getBoundingClientRect();
      if (!f && (r.bottom < 0 || r.top > innerHeight)) return;
      var end = c.style.transform || 'none';
      // 變暗也跟著飛：從原本的暗度補間到新的，不會一出發就一下暗掉（或一下亮起來）
      var s0 = shade0.get(c) || 0, s1 = parseFloat(c._shade.style.opacity) || 0;
      // 切到堆疊：離最前面越遠的卡片，越早變暗、越晚出發；最前面那張先飛，其他張依序塞到後面
      var depth = on ? Math.abs(list.indexOf(c) - target) : 0, wait = on ? Math.min(depth, 6) * 60 : 0;
      if (Math.abs(s1 - s0) > 0.01) c._shade.animate([{ opacity: s0 }, { opacity: s1 }], { duration: on ? 380 : DUR, easing: on ? 'ease-out' : EASE, fill: 'forwards' }).finished.then(function (an) { an.cancel(); }).catch(function () {});
      if (!f) {
        c.animate([{ opacity: 0, transform: (end === 'none' ? '' : end + ' ') + 'scale(.92)' }, { opacity: c.style.opacity || 1, transform: end }], { duration: DUR, delay: 120 + k * 12, easing: EASE, fill: 'backwards' });
        return;
      }
      // 版面上的中心（transform 的原點）跟畫面上看到的中心不一樣（堆疊裡有 3D 位移），兩個都要算進去
      var ox = on ? sr.left + c.offsetLeft + c.offsetWidth / 2 : r.left + r.width / 2;
      var oy = on ? sr.top + c.offsetTop + c.offsetHeight / 2 : r.top + r.height / 2;
      // 堆疊有透視：退到 z 的卡片，加在前面的位移／縮放在畫面上都會乘上 k = d / (d - z)。
      // 先把畫面上的位置換回「沒透視」的平面再算，起點才會剛好落在原本的位置（不然一出發就跳一下）
      var k = 1, px = 0, py = 0;
      if (on) {
        var zm = /translate3d\([^,]+,[^,]+,\s*(-?[\d.]+)px/.exec(end), d = parseFloat(scs.perspective);
        if (zm && d) k = d / (d - parseFloat(zm[1]));
        px = sr.left + parseFloat(po[0]); py = sr.top + parseFloat(po[1]);
      }
      var un = function (v, p0) { return p0 + (v - p0) / k; };
      var fcx = un(f.left + f.width / 2, px), fcy = un(f.top + f.height / 2, py);
      var rcx = un(r.left + r.width / 2, px), rcy = un(r.top + r.height / 2, py);
      var sx = f.width / r.width, sy = f.height / r.height;
      var tx = fcx - ox - sx * (rcx - ox);
      var ty = fcy - oy - sy * (rcy - oy);
      var tf = function () { return 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')' + (end === 'none' ? '' : ' ' + end); };
      var o0 = op0.get(c), o1 = gone ? 0 : parseFloat(c.style.opacity || 1);
      var from = { transform: tf() }, to = { transform: end };
      // 九宮格裡看得到、堆疊裡藏起來（或變透明）的卡片：邊飛邊淡出，不會一下消失
      if (Math.abs(o1 - o0) > 0.01) { from.opacity = o0; to.opacity = o1; }
      if (gone) from.visibility = to.visibility = 'visible';
      var kf = [from, to];
      // 後面第 3 張以後：飛的途中淡到看不見，到定位才（暗暗地）出現；藏起來的那些一開始就淡掉
      if (on && (depth >= 3 || gone)) {
        from.opacity = o0; to.opacity = o1;
        kf = [from, { opacity: 0, offset: gone ? 0.25 : 0.35 }, { opacity: 0, offset: gone ? 1 : 0.7 }, to];
      }
      c.animate(kf, { duration: DUR, delay: wait, easing: EASE, fill: 'backwards' });
      // 封面裁切：九宮格對齊下方、堆疊置中。卡片搬到另一層時 CSS transition 不會動，這裡自己補間，不然出發那一格圖會跳一下
      var im = c.querySelector('.media > img'), p0 = pos0.get(c), p1 = im && getComputedStyle(im).objectPosition;
      if (p0 && p1 && p0 !== p1) im.animate([{ objectPosition: p0 }, { objectPosition: p1 }], { duration: DUR, delay: wait, easing: EASE, fill: 'backwards' });
    });
    // 光暈不在這裡補間：它本身有 1.4s 的 CSS 淡入；以前一起淡到 1，動畫一結束會一下暗掉，舊的那層也會跟著亮起來
    // 切回堆疊：左側文字從畫面左邊一行一行滑進來，進度列從下面滑上來
    if (on) {
      var IN = 'cubic-bezier(.2,.8,.2,1)';
      [].forEach.call(meta.querySelector('.sm-l').children, function (el, i) {
        el.animate([{ translate: '-75vw 0' }, { translate: '0 0' }], { duration: 760, delay: 180 + i * 60, easing: IN, fill: 'backwards' });
      });
      meta.querySelector('.sm-b').animate([{ translate: '0 90px' }, { translate: '0 0' }], { duration: 700, delay: 240, easing: IN, fill: 'backwards' });
    }
  }
  var toggle = document.createElement('div');
  toggle.className = 'view-toggle';
  toggle.setAttribute('role', 'group'); toggle.setAttribute('aria-label', '瀏覽方式');
  toggle.innerHTML = '<button type="button" data-mode="stack" title="堆疊" aria-label="堆疊"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="1.5" width="8" height="2.5" rx=".6"/><rect x="1.5" y="6" width="13" height="4.5" rx=".8"/><rect x="4" y="12.5" width="8" height="2.5" rx=".6"/></svg></button>' +
    '<button type="button" data-mode="grid" title="九宮格" aria-label="九宮格"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="4" height="4" rx=".6"/><rect x="6" y="1" width="4" height="4" rx=".6"/><rect x="11" y="1" width="4" height="4" rx=".6"/><rect x="1" y="6" width="4" height="4" rx=".6"/><rect x="6" y="6" width="4" height="4" rx=".6"/><rect x="11" y="6" width="4" height="4" rx=".6"/><rect x="1" y="11" width="4" height="4" rx=".6"/><rect x="6" y="11" width="4" height="4" rx=".6"/><rect x="11" y="11" width="4" height="4" rx=".6"/></svg></button>';
  document.querySelector('.work-bar').appendChild(toggle);
  toggle.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || (b.getAttribute('data-mode') === 'stack') === on || toggle._capT) return;
    if (b.getAttribute('data-mode') === 'stack') {
      // 標題先在格子裡淡出，卡片才開始飛
      stackList.classList.remove('cap-in');
      stackList.classList.add('cap-hide');
      toggle._capT = setTimeout(function () { toggle._capT = 0; setMode('stack', true); }, 200);
    } else setMode('grid', true);
  });
  var saved = 'stack';
  try { saved = localStorage.getItem('work-view') || 'stack'; } catch (err) {}
  measure();
  cur = target;
  tick();
  // 從首頁點 WORK 進來：先停在九宮格，再用切換動畫轉成卷軸（從第一張開始）
  var fromHome = false;
  try { var ref = new URL(document.referrer); fromHome = ref.origin === location.origin && /^\/(haol\.motion\/)?(index\.html)?$/.test(ref.pathname); } catch (err) {}
  if (fromHome && saved !== 'grid' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setMode('grid');
    // 卷軸一開始會看到的前幾張，在九宮格進場時就先載好
    cards.filter(function (c) { return !c.hidden; }).slice(0, 7).forEach(function (c) {
      var im = c.querySelector('.media img'); if (im) { im.loading = 'eager'; if (im.decode) im.decode().catch(function () {}); }
    });
    // 九宮格先進場：畫面內的卡片依序淡入、往上浮；同時把這些封面解碼好，避免轉場時才載圖卡頓
    var vis = cards.filter(function (c) { var r = c.getBoundingClientRect(); return !c.hidden && r.top < innerHeight && r.bottom > 0; });
    var EN = 'cubic-bezier(.2,.7,.2,1)';
    var enter = vis.map(function (c, i) {
      var im = c.querySelector('img'); if (im && im.decode) im.decode().catch(function () {});
      return c.animate([{ opacity: 0, transform: 'translateY(40px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: i * 50, easing: EN, fill: 'backwards' });
    });
    // 標題在進場途中就先淡出，轉場開始時卡片上已經沒有字
    setTimeout(function () { if (!on) stackList.classList.add('cap-hide'); }, 230);
    // 不等全部到位：前幾張浮上來就開始轉卷軸。進場動畫交棒給轉場（位置由轉場接手，透明度從當下的值淡到堆疊裡該有的值），不會一下跳暗
    setTimeout(function () {
      if (on) return;
      // 進場還在動的時候直接接上：起點量的是卡片當下的位置，緩動一開始就帶著速度，看起來是同一段動作
      setMode('stack', { first: true, ease: 'cubic-bezier(.3,.12,.2,1)', measured: function () {
        enter.forEach(function (an) { an.cancel(); });
      } });
    }, 450);
  } else setMode(saved === 'grid' ? 'grid' : 'stack');
})();

// 4b. Work 卡片景深：滑過（或鍵盤移到）一張時，其他卡片依離它的距離設 --depth（0 近～1 遠），CSS 用它決定退後多少。
var depthGrid = document.getElementById('work-list');
if (depthGrid && matchMedia('(hover: hover)').matches) {
  var setDepth = function (e) {
    var on = e.target.closest && e.target.closest('.card');
    if (!on || !depthGrid.contains(on) || depthGrid.classList.contains('is-stack')) return;
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
  // 影片本身的比例：有 data-ar 就照它（格子形狀和影片不同時用），不然看格子是寬的還是直的
  function filmRatio(entry) {
    var ar = parseFloat(entry.getAttribute('data-ar'));
    if (ar > 0) return ar;
    if (entry.classList.contains('cr-wide')) return 16 / 9;
    if (entry.classList.contains('cr-tall')) return 9 / 16;
    return 1;
  }
  function openEntry(entry) {
    boxMedia.innerHTML = '';
    var m = entry.querySelector('.media').cloneNode(true);
    m.querySelectorAll('.cr-play').forEach(function (n) { n.remove(); });
    var ar = filmRatio(entry);
    if (ar > 1.2) m.classList.add('is-wide');
    if (ar < 0.8) m.classList.add('is-tall');
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
    el.style.setProperty('--ar', filmRatio(entry));
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

