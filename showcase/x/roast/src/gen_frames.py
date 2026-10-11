"""Render the batch-041 bean sequence.

desktop: media/d/f000.webp ... (N frames, 1200 px, transparent)
mobile:  media/m/f000.webp ... (every other frame, downsampled to 640 px)
Each frame i corresponds to story progress p = i / (N - 1) (see story.py).
"""
import math, os, sys, time, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from story import t_of_p, roast_degree, swell, smoothstep
from render_bean import render

ROOT = __import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)), "..", "media")
N = int(os.environ.get("FRAMES", 140))
W = int(os.environ.get("W", 1200))
WM = int(os.environ.get("WM", 640))
SCALE = 0.33


def pose(p):
    t = t_of_p(p)
    e = 1 - (1 - p) ** 2.0
    return dict(theta=math.radians(380 * e), pitch=math.radians(16), roll=math.radians(-28),
                roast=roast_degree(t), swell=swell(t),
                crease_open=smoothstep(490, 545, t), crack=smoothstep(490, 528, t))


def make_flakes():
    rng = np.random.default_rng(1041)
    groups = [(0.22, 0.36, 4), (0.40, 0.56, 7), (0.585, 0.67, 20), (0.70, 0.80, 4)]
    fl = []
    for a, b, k in groups:
        for _ in range(k):
            ang = rng.uniform(0, 2 * np.pi)
            r0 = rng.uniform(0.05, 0.42)
            fl.append(dict(birth=rng.uniform(a, b), life=rng.uniform(0.05, 0.08),
                           x0=np.cos(ang) * r0 * 0.7, y0=np.sin(ang) * r0,
                           vx=0.45 + rng.normal(0, 0.35) + np.cos(ang) * 0.5, vy=0.85 + rng.normal(0, 0.3) + np.sin(ang) * 0.4,
                           size=rng.uniform(0.04, 0.085), spin=rng.normal(0, 7), a0=rng.uniform(0, 6.28),
                           shade=(int(rng.uniform(196, 222)), int(rng.uniform(178, 200)), int(rng.uniform(134, 160))),
                           seed=int(rng.integers(1, 1 << 30))))
    return fl


FLAKES = make_flakes()


def flakes_at(p):
    out = []
    for f in FLAKES:
        q = (p - f["birth"]) / f["life"]
        if 0 <= q <= 1:
            al = min(1.0, q / 0.15) * (1 - smoothstep(0.55, 1.0, q)) * 0.85
            out.append((f["x0"] + f["vx"] * q * 1.1, f["y0"] + f["vy"] * q * 1.1, f["size"],
                        f["a0"] + f["spin"] * q, al, f["shade"], f["seed"]))
    return out


if __name__ == "__main__":
    os.makedirs(f"{ROOT}/d", exist_ok=True)
    os.makedirs(f"{ROOT}/m", exist_ok=True)
    only = [int(x) for x in sys.argv[1:]]
    t0 = time.time()
    tot_d = tot_m = 0
    for i in (only or range(N)):
        p = i / (N - 1)
        im = render(W, scale=SCALE, flakes=flakes_at(p), **pose(p))
        fn = f"{ROOT}/d/f{i:03d}.webp"
        im.save(fn, quality=82, method=6, alpha_quality=85)
        tot_d += os.path.getsize(fn)
        if i % 2 == 0 or i == N - 1:
            j = i // 2 if i % 2 == 0 else (N - 1 + 1) // 2
            sm = im.resize((WM, WM), Image.LANCZOS)
            fm = f"{ROOT}/m/f{j:03d}.webp"
            sm.save(fm, quality=80, method=6, alpha_quality=85)
            tot_m += os.path.getsize(fm)
        if i % 10 == 0:
            print(i, round(time.time() - t0, 1), "s", flush=True)
    print("desktop KB", tot_d // 1024, "mobile KB", tot_m // 1024, "time", round(time.time() - t0, 1))
    json.dump({"desktop": {"n": N, "w": W, "scale": SCALE}, "mobile": {"n": (N + 1) // 2 + (0 if N % 2 else 1), "w": WM}},
              open(f"{ROOT}/frames.json", "w"))
