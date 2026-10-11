#!/usr/bin/env python3
"""
roll.py — the unclawdesign genome engine.

Rolls design "genomes" (experience × paradigm × palette × font pair × 14 visual genes) that fit a brief,
then picks a maximally DIFFERENT set of candidates and avoids what was used in recent runs.
The experience is the page's structure/interaction archetype (data/experiences.json): a well-made
classic landing, parallax scrollytelling, a scroll-scrubbed sequence, a physics toy, an OS desktop, …

Usage
  python3 roll.py --job conversion --tone "calm,trustworthy,precise" --sector "legal tech" [options]
  python3 roll.py commit 2                 # record candidate #2 of the last roll as used (feeds variety)
  python3 roll.py css 2 -o tokens.css      # write the token stylesheet for candidate #2 of the last roll
  python3 roll.py show 2                   # the raw genome (JSON)
  python3 roll.py list paradigms|palettes|fonts|genes|moods|experiences
  python3 roll.py check                    # validate data/experiences.json against the other libraries

Options
  --job        conversion | brand | editorial | portfolio | product-ui | dashboard | docs | event | ecommerce
  --tone       comma-separated moods from the brief (see `list moods`)
  --sector     free text; matched against each paradigm's and experience's "fits"
  --mode       any | light | dark | color          (default any)
  --count      number of divergent candidates      (default 3)
  --wild       0..3 — higher = more surprising picks (default 1)
  --seed       integer for reproducible rolls       (default: random)
  --paradigm / --palette / --fonts / --experience   force a specific id (the rest still rolls)
  --structure  any | landing | experiential   landing = --experience landing-classic; experiential = never landing-classic
  --bold       prefer ambitious experiences (effort M/L, low novelty risk) — for "creative / playful / award-level" briefs
  --avoid      comma list of ids (paradigms, palettes, font pairs or experiences) to exclude
  --palette-source any | wada | library   (wada = Sanzo Wada's 348 historical combinations; library = generated set)
  --fontshare  allow Fontshare pairs (not loadable inside claude.ai artifacts)
  --history    path (default ~/.unclawdesign/history.json); --no-history to ignore
  --json       machine-readable output
"""
import argparse, json, math, os, random, re, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
STATE = Path(os.environ.get("UNCLAW_HOME", Path.home() / ".unclawdesign"))
LAST = STATE / "last_roll.json"

def load(name): return json.load(open(DATA / name, encoding="utf-8"))

PARADIGMS = load("paradigms.json")
PALETTES_LIB = load("palettes.json")["palettes"]
PALETTES_WADA = load("palettes-wada.json")["palettes"]
PALETTES = PALETTES_LIB + PALETTES_WADA
FONTS = load("fonts.json")
GENES = load("genes.json")["genes"]
EXPERIENCES = load("experiences.json")["experiences"]
GENE_KEYS = ["shape", "edge", "elevation", "texture", "hero", "grid", "motif", "imagery", "icons", "motion", "density", "align", "scale", "color_use"]
JOBS = ["conversion", "brand", "editorial", "portfolio", "product-ui", "dashboard", "docs", "event", "ecommerce"]
JOB_COMPAT = {"dashboard": {"dashboard", "product-ui"}, "product-ui": {"product-ui", "dashboard"}, "docs": {"docs", "product-ui"},
              "ecommerce": {"ecommerce", "brand"}, "conversion": {"conversion"}}
DIST_W = {"experience": 3, "paradigm": 3, "palette": 2, "fonts": 2, "variant": 1, "hero": 1.5, "shape": 1, "grid": 1, "motif": 1, "color_use": 1,
          "texture": .6, "elevation": .6, "edge": .5, "imagery": .6, "motion": .5, "scale": .5, "icons": .3, "density": .3, "align": .4}
LANDING = "landing-classic"
LANDING_HOME = {"conversion", "product-ui", "dashboard", "docs"}   # jobs where the classic structure is the sensible default
EXP_MARGIN = 2.5   # alternatives must score within this of the best-fitting experience in the pool (keeps diversity sensible)
FONT_MOOD_MAP = {"cute": "playful", "cheerful": "playful", "goofy": "playful", "childlike": "playful", "bouncy": "playful",
                 "fun": "playful", "happy": "playful", "joyful": "playful", "sweet": "soft", "squishy": "soft", "groovy": "retro",
                 "chunky": "bold", "cinematic": "dramatic", "refined": "elegant", "sophisticated": "elegant", "couture": "luxurious",
                 "industrial": "raw", "punk": "raw", "hacker": "technical", "developer": "technical", "engineered": "precise",
                 "systematic": "precise", "neutral": "minimal", "serene": "calm", "quiet": "calm", "contemplative": "calm",
                 "literate": "editorial", "journalistic": "editorial", "dramatic": "dramatic", "warm": "warm", "friendly": "friendly",
                 "technical": "technical", "precise": "precise", "elegant": "elegant", "luxury": "luxurious", "quiet luxury": "luxurious",
                 "playful": "playful", "retro": "retro", "nostalgic": "nostalgic", "calm": "calm", "bold": "bold", "raw": "raw",
                 "brutal": "raw", "experimental": "experimental", "minimal": "minimal", "crafted": "crafted", "handmade": "crafted",
                 "futuristic": "futuristic", "urban": "urban", "soft": "soft", "serious": "serious", "academic": "scholarly",
                 "scholarly": "scholarly", "artsy": "artistic", "artistic": "artistic", "energetic": "energetic", "fresh": "fresh",
                 "romantic": "romantic", "natural": "natural", "trustworthy": "trustworthy", "credible": "trustworthy", "loud": "bold", "vivid": "vivid"}

# ── history ────────────────────────────────────────────────────────
def read_history(path):
    try: return json.load(open(path))
    except Exception: return []

def recency_penalty(hist, key, value):
    """Chosen genomes in the last 4 runs weigh heavily, the last 12 lightly."""
    pen = 0.0
    chosen = [h for h in hist if h.get("chosen")][-12:]
    for i, h in enumerate(reversed(chosen)):
        if h.get(key) == value:
            pen += 2.2 if i < 4 else 0.8
    shown = [h for h in hist if not h.get("chosen")][-18:]  # candidates shown in recent rolls but not picked
    pen += 0.35 * sum(1 for h in shown if h.get(key) == value)
    return pen

# ── scoring helpers ────────────────────────────────────────────────
CLUSTER_MOODS = {"playful-rounded": {"playful", "friendly", "soft"}, "retro-70s-groovy": {"retro", "playful", "warm"},
    "handmade-craft": {"crafted", "friendly", "warm"}, "expressive-display": {"experimental", "bold"},
    "condensed-poster-sport": {"bold", "energetic"}, "grotesk-brutal": {"raw", "bold"}, "luxury-high-contrast": {"luxurious", "elegant"},
    "art-deco-gilded": {"luxurious", "retro", "elegant"}, "scholarly-institutional": {"scholarly", "serious", "trustworthy"},
    "editorial-literary": {"editorial", "elegant", "serious"}, "swiss-neutral-precise": {"precise", "minimal", "technical"},
    "geometric-modern": {"fresh", "friendly", "precise"}, "humanist-warm": {"warm", "friendly", "trustworthy"},
    "retro-futurist-tech": {"futuristic", "technical", "retro"}, "monospace-technical": {"technical", "precise"},
    "japanese-minimal": {"calm", "minimal", "elegant"}}
OPPOSITES = {"playful": {"serious", "trustworthy", "precise", "scholarly", "luxurious"}, "serious": {"playful"}, "trustworthy": {"playful", "raw", "experimental"},
    "precise": {"playful", "raw"}, "scholarly": {"playful"}, "raw": {"elegant", "luxurious", "soft", "trustworthy", "precise"},
    "luxurious": {"raw", "playful"}, "elegant": {"raw"}, "soft": {"raw", "bold"}, "calm": {"energetic", "experimental"},
    "energetic": {"calm"}, "minimal": set(), "experimental": {"trustworthy", "calm"}, "dark": {"fresh"}, "fresh": {"dark"}}

def conflicts(tone, moods):
    return sum(1 for t in tone for m in moods if m in OPPOSITES.get(t, set()))

def font_moods(pair):
    out = set(CLUSTER_MOODS.get(pair.get("cluster"), set()))
    for m in pair.get("moods", []):
        m = m.strip().lower()
        for k, v in FONT_MOOD_MAP.items():
            if k in m: out.add(v)
    return out

def softmax_pick(rng, items, scores, temp):
    if not items: return None
    mx = max(scores)
    w = [math.exp((s - mx) / max(temp, 0.05)) for s in scores]
    return rng.choices(items, weights=w, k=1)[0]

def pick_gene(rng, values, wild, hist, key):
    values = list(dict.fromkeys(values))  # de-dupe, keep order
    scores = [-(i * (0.7 / (1 + wild))) - recency_penalty(hist, key, v) * 0.5 for i, v in enumerate(values)]
    return softmax_pick(rng, values, scores, 1.0)

def job_ok(par, job):
    if not job: return True
    want = JOB_COMPAT.get(job, {job})
    return bool(want & set(par["jobs"]))

def sector_hits(fits, sector):
    """True when a meaningful word of the brief's sector appears in one of the 'fits' phrases."""
    words = [w.strip(",.;:()") for w in sector.lower().split()]
    words = [w for w in words if len(w) > 2 and w not in ("and", "the", "for", "with", "tech")] or [w for w in words if w]
    return any(w in f.lower() for f in fits for w in words)

# ── experience (structure / interaction archetype) ─────────────────
def exp_candidates(a):
    if a.experience:
        return [e for e in EXPERIENCES if e["id"] == a.experience]
    pool = [e for e in EXPERIENCES if (not a.job or a.job in e["jobs"]) and e["id"] not in a.avoid]
    if a.structure == "experiential":
        pool = [e for e in pool if e["id"] != LANDING]
    return pool or [e for e in EXPERIENCES if e["id"] == LANDING]

def exp_score(e, par, a, hist, tone):
    """Fit of an experience to the brief and to the rolled paradigm; penalises template-y and recently used ones."""
    s = 0.0
    if a.job and a.job in e["jobs"]:
        s += 1.6 if e["jobs"].index(a.job) < 2 else 0.6
    s += 1.8 * (par["id"] in e["compatible_paradigms"])
    s += 0.6 * len(tone & set(e.get("moods", [])))
    s -= 1.0 * conflicts(tone, e.get("moods", []))
    sector = (a.sector or "").strip()
    if sector:
        hit = sector_hits(e["fits"], sector)
        s += 0.8 * hit
        if e.get("needs") and not hit: s -= 1.8      # a configurator needs a configurable product, etc.
    elif e.get("needs"):
        s -= 0.4
    level = e["novelty_risk"]["level"]
    home = e["id"] == LANDING and a.job in LANDING_HOME
    if home and not a.bold:
        s += 1.0                                      # task-first jobs default to a conventional structure (research P1: choose by visit mode)
    if not home:                                      # the classic structure is only 'template-y' where an experience was possible
        s -= {"high": 1.0 + 0.4 * a.wild, "medium": 0.3}.get(level, 0.0)
    if a.bold:
        s += {"L": 1.4, "M": 0.8, "S": -1.0}[e["effort"]]
        s += {"low": 1.0, "medium": 0.0, "high": -1.0}[level]
        if e["id"] == LANDING: s -= 2.0
    if not set(par["genes"]["motion"]) & set(e.get("motion_genes", [])) and e["id"] != LANDING:
        s -= 0.8                                      # a 'still' paradigm fights a motion-led experience
    s -= recency_penalty(hist, "experience", e["id"])
    return s

def fit_motion(rng, g, par, e):
    """Keep the motion gene coherent with the experience: prefer a value both the paradigm and the experience allow;
    never leave a motion-led experience on 'still'."""
    want = e.get("motion_genes") or []
    if not want or e["id"] == LANDING or g["motion"] in want:
        return
    shared = [m for m in par["genes"]["motion"] if m in want]
    if shared:
        g["motion"] = rng.choice(shared)
    elif g["motion"] == "still":
        g["motion"] = want[0]

# ── genome sampling ────────────────────────────────────────────────
def roll_one(rng, a, hist, tone):
    temp = 1.0 + 0.6 * a.wild
    pars = [p for p in PARADIGMS["paradigms"] if job_ok(p, a.job) and p["id"] not in a.avoid]
    if a.paradigm: pars = [p for p in PARADIGMS["paradigms"] if p["id"] == a.paradigm]
    if a.mode in ("light", "dark", "color"):
        pars = [p for p in pars if a.mode in p["palette_modes"]] or pars
    sector = (a.sector or "").lower()
    locked_exp = next((e for e in EXPERIENCES if e["id"] == a.experience), None)
    def pscore(p):
        s = 2.0 * len(tone & set(p["moods"]))
        if locked_exp: s += 1.5 * (p["id"] in locked_exp["compatible_paradigms"])
        s += 1.5 * any(w and (w in f.lower() or f.lower() in sector) for f in p["fits"] for w in sector.split())
        s -= 1.6 * conflicts(tone, p["moods"])
        s -= {"high": 2.2, "medium": 0.7}.get(p["ai_default_risk"], 0)
        s -= recency_penalty(hist, "paradigm", p["id"])
        return s
    par = softmax_pick(rng, pars, [pscore(p) for p in pars], temp)
    g = {k: pick_gene(rng, par["genes"][k], a.wild, hist, k) for k in GENE_KEYS}

    # experience: the page's structure / interaction archetype, conditioned on job, paradigm, tone and sector
    exps = exp_candidates(a)
    escores = [exp_score(e, par, a, hist, tone) for e in exps]
    exp = exps[0] if len(exps) == 1 else softmax_pick(rng, exps, escores, temp)
    escore = escores[exps.index(exp)]
    fit_motion(rng, g, par, exp)

    # variant / palette conditioned on color_use + mode
    modes = [m for m in par["palette_modes"] if a.mode in ("any", m)] or par["palette_modes"]
    if g["color_use"] == "full-ground" and a.mode in ("light", "dark"):
        # an explicit light/dark request beats a rolled full-ground gene (full-ground forces the color variant)
        opts = par["genes"].get("color_use") or []
        opts = list(opts.keys()) if isinstance(opts, dict) else list(opts)
        alts = [c for c in opts if c != "full-ground"] or ["neutral-plus-accent"]
        g["color_use"] = rng.choice(alts)
    if g["color_use"] == "full-ground":
        variant = "color"
    else:
        variant = rng.choices(modes, weights=[1.0 / (i + 1) for i in range(len(modes))], k=1)[0]
        if variant == "color" and g["color_use"] != "full-ground":
            g["color_use"] = "full-ground"
    pool = {"wada": PALETTES_WADA, "library": PALETTES_LIB}.get(a.palette_source, PALETTES)
    cands = [pl for pl in pool if variant in pl["variants"] and pl["id"] not in a.avoid
             and not pl.get("flags", {}).get(variant) and pl["checks"][variant]["all_ok"]]
    if a.palette: cands = [pl for pl in PALETTES if pl["id"] == a.palette] or cands
    want_moods = tone | set(par["moods"])
    strat_bonus = {"duotone": ("duotone", "triad", "complementary"), "monochrome": ("monochrome",),
                   "color-blocking": ("triad", "complementary", "primary", "duotone", "nautical"), "full-ground": (),
                   "neutral-plus-accent": (), "inverted-bands": ()}
    def palscore(pl):
        s = 1.4 * len(want_moods & set(pl["moods"]))
        s += 1.2 * any(t in pl["strategy"] for t in strat_bonus.get(g["color_use"], ()))
        if g["color_use"] == "color-blocking" and "accent-2" not in pl["variants"][variant]: s -= 1.5
        if g["color_use"] == "duotone" and "accent-2" not in pl["variants"][variant]: s -= 1.0
        s += 0.6 * (pl["primary_mode"] == variant)
        s -= 1.4 * conflicts(tone, pl["moods"])
        if pl.get("source") == "wada": s += 0.6   # hand-made historical combinations beat generated ones on distinctiveness
        s -= recency_penalty(hist, "palette", pl["id"])
        return s
    pal = softmax_pick(rng, cands, [palscore(pl) for pl in cands], temp)
    if variant not in pal["variants"]:
        variant = pal["primary_mode"]

    pairs = [f for f in FONTS["pairs"]] + (FONTS.get("fontshare_pairs", []) if a.fontshare else [])
    pairs = [f for f in pairs if f["id"] not in a.avoid]
    if a.fonts: pairs = [f for f in pairs if f["id"] == a.fonts] or pairs
    def fscore(f):
        s = 2.5 if f["cluster"] in par["font_clusters"] else -2.5
        if f["cluster"] in par["font_clusters"][:1]: s += 0.8
        fm = font_moods(f)
        s += 0.9 * len(want_moods & fm) + 0.6 * len(tone & fm)
        s -= 1.8 * conflicts(tone, fm)
        if any(w in " ".join(f.get("avoid_for", [])).lower() for w in sector.split() if len(w) > 3): s -= 2.5
        if f["body"].get("category") == "mono" and a.job not in ("docs", "product-ui", "dashboard", "portfolio") \
                and par["id"] not in ("terminal-cli", "web-brutalism"): s -= 2.5  # mono body text hurts reading on marketing pages
        s -= recency_penalty(hist, "fonts", f["id"])
        return s
    fp = softmax_pick(rng, pairs, [fscore(f) for f in pairs], temp)

    fit = round(pscore(par) + palscore(pal) + fscore(fp) + escore, 1)
    return {"experience": exp["id"], "paradigm": par["id"], "palette": pal["id"], "variant": variant, "fonts": fp["id"], **g, "fit": fit,
            "_efit": escore}

def distance(x, y):
    d = 0.0
    for k, w in DIST_W.items():
        if x.get(k) != y.get(k):
            d += w
    fx = next(f for f in all_pairs() if f["id"] == x["fonts"])
    fy = next(f for f in all_pairs() if f["id"] == y["fonts"])
    if x["fonts"] != y["fonts"] and fx["cluster"] == fy["cluster"]:
        d -= 1.0
    return d

def all_pairs(): return FONTS["pairs"] + FONTS.get("fontshare_pairs", [])

def diverse(rng, a, hist, tone, n):
    pool, seen = [], set()
    for _ in range(140):
        gnm = roll_one(rng, a, hist, tone)
        key = json.dumps({k: v for k, v in gnm.items() if k not in ("fit", "_efit")}, sort_keys=True)
        if key not in seen:
            seen.add(key); pool.append(gnm)
    # experiences that fit the brief clearly worse than the best one never enter just to add variety
    efloor = max(p["_efit"] for p in pool) - EXP_MARGIN - (1.5 if a.bold else 0.0)   # --bold spreads scores; keep variety
    sane = [p for p in pool if p["_efit"] >= efloor or (p["experience"] == LANDING and a.job in LANDING_HOME and not a.bold)] or pool
    top = sorted(sane, key=lambda p: -p["fit"])[: max(6, len(sane) // 3)]
    chosen = [softmax_pick(rng, top, [p["fit"] for p in top], 1.5 + a.wild)]
    while len(chosen) < min(n, len(sane)):
        floor = sorted(p["fit"] for p in sane)[len(sane) // 3]  # never pick from the worst-fitting third
        ok = [p for p in sane if p not in chosen and p["fit"] >= floor] or [p for p in sane if p not in chosen]
        best = max(ok, key=lambda p: min(distance(p, c) for c in chosen) + 0.25 * p["fit"] + rng.random() * 0.5)
        chosen.append(best)
    return [{k: v for k, v in c.items() if k != "_efit"} for c in chosen]

# ── presentation ───────────────────────────────────────────────────
def by_id(items, i): return next(x for x in items if x["id"] == i)

def exp_lines(e):
    """Card block for an experience archetype."""
    nov = e["novelty_risk"]
    out = [f"- **Experience** `{e['id']}` — {e['name']} (effort {e['effort']}, novelty risk {nov['level']}): {e['essence']}",
           "  - structure: " + " → ".join(e["structure"]),
           "  - signature moves: " + "; ".join(e["signature_moves"]),
           "  - techniques: " + "; ".join(e["techniques"][:5]),
           "  - libraries: " + "; ".join(e["libraries"]),
           f"  - mobile: {e['mobile_strategy']}",
           f"  - reduced motion: {e['reduced_motion_strategy']}"]
    if nov["level"] != "low":
        out.append(f"  - novelty risk: {nov['why']}")
    if e.get("needs"):
        out.append(f"  - needs from the brief: {e['needs']}")
    ref = f"references/experiences.md#{e['id']}"
    out.append(f"  - recipe: `{ref}`" + (f" · reference build: showcase `{e['showcase']}`" if e.get("showcase") else ""))
    return out

def card(n, gnm):
    par = by_id(PARADIGMS["paradigms"], gnm["paradigm"])
    pal = by_id(PALETTES, gnm["palette"])
    fp = by_id(all_pairs(), gnm["fonts"])
    t = pal["variants"][gnm["variant"]]
    dt = fp["display_treatment"]
    exp = next((e for e in EXPERIENCES if e["id"] == gnm.get("experience")), None)
    title = (f"{exp['name']} · " if exp else "") + f"{par['name']} × {pal['name']} ({gnm['variant']}) × {fp['name']}"
    lines = [f"## Candidate {n}: {title}  — fit {gnm.get('fit', '?')}",
             f"*{par['essence']}*", ""]
    if exp:
        lines += exp_lines(exp)
    lines += [
             f"- **Paradigm** `{par['id']}` — traits: " + "; ".join(par["traits"][:4]),
             f"- **Palette** `{pal['id']}` — {pal['story']}",
             "  - tokens: " + ", ".join(f"{k} {v}" for k, v in t.items() if k in ("bg", "surface", "text", "text-muted", "accent", "accent-ink", "accent-2", "accent-3")),
             f"- **Type** `{fp['id']}` — display **{fp['display']['family']}** / body **{fp['body']['family']}**"
             + (f" / mono **{fp['mono']['family']}**" if fp.get("mono") else "")
             + f" · display {dt['case']}, weight {dt['weight']}, tracking {dt['tracking_em']}em, leading {dt['line_height']}",
             f"  - why it pairs: {fp.get('contrast_logic', '')}",
             "- **Genes** " + " · ".join(f"{k}: `{gnm[k]}`" for k in GENE_KEYS),
             f"- **Signature move** — motif `{gnm['motif']}` ({GENES['motif'][gnm['motif']]}) carried by the `{gnm['hero']}` hero ({GENES['hero'][gnm['hero']]})"
             + (" — the hero gene shapes the experience's first scene." if exp and exp["id"] != LANDING else "."),
             "- **CSS moves**: " + " | ".join(par["css_moves"][:3]),
             "- **Watch out**: " + "; ".join(par["risks"])]
    return "\n".join(lines)

def main():
    if len(sys.argv) > 1 and sys.argv[1] in ("commit", "css", "list", "show", "check"):
        return sub(sys.argv[1], sys.argv[2:])
    ap = argparse.ArgumentParser(add_help=True, description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--job", default=None); ap.add_argument("--tone", default=""); ap.add_argument("--sector", default="")
    ap.add_argument("--mode", default="any"); ap.add_argument("--count", type=int, default=3); ap.add_argument("--wild", type=float, default=1.0)
    ap.add_argument("--seed", type=int, default=None); ap.add_argument("--paradigm"); ap.add_argument("--palette"); ap.add_argument("--fonts")
    ap.add_argument("--experience", help="lock the experience archetype (see `list experiences`)")
    ap.add_argument("--structure", default="any", choices=["any", "landing", "experiential"],
                    help="landing = --experience landing-classic; experiential = exclude landing-classic")
    ap.add_argument("--bold", action="store_true", help="prefer ambitious experiences (effort M/L, low novelty risk)")
    ap.add_argument("--avoid", default=""); ap.add_argument("--fontshare", action="store_true")
    ap.add_argument("--palette-source", default="any", choices=["any", "wada", "library"])
    ap.add_argument("--history", default=str(STATE / "history.json")); ap.add_argument("--no-history", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    a.avoid = {x.strip() for x in a.avoid.split(",") if x.strip()}
    if a.structure == "landing" and not a.experience:
        a.experience = LANDING
    if a.experience and not any(e["id"] == a.experience for e in EXPERIENCES):
        ap.error(f"unknown experience '{a.experience}'. Known: {', '.join(e['id'] for e in EXPERIENCES)}")
    if a.job and a.job not in JOBS:
        ap.error(f"unknown job '{a.job}'. Known: {', '.join(JOBS)}")
    seed = a.seed if a.seed is not None else int.from_bytes(os.urandom(4), "little")
    rng = random.Random(seed)
    hist = [] if a.no_history else read_history(a.history)
    tone = {t.strip().lower() for t in a.tone.split(",") if t.strip()}
    unknown = tone - set(PARADIGMS["moods"])
    cands = diverse(rng, a, hist, tone, a.count)
    STATE.mkdir(parents=True, exist_ok=True)
    if not a.no_history:
        hp = Path(a.history); hp.parent.mkdir(parents=True, exist_ok=True)
        json.dump((hist + [{**c, "chosen": False, "t": int(time.time())} for c in cands])[-80:], open(hp, "w"), indent=1)
    json.dump({"seed": seed, "args": {k: (list(v) if isinstance(v, set) else v) for k, v in vars(a).items()}, "candidates": cands},
              open(LAST, "w"), indent=1)
    if a.json:
        print(json.dumps({"seed": seed, "candidates": cands}, indent=1)); return
    print(f"# Rolled {len(cands)} divergent genomes (seed {seed}; history: {len(hist)} entries)")
    if unknown: print(f"_Tone words not in the mood vocabulary were ignored: {', '.join(sorted(unknown))}_")
    for i, gnm in enumerate(cands, 1):
        print(); print(card(i, gnm))
    print("\nNext: pick one (or merge), then `python3 roll.py commit N` and `python3 roll.py css N -o tokens.css`."
          "\nStructure: lock it with `--experience ID` (or `--structure landing`), go bolder with `--bold`; recipes in references/experiences.md.")

def check_experiences():
    """Validate data/experiences.json: required fields, unique ids, known jobs/paradigms/motion genes, enums."""
    required = ["id", "name", "essence", "structure", "signature_moves", "interaction_model", "techniques", "libraries", "media",
                "jobs", "fits", "avoid_when", "novelty_risk", "effort", "mobile_strategy", "reduced_motion_strategy",
                "a11y_requirements", "perf_budget", "compatible_paradigms", "examples", "showcase"]
    par_ids = {p["id"] for p in PARADIGMS["paradigms"]}
    moods, motions = set(PARADIGMS["moods"]), set(GENES["motion"])
    errs, seen = [], set()
    for e in EXPERIENCES:
        i = e.get("id", "?")
        errs += [f"{i}: missing field '{k}'" for k in required if k not in e]
        if i in seen: errs.append(f"{i}: duplicate id")
        seen.add(i)
        if i != i.lower() or " " in i or "_" in i: errs.append(f"{i}: id is not kebab-case")
        errs += [f"{i}: unknown job '{j}'" for j in e.get("jobs", []) if j not in JOBS]
        errs += [f"{i}: unknown paradigm '{p}'" for p in e.get("compatible_paradigms", []) if p not in par_ids]
        errs += [f"{i}: unknown mood '{m}'" for m in e.get("moods", []) if m not in moods]
        errs += [f"{i}: unknown motion gene '{m}'" for m in e.get("motion_genes", []) if m not in motions]
        if e.get("effort") not in ("S", "M", "L"): errs.append(f"{i}: effort must be S|M|L")
        nr = e.get("novelty_risk", {})
        if nr.get("level") not in ("low", "medium", "high") or not nr.get("why"): errs.append(f"{i}: novelty_risk needs level low|medium|high and why")
        if not 2 <= len(e.get("examples", [])) <= 3: errs.append(f"{i}: needs 2–3 examples")
        errs += [f"{i}: example without https url: {x.get('name')}" for x in e.get("examples", []) if not str(x.get("url", "")).startswith("https://")]
        if not 3 <= len(e.get("signature_moves", [])) <= 5: errs.append(f"{i}: needs 3–5 signature moves")
        if not any(re.search(r"\b\d\.\d\.\d{1,2}\b", x) for x in e.get("a11y_requirements", [])): errs.append(f"{i}: cite WCAG SC numbers")
        sc = e.get("showcase")
        if sc is not None and not (sc.startswith("x/") and sc.endswith("/")): errs.append(f"{i}: showcase must look like x/<slug>/")
        pb = e.get("perf_budget", {})
        errs += [f"{i}: perf_budget.{k} missing" for k in ("lcp_s", "inp_ms", "cls") if k not in pb]
    if LANDING not in seen: errs.append(f"'{LANDING}' entry is required")
    if not 16 <= len(EXPERIENCES) <= 20: errs.append(f"expected 16–20 experiences, found {len(EXPERIENCES)}")
    built = sorted(e["id"] for e in EXPERIENCES if e.get("showcase"))
    print(f"experiences.json: {len(EXPERIENCES)} archetypes, {len(built)} with reference builds ({', '.join(built)})")
    cover = {j: sum(j in e["jobs"] for e in EXPERIENCES) for j in JOBS}
    print("per job: " + ", ".join(f"{j} {n}" for j, n in cover.items()))
    print("OK — ids unique, jobs, paradigms, moods and motion genes all known" if not errs else "\n".join(["FAILED:"] + errs))
    return not errs

def sub(cmd, rest):
    if cmd == "check":
        sys.exit(0 if check_experiences() else 1)
    if cmd == "list":
        what = rest[0] if rest else "paradigms"
        if what == "paradigms":
            for p in PARADIGMS["paradigms"]: print(f"{p['id']:24} {p['ai_default_risk']:6} {', '.join(p['jobs'])} — {p['essence']}")
        elif what == "palettes":
            for p in PALETTES: print(f"{p['id']:22} {p['primary_mode']:5} {', '.join(p['moods'][:6])} — {p['story']}")
        elif what == "fonts":
            for f in all_pairs(): print(f"{f['id']:26} {f['cluster']:24} {f['display']['family']} / {f['body']['family']} [{f['source']}]")
        elif what == "genes":
            for k, v in GENES.items(): print(f"{k}: " + ", ".join(v))
        elif what == "moods":
            print(", ".join(PARADIGMS["moods"]))
        elif what == "experiences":
            print(f"{'id':26} {'eff':3} {'novelty':7} {'showcase':14} jobs — essence")
            for e in EXPERIENCES:
                print(f"{e['id']:26} {e['effort']:3} {e['novelty_risk']['level']:7} {(e.get('showcase') or '-'):14} "
                      f"{', '.join(e['jobs'][:5])}{'…' if len(e['jobs']) > 5 else ''} — {e['essence']}")
        else:
            print("list what? paradigms | palettes | fonts | genes | moods | experiences")
        return
    last = json.load(open(LAST))
    n = int(rest[0]) if rest else 1
    gnm = last["candidates"][n - 1]
    if cmd == "commit":
        hp = Path(last["args"].get("history") or STATE / "history.json")
        hist = read_history(hp)
        hist.append({**gnm, "chosen": True, "t": int(time.time())})
        hp.parent.mkdir(parents=True, exist_ok=True)
        json.dump(hist[-60:], open(hp, "w"), indent=1)
        print(f"Recorded candidate {n} ({gnm.get('experience', 'no experience')} / {gnm['paradigm']} / {gnm['palette']} / {gnm['fonts']}) in {hp}")
    elif cmd == "show":
        print(json.dumps(gnm, indent=1))
    elif cmd == "css":
        sys.path.insert(0, str(HERE))
        from tokens import genome_css
        out = rest[rest.index("-o") + 1] if "-o" in rest else None
        css, head = genome_css(gnm, fixed="--fixed" in rest)
        if out:
            open(out, "w").write(css); print(f"wrote {out}\n\nPut this in <head>:\n{head}")
        else:
            print(head); print(css)

if __name__ == "__main__":
    main()
