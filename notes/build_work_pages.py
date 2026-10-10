"""從舊 Wix 作品頁的版面資料（notes/wix-pages/*.json）產生 work/*.html 作品頁。

用法：python3 notes/build_work_pages.py
每個 json 是在 Wix 頁面上量出來的元素位置（寬度 W 的畫面上，x, y, w, h 像素）。
這裡把位置換成百分比，所以版面會跟著視窗寬度等比例縮放；手機上改成由上往下排。
"""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'notes', 'wix-pages')
OUT = os.path.join(ROOT, 'work')
ASSET_V = '7'

WIXVID = 'https://video.wixstatic.com/video/f77ff6_{}/{}/mp4/file.mp4'
WIXPOSTER = 'https://static.wixstatic.com/media/f77ff6_{}f000.jpg/v1/fill/w_960,h_540,q_80/poster.jpg'
VTHUMB = 'https://i.vimeocdn.com/video/{}-d_1280'

# 檔名, Wix json, 標題, 中文, 年份, Vimeo 編號（依頁面上播放器的順序）, Vimeo 縮圖, 沒有 Vimeo 時用的 Wix 影片
PAGES = [
    ('tiaf-2023', 'tiaf2023', 'TIAF 2023', '台中國際動畫影展 形象片', '2023', ['852277020']),
    ('taiwan-lantern-festival-2025', 'tlf2025', 'Taiwan Lantern Festival', '2025 台灣燈會', '2025', ['1067632531']),
    ('golden-horse-61', 'thethriftyfamily-1', 'Golden Horse 61st', '第 61 屆金馬獎', '2024', ['1046285324', '1046277623']),
    ('thrifty-family', 'thethriftyfamily', 'The Thrifty Family', '省省吧！我家富貴發 影集片頭', '2024', ['1017416780']),
    ('ballbreaker', 'breakball', 'Ballbreaker', '', '2023', ['843768853']),
    ('gma33-best-mv', 'gma33bestmv', 'GMA 33rd · Best MV', '第 33 屆金曲獎 最佳MV獎', '2022', ['726967776']),
    ('gma33-best-hakka', 'gma33besthakka', 'GMA 33rd · Best Hakka Singer', '第 33 屆金曲獎 最佳客語歌手', '2022', ['727259221']),
    ('good-financial-ep7', 'goodfinancialseriesep7', 'Good Financial EP7', '金融知識+ 第七集', '2022', ['776099322']),
    ('gogoro-share', 'gogoropromotevideo', 'Gogoro Share', '品牌宣傳', '', ['wix:02d5bf36da1e45f29247b9c5d0b88035']),
    ('gma31-best-taiwanese-male', 'gma31besttaiwanesemale', 'GMA 31st · Best Taiwanese Male', '第 31 屆金曲獎 最佳台語男歌手', '2020', ['464960271']),
    ('disney-channel-ident', 'disneychannel', 'Disney Channel Ident', '迪士尼頻道 識別動畫', '2020', ['411747351']),
    ('national-day-2019', 'nationday2019', 'Taiwan National Day', '2019 國慶 Taiwan Forward', '2019', ['364585226']),
    ('hsinchu-fire-museum', 'hsinchufiremuseum', 'Hsinchu Fire Museum', '新竹市消防博物館', '', ['dead']),
    ('dragon-boat-festival', 'dragonboatfestival', 'Dragon Boat Festival', '空集端午', '2021', ['884537476']),
    ('esthesia-collision', 'ntub108thesthesiacollision', 'Esthesia Collision', '感知游擊 畢業展預告', '2019', ['336784431']),
]

VTHUMBS = {
    '852277020': '1707358898-6cf7469ad96512fa2e7b1263941865910c4da98f896ddbfa3b40169299178a05',
    '726967776': '1463521733-8dfbd9f5793710e302b53d33e5f2ccc88f342b96d79074cbb57e0e76fda21e27',
    '727259221': '1464066480-16cb27bdf77c2674ce986267333f7087b241889b113f83c74cc9969372faf8ea',
    '464960271': '969625254-639b9bb0d12e55b83c42553a0252916f21bbb65f740a7161e453bd01b85343f0',
    '1046285324': '1970023605-ca5e93bc451827f1b4a18aa9b9e8d465f0c5f400f5bedab7c872a96f4f2255e7',
    '1046277623': '1970021637-10d6c880d0852163ddb73e64f14ca3a64e2e59ee00f59df06eaf6f391466623d',
    '1017416780': '1935424180-2307a5abde63c9d593bbc540b5cd8b5206a120f3aa556042882dc35f4d9c231b',
    '411747351': '883895719-76ed44dfb6d6820244ab88bd862053456ae959bafb5f0530ce23c5590e9e94ec',
    '364585226': '820053853-285f77f78dbf045ed3afd7480a94d53795b7a6c8758641067e5c0ce520e63c6c',
    '843768853': '1695740842-d869d29768f9b115d36959af13c8702739090b6e24880503a07df9129b337ea4',
    '776099322': '1557364186-8c795cb27de57abd6a31975beeb90e69a8b7cf801dab5d2007d7f7bfb87f5e74',
    '1067632531': '1995582600-d5598a3e3bcf93ddf149e7febe2853fce572f2ccac6340efb8de71c9bdee7657',
    '884537476': '1753667350-3d3fdd3433809653da8fa6b4b9ef3d737b596cc1a74e077afe28126270c13131',
    '336784431': '783722627-b021172247e0a04b5f8b3fcbabf1ca020a8087f271e0cd8420a3de3b7148c6a1',
}

HEADER_GREEN = '150,255,2'
WEIGHT = {'display-extrabold': 800, 'display-bold': 700, 'display-medium': 500, 'display': 500, 'text': 400}


def media_url(u, w_px, h_px):
    """u 是去掉 f77ff6_ 和 ~mv2 的檔名，例如 60a6...581.gif"""
    stem, ext = u.rsplit('.', 1)
    full = 'f77ff6_{}~mv2.{}'.format(stem, ext)
    w, h = max(1, round(w_px * 2)), max(1, round(h_px * 2))
    return 'https://static.wixstatic.com/media/{0}/v1/fill/w_{1},h_{2},al_c,q_85/{0}'.format(full, w, h)


def pct(v, total):
    return '{:.3f}%'.format(v / total * 100)


def vid_quality(q):
    order = ['360p', '480p', '720p', '1080p']
    if q in order and order.index(q) < 2:
        return q
    return '720p'


def expand_galleries(items, H):
    """Wix 圖庫在抓取時還沒排好版，這裡自己排：每列 k 張、等高、塞滿寬度，k 選最接近 Wix 上高度的。
    排完的高度跟 Wix 不同時，把圖庫下方的元素一起上下移。"""
    GAP = 6
    items = [dict(i) for i in items]
    while True:
        g = next((i for i in items if i['t'] == 'g'), None)
        if not g:
            return items, H
        items.remove(g)
        gx, gy, gw, gh = g['r']
        cells = [c for c in g.get('gi', []) if c.get('w') and c.get('h') and (c.get('u') or c.get('v'))]
        best = None
        for k in range(1, len(cells) + 1):
            rows, y, last_h = [], 0, None
            for n in range(0, len(cells), k):
                row = cells[n:n + k]
                ratios = [c['w'] / c['h'] for c in row]
                rh = (gw - GAP * (len(row) - 1)) / sum(ratios)
                if len(row) < k and last_h:
                    rh = min(rh, last_h)
                rows.append((row, ratios, rh, y))
                y += rh + GAP
                last_h = rh
            total = y - GAP
            if best is None or abs(total - gh) < abs(best[1] - gh):
                best = (rows, total)
        rows, total = best if best else ([], 0)
        new = []
        for row, ratios, rh, ry in rows:
            ww = sum(rt * rh for rt in ratios) + GAP * (len(row) - 1)
            x = gx + (gw - ww) / 2
            for c, rt in zip(row, ratios):
                r = [round(x), round(gy + ry), round(rt * rh), round(rh)]
                if c.get('v'):
                    new.append({'t': 'v', 'r': r, 'id': c['v'], 'q': '720p'})
                else:
                    new.append({'t': 'i', 'r': r, 'u': c['u'], 'o': [c['w'], c['h']]})
                x += rt * rh + GAP
        delta = round(total - gh)
        for it in items:
            if it['r'][1] >= gy + gh - 4:
                it['r'] = [it['r'][0], it['r'][1] + delta, it['r'][2], it['r'][3]]
        idx = next((n for n, it in enumerate(items) if it['r'][1] > gy), len(items))
        items[idx:idx] = new
        H += delta


def posters_to_videos(items):
    """Wix 影片的封面圖（檔名是影片 id 加 f000.jpg）換回會動的影片；同位置已經有影片的就直接拿掉"""
    out, seen = [], set()
    for it in items:
        if it['t'] in ('v', 'bv'):
            seen.add((it['id'], tuple(it['r'])))
    for it in items:
        m = re.match(r'^([0-9a-f]{32})f\d{3}\.jpg$', it.get('u', '')) if it['t'] in ('i', 'bi') else None
        if m:
            if (m.group(1), tuple(it['r'])) in seen:
                continue
            it = {'t': 'v', 'r': it['r'], 'id': m.group(1), 'q': '720p'}
            seen.add((it['id'], tuple(it['r'])))
        out.append(it)
    return out


def fit_players(items, H):
    """Wix 的播放器框比 16:9 高（上下是黑邊），改成剛好 16:9，下面的內容跟著往上移"""
    items = [dict(i) for i in items]
    for p in sorted([i for i in items if i['t'] == 'p'], key=lambda i: -i['r'][1]):
        x, y, w, h = p['r']
        nh = round(w * 9 / 16)
        delta = nh - h
        if abs(delta) < 4:
            continue
        p['r'] = [x, y, w, nh]
        for it in items:
            if it is not p and it['r'][1] >= y + h - 40:
                it['r'] = [it['r'][0], it['r'][1] + delta, it['r'][2], it['r'][3]]
        H += delta
    return items, H


def render(slug, data, films, title):
    W = data['W']
    items, H = fit_players(data['items'], data['H'])
    items, H = expand_galleries(posters_to_videos(items), H)
    # 拿掉 Wix 的頂部綠色選單列。Wix 的選單是蓋在內容上面的，所以從第一個內容元素的上方 40px 開始裁
    def is_header(it):
        return it['t'] == 'b' and it['c'].startswith(HEADER_GREEN) and it['r'][1] < 200
    tops = [it['r'][1] for it in items if not is_header(it) and it['r'][3] > 0]
    cut = max(0, min(tops) - 40) if tops else 0
    keep = []
    for z, it in enumerate(items):
        x, y, w, h = it['r']
        if y + h <= cut:
            continue
        if is_header(it):
            continue
        it = dict(it)
        it['r'] = [x, y - cut, w, h]
        it['z'] = z
        keep.append(it)
    H = H - cut
    if keep:
        H = max(H, max(i['r'][1] + i['r'][3] for i in keep))
    keep.sort(key=lambda i: (i['r'][1], i['r'][0]))

    film_iter = iter(films)
    parts = []
    tagged = 0

    def tag_new():
        # 每個元素記下 Wix 上的原始位置，讓 main.js 量完實際字高後重排，避免文字互相重疊
        nonlocal tagged
        for n in range(tagged, len(parts)):
            parts[n] = parts[n].replace('<div class="wx-i', '<div data-r="{},{},{},{}" class="wx-i'.format(*cur_r), 1)
        tagged = len(parts)

    cur_r = None
    for it in keep:
        if cur_r:
            tag_new()
        x, y, w, h = it['r']
        cur_r = (x, y, w, h)
        if w <= 0 or h <= 0:
            continue
        t = it['t']
        # order 只在手機版（由上往下排）有用：照元素的垂直中心排，標題才會在它的圖前面
        style = 'left:{};top:{};width:{};height:{};z-index:{};order:{}'.format(pct(x, W), pct(y, H), pct(w, W), pct(h, H), it['z'], round(y + h / 2))
        small = ' wx-deco' if t in ('i', 's', 'v') and w < W * 0.14 else ''
        ar = '--ar:{}/{}'.format(w, h)
        if t == 'b':
            r, g, b = it['c'].split(',')[:3]
            a = it['c'].split(',')[3] if len(it['c'].split(',')) > 3 else '1'
            parts.append('<div class="wx-i wx-box" style="{};background:rgba({},{},{},{});border-radius:{}px"></div>'.format(style, r, g, b, a, it.get('br', 0)))
        elif t in ('i', 'bi'):
            fit = 'contain' if it.get('dm') in ('fit', 'fitWidth', 'legacyFit') else 'cover'
            parts.append('<div class="wx-i wx-media{}" style="{};{}"><img src="{}" alt="" loading="lazy" style="object-fit:{}"></div>'.format(
                small, style, ar, html.escape(media_url(it['u'], w, h)), fit))
        elif t in ('v', 'bv'):
            src = WIXVID.format(it['id'], vid_quality(it.get('q')))
            parts.append('<div class="wx-i wx-media{}" style="{};{}"><video data-lazy-src="{}" poster="{}" muted loop playsinline aria-hidden="true"></video></div>'.format(
                small, style, ar, html.escape(src), html.escape(WIXPOSTER.format(it['id']))))
        elif t == 'p':
            film = next(film_iter, None)
            parts.append('<div class="wx-i wx-film" style="{}">{}</div>'.format(style, film_html(film, title)))
        elif t == 's':
            if it.get('svg'):
                parts.append('<div class="wx-i wx-svg{}" style="{};{}">{}</div>'.format(small, style, ar, it['svg']))
        elif t in ('t', 'btn'):
            lines = it['l'] if t == 't' else [{'x': it['x'], 's': '255,255,255|16|500|display|c'}]
            cur = None
            ps = []
            for ln in lines:
                if 's' in ln:
                    cur = ln['s']
                color, size, weight, fam, align = (cur or '255,255,255|16|400|text|l').split('|')
                cps = color.split(',')
                css_color = 'rgba({},{},{},{})'.format(*cps) if len(cps) == 4 else 'rgb({})'.format(color)
                wgt = max(int(float(weight)), WEIGHT.get(fam, 400))
                al = {'l': 'left', 'c': 'center', 'r': 'right', 'j': 'justify', 's': 'left'}.get(align, 'left')
                text = html.escape(ln['x']).replace('\n', '<br>')
                if not ln['x'].strip():
                    text = '&nbsp;'
                size = max(float(size), 11)
                ps.append('<p style="--fs:{};color:{};font-weight:{};text-align:{}">{}</p>'.format(size, css_color, wgt, al, text))
            parts.append('<div class="wx-i wx-text" style="{}">{}</div>'.format(style, ''.join(ps)))
    if cur_r:
        tag_new()
    return '<section class="wx" data-w="{}" data-h="{}" style="--W:{};aspect-ratio:{}/{}">\n{}\n</section>'.format(W, H, W, W, H, '\n'.join(parts))


def film_html(film, title):
    if not film or film == 'dead':
        return '<div class="media ratio-16x9 wx-dead"><span class="mono muted">影片已下架</span></div>'
    if film.startswith('wix:'):
        vid = film[4:]
        return '<div class="media ratio-16x9"><video src="{}" poster="{}" controls playsinline preload="none"></video></div>'.format(
            WIXVID.format(vid, '720p'), WIXPOSTER.format(vid))
    thumb = VTHUMB.format(VTHUMBS[film]) if film in VTHUMBS else ''
    return ('<div class="media ratio-16x9"><img src="{}" alt="{} 影片封面">'
            '<button class="player" type="button" data-vimeo="{}" aria-label="播放 {} 完整影片">'
            '<span class="play round"><svg width="26" height="30" viewBox="0 0 18 20" aria-hidden="true"><path d="M3 2 L16 10 L3 18 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg></span>'
            '</button></div>').format(thumb, html.escape(title), film, html.escape(title))


PAGE = '''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | 浩辰 HaoChen</title>
<meta name="description" content="{title}{zh_sep}{zh}。浩辰 HaoChen 動態設計作品。">
<link rel="icon" href="../images/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@600;800&family=Noto+Sans+TC:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="../css/style.css?v={v}">
<link rel="stylesheet" href="../css/project.css?v={v}">
</head>
<body class="project-page">

<header class="site-header">
  <div class="wrap">
    <a class="logo" href="../index.html">HAOCHEN<span class="dot">.</span><span class="zh">浩辰</span></a>
    <nav class="nav" aria-label="主選單">
      <a href="index.html" aria-current="page">WORK</a>
      <a href="../lab/index.html">LAB</a>
      <a href="../about/index.html">ABOUT</a>
      <a href="#contact">CONTACT</a>
    </nav>
  </div>
</header>

<main>
  <div class="wrap wx-back"><a class="mono muted" href="index.html">← 全部作品</a><span class="mono muted">{no} / {total}</span></div>
  <!-- 這一區是照舊 Wix 作品頁的版面產生的（notes/build_work_pages.py），要改請改 notes/wix-pages/{src}.json 再重新產生 -->
{body}

  <nav class="pager" aria-label="上一個與下一個作品"><div class="wrap">
    <a href="{prev_href}"><span class="mono">← PREV</span><strong>{prev_title}</strong></a>
    <a class="next" href="{next_href}"><span class="mono">NEXT →</span><strong>{next_title}</strong></a>
  </div></nav>
</main>

<footer class="site-footer" id="contact">
  <div class="wrap">
    <p class="mono muted kicker">LET'S MAKE THINGS MOVE · 合作洽詢</p>
    <a class="big-mail" href="mailto:haolchen.work@gmail.com">haolchen.work<span class="at">@</span><wbr>gmail.com</a>
    <div class="footer-row">
      <div class="links">
        <a href="https://www.instagram.com/haol2.5d/" target="_blank" rel="noopener">Instagram ↗</a>
        <a href="https://www.behance.net/1044b10990be" target="_blank" rel="noopener">Behance ↗</a>
        <a href="https://www.linkedin.com/in/haochen-liao-a58705299" target="_blank" rel="noopener">LinkedIn ↗</a>
      </div>
      <span class="muted">© 2026 HaoChen Liao</span>
    </div>
  </div>
</footer>

<script src="../js/main.js?v={v}"></script>
</body>
</html>
'''


def main():
    n = len(PAGES)
    for i, (slug, src, title, zh, year, films) in enumerate(PAGES):
        path = os.path.join(DATA, src + '.json')
        if not os.path.exists(path):
            print('skip (no data):', src)
            continue
        data = json.load(open(path, encoding='utf-8'))
        prev = PAGES[(i - 1) % n]
        nxt = PAGES[(i + 1) % n]
        body = render(slug, data, films, title)
        out = PAGE.format(title=html.escape(title), zh=zh, zh_sep='，' if zh else '', v=ASSET_V, src=src, body=body,
                          no='{:02d}'.format(i + 1), total='{:02d}'.format(n),
                          prev_href=prev[0] + '.html', prev_title=html.escape(prev[2]),
                          next_href=nxt[0] + '.html', next_title=html.escape(nxt[2]))
        open(os.path.join(OUT, slug + '.html'), 'w', encoding='utf-8').write(out)
        print('wrote', slug)


if __name__ == '__main__':
    main()
