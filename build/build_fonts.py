"""Verify every Google family in font_pairs_src against google/fonts METADATA.pb and build data/fonts.json."""
import os as _os
_ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
import json, re, sys, urllib.request, concurrent.futures as cf
sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from font_pairs_src import PAIRS, FONTSHARE, OVERUSED

RAW = "https://raw.githubusercontent.com/google/fonts/main/{lic}/{dir}/METADATA.pb"
CAT = {"SERIF": "serif", "SANS_SERIF": "sans", "DISPLAY": "display", "HANDWRITING": "handwriting", "MONOSPACE": "mono"}
FALLBACK = {"serif": "Georgia, 'Times New Roman', serif", "sans": "system-ui, -apple-system, 'Segoe UI', sans-serif",
            "display": "system-ui, sans-serif", "handwriting": "'Comic Sans MS', cursive", "mono": "ui-monospace, 'SFMono-Regular', Menlo, monospace"}

def dirname(family):
    return re.sub(r"[^a-z0-9]", "", family.lower())

def fetch(family):
    for lic in ("ofl", "apache", "ufl", "ofl", "apache"):
        try:
            with urllib.request.urlopen(RAW.format(lic=lic, dir=dirname(family)), timeout=20) as r:
                txt = r.read().decode()
            return family, lic, txt
        except Exception:
            continue
    return family, None, None

def parse(txt):
    name = re.search(r'^name: "([^"]+)"', txt, re.M).group(1)
    cat = re.search(r'^category: "([^"]+)"', txt, re.M).group(1)
    fonts = re.findall(r'fonts \{\s*name: "[^"]*"\s*style: "(\w+)"\s*weight: (\d+)', txt)
    axes = {t: (float(a), float(b)) for t, a, b in re.findall(r'axes \{\s*tag: "(\w+)"\s*min_value: ([\d.]+)\s*max_value: ([\d.]+)', txt)}
    styles = {s for s, _ in fonts}
    weights = sorted({int(w) for s, w in fonts if s == "normal"})
    return {"family": name, "category": CAT.get(cat, "sans"), "italic": "italic" in styles,
            "static_weights": weights, "axes": {k: [int(v[0]) if v[0].is_integer() else v[0], int(v[1]) if v[1].is_integer() else v[1]] for k, v in axes.items()}}

def css_param(meta, want_weights, want_italic):
    fam = meta["family"].replace(" ", "+")
    ital = want_italic and meta["italic"]
    if "wght" in meta["axes"]:
        lo, hi = meta["axes"]["wght"]
        rng = f"{lo}..{hi}"
        return f"{fam}:ital,wght@0,{rng};1,{rng}" if ital else f"{fam}:wght@{rng}"
    avail = meta["static_weights"] or [400]
    ws = sorted({min(avail, key=lambda a: abs(a - w)) for w in want_weights})
    if len(avail) == 1 and not ital:
        return fam  # single-weight family
    if ital:
        return f"{fam}:ital,wght@" + ";".join([f"0,{w}" for w in ws] + ["1,400"])
    return f"{fam}:wght@" + ";".join(str(w) for w in ws)

def main():
    fams = sorted({f for p in PAIRS for f in (p[3], p[4], p[5]) if f})
    meta, missing = {}, []
    with cf.ThreadPoolExecutor(16) as ex:
        for fam, lic, txt in ex.map(fetch, fams):
            if txt is None:
                missing.append(fam); continue
            m = parse(txt); m["license_dir"] = lic
            if m["family"] != fam:
                print(f"NAME MISMATCH: {fam!r} -> {m['family']!r}")
            meta[fam] = m
    print(f"verified {len(meta)}/{len(fams)} families; missing: {missing}")

    out_pairs = []
    for (pid, name, cluster, disp, body, mono, case, track, dw, lh, moods, fits, avoid, logic) in PAIRS:
        if disp in missing or body in missing or (mono and mono in missing):
            print("SKIP pair (unverified family):", pid); continue
        roles = {"display": (disp, [dw], True), "body": (body, [400, 600, 700], True)}
        if mono: roles["mono"] = (mono, [400, 500], False)
        params, role_out = [], {}
        merged = {}
        for role, (fam, ws, it) in roles.items():
            mw, mi = merged.get(fam, ([], False))
            merged[fam] = (mw + ws, mi or it)
        for fam, (ws, it) in merged.items():
            params.append(css_param(meta[fam], ws, it))
        for role, (fam, ws, it) in roles.items():
            m = meta[fam]
            role_out[role] = {"family": fam, "category": m["category"], "italic": m["italic"],
                              "variable_axes": m["axes"] or None, "static_weights": m["static_weights"] if not m["axes"].get("wght") else None,
                              "stack": f"'{fam}', {FALLBACK['mono' if role == 'mono' else m['category']]}"}
        out_pairs.append({
            "id": pid, "name": name, "cluster": cluster, "source": "google", **role_out,
            "google_css": "https://fonts.googleapis.com/css2?" + "&".join("family=" + p for p in params) + "&display=swap",
            "display_treatment": {"case": case, "tracking_em": track, "weight": dw, "line_height": lh},
            "moods": moods.split(","), "fits": fits.split(","), "avoid_for": avoid.split(","), "contrast_logic": logic,
            "verified_via": "google/fonts METADATA.pb (GitHub)",
        })
    fs_pairs = []
    for (pid, name, cluster, disp, body, case, track, dw, lh, moods, fits, avoid) in FONTSHARE:
        slug = lambda f: f.lower().replace(" ", "-")
        fs_pairs.append({"id": pid, "name": name, "cluster": cluster, "source": "fontshare",
                         "display": {"family": disp, "stack": f"'{disp}', system-ui, sans-serif"},
                         "body": {"family": body, "stack": f"'{body}', system-ui, sans-serif"},
                         "fontshare_css": f"https://api.fontshare.com/v2/css?f[]={slug(disp)}@400,500,600,700&f[]={slug(body)}@400,500,700&display=swap",
                         "display_treatment": {"case": case, "tracking_em": track, "weight": dw, "line_height": lh},
                         "moods": moods.split(","), "fits": fits.split(","), "avoid_for": avoid.split(","),
                         "note": "Fontshare CSS is blocked inside claude.ai artifacts; use only for real projects / Claude Code."})
    data = {"version": "2026-10", "overused": [{"family": f, "reason": r} for f, r in OVERUSED],
            "pairs": out_pairs, "fontshare_pairs": fs_pairs}
    json.dump(data, open(_os.path.join(_ROOT, "unclawdesign/data/fonts.json"), "w"), indent=1, ensure_ascii=False)
    from collections import Counter
    print("pairs:", len(out_pairs), Counter(p["cluster"] for p in out_pairs))

if __name__ == "__main__":
    main()
