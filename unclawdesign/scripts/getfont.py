#!/usr/bin/env python3
"""Fetch a Google Fonts family from github.com/google/fonts, subset it to Latin + German
punctuation and write self-hosted WOFF2 files plus @font-face CSS (no request to Google at
page load, DSGVO-friendly).

  python3 getfont.py "Literata" -o fonts --css fonts.css [--italic] [--weights 400,700]

Variable families keep their axes. Appends to --css (creates it if missing) and copies the
family's licence file next to the fonts."""
import argparse, io, os, re, sys, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont

RAW = 'https://raw.githubusercontent.com/google/fonts/main/'
UNICODES = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + list(range(0x2010, 0x2028)) +
            list(range(0x2030, 0x203B)) + [0x20AC, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x2026, 0x2116, 0x2122, 0x25B6, 0x25A0, 0x25CF, 0x2665, 0x2713, 0x00A7, 0x2009, 0x202F, 0x2007, 0x2060, 0xFEFF])

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()

def find(family):
    slug = re.sub(r'[^a-z0-9]', '', family.lower())
    for lic in ('ofl', 'apache', 'ufl'):
        try:
            return lic, slug, get(RAW + '%s/%s/METADATA.pb' % (lic, slug)).decode()
        except Exception:
            continue
    sys.exit('family not found in google/fonts: %s' % family)

def parse(meta):
    fonts = []
    for blk in re.findall(r'fonts \{(.*?)\n\}', meta, re.S):
        d = dict(re.findall(r'(\w+): "?([^"\n]*)"?', blk))
        fonts.append({'file': d['filename'], 'style': d.get('style', 'normal'), 'weight': int(d.get('weight', 400))})
    axes = {m[0]: (float(m[1]), float(m[2])) for m in re.findall(r'axes \{\s*tag: "(\w+)"\s*min_value: ([\d.]+)\s*max_value: ([\d.]+)', meta)}
    return fonts, axes

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('family'); ap.add_argument('-o', '--out', default='fonts'); ap.add_argument('--css')
    ap.add_argument('--italic', action='store_true'); ap.add_argument('--weights', default='400,700')
    ap.add_argument('--name', help='CSS font-family name (default: family)')
    ap.add_argument('--pin', default='', help='pin or narrow axes to shrink files, e.g. opsz=14 or wght=300:800')
    a = ap.parse_args()
    lic, slug, meta = find(a.family)
    fonts, axes = parse(meta)
    os.makedirs(a.out, exist_ok=True)
    var = [f for f in fonts if '[' in f['file']]
    pick = []
    if var:
        seen = set()
        for f in var:
            if f['style'] == 'italic' and not a.italic: continue
            if f['file'] in seen: continue
            seen.add(f['file']); pick.append(f)
    else:
        want = [int(w) for w in a.weights.split(',')]
        for f in fonts:
            if f['style'] == 'italic' and not a.italic: continue
            if f['weight'] in want or len(fonts) == 1: pick.append(f)
        if not pick: pick = fonts[:1]
    css = []
    name = a.name or a.family
    for f in pick:
        raw = get(RAW + '%s/%s/%s' % (lic, slug, urllib.request.quote(f['file'])))
        font = TTFont(io.BytesIO(raw))
        opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
        sub = subset.Subsetter(opts); sub.populate(unicodes=UNICODES); sub.subset(font)
        if a.pin and 'fvar' in font:
            from fontTools.varLib import instancer
            lim = {}
            for kv in a.pin.split(','):
                k, v = kv.split('=')
                lim[k] = tuple(float(x) for x in v.split(':')) if ':' in v else float(v)
                if isinstance(lim[k], tuple): axes[k] = lim[k]
                else: axes.pop(k, None)
            font = instancer.instantiateVariableFont(font, lim)
        base = slug + ('-italic' if f['style'] == 'italic' else '') + ('-var' if '[' in f['file'] else '-%d' % f['weight'])
        path = os.path.join(a.out, base + '.woff2')
        font.flavor = 'woff2'; font.save(path)
        if '[' in f['file'] and 'wght' in axes:
            w = '%d %d' % axes['wght']
        else:
            w = str(f['weight'])
        extra = ''
        if '[' in f['file'] and 'wdth' in axes:
            extra = '\n  font-stretch: %g%% %g%%;' % axes['wdth']
        css.append("@font-face {\n  font-family: '%s';\n  src: url('%s') format('woff2');\n  font-weight: %s;\n  font-style: %s;%s\n  font-display: swap;\n}" % (
            name, os.path.relpath(path, os.path.dirname(a.css) if a.css else '.'), w, f['style'], extra))
        print('%-48s %6.1f KB  axes=%s' % (path, os.path.getsize(path) / 1024, ','.join('%s %g..%g' % (k, *v) for k, v in axes.items()) if '[' in f['file'] else '-'))
    for licname in ('OFL.txt', 'LICENSE.txt', 'UFL.txt'):
        try:
            open(os.path.join(a.out, 'LICENSE-%s.txt' % slug), 'wb').write(get(RAW + '%s/%s/%s' % (lic, slug, licname))); break
        except Exception:
            continue
    out = '\n'.join(css) + '\n'
    if a.css:
        with open(a.css, 'a') as fh: fh.write('/* %s, %s licence, self-hosted subset (Latin, German punctuation) */\n' % (a.family, lic.upper()) + out)
    else:
        print(out)

if __name__ == '__main__':
    main()
