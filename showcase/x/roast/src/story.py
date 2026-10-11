"""Shared story timeline for 'The Roast' (batch 041, illustrative values).

Story progress p in [0, 1] (what the scroll drives) maps piecewise-linearly to roast time t (seconds).
Bean temperature BT(t): a plunge to the turning point, then an integrated, declining rate of rise.
The page uses the same keyframes (exported to media/roast.json).
"""
import json, numpy as np

# (p, t seconds) keyframes; phases get equal-ish scroll room, not equal time
KEYS = [(0.00, 0), (0.07, 0), (0.20, 65), (0.38, 260), (0.58, 490), (0.70, 525), (0.86, 580), (1.00, 580)]
PHASES = [  # id, label, start p, end p
    ("still", "Green", 0.00, 0.07),
    ("charge", "Charge", 0.07, 0.20),
    ("drying", "Drying", 0.20, 0.38),
    ("maillard", "Maillard", 0.38, 0.58),
    ("crack", "First crack", 0.58, 0.70),
    ("development", "Development", 0.70, 0.86),
    ("drop", "Drop", 0.86, 1.00),
]
EVENTS = {"charge": 0, "turning": 65, "dry_end": 260, "first_crack": 490, "drop": 580}

def _build_bt():
    """Pre-turning-point plunge, then integrate a declining rate of rise (RoR, °C/min)."""
    ts = np.arange(0, 581, 1.0)
    out = np.zeros_like(ts)
    pre = ts <= 65
    out[pre] = 95 + 105 * ((65 - ts[pre]) / 65) ** 2.6
    ror = np.interp(ts, [65, 100, 260, 490, 580], [0, 20.5, 17.0, 7.0, 4.0])
    seg = [(65, 260, 150.0), (260, 490, 196.0), (490, 580, 204.0)]
    cur = 95.0
    for a, b, target in seg:
        m = (ts > a) & (ts <= b)
        inc = np.cumsum(ror[m] / 60.0)
        inc *= (target - cur) / inc[-1]          # hit the published phase temperatures exactly
        out[m] = cur + inc
        cur = target
    return ts, out


_ts, _bt_arr = _build_bt()


def _bt(t):
    return np.interp(t, _ts, _bt_arr)


def t_of_p(p):
    ps, ts = zip(*KEYS)
    return float(np.interp(p, ps, ts))


def bt(t):
    return float(_bt(min(max(t, 0), 580)))


def smoothstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def roast_degree(t):
    """0 = green, ~0.25 yellow, ~0.62 cinnamon, ~0.82 at first crack, 1.0 = Kiambu light roast at drop."""
    pts = [(0, 0), (100, 0.0), (260, 0.24), (380, 0.48), (440, 0.62), (490, 0.80), (580, 1.0)]
    return float(np.interp(t, *zip(*pts)))


def swell(t):
    return 1.0 + 0.025 * smoothstep(260, 490, t) + 0.095 * smoothstep(480, 580, t)


if __name__ == "__main__":
    samples = [[t, round(bt(t), 2)] for t in range(0, 581, 5)]
    out = {"keys": KEYS, "phases": [dict(id=a, label=b, p0=c, p1=d) for a, b, c, d in PHASES],
           "events": {k: [v, round(bt(v), 1)] for k, v in EVENTS.items()}, "bt": samples}
    json.dump(out, open(__import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)), "..", "media", "roast.json"), "w"), separators=(",", ":"))
    for k, v in EVENTS.items():
        print(k, v, round(bt(v), 1))
    ror = [(t, round((bt(t + 30) - bt(t)) * 2, 1)) for t in range(70, 560, 60)]
    print("RoR °C/min", ror)
