# skills-unclawdesign

The **unclawdesign** skill: systematic, library-driven web and UI design that comes out
distinctive and different on every run. It rolls a design genome (experience archetype ×
design paradigm × palette × font pair × 14 visual genes) from verified libraries, then
builds, animates and critiques the page. Instructions for Claude are in
[`unclawdesign/SKILL.md`](unclawdesign/SKILL.md).

## Layout

| Path | What it is |
| --- | --- |
| `unclawdesign/` | The skill itself: `SKILL.md`, `data/` (20 experiences, 41 paradigms, 54 generated + 348 Wada palettes, 77 Google font pairs, genes), `scripts/` (genome engine, tokens, boards, colour library, linter, screenshots, font helper), `references/`, `assets/` (palette engine and customizer) |
| `showcase/` | Reference builds for one brief (Tidewater Roasters, a fictional roastery): six switchable style directions and six experience pages (`x/journey`, `x/roast`, `x/playground`, `x/os`, `x/crema`, `x/issue`), with a gallery at `showcase/index.html` |
| `build/` | Scripts that regenerate the libraries in `unclawdesign/data/` (font verification against google/fonts, palette and Wada builds, paradigms and genes) |
| `docs/` | Research report "Creative web beyond landing pages" behind the experience layer |
| `tools/` | `package.sh` packs the skill into `dist/unclawdesign.skill`; `build_customizer.py` rebuilds the palette panel |

A real-site application (six jurasongs.de variants) lives in the mobot repo under
`jurasongs/variants/`.

## Install

**Claude Code** (skills are read from `~/.claude/skills/<name>/`):

```bash
git clone git@github.com:Tonvenio/skills-unclawdesign.git ~/GitHub/skills-unclawdesign
ln -s ../../skills-unclawdesign/unclawdesign ~/GitHub/claude-config/skills/unclawdesign
```

The relative link works on both Macs as long as both repos sit in `~/GitHub/`
(`~/.claude/skills` points into `claude-config/skills`).

**claude.ai**: `./tools/package.sh`, then upload `dist/unclawdesign.skill` under
Settings → Capabilities → Skills. The package carries all data, scripts and references.

## How to run

The skill has no server; its scripts are command-line tools (Python 3, standard library only,
except `getfont.py`, which needs `pip install fonttools brotli`). Run them from the skill folder:

```bash
cd unclawdesign
python3 scripts/roll.py --job brand --tone "warm,crafted" --sector "coffee roastery" --count 3
python3 scripts/roll.py css 1 -o tokens.css      # token stylesheet for candidate 1
python3 scripts/roll.py list experiences         # browse any library
python3 scripts/lint_design.py page.html         # AI-tell and quality check
python3 scripts/roll.py check                    # validate the experience library
```

The roll history lives in `~/.unclawdesign/` (override with `UNCLAW_HOME`).

**Showcase** (static files only):

- Locally: `cd showcase && python3 -m http.server 8799 --bind 127.0.0.1`, then
  <http://127.0.0.1:8799/>. Stop with Ctrl-C.
- On the tailnet: double-click `showcase/serve.command` (port 8787, bound to the Tailscale
  address). Stop with `pkill -f 'http.server 8787'`.

Check the port first with `lsof -nP -iTCP:<port> -sTCP:LISTEN`.

**Rebuilding the libraries** (rarely needed; writes into `unclawdesign/data/`):

```bash
python3 build/paradigms_src.py        # paradigms.json + genes.json
python3 build/build_fonts.py          # fonts.json, verifies every family against google/fonts
python3 build/build_palettes.py       # palettes.json
python3 build/build_wada.py           # palettes-wada.json + wada-combos.json
python3 tools/build_customizer.py     # re-inject the Wada data into assets/customizer.js
python3 unclawdesign/scripts/roll.py check
```

`assets/customizer.js` is generated from `assets/customizer.src.js`; edit the source file and
rebuild.

## Credits

Wada colour data: Sanzo Wada, *A Dictionary of Color Combinations* (Seigensha), digitised in
[mattdesl/dictionary-of-colour-combinations](https://github.com/mattdesl/dictionary-of-colour-combinations)
(MIT, licence in `build/wada/`). Fonts: Google Fonts (OFL / Apache). Showcase libraries in
`showcase/vendor/`: GSAP 3.15, Lenis 1.3, Matter.js 0.20, three.js r186.
