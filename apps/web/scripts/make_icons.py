"""Generate PWA icons (shield + check on teal). Usage: python scripts/make_icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw
out = Path(__file__).resolve().parent.parent / "public" / "icons"; out.mkdir(parents=True, exist_ok=True)
def icon(size, pad_ratio, name, rounded=True):
    S = size * 4; im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    bg = (15, 118, 110, 255)
    if rounded: d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=bg)
    else: d.rectangle([0, 0, S, S], fill=bg)
    p = pad_ratio; w = S * (1 - 2 * p); x0, y0 = S * p, S * p
    pts = [(x0 + w * 0.5, y0), (x0 + w, y0 + w * 0.18), (x0 + w * 0.92, y0 + w * 0.62), (x0 + w * 0.5, y0 + w), (x0 + w * 0.08, y0 + w * 0.62), (x0, y0 + w * 0.18)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    ck = [(x0 + w * 0.28, y0 + w * 0.50), (x0 + w * 0.45, y0 + w * 0.67), (x0 + w * 0.74, y0 + w * 0.33)]
    d.line(ck, fill=bg, width=int(w * 0.09), joint="curve")
    im.resize((size, size), Image.LANCZOS).save(out / name)
icon(192, 0.2, "icon-192.png"); icon(512, 0.2, "icon-512.png"); icon(512, 0.3, "icon-maskable-512.png", rounded=False)
print("icons written")
