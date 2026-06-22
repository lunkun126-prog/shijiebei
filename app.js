// 世界杯 2026 胜率看板前端
// 读 data.json -> 按北京时间(UTC+8)分组到日期 -> 默认显示"今天" -> 渲染卡片

const CN_TZ_OFFSET = 8 * 60; // 北京时间 UTC+8(分钟)

// 英文队名 -> 中文(接口返回英文,前端翻译;表里没有的原样显示英文)
const TEAM_CN = {
  "Argentina": "阿根廷", "Austria": "奥地利", "Australia": "澳大利亚",
  "Belgium": "比利时", "Brazil": "巴西", "Bosnia & Herzegovina": "波黑",
  "Canada": "加拿大", "Cape Verde": "佛得角", "Colombia": "哥伦比亚",
  "Croatia": "克罗地亚", "Curaçao": "库拉索", "Czech Republic": "捷克",
  "Denmark": "丹麦", "DR Congo": "刚果(金)", "Ecuador": "厄瓜多尔",
  "Egypt": "埃及", "England": "英格兰", "France": "法国", "Germany": "德国",
  "Ghana": "加纳", "Greece": "希腊", "Haiti": "海地", "Honduras": "洪都拉斯",
  "Iran": "伊朗", "Iraq": "伊拉克", "Italy": "意大利", "Ivory Coast": "科特迪瓦",
  "Jamaica": "牙买加", "Japan": "日本", "Jordan": "约旦", "Mexico": "墨西哥",
  "Morocco": "摩洛哥", "Netherlands": "荷兰", "New Zealand": "新西兰",
  "Nigeria": "尼日利亚", "Norway": "挪威", "Panama": "巴拿马",
  "Paraguay": "巴拉圭", "Peru": "秘鲁", "Poland": "波兰", "Portugal": "葡萄牙",
  "Qatar": "卡塔尔", "Saudi Arabia": "沙特阿拉伯", "Scotland": "苏格兰",
  "Senegal": "塞内加尔", "Serbia": "塞尔维亚", "Slovenia": "斯洛文尼亚",
  "South Africa": "南非", "South Korea": "韩国", "Spain": "西班牙",
  "Sweden": "瑞典", "Switzerland": "瑞士", "Tunisia": "突尼斯",
  "Turkey": "土耳其", "Türkiye": "土耳其", "Ukraine": "乌克兰",
  "United States": "美国", "USA": "美国", "Uruguay": "乌拉圭",
  "Uzbekistan": "乌兹别克斯坦", "Wales": "威尔士", "Algeria": "阿尔及利亚",
  "Cameroon": "喀麦隆", "Costa Rica": "哥斯达黎加", "Mali": "马里",
  "Hungary": "匈牙利", "Romania": "罗马尼亚", "Venezuela": "委内瑞拉",
  "Bolivia": "玻利维亚", "Chile": "智利", "Finland": "芬兰", "Israel": "以色列",
  "New Caledonia": "新喀里多尼亚", "Bolivia ": "玻利维亚", "Congo DR": "刚果(金)",
};

function cn(name) {
  return TEAM_CN[name] || name;
}

// 把 UTC 时间转成北京时间的 Date 部件
function toBeijing(utcStr) {
  const d = new Date(utcStr);
  // 用 UTC 取值再手动 +8,避免依赖运行环境时区
  return new Date(d.getTime() + CN_TZ_OFFSET * 60 * 1000);
}

function beijingDateKey(utcStr) {
  const b = toBeijing(utcStr);
  const y = b.getUTCFullYear();
  const m = String(b.getUTCMonth() + 1).padStart(2, "0");
  const day = String(b.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function beijingTimeLabel(utcStr) {
  const b = toBeijing(utcStr);
  const hh = String(b.getUTCHours()).padStart(2, "0");
  const mm = String(b.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function todayBeijingKey() {
  const now = new Date();
  const b = new Date(now.getTime() + CN_TZ_OFFSET * 60 * 1000);
  const y = b.getUTCFullYear();
  const m = String(b.getUTCMonth() + 1).padStart(2, "0");
  const day = String(b.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateTabLabel(key) {
  const today = todayBeijingKey();
  const [y, m, d] = key.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const [ty, tm, td] = today.split("-").map(Number);
  const todayBase = new Date(Date.UTC(ty, tm - 1, td));
  const diff = Math.round((base - todayBase) / 86400000);
  const md = `${m}月${d}日`;
  if (diff === 0) return `今天 ${md}`;
  if (diff === 1) return `明天 ${md}`;
  if (diff === -1) return `昨天 ${md}`;
  return md;
}

function favoredText(m) {
  const arr = [
    { side: cn(m.home), p: m.p_home },
    { side: "平局", p: m.p_draw },
    { side: cn(m.away), p: m.p_away },
  ].sort((a, b) => b.p - a.p);
  return `${arr[0].side} 占优(${arr[0].p}%)`;
}

function matchCard(m) {
  const card = document.createElement("div");
  card.className = "match-card";
  card.innerHTML = `
    <div class="match-head">
      <span class="kickoff">🕐 ${beijingTimeLabel(m.kickoff_utc)} 北京时间</span>
      <span class="books">${m.books_n} 家盘口</span>
    </div>
    <div class="teams">
      <span class="team home">${escapeHtml(cn(m.home))}</span>
      <span class="vs">VS</span>
      <span class="team away">${escapeHtml(cn(m.away))}</span>
    </div>
    <div class="prob-bar">
      <div class="seg win" style="flex-basis:${m.p_home}%">${m.p_home}%</div>
      <div class="seg draw" style="flex-basis:${m.p_draw}%">${m.p_draw}%</div>
      <div class="seg lose" style="flex-basis:${m.p_away}%">${m.p_away}%</div>
    </div>
    <div class="prob-legend">
      <span class="lg"><span class="dot win"></span>主胜</span>
      <span class="lg"><span class="dot draw"></span>平局</span>
      <span class="lg"><span class="dot lose"></span>客胜</span>
    </div>
    <div class="prob-legend" style="margin-top:6px">
      <span class="favored">📈 ${escapeHtml(favoredText(m))}</span>
    </div>
    ${oddsRow(m)}
  `;
  return card;
}

function oddsRow(m) {
  if (m.odd_home == null) return ""; // 旧数据无倍率时不显示
  const btn = (lbl, odd, bet) =>
    `<button class="odd-btn" data-odd="${odd}" data-bet="${escapeHtml(bet)}">
       <span>${lbl}</span><b>${odd}</b></button>`;
  return `
    <div class="odds-label">赔率(点一下带进计算器):</div>
    <div class="odds-row">
      ${btn("主胜", m.odd_home, cn(m.home) + " 胜")}
      ${btn("平局", m.odd_draw, cn(m.home) + " vs " + cn(m.away) + " 打平")}
      ${btn("客胜", m.odd_away, cn(m.away) + " 胜")}
    </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ===== 今日示例买法(全部从赔率自动算, 拿 ¥100 举例)=====
const STAKE = 100;

function favOf(m) {
  const arr = [
    { side: cn(m.home), odd: m.odd_home, p: m.p_home },
    { side: "平局", odd: m.odd_draw, p: m.p_draw },
    { side: cn(m.away), odd: m.odd_away, p: m.p_away },
  ];
  arr.sort((a, b) => b.p - a.p);
  return arr[0];
}

// 按胜率给个最可能的比分(只是示例方向, 不是预言)
function suggestScore(m) {
  const f = favOf(m);
  const strongHome = f.side === cn(m.home);
  const lead = f.p >= 80 ? "2:0" : f.p >= 68 ? "2:1" : f.p >= 58 ? "1:0" : "1:1";
  if (f.side === "平局") return "1:1";
  return strongHome ? lead : lead.split(":").reverse().join(":");
}

function moneyBox(odd) {
  const payout = STAKE * odd;
  const profit = payout - STAKE;
  return `<span class="win">中了拿回 <b>${fmtMoney(payout)}</b>,净赚 ${fmtMoney(profit)}</span>
          <span class="lose">没中亏 ${fmtMoney(STAKE)}</span>`;
}

function recCard(tag, tagCls, matchLabel, pickHtml, moneyHtml, note) {
  return `<div class="rec">
    <div class="rec-head"><span class="rec-tag ${tagCls}">${tag}</span>
      <span class="rec-match">${escapeHtml(matchLabel)}</span></div>
    <div class="rec-pick">${pickHtml}</div>
    <div class="rec-money">${moneyHtml}</div>
    ${note ? `<div class="rec-note">${note}</div>` : ""}
  </div>`;
}

function favoredSide(m) {
  return m.p_home >= m.p_away ? "home" : "away";
}

// 让球(spreads):强队让球还能赢, 倍率比直接买胜高一点
function handicapCard(x) {
  const m = x.m;
  if (m.spread_point == null) return "";
  const side = favoredSide(m);
  const pt = Math.abs(m.spread_point);
  if (pt === 0) return "";
  const team = side === "home" ? cn(m.home) : cn(m.away);
  const odd = side === "home" ? m.spread_home_odd : m.spread_away_odd;
  if (odd == null) return "";
  return recCard(
    "让球",
    "handicap",
    `${cn(m.home)} vs ${cn(m.away)} · ${beijingTimeLabel(m.kickoff_utc)}`,
    `买 <b>${team} 让${pt}球</b> 胜(倍率 ${odd})`,
    moneyBox(odd),
    `${team}先让${pt}球再算赢 → 它够强时,倍率比直接买胜更划算;但让球后赢得不够多就白搭。`
  );
}

// 大小球(totals):稳健只在强弱悬殊时推大球
function totalsCard(x) {
  const m = x.m;
  if (m.total_point == null) return "";
  const f = x.f;
  if (f.side !== "平局" && f.p >= 78 && m.over_odd != null) {
    return recCard(
      "大小球",
      "total",
      `${cn(m.home)} vs ${cn(m.away)} · ${beijingTimeLabel(m.kickoff_utc)}`,
      `买 <b>大于${m.total_point}球</b>(倍率 ${m.over_odd})`,
      moneyBox(m.over_odd),
      `${f.side}实力碾压、大概率进球多 → 偏大球(全场≥3 球)。⚠️ 弱队摆大巴闷平是大球杀手,只在悬殊场玩。`
    );
  }
  return "";
}

// 串关:稳健最多 2 串 1(两场最稳的串一起)
function parlayCard(top) {
  if (top.length < 2) return "";
  const [a, b] = top;
  const combo = +(a.f.odd * b.f.odd).toFixed(2);
  const hitRate = Math.round((a.f.p * b.f.p) / 100);
  return recCard(
    "2串1·串关",
    "parlay",
    `${cn(a.m.home)}vs${cn(a.m.away)} ＋ ${cn(b.m.home)}vs${cn(b.m.away)}`,
    `串 <b>${a.f.side}</b>@${a.f.odd} × <b>${b.f.side}</b>@${b.f.odd} = <b>${combo}倍</b>`,
    moneyBox(combo),
    `两场都猜中才算赢 → 倍率相乘更高,但中奖率也相乘(约 ${hitRate}%),比单买难。稳健<b>最多 2 串 1</b>,别串更多场。`
  );
}

function renderRecs(matches) {
  const sec = document.getElementById("recs");
  const list = document.getElementById("recsList");
  const withOdds = matches.filter((m) => m.odd_home != null);
  if (!sec || !list || withOdds.length === 0) {
    if (sec) sec.hidden = true;
    return;
  }
  // 只在还没开打的比赛里选(开球时间 > 现在)
  const now = Date.now();
  const pool = withOdds
    .filter((m) => new Date(m.kickoff_utc).getTime() > now)
    .map((m) => ({ m, f: favOf(m) }));
  const use = pool.length ? pool : withOdds.map((m) => ({ m, f: favOf(m) }));
  use.sort((a, b) => b.f.p - a.f.p);

  const safe = use[0];
  const cards = [];

  // 1) 胜平负·稳胆:最被看好的一场, 买它赢
  cards.push(
    recCard(
      "胜平负·稳胆",
      "safe",
      `${cn(safe.m.home)} vs ${cn(safe.m.away)} · ${beijingTimeLabel(safe.m.kickoff_utc)}`,
      `买 <b>${safe.f.side}</b>(胜率 ${safe.f.p}% · 倍率 ${safe.f.odd})`,
      moneyBox(safe.f.odd),
      `胜率高、倍率低 → 赢面大但赚得少。越稳的越不值钱,这就是规律。`
    )
  );
  // 2) 胜平负·性价比:胜率 55~72% 区间, 倍率适中
  const value =
    use.find((x) => x.f.p >= 55 && x.f.p <= 72) || use[Math.min(1, use.length - 1)];
  if (value && value !== safe) {
    cards.push(
      recCard(
        "胜平负·性价比",
        "value",
        `${cn(value.m.home)} vs ${cn(value.m.away)} · ${beijingTimeLabel(value.m.kickoff_utc)}`,
        `买 <b>${value.f.side}</b>(胜率 ${value.f.p}% · 倍率 ${value.f.odd})`,
        moneyBox(value.f.odd),
        `胜率没那么悬殊、倍率高一点 → 风险和回报相对平衡。`
      )
    );
  }
  // 3) 让球:用最强那场
  const hc = handicapCard(safe);
  if (hc) cards.push(hc);
  // 4) 大小球:在最悬殊的场里找(use 已按胜率降序, 取第一个 >=78% 的)
  const lop = use.find((x) => x.f.p >= 78) || safe;
  const tc = totalsCard(lop);
  if (tc) cards.push(tc);
  // 5) 比分(竞彩没有现成赔率, 给方向 + 让你去 App 看实际倍率填计算器)
  const scLine = suggestScore(safe.m);
  cards.push(
    recCard(
      "猜比分",
      "score",
      `${cn(safe.m.home)} vs ${cn(safe.m.away)} · ${beijingTimeLabel(safe.m.kickoff_utc)}`,
      `猜 <b>${scLine}</b>(${safe.f.side}赢面大,最可能这个方向)`,
      `<span class="lose">猜中赚得多、猜错亏 ${fmtMoney(STAKE)}</span>`,
      `⚠️ 比分玩法倍率盘口里没有,本页给不了精确数。强队 2:0 在竞彩通常 <b>7~10 倍</b>(¥100 猜中约赚 ¥600~900)。
       到竞彩 App 看到真实倍率后,填进上面计算器就能算出能赚多少。比分极难中,纯属娱乐。`
    )
  );
  // 6) 2串1:最稳的两场串一起
  const pc = parlayCard(use.slice(0, 2));
  if (pc) cards.push(pc);

  list.innerHTML = cards.join("");
  sec.hidden = false;
}

let GROUPED = {}; // dateKey -> [matches]
let DATE_KEYS = [];

function render(activeKey) {
  const board = document.getElementById("board");
  const tabs = document.getElementById("dateTabs");
  tabs.innerHTML = "";
  DATE_KEYS.forEach((key) => {
    const tab = document.createElement("button");
    tab.className = "date-tab" + (key === activeKey ? " active" : "");
    tab.innerHTML = `${dateTabLabel(key)}<span class="cnt">${GROUPED[key].length}场</span>`;
    tab.onclick = () => render(key);
    tabs.appendChild(tab);
  });

  board.innerHTML = "";
  const list = GROUPED[activeKey] || [];
  if (list.length === 0) {
    board.innerHTML = `<div class="state">这一天暂无世界杯比赛 🌙</div>`;
    return;
  }
  list.forEach((m) => board.appendChild(matchCard(m)));
}

// ===== 盈利计算器 =====
function fmtMoney(n) {
  return "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}
function updateCalc() {
  const stake = parseFloat(document.getElementById("stake").value);
  const odd = parseFloat(document.getElementById("odd").value);
  const out = document.getElementById("calcResult");
  if (!stake || !odd || stake <= 0 || odd <= 1) {
    out.className = "calc-result";
    out.textContent = "输入本金和倍率,自动算出能拿回多少、净赚多少";
    return;
  }
  const payout = stake * odd;
  const profit = payout - stake;
  out.className = "calc-result ok";
  out.innerHTML = `中了拿回 <b>${fmtMoney(payout)}</b> · 净赚 <b class="green">${fmtMoney(
    profit
  )}</b><br/><span class="calc-lose">没中则亏掉本金 ${fmtMoney(stake)}</span>`;
}
function bindCalc() {
  document.getElementById("stake").addEventListener("input", updateCalc);
  document.getElementById("odd").addEventListener("input", updateCalc);
  // 事件委托:点比赛卡片里的赔率按钮,自动带入倍率
  document.getElementById("board").addEventListener("click", (e) => {
    const btn = e.target.closest(".odd-btn");
    if (!btn) return;
    document.getElementById("odd").value = btn.dataset.odd;
    document.getElementById("calcBet").textContent = "已选:" + btn.dataset.bet + " @" + btn.dataset.odd;
    updateCalc();
    document.getElementById("calc").scrollIntoView({ behavior: "smooth", block: "nearest" });
    document.getElementById("stake").focus();
  });
}

async function init() {
  const board = document.getElementById("board");
  try {
    // 加时间戳避开缓存,拿最新 data.json
    const resp = await fetch("data.json?t=" + Date.now());
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();

    // 更新时间
    const upd = document.getElementById("updatedAt");
    if (data.updated_at) {
      const b = toBeijing(data.updated_at);
      upd.textContent = `最后更新:${b.getUTCFullYear()}-${String(
        b.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(b.getUTCDate()).padStart(2, "0")} ${String(
        b.getUTCHours()
      ).padStart(2, "0")}:${String(b.getUTCMinutes()).padStart(2, "0")} 北京时间`;
    }

    const matches = data.matches || [];
    if (matches.length === 0) {
      board.innerHTML = `<div class="state">近期暂无世界杯比赛盘口 🏖️</div>`;
      return;
    }

    renderRecs(matches);

    GROUPED = {};
    matches.forEach((m) => {
      const k = beijingDateKey(m.kickoff_utc);
      (GROUPED[k] = GROUPED[k] || []).push(m);
    });
    DATE_KEYS = Object.keys(GROUPED).sort();

    // 默认选"今天";今天没有就选最近的未来一天,否则第一天
    const today = todayBeijingKey();
    let active = DATE_KEYS.includes(today)
      ? today
      : DATE_KEYS.find((k) => k >= today) || DATE_KEYS[0];
    render(active);
  } catch (e) {
    board.innerHTML = `<div class="state">😵 加载失败:${escapeHtml(
      e.message
    )}<br/><br/>请稍后刷新;若刚上线请确认 GitHub Action 已生成 data.json。</div>`;
  }
}

bindCalc();
init();
