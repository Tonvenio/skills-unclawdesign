"""Procedural coffee-bean renderer (numpy only, analytic ray casting, orthographic camera).

Geometry: two half-ellipsoids sharing an equator: a flatter one for the flat (crease) face at local z >= 0 and a
deeper dome at z <= 0. The centre cut is a bump-mapped S-shaped groove with silverskin (chaff) in its core.
Surface detail: wrapped 3D gradient noise (wrinkles) + low-frequency mottling, both pinned to the bean.
Lighting: soft key (upper left), cool fill, back rim light, broad soft-box specular, filmic tone map.
Output: premultiplied-free RGBA with an analytically supersampled silhouette (transparent background).
"""
import math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, map_coordinates, distance_transform_edt

RNG = np.random.default_rng(41)
NG = 64


def _noise(sigma):
    n = gaussian_filter(RNG.standard_normal((NG, NG, NG)).astype(np.float32), sigma, mode="wrap")
    return n / n.std()


N_LO = _noise(5.0)
N_HI = _noise(1.4)
N_HI_G = [g.astype(np.float32) for g in np.gradient(N_HI)]
N_PORE = _noise(0.8)


def sample(field, pts, scale, offset=0.0):
    c = (pts * np.asarray(scale, np.float32)[:, None] + offset) % NG
    return map_coordinates(field, c, order=1, mode="grid-wrap")


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def srgb_to_lin(c):
    c = np.asarray(c, np.float32) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055)


# roast colour ramp (sRGB): green coffee -> straw yellow -> tan -> cinnamon -> light brown (Kiambu at drop)
RAMP = [(0.00, (122, 140, 112)), (0.12, (140, 146, 104)), (0.24, (164, 146, 88)), (0.40, (160, 120, 70)),
        (0.55, (152, 101, 58)), (0.70, (128, 79, 44)), (0.84, (108, 66, 37)), (1.00, (95, 57, 32)), (1.25, (76, 45, 26))]
CHAFF = [(0.0, (168, 176, 140)), (0.3, (200, 186, 138)), (1.0, (206, 188, 146))]


def ramp(table, r):
    xs = [a for a, _ in table]
    cols = np.array([c for _, c in table], np.float32)
    return np.array([np.interp(r, xs, cols[:, k]) for k in range(3)], np.float32)


SPIN_AXIS = np.array([0.22, 1.0, 0.62], np.float32) / np.linalg.norm([0.22, 1.0, 0.62])


def rot_matrix(theta, pitch, roll, axis=SPIN_AXIS):
    """local -> view. precess about a tilted local axis (the flat face never turns fully away),
    then pitch about view x, then roll in the screen plane."""
    kx, ky, kz = axis
    K = np.array([[0, -kz, ky], [kz, 0, -kx], [-ky, kx, 0]], np.float32)
    Ry = np.eye(3, dtype=np.float32) + math.sin(theta) * K + (1 - math.cos(theta)) * (K @ K)
    cp, sp = math.cos(pitch), math.sin(pitch)
    Rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]], np.float32)
    cr, sr = math.cos(roll), math.sin(roll)
    Rz = np.array([[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]], np.float32)
    return Rz @ Rx @ Ry


class Bean:
    def __init__(self, a=1.0, b=0.70, cf=0.19, cb=0.56):
        self.a, self.b, self.cf, self.cb = a, b, cf, cb

    def intersect(self, X, Y, R, s):
        """Orthographic rays (X, Y, +5) -> -z. Returns t, local hit point, side (+1 front / -1 back), hit mask."""
        Rt = R.T
        o = np.stack([X, Y, np.full_like(X, 5.0)])  # 3 x n
        ol = Rt @ o
        dl = Rt @ np.array([0, 0, -1.0], np.float32)
        best_t = np.full(X.shape, np.inf, np.float32)
        side = np.zeros(X.shape, np.int8)
        for c, sgn in ((self.cf, 1), (self.cb, -1)):
            ax = np.array([self.b * s, self.a * s, c * s], np.float32)[:, None]
            op = ol / ax
            dp = (dl[:, None] / ax)
            A = (dp * dp).sum(0)
            B = 2 * (op * dp).sum(0)
            C = (op * op).sum(0) - 1
            disc = B * B - 4 * A * C
            ok = disc >= 0
            t = np.where(ok, (-B - np.sqrt(np.maximum(disc, 0))) / (2 * A), np.inf)
            z = ol[2] + t * dl[2]
            valid = ok & ((z >= 0) if sgn > 0 else (z <= 0))
            take = valid & (t < best_t)
            best_t = np.where(take, t, best_t)
            side = np.where(take, sgn, side)
        hit = np.isfinite(best_t)
        p = ol + np.where(hit, best_t, 0) * dl[:, None]
        return best_t, p, side, hit


def crease_field(u, v, open_amt, split=0.0):
    """S-shaped centre cut in normalised face coords u=x/b, v=y/a. Returns (g_narrow, g_wide, dg/du, dg/dv, core)."""
    uc = 0.045 * np.sin(2.3 * v) + 0.20 * v ** 5
    duc = 0.045 * 2.3 * np.cos(2.3 * v) + 1.0 * v ** 4
    du = u - uc
    env = 1.0 - smoothstep(0.80, 0.975, np.abs(v))
    w1 = (0.030 + 0.022 * open_amt) * (1.0 + 0.8 * split * smoothstep(0.25, 0.75, v)) * (0.45 + 0.55 * (1 - v * v))
    w2 = 0.30
    e1 = np.exp(-(du / w1) ** 2)
    e2 = np.exp(-(du / w2) ** 2)
    d1, d2 = 1.0, 0.55
    dgdu = env * (d1 * e1 * (-2 * du / w1 ** 2) * 0.026 + d2 * e2 * (-2 * du / w2 ** 2) * 0.10)
    dgdv = -dgdu * duc
    core = env * np.exp(-(du / (w1 * 0.55)) ** 2)
    return env * e1, env * e2, dgdu, dgdv, core


def crack_field(u, v, amount, seed=7):
    """A jagged fissure branching off the crease near the top end; grows with amount (0..1)."""
    if amount <= 0:
        return np.zeros_like(u)
    rng = np.random.default_rng(seed)
    # polyline from the crease at v=0.55 out toward the rim on the +u side
    n = 9
    vs = np.linspace(0.50, 0.70, n)
    us = 0.07 + np.linspace(0, 0.30, n) + rng.normal(0, 0.02, n)
    vs = vs + rng.normal(0, 0.02, n)
    L = max(2, int(round(1 + amount * (n - 1))))
    dmin = np.full(u.shape, 9.0, np.float32)
    for i in range(L - 1):
        ax, ay, bx, by = us[i], vs[i], us[i + 1], vs[i + 1]
        if i == L - 2:
            frac = amount * (n - 1) - (L - 2) if amount < 1 else 1.0
            frac = min(max(frac, 0.25), 1.0)
            bx, by = ax + (bx - ax) * frac, ay + (by - ay) * frac
        px, py = u - ax, v - ay
        ex, ey = bx - ax, by - ay
        h = np.clip((px * ex + py * ey) / (ex * ex + ey * ey + 1e-9), 0, 1)
        d = np.hypot(px - ex * h, py - ey * h)
        dmin = np.minimum(dmin, d)
    width = 0.008 + 0.004 * amount
    return np.exp(-(dmin / width) ** 2) * min(1.0, amount * 2.0) * 0.8


def render(W, theta, pitch, roll, roast, swell, crease_open=0.0, crack=0.0, scale=0.355, center=(0.5, 0.5),
           bean=None, mottle_seed=0.0, flakes=None, taper=0.07, tex_offset=(0.0, 0.0, 0.0)):
    bean = bean or Bean()
    L = scale * W
    cx, cy = center
    xs = (np.arange(W, dtype=np.float32) + 0.5 - cx * W) / L
    ys = -(np.arange(W, dtype=np.float32) + 0.5 - cy * W) / L
    XX, YY = np.meshgrid(xs, ys)
    R = rot_matrix(theta, pitch, roll)
    if taper:
        cr_, sr_ = math.cos(-roll), math.sin(-roll)
        bx_, by_ = XX * cr_ - YY * sr_, XX * sr_ + YY * cr_
        bx_ = bx_ / (1.0 + taper * by_ / swell)
        XX, YY = bx_ * cr_ + by_ * sr_, -bx_ * sr_ + by_ * cr_

    # coarse bounding test to limit work
    rad = 1.06 * swell
    near = (XX ** 2 + YY ** 2) < rad * rad
    iy, ix = np.nonzero(near)
    X, Y = XX[iy, ix], YY[iy, ix]
    t, p, side, hit = bean.intersect(X, Y, R, swell)

    # --- silhouette coverage: 4x4 supersample on boundary pixels
    hitimg = np.zeros((W, W), bool)
    hitimg[iy[hit], ix[hit]] = True
    pad = np.pad(hitimg, 1)
    edge = np.zeros_like(hitimg)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            edge |= pad[1 + dy:W + 1 + dy, 1 + dx:W + 1 + dx] != hitimg
    ey, ex = np.nonzero(edge)
    offs = (np.arange(4, dtype=np.float32) + 0.5) / 4 - 0.5
    cov = np.zeros(len(ey), np.float32)
    for oy in offs:
        for ox in offs:
            sx_, sy_ = xs[ex] + ox / L, ys[ey] - oy / L
            if taper:
                bx_, by_ = sx_ * cr_ - sy_ * sr_, sx_ * sr_ + sy_ * cr_
                bx_ = bx_ / (1.0 + taper * by_ / swell)
                sx_, sy_ = bx_ * cr_ + by_ * sr_, -bx_ * sr_ + by_ * cr_
            _, _, _, h2 = bean.intersect(sx_, sy_, R, swell)
            cov += h2
    cov /= 16.0
    alpha = hitimg.astype(np.float32)
    alpha[ey, ex] = cov

    # --- shading on hit pixels
    sel = hit
    P = p[:, sel]
    sd = side[sel]
    hy, hx = iy[sel], ix[sel]
    a, b = bean.a * swell, bean.b * swell
    cz = np.where(sd > 0, bean.cf * swell, bean.cb * swell)
    nl = np.stack([P[0] / b ** 2, P[1] / a ** 2, P[2] / cz ** 2])
    nl /= np.linalg.norm(nl, axis=0, keepdims=True)

    Pn = P / swell + np.asarray(tex_offset, np.float32)[:, None]  # texture space: pinned to the bean as it swells
    u, v = (P[0] / swell) / bean.b, (P[1] / swell) / bean.a
    front = (sd > 0).astype(np.float32)
    rimfade = 1.0 - smoothstep(0.55, 0.97, u * u + v * v)  # fade groove toward the equator
    gn, gw, dgdu, dgdv, core = crease_field(u, v, crease_open, crack)
    fw = front * rimfade
    nl[0] += fw * dgdu / bean.b * 1.0
    nl[1] += fw * dgdv / bean.a * 1.0

    # fissure
    cr = np.zeros_like(u)

    # wrinkles: tangential noise gradient, anisotropic (stretched along the long axis)
    gvec = np.zeros_like(nl)
    for sc, amp in (((26.0, 9.0, 26.0), 1.0), ((58.0, 22.0, 58.0), 0.55)):
        gvec += amp * np.stack([sample(g, Pn, sc, 3.0 + sc[0]) for g in N_HI_G]) * (sc[0] / 26.0)
    gvec -= (gvec * nl).sum(0, keepdims=True) * nl
    wr = 0.075 * (1.0 - 0.35 * roast)
    nl -= wr * gvec
    nl /= np.linalg.norm(nl, axis=0, keepdims=True)

    n = R @ nl  # view-space normal

    # albedo
    base = srgb_to_lin(ramp(RAMP, roast))[:, None]
    mott = sample(N_LO, Pn, (3.2, 2.2, 3.2), 11.0 + mottle_seed)
    pore = sample(N_PORE, Pn, (24, 18, 24), 5.0)
    alb = base * (1.0 + (0.16 - 0.06 * roast) * mott)
    # roasted tips run slightly darker; dome slightly darker than the flat face once roasting
    alb *= 1.0 - 0.10 * roast * smoothstep(0.55, 1.0, np.abs(v))
    alb *= 1.0 - 0.05 * roast * (1 - front)
    alb *= 1.0 - 0.10 * smoothstep(1.4, 2.6, pore)
    # cavity darkening in the wrinkle troughs (same noise as the bump, so shading and colour agree)
    cav = sample(N_HI, Pn, (26.0, 9.0, 26.0), 29.0) + 0.55 * sample(N_HI, Pn, (58.0, 22.0, 58.0), 61.0)
    alb *= 1.0 - (0.10 + 0.06 * roast) * smoothstep(0.2, 1.6, -cav)
    # silverskin patches on green coffee; they loosen and fall away as the roast progresses
    skin = smoothstep(0.55, 1.35, sample(N_LO, Pn, (4.5, 3.0, 4.5), 37.0)) * (1 - smoothstep(0.08, 0.40, roast))
    skin_c = srgb_to_lin(np.array([186, 190, 160], np.float32))[:, None]
    alb = alb * (1 - 0.55 * skin) + skin_c * 0.55 * skin
    chaff = srgb_to_lin(ramp(CHAFF, roast))[:, None]
    bits = smoothstep(-0.6, 1.1, sample(N_LO, Pn, (9.0, 14.0, 9.0), 17.0)) * (0.55 + 0.45 * smoothstep(-1.0, 1.0, sample(N_HI, Pn, (20.0, 40.0, 20.0), 4.0)))
    chaff_amt = np.clip(core * front * bits * (0.30 + 0.45 * roast) * (1 - 0.30 * crease_open), 0, 1)
    alb = alb * (1 - chaff_amt) + chaff * chaff_amt
    # occlusion in the groove walls and fissure
    ao = 1.0 - front * (0.70 * np.clip(gn - core * bits * 0.6, 0, 1) + 0.30 * gw) * rimfade
    ao *= 1.0 - 0.55 * cr
    ao *= 1.0 - 0.10 * smoothstep(0.8, 2.2, sample(N_PORE, Pn, (40, 30, 40), 9.0))
    ao *= 0.80 + 0.20 * (0.5 + 0.5 * n[1])

    # lights (view space: x right, y up, z to viewer)
    def nrm(vv):
        vv = np.asarray(vv, np.float32)
        return vv / np.linalg.norm(vv)

    L1 = nrm([-0.55, 0.62, 0.58])
    L2 = nrm([0.80, 0.30, -0.52])
    L3 = nrm([0.55, -0.45, 0.70])
    ndl1 = (n * L1[:, None]).sum(0)
    diff1 = np.clip((ndl1 + 0.22) / 1.22, 0, 1) ** 1.15
    fill = np.clip((n * L3[:, None]).sum(0), 0, 1)
    sky = 0.5 + 0.5 * n[1]
    amb = 0.10 + 0.08 * sky
    facing = np.clip(n[2], 0, 1)
    rim = np.clip((n * L2[:, None]).sum(0), 0, 1) * (1 - facing) ** 2.6

    key_c = np.array([1.00, 0.95, 0.88], np.float32)[:, None] * 1.85
    fill_c = np.array([0.70, 0.82, 0.95], np.float32)[:, None] * 0.30
    rim_c = np.array([0.95, 0.97, 1.00], np.float32)[:, None] * 1.6

    col = alb * (key_c * diff1 * ao + fill_c * fill * ao + amb * ao) + alb * rim_c * rim * 0.9
    # specular: tight Blinn + broad soft box reflection
    Hv = nrm(L1 + np.array([0, 0, 1.0], np.float32))
    ndh = np.clip((n * Hv[:, None]).sum(0), 0, 1)
    rough_spec = (0.05 + 0.05 * roast) * ndh ** (14 + 10 * roast)
    rv = 2 * n[2] * n - np.array([0, 0, 1.0], np.float32)[:, None]  # reflect view dir
    box = smoothstep(0.82, 0.97, (rv * L1[:, None]).sum(0)) * (0.045 + 0.02 * roast)
    spec = (rough_spec + box) * ao * (1 - 0.6 * chaff_amt) * (1 + 0.8 * skin)
    col += spec[None, :] * key_c * 0.55
    col += rim_c * rim * 0.32 * (1 - 0.35 * roast)
    col += 0.035 * (1 - facing) ** 4  # sheen at grazing angles

    # filmic tone map
    exposure = 1.05
    col = 1.0 - np.exp(-col * exposure * 1.6)
    srgb = lin_to_srgb(col)

    img = np.zeros((W, W, 3), np.float32)
    img[hy, hx] = srgb.T
    # extend colours outward into the antialiased rim
    if len(ey):
        filled = np.zeros((W, W), bool)
        filled[hy, hx] = True
        _, (iy2, ix2) = distance_transform_edt(~filled, return_indices=True)
        img[ey, ex] = img[iy2[ey, ex], ix2[ey, ex]]
    rgba = np.concatenate([img, alpha[..., None]], axis=2)
    out = Image.fromarray(np.clip(rgba * 255 + 0.5, 0, 255).astype(np.uint8), "RGBA")
    if flakes:
        out = composite_flakes(out, flakes, W, L, center)
    return out


def composite_flakes(img, flakes, W, L, center):
    """flakes: list of (x, y, size, angle, alpha, shade) in bean units (view space)."""
    layer = Image.new("RGBA", (W, W), (208, 190, 148, 0))  # chaff-coloured transparent base: no dark blur fringe
    d = ImageDraw.Draw(layer)
    cx, cy = center
    for (x, y, size, ang, al, shade, seed) in flakes:
        rng = np.random.default_rng(seed)
        k = rng.integers(5, 8)
        angs = np.sort(rng.uniform(0, 2 * np.pi, k))
        rads = size * L * rng.uniform(0.45, 1.0, k)
        px = cx * W + x * L + np.cos(angs + ang) * rads * 1.5
        py = cy * W - y * L + np.sin(angs + ang) * rads * 0.7
        c = tuple(int(v) for v in shade) + (int(255 * al),)
        d.polygon(list(zip(px.tolist(), py.tolist())), fill=c)
    layer = layer.filter(ImageFilter.GaussianBlur(0.6))
    return Image.alpha_composite(img, layer)


if __name__ == "__main__":
    import sys, time
    W = int(sys.argv[1]) if len(sys.argv) > 1 else 480
    r = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
    t0 = time.time()
    tiles = []
    for th in range(0, 360, 45):
        tiles.append(render(W, math.radians(th), math.radians(16), math.radians(-30), r, 1.04, 0.3, 0.3))
    sheet = Image.new("RGBA", (W * 4, W * 2), (17, 47, 44, 255))
    for i, im in enumerate(tiles):
        sheet.alpha_composite(im, ((i % 4) * W, (i // 4) * W))
    sheet.save("/tmp/claude-0/-home-claude/cfca7f2c-ee1e-5801-89b3-b8544835b5b0/scratchpad/sweep.png")
    print("time", time.time() - t0)
