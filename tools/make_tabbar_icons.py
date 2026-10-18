"""生成 tabBar 线性图标（81x81）：先按 324px 设计稿绘制，再降采样，保证边缘平滑。

用法：python tools/make_tabbar_icons.py
输出：assets/tabbar/{home,form,records}[-on].png
"""
import os
from PIL import Image, ImageDraw

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(PROJECT_ROOT, "assets", "tabbar")
os.makedirs(OUT, exist_ok=True)

DESIGN = 324        # 设计稿边长
FINAL = 81          # tabBar 图标边长
STROKE = 20         # 设计稿线宽

NORMAL = (139, 150, 143, 255)
ACTIVE = (31, 75, 67, 255)


def canvas():
    img = Image.new("RGBA", (DESIGN, DESIGN), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def draw_home(d, color):
    d.line([(46, 150), (162, 58), (278, 150)], fill=color, width=STROKE, joint="curve")
    d.line([(74, 148), (74, 262)], fill=color, width=STROKE)
    d.line([(250, 148), (250, 262)], fill=color, width=STROKE)
    d.line([(74, 262), (250, 262)], fill=color, width=STROKE)
    d.line([(140, 262), (140, 206), (184, 206), (184, 262)],
           fill=color, width=STROKE, joint="curve")


def draw_form(d, color):
    d.rounded_rectangle([(60, 52), (264, 270)], radius=88, outline=color, width=STROKE)
    d.line([(110, 122), (214, 122)], fill=color, width=STROKE)
    d.line([(110, 166), (214, 166)], fill=color, width=STROKE)
    d.line([(110, 210), (172, 210)], fill=color, width=STROKE)


def draw_records(d, color):
    for y in (112, 166, 220):
        d.ellipse([(66, y - 8), (82, y + 8)], fill=color)
        d.line([(112, y), (248, y)], fill=color, width=STROKE)


JOBS = [
    ("home", draw_home),
    ("form", draw_form),
    ("records", draw_records),
]

for name, painter in JOBS:
    for suffix, color in (("", NORMAL), ("-on", ACTIVE)):
        img, draw = canvas()
        painter(draw, color)
        img = img.resize((FINAL, FINAL), Image.LANCZOS)
        path = os.path.join(OUT, name + suffix + ".png")
        img.save(path, "PNG", optimize=True)
        print("written", path, os.path.getsize(path), "bytes")
