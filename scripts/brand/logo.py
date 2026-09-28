"""The site's logo: a matte red disc sunk into a tan block, a Y raised in it.

    python3 scripts/brand/logo.py

The disc is debossed into the flat, matte tan of the block, with the mark
softly raised in a lighter tan. The mark is the lettering's Y (flat-cut arms,
U notch, leaning back). The logo keeps its colours in both themes, so the
colours are literal.

Writes
  app/assets/brand/logo.svg          the header's logo (inlined, 64-unit box)
  public/favicon.svg                 the tab icon: no grain (noise at 16-32px),
                                     a bigger disc, a heavier Y, a lighter
                                     rim that holds on a dark tab strip
  scripts/brand/apple-touch-icon.svg full-bleed square (iOS rounds it)
public/favicon.ico (16 + 32px) and public/apple-touch-icon.png (180px) are
rasterized from favicon.svg and apple-touch-icon.svg.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)
from geometry import rpath  # noqa: E402


def mark_y(notch=30, depth=38):
    """The logo's Y: the lettering's Y with rounder corners for small sizes."""
    arm = st = 42
    w = 2 * arm + notch
    cx = w / 2
    pts = [(0, 0), (arm, 0), (cx, depth), (arm + notch, 0), (w, 0), (w, 22),
           (cx + st / 2, 60), (cx + st / 2, 100), (cx - st / 2, 100), (cx - st / 2, 60), (0, 22)]
    R = 8.5
    rad = [R, 3, 7, 3, R, 11, 14, R, R, 14, 11]
    return pts, rad, w


def y_path(k, cx, cy, ang=-7):
    pts, rad, w = mark_y()
    c = (w / 2, 50)
    a = math.radians(ang)
    out = []
    for x, y in pts:
        x2, y2 = (x - c[0]) * k, (y - c[1]) * k
        out.append((cx + x2 * math.cos(a) - y2 * math.sin(a), cy + x2 * math.sin(a) + y2 * math.cos(a)))
    return rpath(out, [r * k for r in rad])


def logo(p='lg', disc_r=21.8, mark_k=0.25, grain=True, rx=18, rim=False, square=False, inline=True):
    C = 32
    mark = y_path(mark_k, C, C + 0.5)
    block = ('<rect x="0" y="0" width="64" height="64"/>' if square
             else f'<rect x="1" y="1" width="62" height="62" rx="{rx}"/>')
    grain_layer = f'<g opacity=".18" filter="url(#{p}-grain)">{block}</g>' if grain else ''
    edge_rx = 0 if square else rx - 0.6
    edge = ('' if rim else
            f'<rect x="1.6" y="1.6" width="60.8" height="60.8" rx="{edge_rx:g}" fill="none" stroke="url(#{p}-edge)" stroke-width="1.2"/>')
    rim_layer = (f'<rect x="1.75" y="1.75" width="60.5" height="60.5" rx="{rx - 0.75:g}" fill="none" stroke="#BB926F" stroke-width="1.5"/>'
                 if rim else '')
    attrs = ' class="logo" aria-hidden="true" focusable="false"' if inline else ''
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"{attrs}><defs>
<linearGradient id="{p}-tan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A7815A"/><stop offset=".5" stop-color="#A17B50"/><stop offset="1" stop-color="#9A744A"/></linearGradient>
<linearGradient id="{p}-edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9A87D" stop-opacity=".55"/><stop offset=".45" stop-color="#A17B50" stop-opacity="0"/><stop offset="1" stop-color="#6A4A2A" stop-opacity=".4"/></linearGradient>
<linearGradient id="{p}-lip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5E3F22" stop-opacity=".55"/><stop offset=".5" stop-color="#7A5733" stop-opacity="0"/><stop offset="1" stop-color="#CDAA7E" stop-opacity=".85"/></linearGradient>
<linearGradient id="{p}-disc" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#8D2C32"/><stop offset=".55" stop-color="#86232B"/><stop offset="1" stop-color="#7A1D25"/></linearGradient>
<linearGradient id="{p}-mark" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#BB926F"/><stop offset="1" stop-color="#A27D51"/></linearGradient>
<clipPath id="{p}-clip"><circle cx="{C}" cy="{C}" r="{disc_r}"/></clipPath>
<filter id="{p}-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".9"/></filter>
<filter id="{p}-emb" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceAlpha" stdDeviation=".7" result="b"/>
<feOffset in="b" dx=".8" dy=".8" result="bd"/><feComposite in="SourceAlpha" in2="bd" operator="out" result="rimL"/>
<feFlood flood-color="#E9D0A6" flood-opacity=".8"/><feComposite in2="rimL" operator="in" result="lit"/>
<feOffset in="b" dx="-.8" dy="-.8" result="bu"/><feComposite in="SourceAlpha" in2="bu" operator="out" result="rimS"/>
<feFlood flood-color="#5E1419" flood-opacity=".3"/><feComposite in2="rimS" operator="in" result="shd"/>
<feOffset in="b" dx=".45" dy=".6" result="cs"/><feFlood flood-color="#2E0508" flood-opacity=".28"/><feComposite in2="cs" operator="in" result="cast"/>
<feMerge><feMergeNode in="cast"/><feMergeNode in="SourceGraphic"/><feMergeNode in="lit"/><feMergeNode in="shd"/></feMerge></filter>
<filter id="{p}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 .30  0 0 0 0 .20  0 0 0 0 .11  0 0 0 -2.2 1.25"/><feComposite in2="SourceGraphic" operator="in"/></filter>
</defs>
<g fill="url(#{p}-tan)">{block}</g>
{grain_layer}
{edge}{rim_layer}
<circle cx="{C}" cy="{C}" r="{disc_r + 1.7:.2f}" fill="none" stroke="url(#{p}-lip)" stroke-width="1.1"/>
<circle cx="{C}" cy="{C}" r="{disc_r + 1.1:.2f}" fill="#5E1419"/>
<circle cx="{C}" cy="{C}" r="{disc_r}" fill="url(#{p}-disc)"/>
<g clip-path="url(#{p}-clip)"><circle cx="{C + 1.3}" cy="{C + 1.6}" r="{disc_r + 1.8:.2f}" fill="none" stroke="#300609" stroke-opacity=".55" stroke-width="3.4" filter="url(#{p}-soft)"/></g>
<path d="{mark}" fill="url(#{p}-mark)" filter="url(#{p}-emb)"/>
</svg>'''
    return ' '.join(svg.split())


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(text + '\n')
    print(f'{rel}: {len(text)} bytes')


if __name__ == '__main__':
    write('app/assets/brand/logo.svg', logo())
    write('public/favicon.svg', logo(p='f', disc_r=23.4, mark_k=0.27, grain=False, rx=16, rim=True, inline=False))
    write('scripts/brand/apple-touch-icon.svg', logo(p='t', square=True, inline=False))
