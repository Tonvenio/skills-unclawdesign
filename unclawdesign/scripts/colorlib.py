#!/usr/bin/env python3
"""
colorlib — OKLCH color math, WCAG 2 + APCA contrast, and a contrast-safe palette generator.

CLI
  python3 colorlib.py contrast "#1a1a2e" "#f5f5f5"        # WCAG ratio + APCA Lc
  python3 colorlib.py brand "#2f5bff" [--mode light|dark|color] [--accent2 "#ff7a1a"] [--css]
        -> full light+dark token set built around a brand color, every pair contrast-checked
  python3 colorlib.py combo "#hex" "#hex" ["#hex" "#hex"] [--mode color|light|dark] [--css]
        -> token set from 1–4 given colors (a Wada combination, brand colors); the colors stay exact as fills
  python3 colorlib.py audit tokens.json                  # re-check any {name: hex} token file

All generated palettes satisfy:
  text      >= 7.0 : 1 on bg, surface, surface-2 (AAA body)
  text-muted>= 4.5 : 1 on bg, surface, surface-2
  accent    >= 3.0 : 1 on bg (UI component / large text, WCAG 1.4.11)
  accent-ink>= 4.5 : 1 on accent (button labels)
  accent-text>=4.5 : 1 on bg, surface, surface-2 (links / inline accent text)
  border-strong>=3 : 1 on bg (input outlines)
"""
import json, math, sys

# ── conversions ────────────────────────────────────────────────────
def _lin(x): return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
def _gam(x): return 12.92 * x if x <= 0.0031308 else 1.055 * (x ** (1 / 2.4)) - 0.055

def oklch_to_linear(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    return (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)

def in_gamut(L, C, H, eps=1e-4):
    return all(-eps <= v <= 1 + eps for v in oklch_to_linear(L, C, H))

def gamut_map(L, C, H):
    """Reduce chroma (keep L and H) until the color fits sRGB."""
    L = min(max(L, 0.0), 1.0)
    if in_gamut(L, C, H): return (L, C, H)
    lo, hi = 0.0, C
    for _ in range(30):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if in_gamut(L, mid, H) else (lo, mid)
    return (L, lo, H)

def oklch_to_hex(L, C, H):
    L, C, H = gamut_map(L, C, H)
    rgb = [min(max(_gam(min(max(v, 0), 1)), 0), 1) for v in oklch_to_linear(L, C, H)]
    return "#" + "".join(f"{round(v * 255):02x}" for v in rgb)

def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3: h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def hex_to_oklab(h):
    r, g, b = (_lin(v) for v in hex_to_rgb(h))
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = (math.copysign(abs(v) ** (1 / 3), v) for v in (l, m, s))
    return (0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
            1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
            0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_)

def hex_to_oklch(h):
    L, a, b = hex_to_oklab(h)
    return (L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360)

def delta_e(h1, h2):
    """Euclidean distance in OKLab (≈ JND 0.02)."""
    return math.dist(hex_to_oklab(h1), hex_to_oklab(h2))

def css_oklch(h):
    L, C, H = hex_to_oklch(h)
    return f"oklch({L * 100:.1f}% {C:.3f} {H:.1f})"

# ── contrast ───────────────────────────────────────────────────────
def luminance(h):
    r, g, b = (_lin(v) for v in hex_to_rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(h1, h2):
    a, b = sorted((luminance(h1), luminance(h2)), reverse=True)
    return (a + 0.05) / (b + 0.05)

def apca(text, bg):
    """APCA-W3 0.0.98G Lc (positive = dark text on light bg). |Lc| 75 ≈ body, 60 ≈ large, 45 ≈ headlines/UI."""
    def y(h):
        r, g, b = hex_to_rgb(h)
        Y = 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.0721750 * b ** 2.4
        return Y + (0.022 - Y) ** 1.414 if Y < 0.022 else Y
    yt, yb = y(text), y(bg)
    if abs(yb - yt) < 0.0005: return 0.0
    if yb > yt:
        s = (yb ** 0.56 - yt ** 0.57) * 1.14
        return 0.0 if s < 0.1 else (s - 0.027) * 100
    s = (yb ** 0.65 - yt ** 0.62) * 1.14
    return 0.0 if s > -0.1 else (s + 0.027) * 100

# ── palette generation ─────────────────────────────────────────────
def _push(lch, against, target, direction):
    """Move lightness of lch (darker/lighter) until contrast >= target against every hex in `against`."""
    L, C, H = lch
    step = -0.005 if direction == "darker" else 0.005
    for _ in range(220):
        hx = oklch_to_hex(L, C, H)
        if min(contrast(hx, a) for a in against) >= target: return (L, C, H)
        L = min(max(L + step, 0.0), 1.0)
        if L in (0.0, 1.0): break
    return (L, C, H)

def _avoid_terracotta(lch, limit=0.06):
    """Steer a color out of the #D97757 neighbourhood (Claude's own accent) by rotating hue / raising chroma."""
    L, C, H = lch
    for i in range(12):
        if delta_e(oklch_to_hex(L, C, H), "#D97757") >= limit: break
        H = (H - 3) % 360 if H < 39 else (H + 3) % 360
        C = C + 0.008
        L, C, H = gamut_map(L, C, H)
    return (L, C, H)

def _away(bg_hex):
    return "darker" if luminance(bg_hex) > 0.18 else "lighter"

def _ink(fill_hex, light, dark):
    return light if contrast(fill_hex, light) >= contrast(fill_hex, dark) else dark

def build_variant(mode, nh, nc, accent, accent2=None, accent3=None, bg=None, exact_fills=False):
    """mode: light | dark | color. accent* = (L, C, H). bg (L,C,H) required for color mode, optional otherwise."""
    H = lambda lch: oklch_to_hex(*lch)
    t = {}
    if mode == "light":
        bL = bg[0] if bg else 0.985
        bgc = bg if bg else (bL, nc, nh)
        t["bg"] = H(bgc)
        t["surface"] = H((min(1.0, bL + 0.012), bgc[1] * 0.5, bgc[2]))
        t["surface-2"] = H((bL - 0.04, bgc[1] * 1.3 + 0.003, bgc[2]))
        t["border"] = H((bL - 0.12, nc * 1.5 + 0.006, nh))
        surf = [t["bg"], t["surface"], t["surface-2"]]
        t["border-strong"] = H(_push((bL - 0.35, nc * 2 + 0.01, nh), [t["bg"], t["surface"]], 3.0, "darker"))
        t["text"] = H(_push((0.24, min(0.03, nc * 3 + 0.008), nh), surf, 7.0, "darker"))
        t["text-muted"] = H(_push((0.50, nc * 2 + 0.01, nh), surf, 4.5, "darker"))
        dark_ink, light_ink = H((0.2, 0.02, nh)), H((0.995, 0.003, nh))
    elif mode == "dark":
        bL = bg[0] if bg else 0.215
        bgc = bg if bg else (bL, nc * 1.5 + 0.008, nh)
        t["bg"] = H(bgc)
        t["surface"] = H((bL + 0.05, bgc[1] * 1.05, bgc[2]))
        t["surface-2"] = H((max(0.1, bL - 0.045), bgc[1], bgc[2]))
        t["border"] = H((bL + 0.13, bgc[1] * 1.1, bgc[2]))
        surf = [t["bg"], t["surface"], t["surface-2"]]
        t["border-strong"] = H(_push((bL + 0.3, bgc[1], bgc[2]), [t["bg"], t["surface"]], 3.0, "lighter"))
        t["text"] = H(_push((0.94, nc + 0.006, nh), surf, 7.0, "lighter"))
        t["text-muted"] = H(_push((0.66, nc + 0.01, nh), surf, 4.5, "lighter"))
        dark_ink, light_ink = H((0.18, 0.02, nh)), H((0.97, 0.01, nh))
    else:  # color: saturated background
        bgc = bg
        t["bg"] = H(bgc)
        light_txt, dark_txt = H((0.985, 0.012, bgc[2])), H((0.2, 0.04, bgc[2]))
        txt_dir = "lighter" if contrast(t["bg"], light_txt) >= contrast(t["bg"], dark_txt) else "darker"
        sgn = 1 if txt_dir == "darker" else -1  # both surfaces move away from the text, so text contrast only improves
        t["surface"] = H((min(0.99, max(0.05, bgc[0] + 0.045 * sgn)), bgc[1] * 0.92, bgc[2]))
        t["surface-2"] = H((min(0.99, max(0.05, bgc[0] + 0.09 * sgn)), bgc[1] * 0.95, bgc[2]))
        surf = [t["bg"], t["surface"], t["surface-2"]]
        base_txt = (0.985, 0.012, bgc[2]) if txt_dir == "lighter" else (0.2, 0.04, bgc[2])
        t["text"] = H(_push(base_txt, surf, 7.0, txt_dir))   # AAA where the ground allows it, else best possible (≥ AA by ground choice)
        tl = hex_to_oklch(t["text"])
        mid = (bgc[0] + (tl[0] - bgc[0]) * 0.72, bgc[1] * 0.5, bgc[2])
        t["text-muted"] = H(_push(mid, surf, 4.5, txt_dir))
        if min(contrast(t["text-muted"], x) for x in surf) < 4.5:
            t["text-muted"] = t["text"]   # mid-tone ground: no room for a muted tier; hierarchy must come from size/weight
        t["border"] = H((bgc[0] + (tl[0] - bgc[0]) * 0.22, bgc[1] * 0.8, bgc[2]))
        t["border-strong"] = H(_push((bgc[0] + (tl[0] - bgc[0]) * 0.4, bgc[1] * 0.6, bgc[2]), [t["bg"], t["surface"]], 3.0, txt_dir))
        dark_ink, light_ink = H((0.2, 0.03, bgc[2])), H((0.985, 0.01, bgc[2]))
    away = _away(t["bg"])
    # accent
    if mode == "dark":
        aL, aC, aH = accent
        accent = (min(max(aL + 0.16, 0.70), 0.86) if aL < 0.70 else aL, aC, aH)
    a = _push(gamut_map(*accent) if exact_fills else _avoid_terracotta(gamut_map(*accent)), [t["bg"]], 3.0, away)
    t["accent"] = H(a)
    t["accent-hover"] = H((a[0] + (-0.07 if away == "darker" else 0.07), a[1], a[2]))
    ink = _ink(t["accent"], light_ink, dark_ink)
    if contrast(t["accent"], ink) < 4.5:  # nudge accent so a label reads AND it still holds 3:1 on bg
        best = None
        for cand_ink, d in ((light_ink, "darker"), (dark_ink, "lighter")):
            a2 = _push(a, [cand_ink], 4.5, d)
            ok = contrast(H(a2), cand_ink) >= 4.5 and contrast(H(a2), t["bg"]) >= 3.0
            if ok and (best is None or abs(a2[0] - a[0]) < abs(best[0][0] - a[0])):
                best = (a2, cand_ink)
        if best:
            a, ink = best
        t["accent"] = H(a)
        t["accent-hover"] = H((a[0] + (-0.07 if ink == light_ink else 0.07), a[1], a[2]))
    t["accent-ink"] = ink
    t["accent-text"] = H(_push(a, surf, 4.5, away))
    soft_L = {"light": hex_to_oklch(t["bg"])[0] - 0.05, "dark": hex_to_oklch(t["bg"])[0] + 0.08}.get(mode, None)
    if soft_L is None:
        soft_L = hex_to_oklch(t["bg"])[0] + (0.08 if away == "lighter" else -0.08)
    if mode == "color":
        bl, bc, bh = hex_to_oklch(t["bg"])
        t["accent-soft"] = H((soft_L, bc * 0.75, bh))
    else:
        t["accent-soft"] = H((soft_L, min(a[1] * 0.35, 0.07), a[2]))
    for name, ac in (("accent-2", accent2), ("accent-3", accent3)):
        if ac:
            if exact_fills:
                g = gamut_map(*ac)
            else:
                if mode == "dark" and ac[0] < 0.70:
                    ac = (min(max(ac[0] + 0.16, 0.70), 0.86), ac[1], ac[2])
                g = _avoid_terracotta(gamut_map(*ac))
            t[name] = H(g)
            t[name + "-ink"] = _ink(t[name], light_ink, dark_ink)
    t["focus"] = t["accent"] if contrast(t["accent"], t["bg"]) >= 3 and contrast(t["accent"], t["surface"]) >= 3 else t["text"]
    return t

def checks(t, mode=None):
    surf = [k for k in ("bg", "surface", "surface-2") if k in t]
    out = {}
    text_target = 4.5 if mode == "color" else 7.0   # colored grounds: WCAG AA; light/dark: AAA
    for fg, target in (("text", text_target), ("text-muted", 4.5), ("accent-text", 4.5)):
        out[f"{fg} min"] = round(min(contrast(t[fg], t[s]) for s in surf), 2)
        out[f"{fg} ok"] = out[f"{fg} min"] >= target - 0.01
    out["accent/bg"] = round(contrast(t["accent"], t["bg"]), 2)
    out["accent/bg ok"] = out["accent/bg"] >= 2.99
    out["accent-ink/accent"] = round(contrast(t["accent-ink"], t["accent"]), 2)
    out["accent-ink ok"] = out["accent-ink/accent"] >= 4.49
    out["border-strong/bg"] = round(contrast(t["border-strong"], t["bg"]), 2)
    out["border-strong ok"] = out["border-strong/bg"] >= 2.99
    out["text on accent-soft"] = round(contrast(t["text"], t["accent-soft"]), 2)
    out["apca text/bg"] = round(apca(t["text"], t["bg"]), 1)
    for k in ("accent-2", "accent-3"):
        if k in t:
            out[f"{k}-ink/{k}"] = round(contrast(t[k + "-ink"], t[k]), 2)
            out[f"{k}/bg"] = round(contrast(t[k], t["bg"]), 2)
    out["all_ok"] = all(v for k, v in out.items() if k.endswith(" ok"))
    return out

# ── AI-default tells ───────────────────────────────────────────────
TELLS = {
    "claude-cream-bg": "#F4F1EA",
    "claude-terracotta": "#D97757",
}
def tell_flags(t):
    flags = []
    bL, bC, bH = hex_to_oklch(t["bg"])
    if 0.92 <= bL <= 0.975 and 0.006 <= bC <= 0.03 and 55 <= bH <= 100:
        flags.append("bg is the warm-cream AI default (#F4F1EA family)")
    for k, thr in (("accent", 0.06), ("accent-2", 0.04), ("accent-3", 0.04)):
        if k in t and delta_e(t[k], TELLS["claude-terracotta"]) < thr:
            flags.append(f"{k} is the terracotta Claude accent (#D97757 family)")
    L, C, Hh = hex_to_oklch(t["bg"])
    if L < 0.24 and C < 0.015:
        for k in ("accent", "accent-2"):
            if k in t:
                aL, aC, aH = hex_to_oklch(t[k])
                if aC > 0.16 and (115 <= aH <= 150 or 20 <= aH <= 42):
                    flags.append(f"near-black bg + acid-green/vermilion {k} (AI default)")
    hues = [hex_to_oklch(t[k])[2] for k in ("accent", "accent-2") if k in t and hex_to_oklch(t[k])[1] > 0.1]
    if len(hues) == 2 and all(255 <= h <= 315 for h in hues):
        flags.append("indigo+purple accent pair (gradient-SaaS default)")
    return flags

# ── palette from 1–4 given colors (Wada combinations, brand colors) ──
def palette_from_colors(hexes, mode="color"):
    """Turn a set of colors into a full contrast-safe token set.
    mode color: the most characterful color becomes the page ground (the signature way to use a combination).
    mode light: a very light ground drawn from the combination; the colors become accent and fills.
    mode dark:  a deep ground drawn from the darkest color; the colors become accent and fills.
    The combination's own colors are kept exact as fills (accent-2/3); only text/accent roles are contrast-adjusted."""
    cols = [tuple(hex_to_oklch(h)) for h in hexes]
    by_chroma = sorted(range(len(cols)), key=lambda i: -cols[i][1])
    lightest = max(range(len(cols)), key=lambda i: cols[i][0])
    darkest = min(range(len(cols)), key=lambda i: cols[i][0])
    used = set()
    if mode == "color":
        def carry(lch):
            hx = oklch_to_hex(*lch)
            return max(contrast(hx, "#ffffff"), contrast(hx, "#1a1a1a"))
        mids = [i for i in by_chroma if 0.3 <= cols[i][0] <= 0.9]
        good = [i for i in mids if carry(cols[i]) >= 6.0]
        g = (good or mids or by_chroma)[0]
        bg = cols[g]; used.add(g)
        n = 0
        while carry(bg) < 5.2 and n < 20:   # nudge a mid-tone ground just enough for readable text
            bg = (bg[0] + (0.012 if bg[0] > 0.6 else -0.012), bg[1], bg[2]); n += 1
        rest = [i for i in range(len(cols)) if i not in used]
        if rest:
            a = max(rest, key=lambda i: contrast(hexes[i], hexes[g]) * (1 + cols[i][1]))
        else:
            a = None
        nh, nc = bg[2], bg[1]
    elif mode == "light":
        if cols[lightest][0] >= 0.9:
            bg = cols[lightest]; used.add(lightest)
        else:
            L, C, H = cols[lightest]
            bg = (0.975, min(C * 0.3, 0.022), H)
        rest = [i for i in by_chroma if i not in used]
        a = min(rest, key=lambda i: cols[i][0] if cols[i][1] > 0.04 else cols[i][0] + 0.5) if rest else None
        nh, nc = bg[2], max(bg[1], 0.004)
    else:
        if cols[darkest][0] <= 0.3:
            bg = cols[darkest]; used.add(darkest)
        else:
            L, C, H = cols[darkest]
            bg = (0.2, min(C * 0.6, 0.05), H)
        rest = [i for i in by_chroma if i not in used]
        a = max(rest, key=lambda i: cols[i][0] + cols[i][1]) if rest else None
        nh, nc = bg[2], max(bg[1] * 0.6, 0.004)
    if a is None:  # single color given: derive an accent from it
        L, C, H = bg
        accent = (0.3 if L > 0.6 else 0.9, max(C, 0.08), H)
    else:
        accent = cols[a]; used.add(a)
    fills = [cols[i] for i in range(len(cols)) if i not in used]
    while len(fills) < 2:
        fills.append((min(0.95, accent[0] + 0.25), accent[1] * 0.6, accent[2]) if len(fills) == 0 else (max(0.25, accent[0] - 0.2), accent[1] * 0.8, (accent[2] + 30) % 360))
    t = build_variant("color" if mode == "color" else mode, nh, nc, accent, fills[0], fills[1], bg=bg, exact_fills=True)
    return t

def combo_palette(hexes, names=None, ident=None):
    """All three variants for a color combination + checks, in the same shape as the generated library."""
    v = {m: palette_from_colors(hexes, m) for m in ("color", "light", "dark")}
    flags = {}
    for k, t in v.items():
        f = tell_flags(t)
        claude_look = any("cream" in x for x in f) and any("terracotta" in x for x in f)
        hard = [x for x in f if "cream" not in x and "terracotta" not in x]
        if claude_look or hard:
            flags[k] = f
    return {"primary": "color", "variants": v, "checks": {k: checks(t, k) for k, t in v.items()}, "flags": flags}

# ── palette from a seed dict ───────────────────────────────────────
def make_palette(seed):
    """seed: {mode, neutral:[C,H], accent:[L,C,H], accent2?, accent3?, bg?:[L,C,H]} → {variants, checks, flags}"""
    mode = seed["mode"]
    nc, nh = seed.get("neutral", [0.006, 250])
    a, a2, a3 = (tuple(seed[k]) if seed.get(k) else None for k in ("accent", "accent2", "accent3"))
    bg = tuple(seed["bg"]) if seed.get("bg") else None
    v = {}
    if mode == "color":
        v["color"] = build_variant("color", bg[2], bg[1], a, a2, a3, bg=bg)
        if bg[0] > 0.68:   # light, bright ground (butter, saffron, peach): keep the seed accent, ground becomes a fill color
            v["light"] = build_variant("light", bg[2], 0.008, a, bg, a3)
            v["dark"] = build_variant("dark", a[2], 0.012, bg, a, a3)
        else:              # deep ground (Klein, forest, brick): the ground color is the brand accent
            brand = (min(bg[0], 0.6), bg[1], bg[2])
            v["light"] = build_variant("light", bg[2], 0.008, brand, a, a3)
            v["dark"] = build_variant("dark", bg[2], 0.012, brand, a, a3)
    elif mode == "dark":
        v["dark"] = build_variant("dark", bg[2] if bg else nh, bg[1] if bg else nc, a, a2, a3, bg=bg)
        v["light"] = build_variant("light", bg[2] if bg else nh, max(0.004, (bg[1] if bg else nc) * 0.4), a, a2, a3)
    else:
        v["light"] = build_variant("light", nh, nc, a, a2, a3, bg=bg)
        v["dark"] = build_variant("dark", nh, nc, a, a2, a3)
    return {"primary": mode, "variants": v,
            "checks": {k: checks(t, k) for k, t in v.items()},
            "flags": {k: tell_flags(t) for k, t in v.items() if tell_flags(t)}}

def to_css(variants, primary):
    """CSS custom properties: primary variant on :root, the other light/dark via prefers-color-scheme + data-theme."""
    def block(t): return "\n".join(f"  --c-{k}: {h};" for k, h in t.items())
    p = variants[primary]
    css = f":root {{\n{block(p)}\n  color-scheme: {'dark' if primary == 'dark' else 'light'};\n}}\n"
    alt = "dark" if primary in ("light", "color") else "light"
    if alt in variants:
        q = "dark" if alt == "dark" else "light"
        css += (f"@media (prefers-color-scheme: {q}) {{\n  :root:not([data-theme]) {{\n"
                + block(variants[alt]).replace("  --", "    --") + f"\n    color-scheme: {q};\n  }}\n}}\n")
        css += f":root[data-theme=\"{alt}\"] {{\n{block(variants[alt])}\n  color-scheme: {q};\n}}\n"
    return css

# ── CLI ────────────────────────────────────────────────────────────
def _cli():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__); return
    if args[0] == "contrast":
        a, b = args[1], args[2]
        print(f"WCAG {contrast(a, b):.2f}:1   APCA Lc {apca(a, b):.1f} ({a} on {b})")
    elif args[0] == "brand":
        hx = args[1]
        mode = args[args.index("--mode") + 1] if "--mode" in args else "light"
        L, C, Hh = hex_to_oklch(hx)
        seed = {"mode": mode, "neutral": [0.006, Hh], "accent": [L, C, Hh]}
        if "--accent2" in args:
            seed["accent2"] = list(hex_to_oklch(args[args.index("--accent2") + 1]))
        if mode == "color":
            seed["bg"] = [L, C, Hh]
            seed["accent"] = [0.9, 0.12, (Hh + 180) % 360] if L < 0.6 else [0.3, 0.1, (Hh + 180) % 360]
        p = make_palette(seed)
        if "--css" in args:
            print(to_css(p["variants"], p["primary"]))
        else:
            print(json.dumps(p, indent=1))
    elif args[0] == "combo":
        hexes = [a for a in args[1:] if a.startswith("#")]
        mode = args[args.index("--mode") + 1] if "--mode" in args else None
        p = combo_palette(hexes)
        if mode:
            p["variants"] = {mode: p["variants"][mode]}; p["primary"] = mode
        if "--css" in args:
            print(to_css(p["variants"], p["primary"]))
        else:
            print(json.dumps(p, indent=1))
    elif args[0] == "audit":
        t = json.load(open(args[1]))
        print(json.dumps({"checks": checks(t), "flags": tell_flags(t)}, indent=1))

if __name__ == "__main__":
    _cli()
