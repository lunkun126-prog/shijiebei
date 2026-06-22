# -*- coding: utf-8 -*-
"""把一张照片压缩 + 裁成圆形 + 贴经典足球黑色五边形拼块 -> assets/ball.png
用法: python scripts/make_ball.py <源图路径>
"""
import math
import os
import sys
from PIL import Image, ImageDraw

SIZE = 560  # 成品球直径(像素)
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "ball.png")


def regular_polygon(cx, cy, r, n, start_deg):
    """生成正 n 边形顶点; start_deg 为第一个顶点的角度(0=右,-90=上)。"""
    pts = []
    for i in range(n):
        a = math.radians(start_deg + i * (360 / n))
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def main():
    if len(sys.argv) < 2:
        print("缺少源图路径")
        return 1
    src = sys.argv[1]

    # 1. 压缩: 居中正方形裁切 + 缩放到 SIZE
    im = Image.open(src).convert("RGB")
    w, h = im.size
    side = min(w, h)
    im = im.crop(((w - side) // 2, (h - side) // 2,
                  (w - side) // 2 + side, (h - side) // 2 + side))
    im = im.resize((SIZE, SIZE), Image.LANCZOS)

    # 轻微提亮, 让它更像球面(后面页面还会再降到 30% 透明)
    base = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    base.paste(im, (0, 0))

    # 2. 画足球黑色五边形拼块(半透明黑, 叠在照片上)
    overlay = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    R = SIZE / 2
    cx, cy = R, R
    blk = (15, 15, 20, 235)

    # 中央五边形(尖朝上)
    central = regular_polygon(cx, cy, R * 0.26, 5, -90)
    od.polygon(central, fill=blk)

    # 5 个外圈五边形(对准中央五边形的"边", 尖朝外)
    for i in range(5):
        ang = -90 + 36 + i * 72  # 边中点方向
        ox = cx + R * 0.72 * math.cos(math.radians(ang))
        oy = cy + R * 0.72 * math.sin(math.radians(ang))
        outer = regular_polygon(ox, oy, R * 0.2, 5, ang)
        od.polygon(outer, fill=blk)
        # 拼缝: 中央顶点 -> 外圈
        od.line([(cx + R * 0.26 * math.cos(math.radians(-90 + i * 72)),
                  cy + R * 0.26 * math.sin(math.radians(-90 + i * 72))),
                 (ox, oy)], fill=(20, 20, 25, 160), width=3)

    combined = Image.alpha_composite(base, overlay)

    # 3. 圆形遮罩(裁成球)+ 白色描边
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).ellipse([2, 2, SIZE - 2, SIZE - 2], fill=255)
    result = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    result.paste(combined, (0, 0), mask)
    # 白色高光描边
    ImageDraw.Draw(result).ellipse([2, 2, SIZE - 2, SIZE - 2],
                                   outline=(255, 255, 255, 200), width=5)

    os.makedirs(os.path.dirname(os.path.normpath(OUT)), exist_ok=True)
    result.save(os.path.normpath(OUT), "PNG", optimize=True)
    kb = os.path.getsize(os.path.normpath(OUT)) / 1024
    print(f"已生成 {OUT}  ({SIZE}x{SIZE}, {kb:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
