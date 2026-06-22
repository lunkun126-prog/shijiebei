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
