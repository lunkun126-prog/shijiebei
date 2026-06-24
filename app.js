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

// 诚实解读:把"市场胜率"和"回本胜率"摆一起,差值就是长期要交的水
function honestLine(m) {
  const f = favOf(m); // {side, odd, p}
  if (f.odd == null) return `市场看好 <b>${escapeHtml(f.side)} ${f.p}%</b>(暂无倍率)`;
  const be = +(100 / f.odd).toFixed(1);
  const gap = +(be - f.p).toFixed(1);
  let verdict;
  if (gap > 0) verdict = `,但要赢 <b>${be}%</b> 才回本(比市场高 ${gap} 个点)→ 长期亏`;
  else if (gap < 0) verdict = `,回本线仅 <b>${be}%</b>(比市场低 ${Math.abs(gap)} 点)→ 理论略有价值`;
  else verdict = `,回本线也 <b>${be}%</b> → 长期基本持平`;
  return `市场看好 <b>${escapeHtml(f.side)} ${f.p}%</b>,倍率 ${f.odd}${verdict}。竞彩实开更低,回本更难。`;
}

// ===== 竞彩手填赔率(C5)+ 价值扫描(C7)=====
// 竞彩单场固定奖金、赔率公布后不变, 每天仅 4–6 场, 手填完全可行。
// 数据来自仓库里的 jingcai.json(键 = 北京日期|主队英文|客队英文), 站长日更一次提交,
// 朋友刷新即可看到。打开 页面#luru 有录入面板自动生成这段 JSON。
let JINGCAI = {};
const VALUE_THRESHOLD = 0.03; // 价值% ≥ +3% 才标"有价值", 留安全垫避免噪声

function jcKey(m) {
  return `${beijingDateKey(m.kickoff_utc)}|${m.home}|${m.away}`;
}
function jcOf(m) {
  return JINGCAI[jcKey(m)] || null;
}

// ===== 赛后对照(results.json)=====
// 键同 jcKey, 值 { hs, as, note?, provisional? }(hs/as=主/客进球数)。
// 站长赛后日更提交 results.json, 前端把"赛前测算"和"真实赛果"摆一起看命中。
let RESULTS = {};
function resOf(m) {
  return RESULTS[jcKey(m)] || null;
}
// 比分 -> 胜负方
function outcomeOf(hs, as) {
  return hs > as ? "home" : hs < as ? "away" : "draw";
}
// 模型当时最看好的结果(取三概率最大者), 返回 'home'|'draw'|'away'
function favOutcome(m) {
  const arr = [
    ["home", m.p_home],
    ["draw", m.p_draw],
    ["away", m.p_away],
  ].sort((a, b) => b[1] - a[1]);
  return arr[0][0];
}
// 某结果的中文标签 + 该结果的市场概率
function outcomeLabel(m, oc) {
  if (oc === "home") return { name: cn(m.home) + " 胜", p: m.p_home };
  if (oc === "away") return { name: cn(m.away) + " 胜", p: m.p_away };
  return { name: "平局", p: m.p_draw };
}

// 单个结果的价值:公平概率(Pinnacle 去水位)× 你实际能拿到的赔率 − 1
// 实际赔率优先用竞彩(你真去买的), 没填则退回国际盘均值
function valueOf(p, marketOdd, jcOdd) {
  const jc = jcOdd != null && jcOdd > 1 ? jcOdd : null;
  const betOdd = jc != null ? jc : marketOdd;
  const fairOdd = +(100 / p).toFixed(2);          // 公平赔率 = 1/公平概率
  const value = +((p / 100) * betOdd - 1).toFixed(3); // EV 比例(>0 才理论占便宜)
  return { betOdd, jc, fairOdd, value, isValue: value >= VALUE_THRESHOLD };
}
// 一场比赛三个结果里有没有"有价值"的(用于卡片绿边/角标)
function cardHasValue(m) {
  if (m.odd_home == null) return false;
  const jc = jcOf(m);
  return (
    valueOf(m.p_home, m.odd_home, jc && jc.home).isValue ||
    valueOf(m.p_draw, m.odd_draw, jc && jc.draw).isValue ||
    valueOf(m.p_away, m.odd_away, jc && jc.away).isValue
  );
}

// 赛后对照条:有真实赛果才显示, 把"模型看好"和"实际结果"摆一起标命中/爆冷
function resultRow(m) {
  const r = resOf(m);
  if (!r || r.hs == null || r.as == null) return "";
  const actual = outcomeOf(r.hs, r.as);
  const fav = favOutcome(m);
  const hit = actual === fav;
  const favL = outcomeLabel(m, fav);
  const actL = outcomeLabel(m, actual);
  const prov = r.provisional ? `<span class="res-prov">待核实</span>` : "";
  const note = r.note ? `<div class="res-note">${escapeHtml(r.note)}</div>` : "";
  const badge = hit
    ? `<span class="res-badge res-hit">✓ 命中</span>`
    : `<span class="res-badge res-miss">✗ 爆冷</span>`;
  const verdict = hit
    ? `模型看好 <b>${escapeHtml(favL.name)}(${favL.p}%)</b>,实际 <b>${escapeHtml(actL.name)}</b> —— 方向对了。`
    : `模型看好 <b>${escapeHtml(favL.name)}(${favL.p}%)</b>,实际却是 <b>${escapeHtml(actL.name)}</b> —— 大热没踢出来。`;
  return `
    <div class="result-row ${hit ? "is-hit" : "is-miss"}">
      <div class="res-head">
        <span class="res-title">🏁 赛后对照</span>${badge}
      </div>
      <div class="res-score">
        <span class="rs-team">${escapeHtml(cn(m.home))}</span>
        <span class="rs-num">${r.hs}</span><span class="rs-dash">-</span><span class="rs-num">${r.as}</span>
        <span class="rs-team">${escapeHtml(cn(m.away))}</span>${prov}
      </div>
      <div class="res-verdict">${verdict}</div>
      ${note}
    </div>`;
}

function matchCard(m) {
  const card = document.createElement("div");
  const hasValue = cardHasValue(m);
  const r = resOf(m);
  const resCls = r && r.hs != null ? (outcomeOf(r.hs, r.as) === favOutcome(m) ? " has-result hit" : " has-result miss") : "";
  card.className = "match-card" + (hasValue ? " has-value" : "") + resCls;
  // C4:三段同一灰蓝, 深浅(alpha)随概率, 不再用红绿暗示胜负
  const seg = (p) =>
    `<div class="seg" style="flex-basis:${p}%;--depth:${(0.3 + 0.6 * p / 100).toFixed(3)}">${p}%</div>`;
  const fairBadge = m.fair_src === "pinnacle" ? "Pinnacle基准" : "均值基准";
  card.innerHTML = `
    <div class="match-head">
      <span class="kickoff">🕐 ${beijingTimeLabel(m.kickoff_utc)} 北京时间</span>
      <span class="books">${fairBadge} · ${m.books_n}家</span>
    </div>
    ${hasValue ? `<span class="value-flag">✓ 有价值注</span>` : ""}
    <div class="teams">
      <span class="team home">${escapeHtml(cn(m.home))}</span>
      <span class="vs">VS</span>
      <span class="team away">${escapeHtml(cn(m.away))}</span>
    </div>
    <div class="prob-bar">${seg(m.p_home)}${seg(m.p_draw)}${seg(m.p_away)}</div>
    <div class="prob-legend">条宽=市场胜率(左 主胜 · 中 平 · 右 客胜)· 颜色不分胜负</div>
    <div class="honest">📊 ${honestLine(m)}</div>
    ${oddsRow(m)}
    ${resultRow(m)}
  `;
  return card;
}

// 回本胜率 = 1/赔率:要赢这个比例才不亏(和市场胜率一对比就懂)
function breakeven(odd) {
  return +(100 / odd).toFixed(1);
}

function oddsRow(m) {
  if (m.odd_home == null) return ""; // 旧数据无倍率时不显示
  const jc = jcOf(m);
  // 每个赔率带:实开倍率(竞彩优先/标"竞", 没填用国际盘/标"盘") + 回本% + 价值%
  const btn = (lbl, marketOdd, jcOdd, bet, p) => {
    const v = valueOf(p, marketOdd, jcOdd);
    const be = breakeven(v.betOdd);
    const bad = be > p; // 回本线比胜率还高 = 长期亏
    const tag = v.jc != null ? "竞" : "盘";
    const pct = Math.round(v.value * 100);
    const valBadge = v.isValue
      ? `<i class="ob-val good">价值+${pct}%</i>`
      : `<i class="ob-val">水位${pct}%</i>`;
    return `<button class="odd-btn ${bad ? "ob-bad" : "ob-good"} ${v.isValue ? "ob-value" : ""}" data-odd="${v.betOdd}" data-p="${p}" data-bet="${escapeHtml(bet)}" title="公平赔率约 ${v.fairOdd} · 点我试算这一注能赚多少">
       <span class="ob-lbl">${lbl}</span>
       <b>${v.betOdd}<span class="ob-tag">${tag}</span></b>
       <i class="ob-be">回本${be}%</i>
       ${valBadge}
     </button>`;
  };
  const foot = jc
    ? `上排已填<b>竞彩</b>实开(标"竞")。`
    : `<b>竞彩未填</b>,暂用<b>国际盘</b>均值(标"盘",竞彩实际更低)。`;
  return `
    <div class="odds-label">💡 点任意赔率自动试算 · <span class="ob-legend">竞=竞彩 盘=国际盘 · 绿=有价值(+EV)</span></div>
    <div class="odds-row">
      ${btn("主胜", m.odd_home, jc && jc.home, cn(m.home) + " 胜", m.p_home)}
      ${btn("平局", m.odd_draw, jc && jc.draw, cn(m.home) + " vs " + cn(m.away) + " 打平", m.p_draw)}
      ${btn("客胜", m.odd_away, jc && jc.away, cn(m.away) + " 胜", m.p_away)}
    </div>
    <div class="odds-foot">${foot}<b>价值% = 公平胜率 × 你能拿到的赔率 − 1</b>:正的(≥+3%标绿)才理论占便宜,负的就是要交的水位。回本% 比市场胜率还高也是长期亏。</div>`;
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
  return `<span class="win">中 <b>${fmtMoney(payout)}</b>·赚 ${fmtMoney(profit)}</span>
          <span class="lose">没中 -${fmtMoney(STAKE)}</span>`;
}

function recCard(tag, tagCls, matchLabel, pickHtml, moneyHtml, note) {
  return `<div class="rec ${tagCls}">
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
    `让球后还能赢,倍率比直接买胜高。`
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
      `强队碾压偏大球;弱队闷平是杀手,只悬殊场玩。`
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
    `两场全中才算赢,中奖率约 ${hitRate}%。稳健最多 2 串 1。`
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
      "高胜率·低回报",
      "safe",
      `${cn(safe.m.home)} vs ${cn(safe.m.away)} · ${beijingTimeLabel(safe.m.kickoff_utc)}`,
      `买 <b>${safe.f.side}</b>(市场胜率 ${safe.f.p}% · 倍率 ${safe.f.odd} · 回本 ${breakeven(safe.f.odd)}%)`,
      moneyBox(safe.f.odd),
      `没有"稳赢":赢面大但倍率低,回本线常和胜率贴得很近,长期是负期望。`
    )
  );
  // 2) 胜平负·性价比:胜率 55~72% 区间, 倍率适中
  const value =
    use.find((x) => x.f.p >= 55 && x.f.p <= 72) || use[Math.min(1, use.length - 1)];
  if (value && value !== safe) {
    cards.push(
      recCard(
        "中胜率·中回报",
        "value",
        `${cn(value.m.home)} vs ${cn(value.m.away)} · ${beijingTimeLabel(value.m.kickoff_utc)}`,
        `若买 <b>${value.f.side}</b>(市场胜率 ${value.f.p}% · 倍率 ${value.f.odd} · 回本 ${breakeven(value.f.odd)}%)`,
        moneyBox(value.f.odd),
        `胜率倍率较平衡;回本线仍贴着胜率,长期期望多为负,娱乐看待。`
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
      `猜 <b>${scLine}</b>(${safe.f.side}赢面大)`,
      `<span class="lose">猜中赚得多 · 猜错 -${fmtMoney(STAKE)}</span>`,
      `竞彩约 7~10 倍,去 App 看真倍率填上方计算器算。极难中,娱乐。`
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
  // C7:价值扫描日条 —— 数这一天有几注理论有价值
  let valCount = 0;
  list.forEach((m) => {
    if (m.odd_home == null) return;
    const jc = jcOf(m);
    [
      [m.p_home, m.odd_home, jc && jc.home],
      [m.p_draw, m.odd_draw, jc && jc.draw],
      [m.p_away, m.odd_away, jc && jc.away],
    ].forEach(([p, mo, jo]) => {
      if (valueOf(p, mo, jo).isValue) valCount++;
    });
  });
  const banner = document.createElement("div");
  banner.className = "val-banner";
  banner.innerHTML = valCount
    ? `🔎 价值扫描:这一天 ${list.length} 场里发现 <b>${valCount}</b> 注理论有价值(公平胜率 × 可下注赔率 ≥ +3%),已用<b>绿色</b>标出。仍非稳赢,只是长期占一点便宜。`
    : `🔎 价值扫描:这一天 ${list.length} 场<b>没扫到</b>有价值的注 —— 这很正常,绝大多数注长期都是负期望(在交水位)。`;
  board.appendChild(banner);

  // 赛后对照汇总:当天有出结果的场就数命中率
  const played = list.filter((m) => {
    const r = resOf(m);
    return r && r.hs != null && r.as != null;
  });
  if (played.length) {
    const hits = played.filter((m) => outcomeOf(resOf(m).hs, resOf(m).as) === favOutcome(m)).length;
    const recap = document.createElement("div");
    recap.className = "recap-banner";
    recap.innerHTML = `🏁 赛后对照:这一天 <b>${played.length}</b> 场已出结果,模型胜负命中 <b>${hits}/${played.length}</b>。下方每张卡片底部有逐场对照(✓命中 / ✗爆冷)。`;
    board.appendChild(recap);
  }

  list.forEach((m) => board.appendChild(matchCard(m)));
}

// ===== 竞彩录入面板(打开 页面#luru 出现, 站长用)=====
function maybeRenderAdmin(matches) {
  if (location.hash !== "#luru") return false;
  const board = document.getElementById("board");
  const tabs = document.getElementById("dateTabs");
  if (tabs) tabs.innerHTML = "";
  const rows = matches
    .slice()
    .sort((a, b) => (a.kickoff_utc < b.kickoff_utc ? -1 : 1))
    .map((m) => {
      const k = jcKey(m);
      const jc = JINGCAI[k] || {};
      return `<tr data-k="${escapeHtml(k)}">
        <td>${beijingDateKey(m.kickoff_utc).slice(5)} ${beijingTimeLabel(m.kickoff_utc)}<br>${escapeHtml(cn(m.home))} vs ${escapeHtml(cn(m.away))}</td>
        <td><input type="number" step="0.01" min="1" class="jc-h" value="${jc.home ?? ""}" placeholder="盘${m.odd_home ?? "-"}"></td>
        <td><input type="number" step="0.01" min="1" class="jc-d" value="${jc.draw ?? ""}" placeholder="盘${m.odd_draw ?? "-"}"></td>
        <td><input type="number" step="0.01" min="1" class="jc-a" value="${jc.away ?? ""}" placeholder="盘${m.odd_away ?? "-"}"></td>
      </tr>`;
    })
    .join("");
  board.innerHTML = `<div class="admin">
    <h2>🎯 竞彩赔率录入</h2>
    <p>对照竞彩 App 把每场<b>实际赔率</b>填进去(主/平/客),灰色占位是国际盘参考。填好点下面按钮生成 JSON,整段复制覆盖到仓库 <code>jingcai.json</code> 提交即可 —— 朋友刷新就能看到真实竞彩价值。留空=该项不显示竞彩、回退国际盘。</p>
    <table class="admin-tbl"><thead><tr><th>比赛(北京时间)</th><th>主胜</th><th>平</th><th>客胜</th></tr></thead><tbody>${rows}</tbody></table>
    <button id="jcGen" class="jc-gen">生成 jingcai.json</button>
    <textarea id="jcOut" class="jc-out" readonly placeholder="点上面按钮,这里出现要提交的内容…"></textarea>
  </div>`;
  document.getElementById("jcGen").addEventListener("click", () => {
    const obj = {};
    board.querySelectorAll("tr[data-k]").forEach((tr) => {
      const k = tr.getAttribute("data-k");
      const e = {};
      const h = parseFloat(tr.querySelector(".jc-h").value);
      const d = parseFloat(tr.querySelector(".jc-d").value);
      const a = parseFloat(tr.querySelector(".jc-a").value);
      if (h > 1) e.home = h;
      if (d > 1) e.draw = d;
      if (a > 1) e.away = a;
      if (Object.keys(e).length) obj[k] = e;
    });
    document.getElementById("jcOut").value = JSON.stringify(obj, null, 2);
  });
  return true;
}

// ===== 盈利计算器 =====
let CUR_BET = null; // {p, odd} 最近从赔率按钮带入的, 用于算"长期期望"(硬币另一面)
function fmtMoney(n) {
  return "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}
function updateCalc() {
  const stake = parseFloat(document.getElementById("stake").value);
  const odd = parseFloat(document.getElementById("odd").value);
  const out = document.getElementById("calcResult");
  if (!stake || !odd || stake <= 0 || odd <= 1) {
    out.className = "calc-result";
    out.textContent = "👆 点下面任意赔率,自动帮你算这一注能赚多少";
    return;
  }
  const payout = stake * odd;
  const profit = payout - stake;
  // 长期期望:只有从赔率按钮带入(知道市场概率)时才算得出
  let evHtml;
  if (CUR_BET && Math.abs(CUR_BET.odd - odd) < 1e-9) {
    const p = CUR_BET.p / 100;
    const expReturn = stake * odd * p; // 长期平均能拿回
    const ev = expReturn - stake;      // 长期平均盈亏(几乎总是负)
    const sign = ev >= 0 ? "赚" : "亏";
    const cls = ev >= 0 ? "green" : "calc-lose";
    evHtml = `<div class="calc-ev">📉 按市场概率(${CUR_BET.p}%),这注 ${fmtMoney(stake)} 长期期望约 <b>${fmtMoney(
      expReturn
    )}</b>(平均每注${sign} <b class="${cls}">${fmtMoney(Math.abs(ev))}</b>)
      <span class="calc-ev-note">上面的净赚是"中了"的上限,这才是硬币另一面;竞彩赔率更低,实际更差。</span></div>`;
  } else {
    evHtml = `<div class="calc-ev calc-ev-hint">想看「长期期望」?去比赛里点一个赔率带进来,按市场胜率帮你算硬币另一面。</div>`;
  }
  out.className = "calc-result ok";
  out.innerHTML = `中了拿回 <b>${fmtMoney(payout)}</b> · 净赚 <b class="green">${fmtMoney(
    profit
  )}</b><br/><span class="calc-lose">没中则亏掉本金 ${fmtMoney(stake)}</span>${evHtml}`;
}
// 窄屏(<1320px)=抽屉形态;宽屏=右侧常驻侧栏
function isSheetMode() {
  return window.matchMedia("(max-width: 1319px)").matches;
}
function openCalc() {
  document.body.classList.add("calc-open");
}
function closeCalc() {
  document.body.classList.remove("calc-open");
}

function bindCalc() {
  document.getElementById("stake").addEventListener("input", updateCalc);
  // 手动改倍率 → 失去市场概率, 不显示长期期望
  document.getElementById("odd").addEventListener("input", () => { CUR_BET = null; updateCalc(); });

  // 悬浮按钮 / 关闭 / 遮罩 / Esc
  const fab = document.getElementById("calcFab");
  const closeBtn = document.getElementById("calcClose");
  const backdrop = document.getElementById("calcBackdrop");
  if (fab) fab.addEventListener("click", () => {
    openCalc();
    dismissBubble();
    document.getElementById("stake").focus();
  });
  if (closeBtn) closeBtn.addEventListener("click", closeCalc);
  if (backdrop) backdrop.addEventListener("click", closeCalc);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCalc(); });

  // 事件委托:点比赛卡片里的赔率按钮,自动带入倍率
  document.getElementById("board").addEventListener("click", (e) => {
    const btn = e.target.closest(".odd-btn");
    if (!btn) return;
    document.getElementById("odd").value = btn.dataset.odd;
    CUR_BET = { p: parseFloat(btn.dataset.p), odd: parseFloat(btn.dataset.odd) };
    document.getElementById("calcBet").textContent = "已选:" + btn.dataset.bet + " @" + btn.dataset.odd;
    updateCalc();
    dismissBubble();
    if (isSheetMode()) {
      openCalc(); // 手机:从底部弹出抽屉
    } else {
      document.getElementById("calc").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    document.getElementById("stake").focus();
  });
}

// ===== 首次访问引导气泡(localStorage 只提示一次)=====
function dismissBubble() {
  const b = document.getElementById("calcBubble");
  if (b) b.remove();
  try { localStorage.setItem("wc_calc_hint", "1"); } catch (e) {}
}
function showFirstVisitBubble() {
  try { if (localStorage.getItem("wc_calc_hint")) return; } catch (e) { return; }
  const sheet = window.matchMedia("(max-width: 1319px)").matches;
  const b = document.createElement("div");
  b.id = "calcBubble";
  b.className = "calc-bubble " + (sheet ? "m" : "d");
  b.innerHTML = sheet
    ? `💰 想知道这场能赚多少?<br/>点右下角 <b>试算</b> 按钮,或直接点任意赔率自动算。<span class="bub-close">知道了</span>`
    : `💰 右边是<b>盈利计算器</b> →<br/>点任意比赛的赔率,自动算你这一注能赚多少。<span class="bub-close">知道了</span>`;
  document.body.appendChild(b);
  b.querySelector(".bub-close").addEventListener("click", dismissBubble);
  setTimeout(() => { const x = document.getElementById("calcBubble"); if (x) x.remove(); }, 13000);
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

    // 竞彩手填赔率(可选;没有 jingcai.json 也不报错, 回退国际盘)
    try {
      const jr = await fetch("jingcai.json?t=" + Date.now());
      if (jr.ok) JINGCAI = await jr.json();
    } catch (e) { /* 没填就算了 */ }

    // 赛后真实赛果(可选;没有 results.json 也不报错, 不显示对照)
    try {
      const rr = await fetch("results.json?t=" + Date.now());
      if (rr.ok) RESULTS = await rr.json();
    } catch (e) { /* 还没出结果就算了 */ }

    // 录入模式:打开 #luru 直接出录入面板, 不渲染看板
    if (maybeRenderAdmin(matches)) return;

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
showFirstVisitBubble();
// 站长录入面板:#luru 进出时重渲染
window.addEventListener("hashchange", () => init());
