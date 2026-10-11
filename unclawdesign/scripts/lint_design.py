#!/usr/bin/env python3
"""
lint_design.py — detect "default AI design" tells and quality-floor misses in an HTML/CSS file.

  python3 lint_design.py page.html [more.css ...]

Prints findings by severity and a 0–100 "distinctiveness & floor" score. It is a smoke detector, not a judge:
a flagged item is fine when the brief explicitly asked for it — say so in the critique.
"""
import re, sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from colorlib import delta_e, hex_to_oklch, contrast

OVERUSED = ["Inter", "Roboto", "Open Sans", "Lato", "Poppins", "Montserrat", "Space Grotesk", "Playfair Display", "Fraunces",
            "Instrument Serif", "DM Sans", "DM Serif Display", "Cormorant Garamond", "Lora", "Merriweather", "IBM Plex", "JetBrains Mono"]
GENERIC_CTA = [r"get started", r"learn more", r"submit", r"click here", r"sign up now", r"start your journey", r"unlock", r"elevate",
               r"supercharge", r"revolutioni[sz]e", r"seamless(ly)?", r"empower", r"next[- ]level", r"game[- ]changer"]
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]")

def expand_hex(h):
    h = h.lstrip("#")
    if len(h) in (3, 4): h = "".join(c * 2 for c in h[:3])
    return "#" + h[:6]

def main(paths):
    src = "\n".join(Path(p).read_text(encoding="utf-8", errors="ignore") for p in paths)
    low = src.lower()
    text = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", src, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    F = []  # (severity, message)
    def add(sev, msg): F.append((sev, msg))

    # ── typography ──
    fams = set(re.findall(r"font-family\s*:\s*([^;}{]+)", src, re.I)) | set(re.findall(r"family=([A-Za-z0-9+]+)", src))
    famtxt = " ".join(fams).replace("+", " ")
    for f in OVERUSED:
        if re.search(r"(?<![A-Za-z])" + re.escape(f) + r"(?![A-Za-z])", famtxt, re.I):
            add("high", f"Overused default typeface: {f}")
    sizes = set(re.findall(r"font-size\s*:\s*([^;}{]+)", src, re.I))
    if len(sizes) > 12: add("med", f"{len(sizes)} distinct font-size declarations — use a type scale (≤ ~8 steps)")
    caps = len(re.findall(r"text-transform\s*:\s*uppercase", src, re.I))
    tracked = len(re.findall(r"letter-spacing\s*:\s*0?\.(0[8-9]|1|2|3)\d*em", src, re.I))
    if caps >= 4 and tracked >= 3: add("med", f"Tracked all-caps labels used {caps}× — the eyebrow-label tell; keep to ≤2 meaningful uses")
    if re.search(r"<(h1|h2)[^>]*>[^<]*<(em|i|span)[^>]*(gradient|accent|italic|color)[^>]*>", src, re.I) or \
       len(re.findall(r"<h[12][^>]*>(?:(?!</h[12]>).)*<(em|i)>", src, re.I | re.S)) >= 1:
        add("med", "Single word accented inside a headline (italic/colored) — a top generated-page tell")
    if "text-wrap: balance" not in low and "text-wrap:balance" not in low:
        add("low", "Headings lack text-wrap: balance")

    # ── color ──
    hexes = [expand_hex(h) for h in re.findall(r"#[0-9a-fA-F]{3,8}\b", src)]
    for h in set(hexes):
        try:
            if delta_e(h, "#D97757") < 0.05: add("high", f"{h} is Claude's terracotta accent family (#D97757)")
            L, C, H = hex_to_oklch(h)
            if 0.92 <= L <= 0.975 and 0.006 <= C <= 0.03 and 55 <= H <= 100 and re.search(r"background(-color)?\s*:\s*" + h, src, re.I):
                add("high", f"{h} background is the warm-cream AI default")
        except Exception:
            pass
    if re.search(r"#(0b0b0b|111111|111|0a0a0a|0d0d0d)\b", low): add("low", "Tinted near-black (#0b0b0b/#111) standing in for black — choose a designed dark")
    grads = re.findall(r"linear-gradient\(([^;]+?)\)\s*[;,]", src, re.I)
    purple = 0
    for gr in grads:
        hs = [hex_to_oklch(expand_hex(x))[2] for x in re.findall(r"#[0-9a-fA-F]{3,6}\b", gr)]
        if len(hs) >= 2 and sum(1 for h in hs if 250 <= h <= 320) >= 2: purple += 1
    if purple or re.search(r"(indigo|violet|purple)-\d00\s+to-(indigo|violet|purple|blue|pink)", low):
        add("high", "Blue→indigo→purple gradient — the #1 vibe-coded tell")
    if len(set(hexes)) > 18: add("med", f"{len(set(hexes))} distinct hex colors — palette discipline is missing (use tokens)")
    if len(re.findall(r"background-clip\s*:\s*text", src, re.I)) > 1: add("med", "Gradient text used more than once")

    # ── shape & depth ──
    radii = re.findall(r"border-radius\s*:\s*([^;}{]+)", src, re.I)
    if len(radii) >= 6 and len(set(r.strip() for r in radii)) == 1: add("med", f"One border-radius ({radii[0].strip()}) on everything — tie radius to size tiers")
    if re.search(r"rgba\(0,\s*0,\s*0,\s*0?\.1\)", low): add("low", "Default soft grey shadow rgba(0,0,0,.1) — use a two-part tinted shadow or none")
    if len(re.findall(r"backdrop-filter", low)) >= 3: add("med", "Glassmorphism on 3+ elements — the glass-card tell")
    if re.search(r"filter\s*:\s*blur\(\s*(?:[4-9]\d|\d{3})px", low) or re.search(r"\.(?:blob|orb|glow|aurora)\s*[{,]", low):
        add("med", "Blurred glow orb/blob decoration — ambient AI hero mood")

    # ── layout & structure ──
    if re.search(r"(min-)?height\s*:\s*100(d|s)?vh", low): add("low", "Hero at 100vh — leave a peek of the next section (false-floor risk)")
    centered = len(re.findall(r"text-align\s*:\s*center", low))
    if centered >= 6: add("med", f"text-align:center used {centered}× — centered stacks everywhere read as template")
    nums = len(re.findall(r">\s*0[1-9]\s*<", src))
    if nums >= 3: add("low", f"Numbered markers 01/02/03 ×{nums} — only valid for real sequences")
    if len(re.findall(r"class=\"[^\"]*(pill|badge|chip)[^\"]*\"", low)) and re.search(r"(new|announcing|introducing|beta)", low[:4000]):
        add("low", "Announcement pill above the hero headline — template chrome")
    fades = len(re.findall(r"(fade-?in-?up|fadeup|data-aos|reveal)", low))
    if fades >= 4: add("med", f"Entrance fade/slide on {fades} elements — choose one orchestrated moment")
    if re.search(r"→</(a|button)>|→\s*</(a|button)>", src): add("low", "'→' appended to button/link text")
    if text.count(" · ") >= 4: add("low", "Meta strings joined with middle dots repeatedly")

    # ── copy ──
    for pat in GENERIC_CTA:
        n = len(re.findall(r"\b" + pat + r"\b", text, re.I))
        if n: add("med" if pat in ("get started", "learn more", "submit", "click here") else "low", f"Generic copy: '{pat}' ×{n}")
    if re.search(r"lorem ipsum", low): add("high", "Lorem ipsum placeholder copy")
    em = len(EMOJI.findall(text))
    if em >= 3: add("high", f"{em} emoji in page text — emoji as icons/decoration is a vibe-coded tell")

    # ── quality floor ──
    if "<html" in low and not re.search(r"<html[^>]*\blang=", low): add("high", "Missing <html lang>")
    if "<head" in low and "viewport" not in low: add("high", "Missing meta viewport")
    if ":focus-visible" not in low and ":focus" not in low: add("high", "No visible focus style")
    if ("@keyframes" in low or "transition" in low) and "prefers-reduced-motion" not in low: add("med", "Motion without prefers-reduced-motion handling")
    imgs = re.findall(r"<img\b[^>]*>", src, re.I)
    noalt = [i for i in imgs if not re.search(r"\balt=", i, re.I)]
    if noalt: add("high", f"{len(noalt)} <img> without alt")
    if re.search(r"placeholder=\"[^\"]+\"", src) and not re.search(r"<label", low): add("med", "Inputs rely on placeholder instead of labels")
    if re.search(r"font-size\s*:\s*(1[01]|[0-9])px", low): add("med", "Text below 12px")

    weights = {"high": 12, "med": 6, "low": 2}
    score = max(0, 100 - sum(weights[s] for s, _ in F))
    order = {"high": 0, "med": 1, "low": 2}
    print(f"unclawdesign lint — score {score}/100 ({len(F)} findings)")
    for s, m in sorted(F, key=lambda x: order[x[0]]):
        print(f"  [{s:4}] {m}")
    if not F: print("  no tells found")
    return score

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(1)
    main(sys.argv[1:])
