"""One-off asset optimizer: downscale + convert to WebP.

Run:  python _tools/optimize_images.py
Safe to re-run; outputs are overwritten deterministically.
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "img")
PROJ = os.path.join(OUT, "projects")


def portrait(src, dst, max_w=1100, q=82):
    """Portraits keep their 3:4 ratio so layout math stays stable."""
    im = Image.open(os.path.join(ROOT, src)).convert("RGB")
    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    im.save(os.path.join(OUT, dst), "WEBP", quality=q, method=6)
    print(f"{src} -> assets/img/{dst}  {im.size[0]}x{im.size[1]}  {os.path.getsize(os.path.join(OUT, dst)) // 1024} KB")


def wide(src, dst, ratio=16 / 10, max_w=1400, q=80):
    """Gallery art is centre-cropped to a consistent 16:10 so the
    horizontal showcase never shows mismatched panel heights."""
    im = Image.open(os.path.join(ROOT, src)).convert("RGB")
    w, h = im.size
    want = h * ratio
    if w > want:
        left = (w - want) // 2
        im = im.crop((round(left), 0, round(left + want), h))
    else:
        top = (h - want / ratio) / 2
        im = im.crop((0, round(top), w, round(top + want / ratio)))
    if im.width > max_w:
        h2 = round(im.height * max_w / im.width)
        im = im.resize((max_w, h2), Image.LANCZOS)
    im.save(os.path.join(PROJ, dst), "WEBP", quality=q, method=6)
    print(f"{src} -> projects/{dst}  {im.size[0]}x{im.size[1]}  {os.path.getsize(os.path.join(PROJ, dst)) // 1024} KB")


def blur_preview(src, dst, size=48):
    """Tiny blurred preview used to build the CSS placeholder gradient."""
    im = Image.open(os.path.join(ROOT, src)).convert("RGB")
    im.thumbnail((size, size), Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(6))
    im.save(os.path.join(OUT, dst), "WEBP", quality=40, method=6)


if __name__ == "__main__":
    os.makedirs(PROJ, exist_ok=True)

    portrait("12.png", "hero.webp")
    portrait("Amjad.png", "about.webp")

    wide("assets/img/projects/_tmp1.jpg", "business-dashboard.webp")
    wide("assets/img/projects/_tmp2.jpg", "interactive-dashboard.webp")
    wide("123.PNG", "mobile-store.webp")

    # cleanup downloaded sources
    for tmp in ("_tmp1.jpg", "_tmp2.jpg"):
        p = os.path.join(PROJ, tmp)
        if os.path.exists(p):
            os.remove(p)

    total = 0
    for dirpath, _, files in os.walk(OUT):
        for f in files:
            total += os.path.getsize(os.path.join(dirpath, f))
    print(f"\nTotal optimized asset weight: {total // 1024} KB")
