"""Rounded-polygon geometry shared by lettering.py and logo.py.

Coordinates are y-down (SVG). A shape is a polygon plus one corner radius per
vertex. `offset` grows or shrinks the outline as a whole (a positive distance
grows it, and convex corners gain the distance while concave ones lose it),
so a stroke of constant width can be built from exact offsets.
"""
import math


def area(pts):
    return sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1]
               for i in range(len(pts))) / 2


def convex_flags(pts):
    """True where the corner turns the same way as the polygon (convex)."""
    s = 1 if area(pts) > 0 else -1
    out = []
    n = len(pts)
    for i in range(n):
        a, b, c = pts[i - 1], pts[i], pts[(i + 1) % n]
        cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
        out.append(cr * s > 0)
    return out


def offset(pts, radii, d):
    """Miter-offset a polygon by d and adjust the corner radii with it."""
    n = len(pts)
    s = 1 if area(pts) > 0 else -1
    conv = convex_flags(pts)
    out, rr = [], []
    for i in range(n):
        a, b, c = pts[i - 1], pts[i], pts[(i + 1) % n]

        def nrm(p, q):
            dx, dy = q[0] - p[0], q[1] - p[1]
            L = math.hypot(dx, dy)
            return (dy / L * -s * -1, -dx / L * -s * -1)

        n1, n2 = nrm(a, b), nrm(b, c)
        k = 1 + n1[0] * n2[0] + n1[1] * n2[1]
        mx, my = (n1[0] + n2[0]) / k, (n1[1] + n2[1]) / k
        out.append((b[0] + mx * d, b[1] + my * d))
        r = radii[i]
        rr.append(max(r + d if conv[i] else r - d, 0.35))
    return out, rr


def rpath(pts, rad):
    """SVG path data for a polygon with rounded corners (cubic arcs)."""
    n = len(pts)
    segs = []
    for i in range(n):
        p0, p, p1 = pts[i - 1], pts[i], pts[(i + 1) % n]
        r = rad[i]

        def towards(a, b, dd):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            dd = min(dd, L / 2)
            return (a[0] + (b[0] - a[0]) * dd / L, a[1] + (b[1] - a[1]) * dd / L)

        v1 = (p0[0] - p[0], p0[1] - p[1])
        v2 = (p1[0] - p[0], p1[1] - p[1])
        l1, l2 = math.hypot(*v1), math.hypot(*v2)
        cosang = max(-1, min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)))
        ang = math.acos(cosang)
        t = r / math.tan(ang / 2) if ang > 1e-3 else r
        a = towards(p, p0, t)
        b = towards(p, p1, t)
        theta = math.pi - ang
        kk = 4 / 3 * math.tan(theta / 4) / max(math.tan(theta / 2), 1e-6) if theta > 1e-3 else 0.55
        c1 = (a[0] + (p[0] - a[0]) * kk, a[1] + (p[1] - a[1]) * kk)
        c2 = (b[0] + (p[0] - b[0]) * kk, b[1] + (p[1] - b[1]) * kk)
        segs.append((a, c1, c2, b))
    f = lambda v: f"{v:.1f}".rstrip('0').rstrip('.')
    d = f"M{f(segs[0][3][0])} {f(segs[0][3][1])}"
    for i in range(1, n + 1):
        a, c1, c2, b = segs[i % n]
        d += f"L{f(a[0])} {f(a[1])}C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(b[0])} {f(b[1])}"
    return d + "Z"


def sample(pts, rad, step=1.0):
    """A dense polyline of a rounded polygon (the same corners as rpath)."""
    n = len(pts)
    out = []
    for i in range(n):
        p0, p, p1 = pts[i - 1], pts[i], pts[(i + 1) % n]
        v1 = (p0[0] - p[0], p0[1] - p[1])
        v2 = (p1[0] - p[0], p1[1] - p[1])
        l1, l2 = math.hypot(*v1), math.hypot(*v2)
        u1 = (v1[0] / l1, v1[1] / l1)
        u2 = (v2[0] / l2, v2[1] / l2)
        ang = math.acos(max(-1, min(1, u1[0] * u2[0] + u1[1] * u2[1])))
        r = rad[i]
        t = r / math.tan(ang / 2) if ang > 1e-3 else 0
        t = min(t, l1 / 2, l2 / 2)
        r_eff = t * math.tan(ang / 2)
        a = (p[0] + u1[0] * t, p[1] + u1[1] * t)
        b = (p[0] + u2[0] * t, p[1] + u2[1] * t)
        bis = (u1[0] + u2[0], u1[1] + u2[1])
        bl = math.hypot(*bis)
        if bl < 1e-9 or r_eff < 1e-6:
            out.append(p)
            continue
        bis = (bis[0] / bl, bis[1] / bl)
        dcen = r_eff / math.sin(ang / 2)
        c = (p[0] + bis[0] * dcen, p[1] + bis[1] * dcen)
        a0 = math.atan2(a[1] - c[1], a[0] - c[0])
        a1 = math.atan2(b[1] - c[1], b[0] - c[0])
        da = a1 - a0
        while da > math.pi:
            da -= 2 * math.pi
        while da < -math.pi:
            da += 2 * math.pi
        k = max(2, int(abs(da) * r_eff / step))
        for j in range(k + 1):
            th = a0 + da * j / k
            out.append((c[0] + r_eff * math.cos(th), c[1] + r_eff * math.sin(th)))
    return out


def rot(pt, ang, c):
    a = math.radians(ang)
    x, y = pt[0] - c[0], pt[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))
