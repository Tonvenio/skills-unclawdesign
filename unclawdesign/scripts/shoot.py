#!/usr/bin/env python3
"""
shoot.py — screenshot an HTML file at desktop and mobile widths with headless Chromium (Playwright).

  python3 shoot.py page.html [--widths 1440,390] [--out shots/] [--full]

Google Fonts are usually unreachable from sandboxed shells; this script serves them from the google/fonts
GitHub repo instead (fetched in Python, so the normal proxy/CA setup applies), so screenshots show real type.
Writes <name>-<width>.png (viewport) and, with --full, <name>-<width>-full.png.
"""
import re, sys, json, urllib.request, urllib.parse, hashlib
from pathlib import Path

CACHE = Path.home() / ".cache" / "unclawdesign-fonts"
RAW = "https://raw.githubusercontent.com/google/fonts/main/{lic}/{dir}/{file}"

def _get(url):
    CACHE.mkdir(parents=True, exist_ok=True)
    p = CACHE / hashlib.sha1(url.encode()).hexdigest()
    if p.exists(): return p.read_bytes()
    with urllib.request.urlopen(url, timeout=30) as r: data = r.read()
    p.write_bytes(data); return data

def _meta(family):
    d = re.sub(r"[^a-z0-9]", "", family.lower())
    for lic in ("ofl", "apache", "ufl"):
        try:
            txt = _get(RAW.format(lic=lic, dir=d, file="METADATA.pb")).decode()
            if txt.startswith("name:") or "fonts {" in txt: return lic, d, txt
        except Exception: continue
    return None

def font_css(css2_url):
    q = urllib.parse.parse_qs(urllib.parse.urlparse(css2_url).query)
    out = []
    for fam_spec in q.get("family", []):
        fam = fam_spec.split(":")[0].replace("+", " ")
        m = _meta(fam)
        if not m: continue
        lic, d, txt = m
        axes = dict((t, (a, b)) for t, a, b in re.findall(r'axes \{\s*tag: "(\w+)"\s*min_value: ([\d.]+)\s*max_value: ([\d.]+)', txt))
        seen = set()
        for style, weight, fn in re.findall(r'fonts \{\s*name: "[^"]*"\s*style: "(\w+)"\s*weight: (\d+)\s*filename: "([^"]+)"', txt):
            if fn in seen: continue
            seen.add(fn)
            w = f"{int(float(axes['wght'][0]))} {int(float(axes['wght'][1]))}" if "wght" in axes and "[" in fn else weight
            out.append(f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:{w};font-display:block;"
                       f"src:url('https://gh-fonts.local/{lic}/{d}/{urllib.parse.quote(fn)}');}}")
    return "\n".join(out)

def main():
    args = sys.argv[1:]
    if not args: print(__doc__); sys.exit(1)
    page = Path(args[0]).resolve()
    widths = [int(x) for x in (args[args.index("--widths") + 1] if "--widths" in args else "1440,390").split(",")]
    out = Path(args[args.index("--out") + 1]) if "--out" in args else page.parent
    out.mkdir(parents=True, exist_ok=True)
    full = "--full" in args
    from playwright.sync_api import sync_playwright
    def handle(route):
        url = route.request.url
        try:
            if "fonts.googleapis.com/css" in url:
                return route.fulfill(status=200, content_type="text/css", body=font_css(url))
            if url.startswith("https://gh-fonts.local/"):
                lic, d, fn = url[len("https://gh-fonts.local/"):].split("/", 2)
                return route.fulfill(status=200, content_type="font/ttf", body=_get(RAW.format(lic=lic, dir=d, file=urllib.parse.unquote(fn))))
            if url.startswith("file:") or url.startswith("data:"):
                return route.continue_()
            return route.abort()
        except Exception as e:
            print("font/asset fetch failed:", url, e, file=sys.stderr)
            return route.abort()
    with sync_playwright() as p:
        b = p.chromium.launch()
        for w in widths:
            ctx = b.new_context(viewport={"width": w, "height": 900 if w > 600 else 844}, device_scale_factor=1, reduced_motion="reduce")
            pg = ctx.new_page(); pg.route("**/*", handle)
            pg.goto(page.as_uri(), wait_until="load")
            pg.evaluate("document.fonts.ready")
            pg.wait_for_timeout(400)
            base = out / f"{page.stem}-{w}.png"
            pg.screenshot(path=str(base))
            if full: pg.screenshot(path=str(out / f"{page.stem}-{w}-full.png"), full_page=True)
            sw = pg.evaluate("document.documentElement.scrollWidth")
            if sw > w + 1: print(f"WARNING: horizontal overflow at {w}px (scrollWidth {sw})")
            print("wrote", base)
            ctx.close()
        b.close()

if __name__ == "__main__":
    main()
