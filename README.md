# ⚽ 世界杯 2026 · 实时胜率看板

一个**零依赖、纯静态**的网页:实时显示世界杯 2026 每天的场次和各队胜率。
胜率由全球博彩公司赔率**去水位反推**(市场共识,免费方案里最准的信号)。

> ⚠️ 仅供娱乐参考,**非投注建议**。足球胜负预测准确率天花板约 50–55%,理性看球。

**在线地址**:`https://lunkun126-prog.github.io/shijiebei/`(开启 Pages 后生效)

---

## 它怎么工作(key 永不泄露)

```
GitHub Action(定时,每4小时) ──► scripts/fetch_odds.py(用 Secret 里的 key)
        └─► 抓赔率 + 去水位算胜率 ──► 生成 data.json(只含胜率,无 key、无原始赔率)
                └─► 自动 commit 回仓库
GitHub Pages ──► index.html + app.js 只读 data.json 渲染(前端完全不碰 key)
```

API key 只活在 **GitHub Secrets** 里,仓库和前端永远看不到它。朋友打开链接零设置即可看。

---

## 三步上手

### ① 注册拿免费 API key(2 分钟)
去 <https://the-odds-api.com/> 注册,免费档每月 500 次请求(本项目每月只用约 180 次)。
拿到一串 `apiKey`。

### ② 把 key 存进仓库 Secret
仓库页 → **Settings → Secrets and variables → Actions → New repository secret**
- Name(必须一字不差):`ODDS_API_KEY`
- Secret:粘贴你的 key → 保存

### ③ 开启 GitHub Pages
仓库页 → **Settings → Pages** → Source 选 **Deploy from a branch** → 分支 `main` / 目录 `/ (root)` → 保存。
等一两分钟,链接 `https://lunkun126-prog.github.io/shijiebei/` 就能打开。

### ④ 生成第一份真实数据
仓库页 → **Actions → 更新世界杯胜率数据 → Run workflow**(手动触发一次)。
跑完后 `data.json` 会被真实赔率覆盖,网页即显示当天真实场次胜率。
之后每 4 小时自动更新,不用再管。

---

## 本地预览(可选)

不能直接双击 `index.html`(浏览器会拦 `data.json` 的读取)。在项目目录里起个本地服务器:

```bash
python -m http.server 8000
```

浏览器打开 <http://localhost:8000> 即可。先看到的是示例数据。

想本地验证抓数脚本(需要 key):

```bash
# Windows PowerShell
$env:ODDS_API_KEY="你的key"; python scripts/fetch_odds.py
```

---

## 文件说明

| 文件 | 作用 |
|---|---|
| `index.html` / `style.css` / `app.js` | 前端页面(深色卡片 + 三段胜率条,移动端适配) |
| `scripts/fetch_odds.py` | 抓赔率、去水位算胜率、写 `data.json`(零第三方依赖) |
| `data.json` | 数据产物(先放示例,Action 跑后被真实数据覆盖) |
| `.github/workflows/update-odds.yml` | 定时任务(每 4 小时 + 手动触发) |

## 胜率怎么算的

对每场比赛,取各家博彩公司的 1X2(主胜/平/客胜)十进制赔率:
- 隐含概率 = `1 / 赔率`,三项相加 > 1,多出来的就是博彩公司的"水位/抽水";
- 归一化(除以三项之和)去掉水位,得到真实概率;
- 再对所有博彩公司取平均,得到最终胜率。`books_n` 是参与的盘口家数,越多越稳。
