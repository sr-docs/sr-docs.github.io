"""Resize card and blog rasters in assets/img and write WebP companions."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "assets" / "img"

CARD_MAX = 1000
BLOG_MAX = 1400
QUALITY = 80
CARD_STEMS = {
    "docs-ecosystem-playground",
    "nimbuswiz-portal-light",
    "nimbuswiz-portal-dark",
    "interactive-ia",
}
RASTER_EXTS = {".png", ".jpg", ".jpeg"}


def to_webp_source(im: Image.Image) -> Image.Image:
    if im.mode in {"RGBA", "LA"} or (im.mode == "P" and "transparency" in im.info):
        rgba = im.convert("RGBA")
        alpha = rgba.getchannel("A")
        if alpha.getextrema()[0] == 255:
            return rgba.convert("RGB")
        return rgba
    return im.convert("RGB")


def optimize(src: Path) -> tuple[int, int, int, int]:
    dest = src.with_suffix(".webp")
    max_w = CARD_MAX if src.stem in CARD_STEMS else BLOG_MAX
    with Image.open(src) as im:
        converted = to_webp_source(im)
        width, height = converted.size
        if width > max_w:
            height = round(height * max_w / width)
            width = max_w
            converted = converted.resize((width, height), Image.Resampling.LANCZOS)
        converted.save(dest, "WEBP", quality=QUALITY, method=6)
    before = src.stat().st_size
    after = dest.stat().st_size
    if after >= before:
        dest.unlink(missing_ok=True)
        return before, before, width, height
    src.unlink()
    return before, after, width, height


def main() -> int:
    if not IMG_DIR.is_dir():
        print(f"Missing {IMG_DIR}", file=sys.stderr)
        return 1

    rows = []
    for src in sorted(IMG_DIR.iterdir()):
        if src.suffix.lower() not in RASTER_EXTS:
            continue
        before, after, width, height = optimize(src)
        rows.append((src.name, before, after, width, height))
        dest = src.with_suffix(".webp")
        if dest.exists() and after < before:
            label = f"{src.stem}.webp {after / 1024:6.0f} KiB"
        else:
            label = "kept original (WebP not smaller)"
        print(f"{src.name:40} {before / 1024:7.0f} KiB -> {label}  {width}x{height}")

    if not rows:
        print("No raster images found")
        return 0

    before_total = sum(r[1] for r in rows)
    after_total = sum(r[2] for r in rows)
    print(
        f"\nTotal  {before_total / 1024:.0f} KiB -> {after_total / 1024:.0f} KiB "
        f"({(1 - after_total / before_total) * 100:.0f}% smaller)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
