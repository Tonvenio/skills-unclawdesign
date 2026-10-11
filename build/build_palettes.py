"""Seeds → data/palettes.json via colorlib.make_palette. Each seed is hand-designed in OKLCH."""
import os as _os
_ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
import json, sys, itertools
sys.path.insert(0, _os.path.join(_ROOT, "unclawdesign/scripts"))
from colorlib import make_palette, delta_e, hex_to_oklch

# (id, name, mode, moods, strategy, neutral[C,H] or bg[L,C,H], accent, accent2, accent3, story)
S = [
# ── light ──
("rhine-slate", "Rhine Slate", "light", "serious,cool,technical,trustworthy", "complementary", {"bg": [0.955, 0.012, 250]}, [0.48, 0.18, 262], [0.72, 0.17, 62], None, "Cool slate neutrals, a deep cobalt doing all the work, a signal-orange spark for one moment per page."),
("matcha-paper", "Matcha Paper", "light", "calm,natural,fresh,muted", "analogous+contrast", {"bg": [0.965, 0.014, 135]}, [0.52, 0.11, 138], [0.45, 0.11, 345], None, "Green-tinted paper, whisked-matcha green, a plum note for warmth."),
("bauhaus-primaries", "Bauhaus Primaries", "light", "bold,playful,artistic,vivid", "primary triad", {"bg": [0.985, 0.0, 0]}, [0.46, 0.17, 262], [0.58, 0.21, 28], [0.87, 0.17, 95], "Red, blue, yellow on off-white — use as flat blocks, circles and squares, never as gradients."),
("swiss-signal", "Swiss Signal", "light", "bold,serious,precise,minimal", "monochrome+signal", {"bg": [0.995, 0.0, 0]}, [0.60, 0.235, 29], None, None, "Pure white, true black type, one signal red. Nothing else."),
("hanko", "Hanko", "light", "serious,elegant,calm,minimal", "monochrome+seal", {"bg": [0.982, 0.004, 100]}, [0.54, 0.20, 30], None, None, "Washi-white, sumi-black text and a seal-red stamp used once or twice."),
("riso-pink-teal", "Riso Pink & Teal", "light", "playful,artistic,nostalgic,vivid", "duotone", {"bg": [0.955, 0.004, 255]}, [0.64, 0.24, 2], [0.56, 0.10, 205], None, "Fluorescent pink and teal ink on grey stock — overprint where they meet."),
("solarpunk", "Solarpunk", "light", "natural,fresh,optimistic,warm", "analogous", {"bg": [0.972, 0.02, 115]}, [0.55, 0.15, 145], [0.82, 0.16, 82], None, "Leaf green and sunlight yellow on a sunny off-white."),
("memphis-pop", "Memphis Pop", "light", "playful,vivid,energetic,nostalgic", "triad", {"bg": [0.985, 0.006, 250]}, [0.64, 0.25, 355], [0.76, 0.13, 195], [0.89, 0.17, 100], "Hot pink, turquoise and yellow with black linework — squiggles, confetti, terrazzo."),
("quiet-capital", "Quiet Capital", "light", "serious,luxurious,muted,calm", "monochrome", {"bg": [0.955, 0.005, 200]}, [0.52, 0.08, 68], None, None, "Stone-grey ground, charcoal type, a bronze accent. Wealth that whispers."),
("oxblood-library", "Oxblood Library", "light", "serious,warm,elegant,scholarly", "analogous+metal", {"bg": [0.968, 0.012, 15]}, [0.40, 0.13, 20], [0.68, 0.10, 82], None, "Blush-white pages, oxblood leather, a brass detail."),
("glacier-lab", "Glacier Lab", "light", "fresh,technical,cool,clean", "complementary", {"bg": [0.982, 0.01, 215]}, [0.52, 0.11, 218], [0.68, 0.17, 12], None, "Icy white, glacial teal-blue, coral-pink warning colour."),
("nordic-birch", "Nordic Birch", "light", "calm,fresh,natural,minimal", "complementary", {"bg": [0.985, 0.003, 230]}, [0.52, 0.17, 15], [0.42, 0.06, 175], None, "Birch white, lingonberry red, spruce green."),
("delft", "Delft", "light", "classic,cool,serious,crafted", "monochrome", {"bg": [0.985, 0.006, 255]}, [0.42, 0.14, 262], None, None, "Tin-glaze white and cobalt blue only — patterns and illustration in one ink."),
("tomato-market", "Tomato Market", "light", "fresh,energetic,warm,natural", "complementary", {"bg": [0.972, 0.016, 140]}, [0.60, 0.21, 30], [0.50, 0.12, 145], None, "Crisp white, ripe tomato, basil green."),
("ocean-liner", "Ocean Liner", "light", "classic,serious,nostalgic,cool", "nautical", {"bg": [0.978, 0.006, 240]}, [0.33, 0.10, 260], [0.58, 0.20, 27], [0.78, 0.12, 85], "Navy, signal red and brass — 1930s transatlantic posters."),
("peach-cocoa", "Peach & Cocoa", "light", "warm,soft,friendly,muted", "analogous+teal", {"bg": [0.945, 0.035, 60]}, [0.38, 0.06, 45], [0.55, 0.09, 195], None, "Peach-skin ground, cocoa type and buttons, a teal counterpoint."),
("rose-quartz", "Rose Quartz", "light", "soft,romantic,calm,elegant", "complementary", {"bg": [0.972, 0.014, 8]}, [0.52, 0.15, 5], [0.64, 0.05, 150], None, "Pale rose, deep rose accent, muted sage."),
("mint-tangerine", "Mint Condition", "light", "fresh,playful,energetic,friendly", "complementary", {"bg": [0.972, 0.025, 165]}, [0.45, 0.08, 185], [0.72, 0.17, 58], None, "Mint ground, deep teal, a tangerine pop."),
("brutalist-concrete", "Brutalist Concrete", "light", "bold,raw,technical,serious", "monochrome+signal", {"bg": [0.90, 0.003, 90]}, [0.25, 0.0, 0], [0.70, 0.20, 48], None, "Raw concrete grey, black type and black buttons, safety-orange used as big flat fills with black ink."),
("y2k-chrome", "Y2K Chrome", "light", "nostalgic,vivid,playful,cool", "duotone", {"bg": [0.95, 0.016, 250]}, [0.55, 0.22, 262], [0.66, 0.25, 350], None, "Icy chrome grey, electric blue, bubblegum pink — add metallic gradients only on objects."),
("aperol", "Aperol Spritz", "light", "energetic,warm,festive,vivid", "analogous+wine", {"bg": [0.988, 0.008, 70]}, [0.36, 0.11, 12], [0.71, 0.19, 52], None, "Bright white, deep wine for type-level accents, Aperol orange as big flat fills (with wine ink)."),
("arctic-data", "Arctic Data", "light", "technical,clean,cool,serious", "data-categorical", {"bg": [0.985, 0.004, 240]}, [0.52, 0.14, 245], [0.60, 0.15, 150], [0.75, 0.15, 75], "Clinical white with three distinguishable data hues (blue, green, amber)."),
("pistachio-raspberry", "Pistachio Gelato", "light", "playful,fresh,sweet,vivid", "complementary", {"bg": [0.965, 0.03, 125]}, [0.55, 0.20, 5], [0.50, 0.12, 132], None, "Pistachio cream ground, raspberry-ripple accent, deep pistachio second colour."),
("library-green", "Library Green", "light", "serious,scholarly,calm,classic", "analogous+metal", {"bg": [0.972, 0.008, 160]}, [0.38, 0.07, 160], [0.70, 0.11, 85], None, "Reading-room green lamps and brass on pale paper."),
("cherry-blossom", "Cherry Blossom", "light", "soft,calm,elegant,japanese", "monochrome+ink", {"bg": [0.976, 0.012, 350]}, [0.55, 0.14, 355], [0.30, 0.01, 260], None, "Sakura-white, blossom pink, sumi ink."),
("lagoon", "Lagoon", "light", "fresh,calm,natural,cool", "complementary", {"bg": [0.975, 0.012, 195]}, [0.48, 0.09, 200], [0.78, 0.10, 80], None, "Shallow-water white, deep lagoon, sand gold."),
("sage-studio", "Sage Studio", "light", "calm,natural,muted,warm", "analogous+ochre", {"bg": [0.955, 0.015, 145]}, [0.45, 0.06, 150], [0.72, 0.12, 80], None, "Sage-tinted walls, deep sage, ochre detail."),
("lavender-butter", "Lavender Haze", "light", "calm,dreamy,soft,playful", "complementary", {"bg": [0.962, 0.02, 300]}, [0.45, 0.15, 298], [0.90, 0.10, 95], None, "Lavender wash, violet accent, butter-yellow highlight — never as a violet-indigo gradient."),
("newsprint-gray", "Newsprint", "light", "serious,classic,journalistic,muted", "monochrome+signal", {"bg": [0.93, 0.003, 250]}, [0.50, 0.19, 18], None, None, "Newsprint grey, black ink, one red for breaking news."),
("monochrome-ink", "Monochrome Ink", "light", "minimal,serious,elegant,precise", "monochrome", {"bg": [0.99, 0.0, 0]}, [0.22, 0.0, 0], None, None, "Black on white. Accent is ink itself; hierarchy from type and space only."),
# ── dark ──
("fjord-night", "Fjord Night", "dark", "cool,calm,dark,serious", "monochrome", {"bg": [0.22, 0.03, 240]}, [0.80, 0.11, 205], None, None, "Deep fjord blue-black with glacier-cyan light."),
("amber-terminal", "Amber Terminal", "dark", "technical,nostalgic,dark,focused", "monochrome", {"bg": [0.2, 0.012, 70]}, [0.80, 0.16, 75], None, None, "Warm phosphor amber on a dark CRT — scanlines optional."),
("deco-noir", "Deco Noir", "dark", "luxurious,elegant,dark,dramatic", "metal+jewel", {"bg": [0.2, 0.008, 80]}, [0.78, 0.12, 85], [0.55, 0.10, 165], None, "Lacquer black, gold leaf, an emerald jewel."),
("aubergine-jazz", "Aubergine Jazz", "dark", "warm,dark,luxurious,soulful", "complementary", {"bg": [0.22, 0.05, 330]}, [0.80, 0.15, 80], [0.70, 0.12, 20], None, "Late-night plum, saffron spotlight, rosewood."),
("desert-dusk", "Desert Dusk", "dark", "warm,earthy,dark,calm", "analogous+cactus", {"bg": [0.24, 0.035, 45]}, [0.83, 0.08, 80], [0.68, 0.09, 150], None, "Canyon dusk brown, sand gold, cactus green."),
("chalkboard", "Chalkboard", "dark", "playful,nostalgic,educational,natural", "chalk", {"bg": [0.30, 0.045, 160]}, [0.88, 0.12, 95], [0.82, 0.09, 350], None, "Slate-green board, chalk yellow and chalk pink."),
("graphite-signal", "Graphite & Signal", "dark", "bold,technical,dark,energetic", "monochrome+signal", {"bg": [0.23, 0.004, 260]}, [0.88, 0.18, 98], None, None, "Graphite, white type, one signal-yellow."),
("forest-floor", "Forest Floor", "dark", "earthy,natural,dark,calm", "analogous", {"bg": [0.24, 0.03, 150]}, [0.76, 0.12, 128], [0.76, 0.04, 60], None, "Pine-shadow green, moss light, mushroom beige."),
("velvet-lounge", "Velvet Lounge", "dark", "luxurious,dark,romantic,warm", "metal", {"bg": [0.22, 0.06, 15]}, [0.86, 0.06, 85], None, None, "Burgundy velvet and champagne."),
("tidepool", "Tidepool", "dark", "cool,vivid,dark,playful", "complementary", {"bg": [0.23, 0.04, 200]}, [0.76, 0.14, 12], [0.84, 0.10, 95], None, "Deep teal water, coral, sunlit yellow."),
("neon-tokyo", "Neon Tokyo", "dark", "vivid,nightlife,dark,futuristic", "neon duotone", {"bg": [0.2, 0.04, 285]}, [0.70, 0.25, 340], [0.85, 0.13, 200], None, "Night-sky violet-black, magenta and cyan neon — glow only on signs, not on everything."),
("carbon-ice", "Carbon & Ice", "dark", "technical,cool,dark,precise", "monochrome", {"bg": [0.22, 0.006, 250]}, [0.84, 0.12, 210], None, None, "Carbon grey with ice-cyan instrument light."),
("observatory", "Observatory", "dark", "calm,dark,scientific,elegant", "complementary", {"bg": [0.21, 0.035, 265]}, [0.86, 0.10, 85], [0.72, 0.09, 220], None, "Midnight blue dome, starlight gold, telescope steel-blue."),
# ── color (saturated grounds) ──
("klein-field", "Klein Field", "color", "bold,vivid,artistic,confident", "complementary", {"bg": [0.40, 0.23, 266]}, [0.92, 0.17, 105], None, None, "International Klein Blue ground, white type, lemon accent."),
("citrus-court", "Citrus Court", "color", "playful,vivid,energetic,warm", "complementary", {"bg": [0.74, 0.17, 58]}, [0.36, 0.08, 158], None, None, "Tangerine ground, ink-black type, deep green accent."),
("blueprint", "Blueprint", "color", "technical,nostalgic,precise,cool", "monochrome", {"bg": [0.40, 0.13, 255]}, [0.90, 0.07, 210], None, None, "Blueprint blue with white linework and pale cyan."),
("cyanotype", "Cyanotype", "color", "artsy,nostalgic,calm,crafted", "monochrome+ochre", {"bg": [0.33, 0.09, 245]}, [0.86, 0.09, 85], None, None, "Prussian-blue sun print with pale ochre."),
("saffron-temple", "Saffron Temple", "color", "warm,vivid,spiritual,festive", "analogous", {"bg": [0.79, 0.16, 72]}, [0.38, 0.13, 20], None, None, "Saffron ground, maroon type and accent."),
("mustard-ink", "Mustard Seed", "color", "retro,bold,warm,graphic", "complementary", {"bg": [0.81, 0.14, 92]}, [0.35, 0.11, 262], None, None, "Mustard ground with ink-blue — 60s book cover."),
("pink-ultramarine", "Pink Riot", "color", "playful,loud,bold,vivid", "complementary", {"bg": [0.78, 0.15, 355]}, [0.34, 0.19, 266], None, None, "Bubblegum ground, ultramarine type and blocks."),
("butter-navy", "Butter & Navy", "color", "friendly,retro,warm,calm", "complementary", {"bg": [0.93, 0.08, 95]}, [0.35, 0.12, 262], [0.60, 0.20, 28], None, "Butter-yellow ground, navy, a tomato detail."),
("electric-grape", "Electric Grape", "color", "bold,vivid,nightlife,playful", "complementary", {"bg": [0.40, 0.20, 300]}, [0.92, 0.19, 125], None, None, "Grape-violet ground with electric lime — loud and short."),
("forest-poster", "Forest Poster", "color", "natural,bold,earthy,confident", "complementary", {"bg": [0.40, 0.08, 155]}, [0.90, 0.10, 90], [0.72, 0.15, 35], None, "Deep forest-green ground, cream-yellow type, persimmon accent — national-park poster."),
("brick-red", "Brick Wall", "color", "bold,warm,urban,confident", "monochrome", {"bg": [0.42, 0.15, 28]}, [0.92, 0.05, 90], None, None, "Brick-red ground, bone-white type. Muscle and warmth."),
]

def main():
    out, problems = [], []
    for sid, name, mode, moods, strat, base, a, a2, a3, story in S:
        seed = {"mode": mode, "accent": a}
        if "neutral" in base: seed["neutral"] = base["neutral"]
        if "bg" in base:
            seed["bg"] = base["bg"]; seed["neutral"] = [base["bg"][1], base["bg"][2]]
        if a2: seed["accent2"] = a2
        if a3: seed["accent3"] = a3
        p = make_palette(seed)
        bad = {k: c for k, c in p["checks"].items() if not c["all_ok"]}
        if bad or p["flags"]:
            problems.append((sid, {k: {kk: vv for kk, vv in c.items() if kk.endswith("ok") and not vv} for k, c in bad.items()}, p["flags"]))
        out.append({"id": sid, "name": name, "primary_mode": mode, "moods": moods.split(","), "strategy": strat,
                    "story": story, "seed": seed, **p})
    # variety: nearest neighbour by (primary bg, accent)
    near = []
    for x, y in itertools.combinations(out, 2):
        vx, vy = x["variants"][x["primary_mode"]], y["variants"][y["primary_mode"]]
        d = delta_e(vx["bg"], vy["bg"]) + delta_e(vx["accent"], vy["accent"])
        near.append((round(d, 3), x["id"], y["id"]))
    near.sort()
    json.dump({"version": "2026-10", "generator": "scripts/colorlib.py make_palette()", "palettes": out},
              open(_os.path.join(_ROOT, "unclawdesign/data/palettes.json"), "w"), indent=1)
    from collections import Counter
    print(len(out), "palettes", Counter(p["primary_mode"] for p in out))
    print("PROBLEMS:", *problems, sep="\n  ")
    print("closest pairs:", near[:6])

main()
