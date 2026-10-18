"""Builds the "Am." brand mark: the header mark's paths, its pen route and keyframes, and the icons.

The mark is an "Am" ligature. A heavy upright A (Instrument Sans 700, width 87.5) has a crossbar that
runs out through its right leg, thins and rises into the entry of an Instrument Serif italic m (its
own entry hook removed), so one stroke changes voice from the sans to the serif, as the hero sets
"Abdelrahman" against an italic "Mohamed". A cobalt full stop follows: the site's one accent.

    python3 -m venv .venv && .venv/bin/pip install skia-pathops fonttools
    .venv/bin/python scripts/brand/build_mark.py

Writes components/brand-mark-data.ts, components/brand-mark.css and app/icon.svg. The glyph outlines
in glyphs.json come from the Instrument Sans and Instrument Serif fonts (SIL Open Font License).
"""

import json
import math
import os

import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.svgLib.path import parse_path

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
GLYPHS = json.load(open(os.path.join(HERE, "glyphs.json")))

INK, PAPER, SIGNAL = "#0e0f12", "#eeeff2", "#3d5afe"  # dark-theme ink tile, its ink, its cobalt


# --- geometry helpers ------------------------------------------------------------------------
def P(d):
    p = pathops.Path()
    parse_path(d, p.getPen())
    return p


def T(p, a=1, b=0, c=0, d=1, e=0, f=0):
    return p.transform(a, b, c, d, e, f)


def fold(ps, op):
    r = ps[0]
    for q in ps[1:]:
        r = pathops.op(r, q, op)
    return r


def U(*ps):
    return fold(list(ps), pathops.PathOp.UNION) if len(ps) > 1 else pathops.op(ps[0], ps[0], pathops.PathOp.UNION)


def D(a, *bs):
    return fold([a, *bs], pathops.PathOp.DIFFERENCE)


def poly(*pts):
    p = pathops.Path()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    p.close()
    return p


def outline(p, w, cap=pathops.LineCap.ROUND_CAP, join=pathops.LineJoin.ROUND_JOIN):
    s = pathops.Path()
    p.draw(s.getPen())
    s.stroke(2 * w, cap, join, 4)
    s.convertConicsToQuads()
    return s


def grow(p, w):
    return U(p, outline(p, w))


def erode(p, w):
    return D(p, outline(p, w, pathops.LineCap.BUTT_CAP, pathops.LineJoin.MITER_JOIN))


def d(p):
    pen = SVGPathPen(None)
    p.draw(pen)
    return pen.getCommands()


def r1(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def dshort(p):
    """Path data with one decimal, so the component stays small."""
    import re

    return re.sub(r"-?\d+\.\d+", lambda m: r1(float(m.group())), d(p))


# --- the mark --------------------------------------------------------------------------------
# The A at width 87.5: two legs and the crossbar (font units, y up, baseline 0, cap 720).
LEG_L = P("M17.769287109375 0 215.01983642578125 720H333.000732421875L160.384765625 0Z")
LEG_R = P("M439.32794189453125 0 267.1927490234375 720H393.25054931640625L590.5010986328125 0Z")
BAR = P("M134.0386962890625 271.7308349609375H468.46240234375V156.923095703125H134.0386962890625Z")
SERIF_M = P(GLYPHS["serif:m"])


def hookless(mm):
    return D(mm, poly((-100, 432), (48.6, 398.5), (68.6, 394), (85, 390), (85, 250), (-100, 250)))


def parts(tx, k1, L, L2, k2, g):
    """The A, and the flick (crossbar out to the m) plus the m, each grown by g units."""
    bt, bb = 271.73, 156.92
    O, Ip = (tx + 55.4, 424.7), (tx + 68.6, 394)
    do, di = (0.457, 0.889), (0.43, 0.9)
    flick = P(
        f"M500 {bt} C {500 + k1} {bt}, {O[0] - do[0] * L:.1f} {O[1] - do[1] * L:.1f}, {O[0]} {O[1]} "
        f"L {Ip[0]} {Ip[1]} C {Ip[0] - di[0] * L2:.1f} {Ip[1] - di[1] * L2:.1f}, {500 + k2} {bb}, 500 {bb} Z"
    )
    m = hookless(SERIF_M).transform(1, 0, 0, 1, tx, 0)
    if g:
        m, flick = grow(m, g), grow(flick, g)
    return U(LEG_L, LEG_R, BAR), U(flick, m)


# The header master: the m set a little further out and 6 units heavier than the display cut, with
# the bar holding its weight longer before it thins, so the hairline stays >= 1.2px at 21px tall
# and the A and m don't fuse at 1x.
HEADER = dict(tx=640, k1=170, L=120, L2=160, k2=100, g=6)
A, FM = parts(**HEADER)
full = U(A, FM)
x0, y0, x1, y1 = full.bounds  # y1 = 720, the cap height


def flip(p):
    return T(p, 1, 0, 0, -1, -x0, y1)  # y down, the A's top-left at 0,0; baseline at y=720


H = round(y1 - y0)
DOT_R, DOT = 60, (1456, 660)  # the full stop: on the baseline, after the m's tail
W = DOT[0] + DOT_R + 4
# The flick+m piece overlaps the A by 10 units, so the join has no antialiasing seam.
A_OUT = flip(A)
FM_OUT = flip(D(FM, erode(A, 10)))

# --- the pen route: along the crossbar, out through the flick, through the m, into the stop ---
RUNS = [
    [(150, 506), (420, 506), (520, 498), (600, 460), (645, 395), (690, 318), (735, 255), (787, 226), (818, 262), (806, 300), (757, 520), (712, 712)],
    [(712, 712), (745, 560), (776, 425), (800, 405), (840, 370), (900, 300), (960, 247), (1013, 226), (1043, 262), (1028, 300), (986, 500), (945, 712)],
    [(945, 712), (980, 560), (1010, 425), (1035, 405), (1065, 375), (1120, 305), (1180, 250), (1243, 226), (1274, 262), (1270, 300), (1225, 495), (1190, 635), (1200, 692), (1238, 702), (1285, 655), (1316, 592), (1335, 548)],
]


def catmull(pts):
    segs, n = [], len(pts)
    for i in range(n - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < n else pts[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        segs.append((p1, c1, c2, p2))
    return segs


def bez(s, t):
    a, b, c, e = s
    u = 1 - t
    return tuple(u**3 * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t**3 * e[i] for i in (0, 1))


segs = [s for run in RUNS for s in catmull(run)]
tip = RUNS[-1][-1]
segs.append((tip, (tip[0] + 50, tip[1] - 10), (DOT[0] - 10, DOT[1] - 70), DOT))  # the tail drops into the stop
ROUTE = f"M{r1(segs[0][0][0])} {r1(segs[0][0][1])}" + "".join(
    "C" + " ".join(f"{r1(v[0])} {r1(v[1])}" for v in s[1:]) for s in segs
)
pts = [bez(s, k / 60) for s in segs for k in range(60)] + [DOT]
cum = [0.0]
for i in range(1, len(pts)):
    cum.append(cum[-1] + math.dist(pts[i - 1], pts[i]))
LENGTH = cum[-1]


def point_at(frac):
    target = frac * LENGTH
    for i in range(1, len(cum)):
        if cum[i] >= target:
            k = (target - cum[i - 1]) / max(1e-9, cum[i] - cum[i - 1])
            return tuple(pts[i - 1][j] + (pts[i][j] - pts[i - 1][j]) * k for j in (0, 1))
    return DOT


def cubic(x1, y1, x2, y2, u):
    v = 1 - u
    return 3 * v * v * u * x1 + 3 * v * u * u * x2 + u**3, 3 * v * v * u * y1 + 3 * v * u * u * y2 + u**3


def time_for(progress, ease=(0.65, 0, 0.2, 1)):
    """The moment (0-1) at which --ease-pour has covered `progress` of the way."""
    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if cubic(*ease, mid)[1] < progress:
            lo = mid
        else:
            hi = mid
    return cubic(*ease, (lo + hi) / 2)[0]


# The dot rides the pen's tip: keyframes at even steps along the route, timed by --ease-pour so it
# stays on the tip of the dash (which runs on --ease-pour from 0 to 1 of the path's length).
frames = []
for k in range(65):
    s = k / 64
    t = time_for(s) if 0 < s < 1 else s
    x, y = point_at(s)
    frames.append((t, x - DOT[0], y - DOT[1]))


def keyframes(name):
    lines = [f"@keyframes am-run-{name} {{"]
    for i, (t, dx, dy) in enumerate(frames):
        extra = " opacity: 0;" if i == 0 else " opacity: 1;" if i == 1 else ""
        lines.append(f"  {t * 100:.2f}% {{ translate: {dx:.1f}px {dy:.1f}px;{extra} }}")
    lines.append("}")
    lines += [
        f"@keyframes am-pen-{name} {{ from {{ stroke-dashoffset: 1; }} to {{ stroke-dashoffset: 0; }} }}",
        f"@keyframes am-fill-{name} {{ 0%, 96% {{ opacity: 0; }} 100% {{ opacity: 1; }} }}",
        f"@keyframes am-pop-{name} {{ from {{ scale: 1.9; }} to {{ scale: 1; }} }}",
    ]
    return "\n".join(lines)


# --- icons -----------------------------------------------------------------------------------
def icon_body(width_frac, g, rx, dot_r=75, dot_gap=45, cfg=None):
    cfg = cfg or {k: v for k, v in HEADER.items() if k != "g"}
    a, fm = parts(**cfg, g=g)
    p = U(a, fm)
    bx0, _, bx1, _ = p.bounds
    w = bx1 - bx0
    total = w + dot_gap + 2 * dot_r
    sc = 1000 * width_frac / total
    ox = (1000 - total * sc) / 2
    oy = (1000 - 720 * sc) / 2 + 720 * sc  # centre the cap height, not the descender
    q = T(p, sc, 0, 0, -sc, ox - bx0 * sc, oy)
    cx, cy = ox + (w + dot_gap + dot_r) * sc, oy - dot_r * sc
    tile = f'<rect width="1000" height="1000" rx="{rx}" fill="{INK}"/>' if rx is not None else f'<rect width="1000" height="1000" fill="{INK}"/>'
    return f'{tile}<path fill="{PAPER}" d="{dshort(q)}"/><circle cx="{r1(cx)}" cy="{r1(cy)}" r="{r1(dot_r * sc)}" fill="{SIGNAL}"/>'


def icon16_body():
    """16px cut: the m's stems close up at 16, so it is the bold A and a 2x2 cobalt pixel, snapped."""
    a = P(GLYPHS["sans94_700:A"])
    px = 62.5
    bx0, _, bx1, _ = a.bounds
    sc = 10 * px / 720  # cap 10px: rows 3-13
    aw = (bx1 - bx0) * sc
    total = aw + 3 * px
    ox = round(((1000 - total) / 2) / px) * px
    q = T(a, sc, 0, 0, -sc, ox - bx0 * sc, 13 * px)
    dx = round((ox + aw + px) / px) * px
    return f'<rect width="1000" height="1000" rx="220" fill="{INK}"/><path fill="{PAPER}" d="{dshort(q)}"/><rect x="{r1(dx)}" y="{r1(11 * px)}" width="{2 * px}" height="{2 * px}" fill="{SIGNAL}"/>'


ICON_LARGE = icon_body(0.86, 24, 220)
ICON_APPLE = icon_body(0.78, 10, None)
ICON_SMALL = icon16_body()
svg = lambda body: f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">{body}</svg>'

# The SVG favicon picks its cut by the size it is drawn at: the A and pixel at 24px and under.
with open(os.path.join(ROOT, "app/icon.svg"), "w") as f:
    f.write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">\n'
        "<style>.s{display:none}@media (max-width:24px){.s{display:inline}.l{display:none}}</style>\n"
        f'<g class="l">{ICON_LARGE}</g>\n<g class="s">{ICON_SMALL}</g>\n</svg>\n'
    )

with open(os.path.join(ROOT, "components/brand-mark-data.ts"), "w") as f:
    f.write(
        "// Generated by scripts/brand/build_mark.py. Don't edit by hand.\n\n"
        f"export const MARK_VIEWBOX = \"0 0 {W} {H}\";\n"
        f"export const MARK_A = \"{dshort(A_OUT)}\";\n"
        f"export const MARK_FM = \"{dshort(FM_OUT)}\";\n"
        f"export const MARK_DOT = {{ cx: {DOT[0]}, cy: {DOT[1]}, r: {DOT_R} }};\n"
        f"export const MARK_ROUTE = \"{ROUTE}\";\n"
        f"export const MARK_PEN = 104;\n"
        f"/** The 32px and up icon (an ink tile), and the full-bleed 180px Apple touch icon, as SVG. */\n"
        f"export const ICON_SVG = '{svg(ICON_LARGE)}';\n"
        f"export const APPLE_ICON_SVG = '{svg(ICON_APPLE)}';\n"
    )

with open(os.path.join(ROOT, "components/brand-mark.css"), "w") as f:
    f.write(
        "/* Generated by scripts/brand/build_mark.py. Don't edit by hand: the dot's run along the pen\n"
        "   route (timed to --ease-pour, so it rides the tip of the dash) and the draw's keyframes.\n"
        "   Two identical sets (a, b) so a redraw can restart them by swapping the name; h is hover. */\n"
        + "\n".join(keyframes(n) for n in ("a", "b", "h"))
        + "\n"
    )

print(f"mark {W}x{H}, route {LENGTH:.0f} units")
