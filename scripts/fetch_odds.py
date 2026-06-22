#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拉取世界杯 2026 赔率 -> 反推去水位胜率 -> 写出 data.json

数据源: the-odds-api.com (免费档 500 次/月)
key 从环境变量 ODDS_API_KEY 读取, 绝不打印, 绝不写入产物。

产物 data.json 只含计算好的胜率, 不含 key、不含原始赔率。
通常由 GitHub Action 定时跑; 也可本地手动跑:
    ODDS_API_KEY=xxxxx python scripts/fetch_odds.py
"""
import json
import os
import sys
import urllib.request
import urllib.error
from collections import Counter, defaultdict
from datetime import datetime, timezone

SPORT_KEY = "soccer_fifa_world_cup"
# 一次请求三种盘口: 胜平负(h2h) + 让球(spreads) + 大小球(totals)
# 计费 = 盘口数 × 区域数 = 3 × 1 = 3 信用/次; 配合 6 小时一跑 => 月 ~360 次, 低于免费 500
API_URL = (
    "https://api.the-odds-api.com/v4/sports/{sport}/odds"
    "?regions=eu&markets=h2h,spreads,totals&oddsFormat=decimal&apiKey={key}"
)
# 输出到项目根目录的 data.json (脚本在 scripts/ 下)
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data.json")


def fetch_raw(api_key: str) -> list:
    """调用 the-odds-api 拿原始赔率列表。"""
    url = API_URL.format(sport=SPORT_KEY, key=api_key)
    req = urllib.request.Request(url, headers={"User-Agent": "wc2026-winrate/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        # 顺带读一下剩余额度(放日志, 不含 key)
        remaining = resp.headers.get("x-requests-remaining")
        used = resp.headers.get("x-requests-used")
        if remaining is not None:
            print(f"[odds-api] 本月已用 {used} / 剩余 {remaining} 次请求")
        return json.loads(resp.read().decode("utf-8"))


def devig_match(event: dict) -> dict | None:
    """
    对一场比赛: 每家 bookmaker 的 h2h 三项 1/赔率 去水位归一,
    再跨所有 bookmaker 平均, 得到 home/draw/away 胜率。
    返回精简后的比赛字典; 没有可用 h2h 盘口则返回 None。
    """
    home = event.get("home_team")
    away = event.get("away_team")
    if not home or not away:
        return None

    sums = {"home": 0.0, "draw": 0.0, "away": 0.0}
    odd_sums = {"home": 0.0, "draw": 0.0, "away": 0.0}  # 原始赔率(含水位)累加, 用于展示倍率
    books_n = 0

    for bm in event.get("bookmakers", []):
        market = next((m for m in bm.get("markets", []) if m.get("key") == "h2h"), None)
        if not market:
            continue
        prices = {}
        for oc in market.get("outcomes", []):
            name = oc.get("name")
            price = oc.get("price")
            if not price or price <= 1.0:
                continue
            if name == home:
                prices["home"] = price
            elif name == away:
                prices["away"] = price
            elif name == "Draw":
                prices["draw"] = price
        if len(prices) != 3:
            continue  # 三项不齐这家跳过
        imp = {k: 1.0 / v for k, v in prices.items()}
        total = sum(imp.values())  # >1, 多出来的就是水位
        for k in sums:
            sums[k] += imp[k] / total  # 去水位后的概率
            odd_sums[k] += prices[k]   # 原始赔率(玩家实际看到的倍率)
        books_n += 1

    if books_n == 0:
        return None

    p = {k: sums[k] / books_n for k in sums}
    # 防浮点误差, 归一到 1
    s = sum(p.values())
    p = {k: v / s for k, v in p.items()}

    out = {
        "home": home,
        "away": away,
        "kickoff_utc": event.get("commence_time"),
        "p_home": round(p["home"] * 100, 1),
        "p_draw": round(p["draw"] * 100, 1),
        "p_away": round(p["away"] * 100, 1),
        # 平均赔率(玩家实际倍率, 含水位), 用于页面展示和计算器自动带入
        "odd_home": round(odd_sums["home"] / books_n, 2),
        "odd_draw": round(odd_sums["draw"] / books_n, 2),
        "odd_away": round(odd_sums["away"] / books_n, 2),
        "books_n": books_n,
    }
    # 让球(spreads) + 大小球(totals): 取最主流的那条盘口线, 跨庄家平均
    out.update(parse_spreads(event, home, away))
    out.update(parse_totals(event))
    return out


def _modal_line(points: list):
    """从多家庄家的盘口线里挑最常见的那条(众数); 并列时取绝对值最小的。"""
    if not points:
        return None
    cnt = Counter(points)
    top = max(cnt.values())
    cands = [pt for pt, c in cnt.items() if c == top]
    return min(cands, key=abs)


def parse_spreads(event: dict, home: str, away: str) -> dict:
    """让球盘: 取最主流的让球线, 给出主/客两边平均赔率。无则返回空。"""
    # home_point -> {"home": [prices], "away": [prices]}
    by_point = defaultdict(lambda: {"home": [], "away": []})
    for bm in event.get("bookmakers", []):
        market = next((m for m in bm.get("markets", []) if m.get("key") == "spreads"), None)
        if not market:
            continue
        hp = ha = None
        hprice = aprice = None
        for oc in market.get("outcomes", []):
            if oc.get("name") == home:
                hp, hprice = oc.get("point"), oc.get("price")
            elif oc.get("name") == away:
                ha, aprice = oc.get("point"), oc.get("price")
        if hp is None or hprice is None or aprice is None:
            continue
        by_point[hp]["home"].append(hprice)
        by_point[hp]["away"].append(aprice)

    line = _modal_line(list(by_point.keys()))
    if line is None:
        return {}
    h = by_point[line]["home"]
    a = by_point[line]["away"]
    if not h or not a:
        return {}
    return {
        "spread_point": line,  # 主队让球数(负数=让, 如 -1.5)
        "spread_home_odd": round(sum(h) / len(h), 2),
        "spread_away_odd": round(sum(a) / len(a), 2),
    }


def parse_totals(event: dict) -> dict:
    """大小球盘: 取最主流的总进球线(常见 2.5), 给出 大/小 平均赔率。无则返回空。"""
    by_point = defaultdict(lambda: {"over": [], "under": []})
    for bm in event.get("bookmakers", []):
        market = next((m for m in bm.get("markets", []) if m.get("key") == "totals"), None)
        if not market:
            continue
        op = up = None
        oprice = uprice = None
        for oc in market.get("outcomes", []):
            if oc.get("name") == "Over":
                op, oprice = oc.get("point"), oc.get("price")
            elif oc.get("name") == "Under":
                up, uprice = oc.get("point"), oc.get("price")
        pt = op if op is not None else up
        if pt is None or oprice is None or uprice is None:
            continue
        by_point[pt]["over"].append(oprice)
        by_point[pt]["under"].append(uprice)

    # 总进球数取最常见的线(并列时取最接近 2.5 的)
    if not by_point:
        return {}
    cnt = Counter({pt: len(v["over"]) for pt, v in by_point.items()})
    top = max(cnt.values())
    cands = [pt for pt, c in cnt.items() if c == top]
    line = min(cands, key=lambda x: abs(x - 2.5))
    o = by_point[line]["over"]
    u = by_point[line]["under"]
    if not o or not u:
        return {}
    return {
        "total_point": line,  # 大小球分界线(如 2.5)
        "over_odd": round(sum(o) / len(o), 2),
        "under_odd": round(sum(u) / len(u), 2),
    }


def main() -> int:
    api_key = os.environ.get("ODDS_API_KEY", "").strip()
    if not api_key:
        print("错误: 未设置环境变量 ODDS_API_KEY", file=sys.stderr)
        return 2

    try:
        raw = fetch_raw(api_key)
    except urllib.error.HTTPError as e:
        # 401 key 无效 / 429 额度耗尽 等; 不打印 url(含 key)
        print(f"错误: API 返回 HTTP {e.code} {e.reason}", file=sys.stderr)
        return 1
    except urllib.error.URLError as e:
        print(f"错误: 网络请求失败 {e.reason}", file=sys.stderr)
        return 1

    matches = []
    for event in raw:
        m = devig_match(event)
        if m:
            matches.append(m)
    # 按开球时间升序
    matches.sort(key=lambda x: x["kickoff_utc"] or "")

    out = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "the-odds-api.com (h2h, eu bookmakers, 去水位均值)",
        "count": len(matches),
        "matches": matches,
    }
    with open(os.path.normpath(OUT_PATH), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"已写出 {len(matches)} 场比赛 -> data.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
