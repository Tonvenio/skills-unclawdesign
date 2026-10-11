#!/usr/bin/env python3
import os as _os
_ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
"""
snap.py — screenshot a showcase page at several widths and scroll positions (real fonts, WebGL via SwiftShader).

  python3 showcase/tools/snap.py http://127.0.0.1:8799/x/journey/ --out /tmp/shots/journey \
      [--widths 1440,390] [--scrolls 0,0.2,0.4,0.6,0.8,1] [--reduced] [--full] [--wait 900] [--wheel]

--scrolls: fractions of the scrollable height, or absolute pixels as px1200. Scrolling happens in small wheel steps
           (so ScrollTrigger/Lenis scrub correctly) when --wheel is set, otherwise via window.scrollTo + scroll events.
Prints console errors, page errors, failed requests and horizontal overflow. Exit code 0 always; read the output.
"""
import sys, argparse, urllib.parse, os
sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))), 'unclawdesign/scripts'))
import shoot
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('url'); ap.add_argument('--out', required=True)
ap.add_argument('--widths', default='1440,390'); ap.add_argument('--scrolls', default='0')
ap.add_argument('--reduced', action='store_true'); ap.add_argument('--full', action='store_true')
ap.add_argument('--wait', type=int, default=900); ap.add_argument('--wheel', action='store_true')
ap.add_argument('--click', default=None, help='CSS selector to click before the first shot')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

def handle(route):
    url = route.request.url
    try:
        if 'fonts.googleapis.com/css' in url:
            return route.fulfill(status=200, content_type='text/css', body=shoot.font_css(url))
        if url.startswith('https://gh-fonts.local/'):
            lic, d, fn = url[len('https://gh-fonts.local/'):].split('/', 2)
            return route.fulfill(status=200, content_type='font/ttf', body=shoot._get(shoot.RAW.format(lic=lic, dir=d, file=urllib.parse.unquote(fn))))
        if url.startswith('http://127.0.0.1') or url.startswith('http://localhost') or url.startswith('data:') or url.startswith('blob:'):
            return route.continue_()
        return route.abort()
    except Exception as e:
        print('route error', url, e); return route.abort()

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    for w in [int(x) for x in a.widths.split(',')]:
        h = 900 if w > 700 else 844
        ctx = b.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce' if a.reduced else 'no-preference',
                            has_touch=w < 700, is_mobile=w < 700, device_scale_factor=1)
        pg = ctx.new_page(); pg.route('**/*', handle)
        msgs = []
        pg.on('console', lambda m: msgs.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: msgs.append(f'PAGEERROR: {e}'))
        pg.on('requestfailed', lambda r: msgs.append(f'requestfailed: {r.url} {r.failure}') if '127.0.0.1' in r.url else None)
        pg.goto(a.url, wait_until='load'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(a.wait)
        if a.click: pg.click(a.click); pg.wait_for_timeout(400)
        H = pg.evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight')
        for i, s in enumerate(a.scrolls.split(',')):
            y = int(s[2:]) if s.startswith('px') else int(float(s) * H)
            if a.wheel:
                cur = pg.evaluate('scrollY'); steps = 0
                while abs(cur - y) > 10 and steps < 400:
                    pg.mouse.move(w / 2, h / 2); pg.mouse.wheel(0, max(-500, min(500, y - cur))); pg.wait_for_timeout(60)
                    nxt = pg.evaluate('scrollY'); steps += 1
                    if abs(nxt - cur) < 1 and steps > 20: break
                    cur = nxt
            else:
                pg.evaluate(f'window.scrollTo(0,{y}); window.dispatchEvent(new Event("scroll"))')
            pg.wait_for_timeout(a.wait)
            name = f'{a.out}/w{w}-{i:02d}-{s}.png'
            pg.screenshot(path=name, full_page=a.full)
            print('shot', name, 'scrollY', pg.evaluate('scrollY'), 'of', H)
        sw = pg.evaluate('document.documentElement.scrollWidth')
        if sw > w + 1: print(f'OVERFLOW at {w}px: scrollWidth {sw}')
        for m in msgs[:40]: print(m)
        ctx.close()
    b.close()
