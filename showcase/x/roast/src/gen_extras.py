"""Huila bean still, roast replay MP4 (+ poster), static overview chart SVG for the no-JS / reduced-motion page."""
import math, os, sys, subprocess, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from render_bean import render, Bean
from story import bt, t_of_p, EVENTS

M = __import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)), "..", "media")
SCR = "/tmp/claude-0/-home-claude/cfca7f2c-ee1e-5801-89b3-b8544835b5b0/scratchpad"


def huila():
    im = render(1200, math.radians(-14), math.radians(14), math.radians(24), 1.27, 1.11, 1.0, 0.6, scale=0.33,
                bean=Bean(a=1.0, b=0.75, cf=0.21, cb=0.52), taper=-0.06, tex_offset=(13.0, 7.0, 21.0))
    im.save(f"{M}/huila.webp", quality=84, method=6, alpha_quality=85)
    print("huila KB", os.path.getsize(f"{M}/huila.webp") // 1024)


def video():
    N = 140
    W, H = 1280, 720
    os.makedirs(f"{SCR}/vid", exist_ok=True)
    # studio plate: a deep slate-green sweep (physical backdrop of the footage, like a photograph)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    top = np.array([22, 58, 54], np.float32); bot = np.array([6, 30, 27], np.float32)
    g = (yy / H)[..., None]
    plate = top * (1 - g) + bot * g
    vign = 1 - 0.35 * (((xx - W * 0.36) / W) ** 2 + ((yy - H * 0.48) / H) ** 2)
    plate = plate * vign[..., None]
    noise = np.random.default_rng(3).normal(0, 1.2, (H, W, 1))
    plate = Image.fromarray(np.clip(plate + noise, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    # chart geometry (right side)
    cx0, cx1, cy0, cy1 = 700, 1210, 170, 560
    def X(t): return cx0 + (cx1 - cx0) * t / 600
    def Y(T): return cy1 - (cy1 - cy0) * (T - 80) / (215 - 80)
    ss = 2
    pts = [(X(t) * ss, Y(bt(t)) * ss) for t in range(0, 581, 2)]
    frames_out = []
    for k in range(N + 24):
        i = min(k, N - 1)
        p = i / (N - 1)
        t = t_of_p(p)
        bean = Image.open(f"{M}/d/f{i:03d}.webp").convert("RGBA").resize((620, 620), Image.LANCZOS)
        fr = plate.copy()
        lay = Image.new("RGBA", (W * ss, H * ss), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for T in (150, 196, 204):
            d.line([(cx0 * ss, Y(T) * ss), (cx1 * ss, Y(T) * ss)], fill=(103, 134, 130, 150), width=2)
        d.line([(cx0 * ss, cy1 * ss + 30), (cx1 * ss, cy1 * ss + 30)], fill=(103, 134, 130, 230), width=4)
        for ev, tt in EVENTS.items():
            d.line([(X(tt) * ss, cy1 * ss + 22), (X(tt) * ss, cy1 * ss + 38)], fill=(137, 165, 161, 255), width=3)
        d.line(pts, fill=(216, 242, 238, 60), width=3)
        n = int(t / 2) + 1
        if n >= 2:
            d.line(pts[:n], fill=(214, 180, 62, 255), width=5, joint="curve")
        tx, ty = X(t) * ss, Y(bt(t)) * ss
        d.ellipse([tx - 9, ty - 9, tx + 9, ty + 9], fill=(214, 180, 62, 255))
        lay = lay.resize((W, H), Image.LANCZOS)
        fr.alpha_composite(lay)
        fr.alpha_composite(bean, (420 - 310, 360 - 310))
        fr.convert("RGB").save(f"{SCR}/vid/v{k:04d}.png")
        if k == N + 23:
            fr.convert("RGB").save(f"{M}/roast-poster.webp", quality=80, method=6)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", "20", "-i", f"{SCR}/vid/v%04d.png", "-c:v", "libx264",
           "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", f"{M}/roast.mp4"]
    subprocess.run(cmd, check=True)
    print("mp4 KB", os.path.getsize(f"{M}/roast.mp4") // 1024, "poster KB", os.path.getsize(f"{M}/roast-poster.webp") // 1024)


if __name__ == "__main__":
    what = sys.argv[1:] or ["huila", "video"]
    if "huila" in what: huila()
    if "video" in what: video()
