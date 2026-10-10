"""用舊 Wix 作品頁的素材和文字（notes/wix-pages/*.json）產生 work/*.html 作品頁，版面是新網站的作品頁設計。

用法：python3 notes/build_work_pages.py
每個 json 是在 Wix 頁面上量出來的元素（寬度 W 的畫面上，x, y, w, h 像素）。
這裡用位置判斷每個素材屬於哪個小標題（Process、Element…），再照新網站的作品頁版型排：
標題與資訊 → 完整影片 → 概念與負責部分 → 各素材區塊 → Credits。
"""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'notes', 'wix-pages')
OUT = os.path.join(ROOT, 'work')
ASSET_V = 61

WIXVID = 'https://video.wixstatic.com/video/f77ff6_{}/{}/mp4/file.mp4'
WIXPOSTER = 'https://static.wixstatic.com/media/f77ff6_{}f000.jpg/v1/fill/w_960,h_540,q_80/poster.jpg'
VTHUMB = 'https://i.vimeocdn.com/video/{}-d_1280'

# 檔名, Wix json, 標題, 中文, 年份, Vimeo 編號（依頁面上播放器的順序）, Vimeo 縮圖, 沒有 Vimeo 時用的 Wix 影片
PAGES = [
    ('tiaf-2023', 'tiaf2023', 'TIAF 2023', '台中國際動畫影展 形象片', '2023', ['852277020']),
    ('taiwan-lantern-festival-2025', 'tlf2025', 'Taiwan Lantern Festival', '2025 台灣燈會', '2025', ['1067632531']),
    ('golden-horse-61', 'thethriftyfamily-1', 'Golden Horse 61st', '第 61 屆金馬獎', '2024', ['1046285324', '1046277623']),
    ('thrifty-family', 'thethriftyfamily', 'The Thrifty Family', '省省吧！我家富貴發 影集片頭', '2024', ['1017416780']),
    ('ballbreaker', 'breakball', 'Ballbreaker', '破蛋者', '2023', ['843768853']),
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


CJK = re.compile(r'[一-鿿]')
FIX = {'Lowerthirt': 'Lower third', 'Award HightLight': 'Award Highlight', 'Priduction House': 'Production House',
       '3D Animarion': '3D Animation', 'Nomimees': 'Nominees', 'Taiwan Nation Day': 'Taiwan National Day',
       'Award 33st': 'Award 33rd', 'Award 31st': 'Award 31st', 'BallBreaker': 'Ballbreaker'}
ZH = {'process': '製作過程', 'element': '元素', 'styleframe': '風格畫面', 'logo': '標準字', 'lower third': '字卡',
      'making of': '幕後', 'title': '片名', 'original': '原始畫面', 'animation': '動畫', 'compositing': '合成',
      'stage': '舞台', 'previz': '前期預覽', 'banner': '橫幅', 'elements': '元素'}


# 作品中文名以浩辰提供的為準（覆蓋 Wix 頁上的寫法）
SUB_FIX = {}


def fix(t):
    for a, b in FIX.items():
        t = t.replace(a, b)
    return t


def tstyle(it):
    s = next((l['s'] for l in it.get('l', []) if 's' in l), '255,255,255|16|400|text|l')
    c, size, wgt, fam, al = s.split('|')
    return float(size), fam


def ttext(it):
    return '\n'.join(l['x'] for l in it.get('l', [])).replace('​', '').strip()


def split_roles(s):
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch in '(（':
            depth += 1
        elif ch in ')）':
            depth -= 1
        if ch in '、,，' and depth == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return [r for r in out if r]


def media_tag(it, fit='cover'):
    """一個素材（圖片、GIF 或 Wix 影片）"""
    x, y, w, h = it['r']
    if it['t'] in ('v', 'bv'):
        return '<video data-lazy-src="{}" poster="{}" muted loop playsinline aria-hidden="true"></video>'.format(
            html.escape(WIXVID.format(it['id'], vid_quality(it.get('q')))), html.escape(WIXPOSTER.format(it['id'])))
    ow, oh = it.get('o', [w, h])
    if fit == 'contain':
        tw = min(ow, 720); th = round(tw * oh / ow) if ow else tw
        url = media_url(it['u'], tw / 2, th / 2)
    else:
        url = media_url(it['u'], min(w * 1.6, 1400), min(h * 1.6, 1400 * h / max(w, 1)))
    return '<img src="{}" alt="" loading="lazy" style="object-fit:{}">'.format(html.escape(url), fit)


def rows_html(media, row_h=260):
    """照 Wix 上的列（y 相近的放同一列）排，同一列等高、照比例分寬度"""
    media = sorted(media, key=lambda m: (m['r'][1], m['r'][0]))
    rows = []
    for m in media:
        if rows and abs(rows[-1][0]['r'][1] - m['r'][1]) < 40:
            rows[-1].append(m)
        else:
            rows.append([m])
    out = []
    for row in rows:
        row.sort(key=lambda m: m['r'][0])
        cells = []
        for m in row:
            ar = '{:.3f}'.format(m['r'][2] / max(m['r'][3], 1))
            cells.append('<div class="media pj-cell" style="--ar:{}">{}</div>'.format(ar, media_tag(m)))
        # 一列在 Wix 上只佔內容欄（約 600px）的一部分時，這裡也不要撐滿整個寬度
        # 列的高度最多 row_h px：用「全部素材比例加總 × 高度」當這一列的最大寬度
        ars = sum(m['r'][2] / max(m['r'][3], 1) for m in row)
        cap = ars * row_h + 8 * (len(row) - 1)
        if len(row) == 1:
            cap = min(cap, 560)                   # 單張圖最寬 560px，不撐滿整個畫面
        mw = ' style="max-width:{:.0f}px"'.format(cap)
        out.append('<div class="pj-row n{}"{}>{}</div>'.format(min(len(row), 4), mw, ''.join(cells)))
    return '\n'.join(out)


def render(slug, data, films, title):
    W = data['W']
    items, H = fit_players(data['items'], data['H'])
    items, H = expand_galleries(posters_to_videos(items), H)
    items = [i for i in items if not (i['t'] == 'b')]
    items.sort(key=lambda i: (i['r'][1], i['r'][0]))
    texts = [i for i in items if i['t'] == 't']
    players = [i for i in items if i['t'] == 'p']

    # 標題區的文字
    big = [t for t in texts if tstyle(t)[1] == 'display-extrabold']
    head_title = fix(ttext(big[0])) if big else title
    zh_sub = SUB_FIX.get(slug) or (ttext(big[1]) if len(big) > 1 else '')
    role_t = next((t for t in texts if re.search(r'/\s*(19|20)\d\d\s*/', ttext(t))), None)
    kind = year = studio = ''
    roles = []
    if role_t:
        parts = [p.strip() for p in fix(ttext(role_t)).split('/')]
        kind = parts[0] if parts else ''
        year = parts[1] if len(parts) > 1 else ''
        rest = '/'.join(parts[2:])
        m = re.search(r'\bRole\b', rest)
        if m:
            studio, roles = rest[:m.start()].strip(' /'), split_roles(rest[m.end():])
        else:
            studio = rest
    headings = [t for t in texts if len(t['l']) == 1 and '\n' not in ttext(t) and tstyle(t)[0] >= 24 and tstyle(t)[1] == 'display-bold']
    credit_ts = [t for t in texts if t not in headings and len(re.findall(r'[：:]', ttext(t))) >= 3]
    used = set(id(t) for t in big[:2] + headings + credit_ts + ([role_t] if role_t else []))
    first_h = headings[0]['r'][1] if headings else H
    brief = [t for t in texts if id(t) not in used and t['r'][1] < first_h + 10 and tstyle(t)[0] >= 14 and len(ttext(t)) > 20]
    brief_zh = [ttext(t) for t in brief if CJK.search(ttext(t))]
    brief_en = [ttext(t) for t in brief if not CJK.search(ttext(t))]

    # 影片：每個播放器上方緊貼的標題當成影片說明，不另外開區塊
    film_caps = []
    for p in players:
        cap = None
        for hd in headings:
            if 0 <= p['r'][1] - (hd['r'][1] + hd['r'][3]) < 70:
                cap = hd
        film_caps.append(cap)
    cap_ids = set(id(c) for c in film_caps if c)

    # 其他標題 = 素材區塊；Credit 另外處理
    sections = []
    credit_h = None
    for hd in headings:
        name = fix(ttext(hd)).strip()
        if id(hd) in cap_ids or name.upper() == 'VIDEO':
            continue
        if name.lower() == 'credit':
            credit_h = hd
            continue
        if sections and sections[-1]['name'].lower() == name.lower():
            continue
        sections.append({'name': name, 'y': hd['r'][1], 'media': [], 'band': None})

    # 素材分到它所在的區塊；小的裝飾 GIF 另外收著，不放進頁面
    seen = set()
    hero_bg = None
    credit_bg = None
    deco = []
    for it in items:
        if it['t'] not in ('i', 'bi', 'v', 'bv'):
            continue
        x, y, w, h = it['r']
        key = it.get('u') or it.get('id')
        full = w >= W * 0.9
        if full and h < 60:
            continue                              # Wix 上的細分隔線
        if key in seen:
            continue
        seen.add(key)
        cy = y + h / 2
        if credit_h and full and y <= credit_h['r'][1] + 60 <= y + h:
            credit_bg = credit_bg or it
            continue
        if full and cy < first_h + 40:
            hero_bg = hero_bg or it
            continue
        sec = None
        for s in sections:
            if s['y'] <= cy + 40:
                sec = s
        in_el = sec is not None and sec['name'].lower().startswith('element') and min(it.get('o', [w, h])) >= 200
        if not in_el and (w < W * 0.15 or (w < W * 0.3 and (x < W * 0.15 or x + w > W * 0.85))):
            deco.append(it)
            continue
        if sec is None:
            deco.append(it) if not full else None
            if full and not hero_bg:
                hero_bg = it
            continue
        if full:
            sec['band'] = sec['band'] or it
        else:
            sec['media'].append(it)
    # 小的裝飾 GIF（Wix 頁面上的點綴）不放進作品頁

    # 組 HTML
    out = []
    facts = []
    client = ''
    credits = []
    for t in credit_ts:
        for ln in fix(ttext(t)).split('\n'):
            ln = ln.strip()
            if not ln:
                continue
            m = re.match(r'^(.*?)\s*[：:]\s*(.+)$', ln)
            if m:
                credits.append((m.group(1).strip(), m.group(2).strip()))
            else:
                credits.append(('', ln))
    for dt, dd in credits:
        if re.search(r'client|客戶', dt, re.I):
            client = dd
            break
    if client:
        facts.append(('CLIENT', client))
    if studio:
        facts.append(('STUDIO', studio))
    if year:
        facts.append(('YEAR', year))
    if kind:
        facts.append(('TYPE', kind))
    if roles:
        facts.append(('MY ROLE', roles))

    hero_cls = 'project-hero wrap' + (' has-bg' if hero_bg else '')
    out.append('<section class="pj-hero{}">'.format(' has-bg' if hero_bg else ''))
    if hero_bg:
        out.append('<div class="pj-hero-bg media">{}</div>'.format(media_tag(hero_bg)))
    out.append('<div class="{}">'.format(hero_cls))
    out.append('<a class="back" href="index.html">← 所有作品</a>')
    out.append('<div><h1>{}</h1>{}</div>'.format(html.escape(head_title),
               '<p class="sub">{}</p>'.format(html.escape(zh_sub)) if zh_sub else ''))
    if facts:
        def fact_dd(label, val):
            if isinstance(val, list):              # 負責項目：一個一個小標籤
                return '<dd class="pj-chips">{}</dd>'.format(''.join('<span>{}</span>'.format(html.escape(v)) for v in val))
            m = re.match(r'^([^A-Za-z]*[\u4e00-\u9fff][^A-Za-z]*?)\s+([A-Za-z].*)$', val)
            if m:                                  # 中英並列的名稱：中文一行、英文小字一行
                return '<dd>{}<small>{}</small></dd>'.format(html.escape(m.group(1)), html.escape(m.group(2)))
            return '<dd>{}</dd>'.format(html.escape(val))
        out.append('<dl class="facts pj-facts">{}</dl>'.format(''.join(
            '<div class="f-{}"><dt>{}</dt>{}</div>'.format(a.split()[-1].lower(), a, fact_dd(a, b)) for a, b in facts)))
    out.append('</div></section>')

    # 影片
    fi = iter(films)
    film_parts = []
    for p, cap in zip(players, film_caps):
        f = next(fi, None)
        if not f or f == 'dead':               # 影片已下架：不放空框，整段跳過
            continue
        c = '<figcaption class="mono">{}</figcaption>'.format(html.escape(fix(ttext(cap)))) if cap and fix(ttext(cap)).upper() != 'VIDEO' else ''
        film_parts.append('<figure class="pj-film">{}{}</figure>'.format(film_html(f, head_title), c))
    if film_parts:
        out.append('<section class="wrap pj-films" aria-label="完整影片">{}</section>'.format(''.join(film_parts)))

    # 專案概念：左邊小標，右邊中文（每段一行）＋英文。負責項目已經在上面的資訊欄，這裡不重複
    if brief_zh or brief_en:
        zh_ps = [ln.strip() for z in brief_zh for ln in z.split('\n') if ln.strip()]
        en_ps = [ln.strip() for e in brief_en for ln in e.split('\n') if ln.strip()]
        out.append('<section class="section wrap pj-brief"><h2 class="eyebrow">THE BRIEF<br>專案概念</h2><div class="pj-brief-body">{}{}</div></section>'.format(
            ''.join('<p class="pj-zh">{}</p>'.format(html.escape(z)) for z in zh_ps),
            '<div class="pj-en">{}</div>'.format(''.join('<p>{}</p>'.format(html.escape(e)) for e in en_ps)) if en_ps else ''))

    # 素材區塊
    for s in sections:
        body = []
        if s.get('band'):
            body.append('<div class="pj-band media" style="--ar:{:.3f}">{}</div>'.format(
                s['band']['r'][2] / max(s['band']['r'][3], 1), media_tag(s['band'])))
        is_el = s['name'].lower().startswith('element')
        if s['media'] and not is_el:
            body.append(rows_html(s['media']))
        # 元素：這一區的素材和小裝飾 GIF 一起排成等大方格，填滿整個寬度
        els = s['media'] if is_el else []
        els = [e for e in els if min(e.get('o', e['r'][2:])) >= 40 and min(e['r'][2:]) >= 20]
        if els:
            body.append('<div class="pj-elements">{}</div>'.format(''.join(
                '<div class="pj-el">{}</div>'.format(media_tag(e, 'contain')) for e in els)))
            s['n_el'] = len(els)
        if not body:
            continue
        n = (0 if is_el else len(s['media'])) + s.get('n_el', 0) + (1 if s.get('band') else 0)
        zh = ZH.get(s['name'].lower().strip(), '')
        out.append('<section class="section wrap pj-sec"><div class="section-head"><h2>{}</h2><span class="mono muted">{}{:02d}</span></div>{}</section>'.format(
            html.escape(s['name']), html.escape(zh) + ' · ' if zh else '', n, '\n'.join(body)))

    # Credits
    if credits:
        bg = '<div class="pj-credit-bg media">{}</div>'.format(media_tag(credit_bg)) if credit_bg else ''
        out.append('<section class="pj-credits{}">{}<div class="section wrap"><h2 class="eyebrow pj-credit-head">CREDITS</h2><dl class="credits">{}</dl></div></section>'.format(
            ' has-bg' if credit_bg else '', bg, ''.join(
                '<div>{}<dd>{}</dd></div>'.format('<dt>{}</dt>'.format(html.escape(a)) if a else '', html.escape(b)) for a, b in credits)))
    return '\n'.join(out)


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
  <!-- {no}/{total}。這頁由 notes/build_work_pages.py 產生，素材和文字來自舊 Wix 作品頁（notes/wix-pages/{src}.json），要改請改 json 再重新產生 -->
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
