// 世界杯 2026 胜率看板前端
// 读 data.json -> 按北京时间(UTC+8)分组到日期 -> 默认显示"今天" -> 渲染卡片

const CN_TZ_OFFSET = 8 * 60; // 北京时间 UTC+8(分钟)

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
    { side: m.home, p: m.p_home },
    { side: "平局", p: m.p_draw },
    { side: m.away, p: m.p_away },
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
      <span class="team home">${escapeHtml(m.home)}</span>
      <span class="vs">VS</span>
      <span class="team away">${escapeHtml(m.away)}</span>
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
  `;
  return card;
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

init();
