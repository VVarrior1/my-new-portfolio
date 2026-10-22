"""Builds the "Am." brand mark: the header mark's paths, its pen route and keyframes, and the icons.

The mark is "Am" set as plain type in one family, Archivo, fitted closer than text spacing so the
two letters read as one mark: a heavy semi-condensed A (wght 700, wdth 87.5, the hero's
"Abdelrahman") and an expanded m (wght 400, wdth 125, as the header's "Mohamed" beside it; at 21px
the hero's 300 reads lighter than that surname). The contrast is width and weight, never style: no
serif, no italic, no added curves, every curve is Archivo's own. A cobalt full stop follows on the
baseline, the site's one accent, closed up to the m by the same factor as the A. JOIN = True instead
runs the A's crossbar on out through its right leg into the m's first stem (the earlier ligature).

    python3 -m venv .venv && .venv/bin/pip install skia-pathops fonttools
    .venv/bin/python scripts/brand/build_mark.py

Writes components/brand-mark-data.ts, components/brand-mark.css and app/icon.svg.

The outlines in glyphs.json are Archivo (Omnibus-Type, SIL Open Font License), from the variable
font ofl/archivo/Archivo[wdth,wght].ttf in github.com/google/fonts, cut into static instances and
drawn with fontTools (coordinates rounded to 2 decimals):

    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools.pens.svgPathPen import SVGPathPen
    for wght, wdth, ch in [(700, 87.5, "A"), (400, 125, "m"), (800, 100, "A")]:
        f = instancer.instantiateVariableFont(TTFont("Archivo[wdth,wght].ttf"), {"wght": wght, "wdth": wdth})
        gs = f.getGlyphSet()
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        gs[f.getBestCmap()[ord(ch)]].draw(pen)
        glyphs[f"archivo_{wght}_{wdth}:{ch}"] = pen.getCommands()

The spacing constants below come from the same instances' hmtx and glyph bounds.
"""

import json
import math
import os

import pathops
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.svgLib.path import parse_path

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
GLYPHS = json.load(open(os.path.join(HERE, "glyphs.json")))

INK, PAPER, SIGNAL = "#0e0f12", "#eeeff2", "#3d5afe"  # dark-theme ink tile, its ink, its cobalt

A_KEY = "archivo_700_87.5:A"  # the mark's A: the hero's first-name setting
M_KEY = "archivo_400_125:m"  # the mark's m: the header surname's setting
ICON16_KEY = "archivo_800_100:A"  # the 16px favicon's A: heavier and wider, so it holds at 10px
JOIN = False  # True: the crossbar runs on out through the A's right leg into the m's first stem
FIT = 52  # no join: the gap from the A's right foot to the m's first stem (A-space units), ~0.6 of text
DOT_R = 62  # the full stop: 1.2x the m's 103-unit stems, as Archivo's own period is to its stems
# The m's own period spacing (Archivo 400/125 hmtx and bounds, font units): the m's right side bearing,
# then the period's left side bearing and half its width, to the stop's centre.
STOP_TEXT = (1090 - 1019.40) + 78.97 + (201.32 - 78.97) / 2
TIGHT = 0.6  # the ink gap from the m to the stop, as a share of that text gap: the same close-up as FIT
PEN = 150  # the pen's width under the mask: covers the m's ~103-unit strokes with room for its curves
FOOT = 25  # the pen's centre at a stem's foot (font units): its round cap covers the foot's corners


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
# A-space: font units scaled by K so the A's apex sits at 720 (y up, baseline 0).
A_GLYPH, M_GLYPH = P(GLYPHS[A_KEY]), P(GLYPHS[M_KEY])
K = 720 / A_GLYPH.bounds[3]


def contours(dstr):
    """Each contour's points (on- and off-curve), in font units."""
    rec = RecordingPen()
    parse_path(dstr, rec)
    out, cur = [], []
    for op, pts in rec.value:
        if op == "moveTo":
            cur = list(pts)
        elif op in ("closePath", "endPath"):
            out.append(cur)
        else:
            cur += pts
    return out


# Measured from the outlines: the crossbar's bottom (the outer contour's lowest point off the
# baseline) and top (the counter's floor), and the m's three stems (its points on the baseline).
_outer, _counter = contours(GLYPHS[A_KEY])[:2]
BB = min(y for _, y in _outer if y > 1) * K
BT = min(y for _, y in _counter) * K
BAR_Y = (BT + BB) / 2
_feet = sorted({round(x, 2) for c in contours(GLYPHS[M_KEY]) for x, y in c if abs(y) < 0.01})
STEMS = [(_feet[i] * K, _feet[i + 1] * K) for i in range(0, len(_feet), 2)]


def rect(x0, y0, x1, y1):
    return poly((x0, y0), (x1, y0), (x1, y1), (x0, y1))


# Where the m sits: with the join, far enough out for the run to show; without, fitted to the A.
TX = 700 if JOIN else A_GLYPH.bounds[2] * K + FIT - STEMS[0][0]


def parts(tx, g):
    """The A, and the m (plus, with JOIN, the run: the crossbar's way out of the A into the m's
    first stem), each grown by g units. tx places the m.

    The run is the crossbar's centre line at the m's stem weight: inside the A it is hidden in the
    bar and the leg, so the heavy bar seems to pass through the leg and come out light. It starts
    well inside the bar and ends 12 units into the stem, so neither end has a seam.
    """
    sl, sr = STEMS[0][0] + tx, STEMS[0][1] + tx
    h = sr - sl
    m = T(M_GLYPH, K, 0, 0, K, tx, 0)
    if JOIN:
        m = U(m, rect(470 * K, BAR_Y - h / 2, sl + 12, BAR_Y + h / 2))
    return T(A_GLYPH, K, 0, 0, K), grow(m, g) if g else m


# The header master. At 21px tall 1px is ~34 units: the m's stems (and the run) are ~103 (3.0px) and
# its arches ~83 (2.4px), well above the 1.2px hairline floor even at 19px, and the A's foot and the
# m's first stem stay ~1.5px apart at 1x, so nothing needs growing (g=0).
HEADER = dict(tx=TX, g=0)
A, FM = parts(**HEADER)
full = U(A, FM)
x0, y0, x1, y1 = full.bounds  # y1 = 720, the A's apex


def flip(p):
    return T(p, 1, 0, 0, -1, -x0, y1)  # y down, the A's top-left at 0,0; baseline at y=720


def fpt(x, y):
    """An A-space point in the mark's (flipped) coordinates."""
    return (x - x0, y1 - y)


H = round(y1 - min(0, y0))
STOP_GAP = (STOP_TEXT * K - DOT_R) * TIGHT  # ink to ink, A-space units
DOT = (round(STEMS[2][1] + TX - x0 + STOP_GAP + DOT_R), round(y1 - DOT_R))  # on the baseline, after the m
W = DOT[0] + DOT_R + 4
# The run+m piece overlaps the A by 10 units, so the join has no antialiasing seam.
A_OUT = flip(A)
FM_OUT = flip(D(FM, erode(A, 10)))

# --- the pen route: the m as it is written, then into the stop ---------------------------------
# From the top of the first stem (with JOIN: along the bar and the run into it) down to its
# foot; back up it, over the first
# arch, down the second stem; back up, over the second arch, down the third; from its foot into
# the stop. ARCH is the arch's centre line from a stem's centre, in the m's font units, measured on
# the 400 m (the two arches are the same shape, 422.4 units apart): up into the stem's top, then
# down to where the arch springs low off the stem, so the pen's round end fills the crotch.
ARCH = [(0, 430), (4, 470), (40, 460), (80, 440), (150, 477), (233, 496), (290, 494), (340, 478), (385, 446), (414, 398)]
C1, C2, C3 = ((a + b) / 2 / K for a, b in STEMS)  # stem centres, font units


def m_pt(x, y):
    return fpt(x * K + TX, y * K)


def down(c):
    return [m_pt(c, 330), m_pt(c, 150), m_pt(c, FOOT)]


def up_and_over(c, nxt):
    return [m_pt(c, FOOT), m_pt(c, 150), m_pt(c, 330), *(m_pt(c + dx, y) for dx, y in ARCH), *down(nxt)]


SL = STEMS[0][0] + TX
ENTRY = [fpt(150 * K, BAR_Y), fpt(SL - 120, BAR_Y), fpt(SL, BAR_Y - 10), m_pt(C1, 120)] if JOIN else [m_pt(C1, 500), m_pt(C1, 330)]
RUNS = [
    [*ENTRY, m_pt(C1, FOOT)],
    up_and_over(C1, C2),
    up_and_over(C2, C3),
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
segs.append((tip, (tip[0], tip[1] + 24), (DOT[0] - 70, DOT[1] + 8), DOT))  # off the last foot, into the stop
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
    a = P(GLYPHS[ICON16_KEY])
    px = 62.5
    bx0, _, bx1, cap = a.bounds
    sc = 10 * px / cap  # cap 10px: rows 3-13
    aw = (bx1 - bx0) * sc
    total = aw + 3 * px
    ox = round(((1000 - total) / 2) / px) * px
    q = T(a, sc, 0, 0, -sc, ox - bx0 * sc, 13 * px)
    dx = round((ox + aw + px) / px) * px
    return f'<rect width="1000" height="1000" rx="220" fill="{INK}"/><path fill="{PAPER}" d="{dshort(q)}"/><rect x="{r1(dx)}" y="{r1(11 * px)}" width="{2 * px}" height="{2 * px}" fill="{SIGNAL}"/>'


# At 32px the header's fit closes up (the A's foot touches the m) and the stop is a speck, so the tile
# opens the fit by 70 units (about 1px) and sets a larger stop with a clear gap. The growth (g) keeps
# the icons' stems as heavy as they were with the 300 m, without closing the 400 m's counters.
ICON_LARGE = icon_body(0.9, 14, 220, dot_r=85, dot_gap=65, cfg=dict(tx=TX + 70))
ICON_APPLE = icon_body(0.84, 0, None)
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
        f"export const MARK_PEN = {r1(PEN)};\n"
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

# How much of the m the pen's width misses (the am-fill rect fills it in at the very end).
_pen = pathops.Path()
parse_path(ROUTE, _pen.getPen())
_pen.stroke(PEN, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
_miss = D(FM_OUT, _pen)


def area(p):
    pen = AreaPen()
    p.draw(pen)
    return abs(pen.value)


print(f"mark {W}x{H}, route {LENGTH:.0f} units, pen misses {area(_miss):.0f} of {area(FM_OUT):.0f} sq units")
if os.environ.get("AM_DEBUG"):
    print("MISS", d(_miss))
