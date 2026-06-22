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
from datetime import datetime, timezone

SPORT_KEY = "soccer_fifa_world_cup"
API_URL = (
    "https://api.the-odds-api.com/v4/sports/{sport}/odds"
    "?regions=eu&markets=h2h&oddsFormat=decimal&apiKey={key}"
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

    return {
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
