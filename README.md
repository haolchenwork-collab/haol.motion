# 浩辰 HaoChen 作品集網站

這是不需要 Wix 的獨立網站，只有 HTML、CSS 和一點 JavaScript，不用安裝任何東西。直接用瀏覽器打開 `index.html` 就能看。

## 資料夾

```
index.html            首頁：Reel、精選 6 件、合作單位、最新 4 則 LAB、簡介
work/index.html       作品列表：全部作品，可依類型篩選
work/tiaf-2023.html   案例頁（新增作品時複製這個檔）
lab/index.html        LAB 實驗紀錄：依技術篩選，點開放大
about/index.html      About：自介、專長、經歷、客戶、履歷
css/style.css         所有樣式；換強調色改 --accent
js/main.js            滑過播放、點了才載入影片
js/intro.js           首頁開場（Reel 全螢幕 → 往下滑縮回首頁）
images/               放圖片（LAB 的圖放 images/lab/）
videos/               放滑過卡片時播放的短循環 mp4（LAB 的放 videos/lab/）
files/                放履歷 PDF
```

## 換上你的作品

1. **圖片**：用 HTML 裡寫好的檔名放進 `images/`，例如 `images/reel-cover.jpg`、`images/tiaf-2023.jpg`。還沒放的位置會顯示斜線底。
   - 作品卡片用 16:9，建議寬 1600px
   - LAB 用正方形
   - 個人照用 4:5
2. **Reel 和成片**：先上傳到 Vimeo，網址最後那串數字就是影片編號，例如 `vimeo.com/123456789`。把編號填進 `data-vimeo=""`。
3. **滑過預覽**：從每支片剪 3 到 5 秒的無聲循環，存成 mp4（寬 960px 左右，1 到 2 MB 以內），用卡片上寫的檔名放進 `videos/`。不想要這個效果，就刪掉卡片上的 `data-loop`。
4. **首頁 Reel 和開場**：首頁一打開，Reel 就會全螢幕靜音自動播放，下方是 AE 時間軸。訪客往下滑、按方向鍵或按「進入網站」，Reel 才縮回首頁的格子，並繼續播放。換 Reel 時，要改 `index.html` 裡 Reel 的 iframe 網址和按鈕 `data-vimeo` 的編號。Vimeo 免費帳號可能會在畫面上顯示播放控制列；付費帳號（Plus 以上）才能完全隱藏。
5. **方括號 `[ ]`** 的地方都是還需要補的資料。

## 新增一個作品

1. 複製 `work/tiaf-2023.html`，改名，例如 `work/gogoro.html`。
2. 改標題、資料、影片編號、圖片和 Credits。
3. 在 `work/index.html` 把那張卡片的 `href="#"` 改成 `gogoro.html`；如果它也在首頁精選裡，首頁那張改成 `work/gogoro.html`。
4. 卡片的 `data-tags` 決定它出現在哪個篩選：brand（品牌宣傳）、event（典禮與活動）、title（片頭與識別）、exhibition（展覽）。
5. 記得更新案例頁底部「上一個／下一個」的連結。

## 新增一則 LAB 實驗

1. 打開 `lab/index.html`，複製最上面那一則，貼在它前面。
2. 編號 +1（id 和 LAB-00X 都要改）、填日期、標題、一兩句說明。
3. `data-tags` 填技術：3d、character、material、transition、graphic，可以填多個，用空白隔開。
4. 圖片放 `images/lab/`，循環動畫放 `videos/lab/`。
5. 首頁的 Lab 區塊只放最新 4 則，記得一起換。

## 免費上線（擇一）

**Netlify（最簡單）**
1. 到 app.netlify.com/drop
2. 把整個資料夾拖進去，馬上就有網址
3. 註冊帳號後可以改網址名稱，之後更新也是重新拖一次

**GitHub Pages**
1. 建一個 GitHub repository，上傳所有檔案
2. Settings → Pages → 選 main branch
3. 網址會是 `你的帳號.github.io/repository名稱`

**自己的網域**（例如 haochen.studio，一年約數百到一千多元台幣）：在 Netlify 或 GitHub Pages 的網域設定裡填入，再照它的指示到網域商設定 DNS。

## 上線前檢查

- 手機打開看一次
- 點 Email，確認寄到正確的信箱
- 每張圖有沒有出現、每支影片能不能播放
