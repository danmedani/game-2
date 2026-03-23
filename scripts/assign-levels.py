#!/usr/bin/env python3
"""
Auto-assign difficulty levels (1–5) to dinos in dinos.js based on Wikipedia pageviews.
Fetches all views first, then splits by percentile so the distribution is always balanced.

Percentile splits (of dinos being processed):
  Level 1 — top 10%   (most famous)
  Level 2 — 10–25%
  Level 3 — 25–55%
  Level 4 — 55–80%
  Level 5 — bottom 20%

Usage:
  make assign-levels              # fill in level 0 or 3 stubs only
  make assign-levels ARGS=--all   # reassign every dino
  make assign-levels ARGS=--dry-run   # print proposed changes without writing
"""

import json, re, sys, os, time
import urllib.request, urllib.parse, ssl

ROOT     = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DINOS_JS = os.path.join(ROOT, 'js', 'dinos.js')

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode    = ssl.CERT_NONE
HEADERS = {'User-Agent': 'DinoGame/1.0 (educational game; contact via github)'}

REASSIGN_ALL = '--all'      in sys.argv
DRY_RUN      = '--dry-run'  in sys.argv

# Percentile bucket edges (upper bound exclusive, descending views = ascending level)
# [top 10%, 10-25%, 25-55%, 55-80%, bottom 20%]
PERCENTILE_EDGES = [0.10, 0.25, 0.55, 0.80, 1.00]

def fetch_pageviews(wiki_title):
    title = urllib.parse.quote(wiki_title.replace(' ', '_'))
    url   = (f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"
             f"en.wikipedia/all-access/all-agents/{title}/monthly/2024010100/2024120100")
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as r:
            data = json.loads(r.read())
        return sum(item['views'] for item in data.get('items', []))
    except Exception:
        return None

def percentile_to_level(rank, total):
    """rank is 0-based from highest views. Returns 1–5."""
    pct = rank / total
    for lvl, edge in enumerate(PERCENTILE_EDGES, 1):
        if pct < edge:
            return lvl
    return 5

# ── Parse entries ─────────────────────────────────────────────────────────────

entry_pattern = re.compile(
    r'(\{[^}]*name:\s*"([^"]+)"[^}]*wiki:\s*"([^"]+)"[^}]*level:\s*(\d+)[^}]*\})',
    re.DOTALL
)

content = open(DINOS_JS, encoding='utf-8').read()
matches = list(entry_pattern.finditer(content))

to_process = [m for m in matches if REASSIGN_ALL or int(m.group(4)) in (0, 3)]

print(f"Found {len(matches)} dinos total, processing {len(to_process)}"
      f"{'  (--all)' if REASSIGN_ALL else '  (level 0 or 3 stubs)'}\n")

# ── Phase 1: fetch all pageviews ──────────────────────────────────────────────

view_data = []  # [(match, views)]

for i, m in enumerate(to_process, 1):
    name = m.group(2)
    wiki = m.group(3)
    print(f"[{i}/{len(to_process)}] {name} ...", end=' ', flush=True)
    views = fetch_pageviews(wiki)
    time.sleep(0.4)
    if views is None:
        print("⚠ fetch failed — will skip")
    else:
        print(f"{views:,}")
    view_data.append((m, views))

# ── Phase 2: compute percentile thresholds and assign ────────────────────────

fetchable = [(m, v) for m, v in view_data if v is not None]
fetchable.sort(key=lambda x: x[1], reverse=True)  # highest views first
total = len(fetchable)

print(f"\n── Distribution ({total} dinos with data) ──")
for lvl in range(1, 6):
    bucket = [name for (m, v), name in
              zip(fetchable, [m.group(2) for m, _ in fetchable])
              if percentile_to_level(fetchable.index((m, v)), total) == lvl]
    # simpler:
    bucket = [m.group(2) for i, (m, v) in enumerate(fetchable)
              if percentile_to_level(i, total) == lvl]
    lo = fetchable[min(int(PERCENTILE_EDGES[lvl-2] * total) if lvl > 1 else 0, total-1)][1]
    hi = fetchable[0][1] if lvl == 1 else fetchable[int(PERCENTILE_EDGES[lvl-2] * total)][1]
    print(f"  Level {lvl}: {len(bucket):3d} dinos  ({hi:,} – {lo:,} views)  e.g. {', '.join(bucket[:3])}")

if DRY_RUN:
    print("\n(dry run — no changes written)")
    sys.exit(0)

# ── Phase 3: write updates ────────────────────────────────────────────────────

updated = content
changed = 0

for i, (m, views) in enumerate(fetchable):
    new_level = percentile_to_level(i, total)
    old_level = int(m.group(4))
    if new_level == old_level:
        continue
    old_block = m.group(1)
    new_block = re.sub(r'(level:\s*)\d+', f'\\g<1>{new_level}', old_block, count=1)
    updated   = updated.replace(old_block, new_block, 1)
    changed  += 1

with open(DINOS_JS, 'w', encoding='utf-8') as f:
    f.write(updated)

print(f"\n✓ Updated {changed} level(s) in {DINOS_JS}")
