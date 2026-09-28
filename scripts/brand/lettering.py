"""The owner's name in padded block letters.

    python3 scripts/brand/lettering.py            # LARRY (the site's)
    python3 scripts/brand/lettering.py YUFAN      # any of A F L N R U Y

Writes app/assets/brand/<name>.svg, which the home page inlines, and prints
the word's width in cap heights: `--nm-w` in main.css must match it.

Each letter is a block (stems 0.42 of the cap height, rounded but never
pill-shaped corners, U-shaped slot ends), ringed by one rolled red cord of the
same absolute width on every letter, which also lines the counters; tonal
double stitching runs inside the edge; the face is flat with a soft roll at
its rim. The letters step up in size toward the end of the word, climb, lean
back, and never touch.

Every colour is a CSS custom property (--nm-*), set on .name-mark in main.css,
so one SVG serves both themes. Ids are prefixed `nm`: the SVG is inlined once
per page.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from geometry import convex_flags, offset, rot, rpath, sample  # noqa: E402

OUT_DIR = os.path.join(HERE, '..', '..', 'app', 'assets', 'brand')

# ------------------------------------------------------------------ glyphs
# Cap 100, y down. One outer rounded polygon and its holes (counters) per
# glyph; the points are the face edge (where the face meets the cord).
# Outer convex radii are the visible silhouette's (the cord's outer edge);
# hole convex radii are the visible counter floor's.

RV = 10.0  # visible outer corner radius, 0.24 of the stem


def A():
    w = 118
    inset = 100 * math.tan(math.radians(11))
    c = w / 2
    nb, nt, ny = 18.5, 6.8, 80.5
    pts = [(inset, 0), (w - inset, 0), (w, 100), (c + nb, 100), (c + nt, ny), (c - nt, ny), (c - nb, 100), (0, 100)]
    rad = [RV, RV, RV, 6, 7.5, 7.5, 6, RV]
    cpts = [(c, 13), (c + 13.5, 54), (c - 13.5, 54)]
    crad = [3.4, 3.0, 3.0]
    return dict(outer=(pts, rad), holes=[(cpts, crad)], w=w)


def R():
    pts = [(0, 0), (58, 0), (107, 33), (107, 58), (125, 58), (125, 100), (82, 100), (67, 78), (41, 78), (41, 100), (0, 100)]
    rad = [RV, 27, 15, 3.5, RV, RV, 6, 8, 8, 6, RV]
    # The counter: a rounded shield set high, flat left and top, a
    # short edge along the shoulder, a big lower-right quarter round.
    cpts = [(40.5, 22.5), (57, 22.5), (74, 34), (74, 56), (40.5, 56)]
    crad = [5.5, 3.5, 4, 13, 5.5]
    return dict(outer=(pts, rad), holes=[(cpts, crad)], w=125)


def L():
    st, w, foot = 42, 86, 38
    pts = [(0, 0), (st, 0), (st, 100 - foot), (w, 100 - foot), (w, 100), (0, 100)]
    rad = [RV, RV, 4, 8, RV, RV]
    return dict(outer=(pts, rad), holes=[], w=w)


def Y(notch=24, depth=40):
    arm = 42
    st = 42
    w = 2 * arm + notch
    cx = w / 2
    pts = [(0, 0), (arm, 0), (cx, depth), (arm + notch, 0), (w, 0), (w, 22),
           (cx + st / 2, 60), (cx + st / 2, 100), (cx - st / 2, 100), (cx - st / 2, 60), (0, 22)]
    rad = [RV, 5.5, 7, 5.5, RV, 9, 8, RV, RV, 8, 9]
    return dict(outer=(pts, rad), holes=[], w=w)


def U():
    st, slot, depth = 42, 20, 62
    w = 2 * st + slot
    e = slot / 2 - 0.01
    pts = [(0, 0), (st, 0), (st, depth), (st + slot, depth), (st + slot, 0), (w, 0), (w, 100), (0, 100)]
    rad = [RV, 5.5, e, e, 5.5, RV, 13, 13]
    return dict(outer=(pts, rad), holes=[], w=w)


def F():
    st, w, wm = 42, 90, 80
    t1, s1, t2 = 33, 53, 80
    e = (s1 - t1) / 2 - 0.01
    pts = [(0, 0), (w, 0), (w, t1), (st, t1), (st, s1), (wm, s1), (wm, t2), (st, t2), (st, 100), (0, 100)]
    rad = [RV, RV, 7, e, e, 7, 7, 4, RV, RV]
    return dict(outer=(pts, rad), holes=[], w=w)


def N():
    w = 124
    e = 4 - 0.01
    pts = [(0, 0), (60, 0), (76, 58), (84, 58), (84, 0), (w, 0), (w, 100), (64, 100), (48, 42), (40, 42), (40, 100), (0, 100)]
    rad = [RV, 6.5, e, e, 5.5, RV, RV, 6.5, e, e, 5.5, RV]
    return dict(outer=(pts, rad), holes=[], w=w)


GLYPHS = dict(A=A, R=R, L=L, Y=Y, U=U, F=F, N=N)

# In cap-100 units at the largest letter. The cord is 4.8 units (2.4px at the
# desktop's 50px cap); the two stitch rows sit 3.4 and 6.5 units inside the
# face edge; letters are at least 15 units apart (R beside R a little more).
STYLE = dict(cord=4.8, stitch=(3.4, 6.5), dash=(0.4, 1.5), thread=0.7, gap=15, rr_extra=2.0)


# ------------------------------------------------------------------ drawing

def face_geom(g, p):
    """Face-edge polygons, with the visible radii converted to the face's."""
    pts, rad = g['outer']
    conv = convex_flags(pts)
    frad = [max(r - p, 1.2) if c else r for r, c in zip(rad, conv)]
    holes = []
    for hp, hr in g['holes']:
        hc = convex_flags(hp)
        holes.append((hp, [r + p if c else r for r, c in zip(hr, hc)]))
    return (pts, frad), holes


def paths(outer, holes, d_outer, d_hole):
    pts, rad = outer
    s = rpath(*offset(pts, rad, d_outer)) if d_outer else rpath(pts, rad)
    for hp, hr in holes:
        s += rpath(*offset(hp, hr, d_hole)) if d_hole else rpath(hp, hr)
    return s


def letter(key, g, s):
    """One letter's shapes (defs) and its layers, in the letter's own units."""
    u = 1 / s
    p = STYLE['cord'] * u
    outer, holes = face_geom(g, p)
    shapes = {
        'f': paths(outer, holes, 0, 0),                              # the face
        'o': paths(outer, holes, p, -p),                             # the cord's outer edge
        'l': paths(outer, holes, p - 0.5 * u, -(p - 0.5 * u)),       # its lit lip
    }
    for i, ins in enumerate(STYLE['stitch']):
        shapes[f's{i}'] = paths(outer, holes, -ins * u, ins * u)     # the stitch rows
    defs = ''.join(f'<path id="{key}{k}" fill-rule="evenodd" d="{d}"/>' for k, d in shapes.items())
    use = lambda k, a: f'<use href="#{key}{k}" {a}/>'
    dash = f'{STYLE["dash"][0] * u:.2f} {STYLE["dash"][1] * u:.2f}'
    layers = [
        use('o', f'fill="url(#{key}cord)"'),
        use('o', f'class="nm-edge" stroke-width="{0.55 * u:.2f}"'),
        use('l', f'class="nm-lip" stroke-width="{0.75 * u:.2f}" mask="url(#{key}lit)"'),
        use('f', f'fill="url(#{key}face)" filter="url(#{key}puff)"'),
        use('f', f'class="nm-crease" stroke-width="{0.6 * u:.2f}"'),
    ]
    for i, cls in enumerate(('nm-row-o', 'nm-row-i')):
        layers.append(f'<g class="nm-stitch {cls}">'
                      + use(f's{i}', f'class="nm-ridge" stroke-width="{0.75 * u:.2f}" stroke-dasharray="{dash}" transform="translate({0.28 * u:.2f} {0.36 * u:.2f})"')
                      + use(f's{i}', f'class="nm-thread" stroke-width="{STYLE["thread"] * u:.2f}" stroke-dasharray="{dash}"')
                      + '</g>')
    return defs, ''.join(layers)


def paints(key, s):
    """The cord's and face's gradients, the lip's mask and the face's puff."""
    u = 1 / s
    return (
        f'<linearGradient id="{key}cord" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" style="stop-color:var(--nm-cord-lit)"/><stop offset=".45" style="stop-color:var(--nm-cord)"/><stop offset="1" style="stop-color:var(--nm-cord-deep)"/></linearGradient>'
        f'<linearGradient id="{key}face" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" style="stop-color:var(--nm-face-hi)"/><stop offset=".22" style="stop-color:var(--nm-face)"/><stop offset=".85" style="stop-color:var(--nm-face)"/><stop offset="1" style="stop-color:var(--nm-face-lo)"/></linearGradient>'
        f'<linearGradient id="{key}litg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        f'<mask id="{key}lit" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#{key}litg)"/></mask>'
        # The puff: the face's rim rolls away, lit at the upper left and shaded
        # at the lower right, over a trace of grain.
        f'<filter id="{key}puff" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">'
        f'<feGaussianBlur in="SourceAlpha" stdDeviation="{2.6 * u:.2f}" result="b"/>'
        f'<feOffset in="b" dx="{-1.4 * u:.2f}" dy="{-1.9 * u:.2f}" result="bs"/>'
        f'<feComposite in="SourceAlpha" in2="bs" operator="out" result="rimS"/>'
        f'<feFlood style="flood-color:var(--nm-puff-shade);flood-opacity:var(--nm-puff-shade-a)"/>'
        f'<feComposite in2="rimS" operator="in" result="shade"/>'
        f'<feOffset in="b" dx="{1.2 * u:.2f}" dy="{1.6 * u:.2f}" result="bh"/>'
        f'<feComposite in="SourceAlpha" in2="bh" operator="out" result="rimH"/>'
        f'<feFlood style="flood-color:var(--nm-puff-hi);flood-opacity:var(--nm-puff-hi-a)"/>'
        f'<feComposite in2="rimH" operator="in" result="hi"/>'
        f'<feTurbulence type="fractalNoise" baseFrequency="{0.75 * s:.3f}" numOctaves="2" seed="11" result="n"/>'
        f'<feColorMatrix in="n" type="matrix" values="0 0 0 0 .40  0 0 0 0 .34  0 0 0 0 .29  .07 0 0 0 -.03" result="gr"/>'
        f'<feComposite in="gr" in2="SourceAlpha" operator="in" result="grain"/>'
        f'<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="grain"/><feMergeNode in="shade"/><feMergeNode in="hi"/></feMerge>'
        f'<feComposite in2="SourceAlpha" operator="in"/></filter>')


def xform(pts, s, a, c, tx, ty):
    out = []
    for x, y in pts:
        X, Y_ = rot((x * s, y * s), a, (c[0] * s, c[1] * s))
        out.append((X + tx, Y_ + ty))
    return out


def mindist(A_, B_):
    best = 1e9
    for ax, ay in A_[::2]:
        for bx, by in B_[::2]:
            d = (ax - bx) ** 2 + (ay - by) ** 2
            if d < best:
                best = d
    return math.sqrt(best)


def word(text, idp='nm', rise=3.5, lean=-5):
    """The word as one SVG: letters step up from 0.84 to 1.0 of the cap, each
    rising `rise` units above the last and leaning `lean` degrees, spaced so
    their cords stay STYLE['gap'] apart."""
    n = len(text)
    cw = STYLE['cord']
    placed = []
    for i, ch in enumerate(text):
        g = GLYPHS[ch]()
        s = 0.84 + 0.16 * i / max(1, n - 1)
        c = (g['w'] / 2, 50)
        outer, _ = face_geom(g, cw / s)
        cord = sample(*offset(*outer, cw / s), step=1.5)
        ty = 100 * (1 - s) - i * rise
        if i == 0:
            tx = 0
        else:
            gap = STYLE['gap'] + (STYLE['rr_extra'] if text[i - 1] == 'R' and ch == 'R' else 0)
            prev = placed[-1][-1]
            lo, hi = -80, 260
            base = placed[-1][4] + placed[-1][0]['w'] * placed[-1][1]
            for _ in range(28):
                mid = (lo + hi) / 2
                if mindist(prev, xform(cord, s, lean, c, base + mid, ty)) < gap:
                    lo = mid
                else:
                    hi = mid
            tx = base + hi
        placed.append((g, s, lean, c, tx, ty, xform(cord, s, lean, c, tx, ty)))
    allp = [pt for pl in placed for pt in pl[-1]]
    minx = min(x for x, y in allp) - 0.6
    maxx = max(x for x, y in allp) + 0.6
    miny = min(y for x, y in allp) - 0.8
    maxy = max(y for x, y in allp) + 0.6
    body, dfs = '', ''
    for i, (g, s, a, c, tx, ty, _) in enumerate(placed):
        key = f'{idp}{i}'
        d, layers = letter(key, g, s)
        dfs += d + paints(key, s)
        body += f'<g transform="translate({tx:.2f} {ty:.2f}) rotate({a} {c[0] * s:.2f} {c[1] * s:.2f}) scale({s:.4f})">{layers}</g>'
    vb = f'{minx:.1f} {miny:.1f} {maxx - minx:.1f} {maxy - miny:.1f}'
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" aria-hidden="true" focusable="false">'
           f'<defs>{dfs}</defs>{body}</svg>')
    return svg, (maxx - minx) / 100, (maxx - minx) / (maxy - miny)


if __name__ == '__main__':
    name = (sys.argv[1] if len(sys.argv) > 1 else 'LARRY').upper()
    missing = sorted(set(name) - set(GLYPHS))
    if missing:
        sys.exit(f'No glyph for {", ".join(missing)} (have {"".join(sorted(GLYPHS))}).')
    svg, width, aspect = word(name)
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f'{name.lower()}.svg')
    with open(path, 'w') as f:
        f.write(svg + '\n')
    print(f'{os.path.relpath(path)}: {len(svg)} bytes, width {width:.3f} caps (--nm-w), aspect {aspect:.3f}')
