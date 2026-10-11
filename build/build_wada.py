"""Wada combinations -> data/palettes-wada.json (+ compact data/wada-combos.json for the browser customizer)."""
import os as _os
_ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
import json, sys, math
from collections import defaultdict
sys.path.insert(0, _os.path.join(_ROOT, "unclawdesign/scripts"))
from colorlib import combo_palette, hex_to_oklch

src = json.load(open(_os.path.join(_ROOT, "build/wada/colors.json")))
combos = defaultdict(list)
for i, x in enumerate(src):
    for k in x["combinations"]:
        combos[k].append(i)

def moods(hexes):
    L = [hex_to_oklch(h) for h in hexes]
    avgC = sum(c for _, c, _ in L) / len(L)
    avgL = sum(l for l, _, _ in L) / len(L)
    spread = max(l for l, _, _ in L) - min(l for l, _, _ in L)
    # chroma-weighted mean hue
    x = sum(c * math.cos(math.radians(h)) for _, c, h in L); y = sum(c * math.sin(math.radians(h)) for _, c, h in L)
    hue = math.degrees(math.atan2(y, x)) % 360
    m = set()
    m.add("muted" if avgC < 0.07 else "vivid" if avgC > 0.13 else "balanced")
    if avgC < 0.07: m.add("calm")
    if avgC > 0.13: m.add("bold")
    if 20 <= hue <= 100: m.add("warm")
    if 170 <= hue <= 290: m.add("cool")
    if 90 <= hue <= 160 and avgC < 0.12: m.update({"natural", "earthy"})
    if (hue >= 320 or hue <= 15) and avgL > 0.6: m.update({"romantic", "soft"})
    if avgL > 0.72: m.update({"light", "soft"})
    if min(l for l, _, _ in L) < 0.3: m.add("dark")
    if spread > 0.5: m.add("dramatic")
    if len(L) >= 3 and sum(1 for _, c, _ in L if c > 0.1) >= 3: m.update({"playful", "energetic"})
    if avgC < 0.1 and 30 <= hue <= 90: m.update({"nostalgic", "retro"})
    m.add("crafted")
    return sorted(m)

out, compact_colors, idx_of = [], [], {}
for i, x in enumerate(src):
    idx_of[i] = len(compact_colors); compact_colors.append([x["name"], x["hex"]])
compact_combos = []
for k in sorted(combos):
    ids = combos[k]
    hexes = [src[i]["hex"] for i in ids]; names = [src[i]["name"] for i in ids]
    p = combo_palette(hexes)
    out.append({"id": f"wada-{k:03d}", "name": f"Wada No. {k}", "source": "wada", "number": k,
                "colors": [{"name": n, "hex": h} for n, h in zip(names, hexes)],
                "primary_mode": "color", "moods": moods(hexes), "strategy": f"wada-combination-{len(hexes)}",
                "story": f"Sanzo Wada, A Dictionary of Color Combinations, No. {k}: " + " + ".join(names) + ".",
                "seed": {"colors": hexes}, **{kk: vv for kk, vv in p.items() if kk != "primary"}})
    compact_combos.append([k, [idx_of[i] for i in ids]])
json.dump({"version": "2026-10", "source": "Sanzo Wada, A Dictionary of Color Combinations (Seigensha); hex data: github.com/mattdesl/dictionary-of-colour-combinations (MIT), CMYK→sRGB via SWOP v2", "palettes": out},
          open(_os.path.join(_ROOT, "unclawdesign/data/palettes-wada.json"), "w"), indent=1, ensure_ascii=False)
json.dump({"colors": compact_colors, "combos": compact_combos}, open(_os.path.join(_ROOT, "unclawdesign/data/wada-combos.json"), "w"), separators=(",", ":"), ensure_ascii=False)
from collections import Counter
print(len(out), "wada palettes; flags:", sum(1 for p in out if p["flags"]), Counter(m for p in out for m in p["moods"]).most_common(12))
