"""Draws the AIDIN logo and writes every size the app uses.

The mark: a blue rounded square with a white "A" made of a roof line over a location dot,
a place in your district. Flat colours only.

    python scripts/make_logo.py            (from the civicwave folder)
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"
BLUE = (28, 100, 242, 255)      # Palette.primary
WHITE = (255, 255, 255, 255)
TINT = (214, 226, 252, 255)     # the light watermark behind the home header
SS = 4                          # supersampling


def symbol(draw, size, color, scale=1.0, dy=0.0):
    """The roof-and-dot "A" on a size x size canvas (unit = size / 1000)."""
    u = size / 1000 * scale
    cx, cy = size / 2, size / 2 + dy * size

    def p(x, y):
        return (cx + (x - 500) * u, cy + (y - 492) * u)

    w = 128 * u
    apex, left, right = p(500, 250), p(262, 735), p(738, 735)
    draw.line([left, apex, right], fill=color, width=round(w), joint="curve")
    for x, y in (left, right):  # round ends
        draw.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=color)
    dx, dy_, r = *p(500, 612), 66 * u
    draw.ellipse((dx - r, dy_ - r, dx + r, dy_ + r), fill=color)


def tile(size, radius=0.235, rounded=True):
    s = size * SS
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if rounded:
        d.rounded_rectangle((0, 0, s - 1, s - 1), round(s * radius), fill=BLUE)
    else:
        d.rectangle((0, 0, s, s), fill=BLUE)
    symbol(d, s, WHITE, scale=0.8)
    return im.resize((size, size), Image.LANCZOS)


def glyph(size, color, scale=1.0, bg=None):
    s = size * SS
    im = Image.new("RGBA", (s, s), bg or (0, 0, 0, 0))
    symbol(ImageDraw.Draw(im), s, color, scale=scale)
    return im.resize((size, size), Image.LANCZOS)


def main():
    tile(600).save(OUT / "logo-mark.png")                       # splash and in-app mark
    tile(1024, rounded=False).convert("RGB").save(OUT / "icon.png")  # the OS rounds the corners
    tile(48).save(OUT / "favicon.png")
    tile(228).save(OUT / "splash-icon.png")
    tile(1254, rounded=False).convert("RGB").save(OUT / "logo.png")
    glyph(512, WHITE, scale=0.62).save(OUT / "android-icon-foreground.png")
    glyph(512, WHITE, scale=0.62).save(OUT / "android-icon-monochrome.png")
    Image.new("RGBA", (512, 512), BLUE).save(OUT / "android-icon-background.png")
    # watermark keeps the old canvas size so the header layout is unchanged
    wm = Image.new("RGBA", (567, 640), (0, 0, 0, 0))
    wm.alpha_composite(glyph(567, TINT, scale=1.0), (0, 36))
    wm.save(OUT / "mark-watermark.png")
    print("wrote logo files to", OUT)


if __name__ == "__main__":
    main()
