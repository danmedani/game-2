#!/usr/bin/env python3
"""
Add new dinos to js/dinos.js and fetch their Wikipedia data into js/dino-data.js.
Auto-extracts period, diet, and geo from the Wikipedia text.
level and length still need to be filled in manually.

Usage:
  python3 scripts/add-dinos.py 14              # pick 14 random from scripts/dino-pool.txt
  python3 scripts/add-dinos.py my-list.txt     # use names from a text file (one per line)
  make add-dinos N=14
  make add-dinos FILE=my-list.txt
"""

import json, re, sys, os, time, random
import urllib.request, urllib.parse, ssl

if len(sys.argv) < 2:
    print("Usage: python3 scripts/add-dinos.py <N | file.txt>")
    sys.exit(1)

ROOT     = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DINOS_JS = os.path.join(ROOT, 'js', 'dinos.js')
DATA_JS  = os.path.join(ROOT, 'js', 'dino-data.js')
POOL     = os.path.join(os.path.dirname(__file__), 'dino-pool.txt')

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode    = ssl.CERT_NONE
HEADERS = {'User-Agent': 'DinoGame/1.0 (educational game; contact via github)'}

# ── Inference helpers ─────────────────────────────────────────────────────────

def infer_diet(text):
    t = text.lower()
    if any(w in t for w in ['piscivore', 'piscivorous', 'fish-eating', 'fish eater']):
        return 'Piscivore'
    if any(w in t for w in ['omnivore', 'omnivorous']):
        return 'Omnivore'
    if any(w in t for w in ['carnivore', 'carnivorous', 'meat-eating', 'meat eater']):
        return 'Carnivore'
    # group-based guesses
    if any(w in t for w in ['sauropod', 'ornithopod', 'hadrosaur', 'ceratopsian',
                              'ankylosaur', 'stegosaur', 'thyreophoran', 'herbivore', 'herbivorous',
                              'plant-eating', 'plant eater']):
        return 'Herbivore'
    if any(w in t for w in ['theropod', 'predator', 'dromaeosaurid', 'tyrannosaurid',
                              'abelisaurid', 'spinosaurid', 'allosaurid']):
        return 'Carnivore'
    return ''

def infer_period(text):
    # Try "Late Cretaceous period (68–66 Ma)" style
    m = re.search(r'(Early|Middle|Late)\s+(Triassic|Jurassic|Cretaceous)'
                  r'(?:\s+period)?\s*\(([^)]*\bMa\b[^)]*)\)', text)
    if m:
        return f"{m.group(1)} {m.group(2)} ({m.group(3).strip()})"
    # Try without Ma range
    m = re.search(r'(Early|Middle|Late)\s+(Triassic|Jurassic|Cretaceous)', text)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    # Just the period name
    m = re.search(r'\b(Triassic|Jurassic|Cretaceous)\b', text)
    if m:
        return m.group(1)
    return ''

def infer_geo(text):
    # Ordered most-specific first so we don't show "Asia" when "Central Asia" matched
    candidates = [
        'North America', 'South America', 'Central America',
        'North Africa', 'South Africa', 'East Africa', 'West Africa',
        'Central Asia', 'East Asia', 'South Asia', 'Southeast Asia',
        'Western Europe', 'Eastern Europe',
        'Europe', 'Africa', 'Asia', 'Antarctica', 'Australia',
        'Argentina', 'Brazil', 'China', 'Mongolia', 'Canada',
        'United States', 'Tanzania', 'Morocco', 'Niger', 'Egypt',
        'India', 'Portugal', 'England', 'France', 'Germany', 'Spain',
    ]
    found = []
    for c in candidates:
        if c in text and not any(c in kept for kept in found):
            found.append(c)
        if len(found) == 3:
            break
    return ', '.join(found)

# ── Resolve input ─────────────────────────────────────────────────────────────

arg = sys.argv[1]

dinos_content  = open(DINOS_JS, encoding='utf-8').read()
existing_names = set(re.findall(r'name:\s*"([^"]+)"', dinos_content))

if arg.isdigit():
    n = int(arg)
    pool = [
        line.strip() for line in open(POOL, encoding='utf-8')
        if line.strip() and not line.startswith('#')
    ]
    available = [name for name in pool if name not in existing_names]
    if len(available) < n:
        print(f"⚠  Only {len(available)} unused dinos left in pool (requested {n}).")
        n = len(available)
    names = random.sample(available, n)
    print(f"Picked {len(names)} dinos from pool: {', '.join(names)}\n")
else:
    names = [
        line.strip() for line in open(arg, encoding='utf-8')
        if line.strip() and not line.startswith('#')
    ]

# ── Skip already-present ──────────────────────────────────────────────────────

new_names = [n for n in names if n not in existing_names]
skipped   = [n for n in names if n in existing_names]

if skipped:
    print(f"Skipping already-present: {', '.join(skipped)}")
if not new_names:
    print("Nothing new to add.")
    sys.exit(0)

# ── Wikipedia fetch ───────────────────────────────────────────────────────────

def fetch_summary(t):
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(t)}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as r:
        data = json.loads(r.read())
    extract = data.get('extract', '')
    m = re.search(r'.+?[.!?](?=\s+[A-Z]|\s*$)', extract, re.DOTALL)
    short = m.group(0).strip() if m else extract[:200].strip()
    full  = extract[len(m.group(0)):].strip() if m else ''
    return short, full, extract

def fetch_image(t):
    params = urllib.parse.urlencode({
        'action': 'query', 'titles': t, 'prop': 'pageimages',
        'format': 'json', 'pithumbsize': 600,
    })
    url = f"https://en.wikipedia.org/w/api.php?{params}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as r:
        data = json.loads(r.read())
    page = list(data['query']['pages'].values())[0]
    return page.get('thumbnail', {}).get('source', '')

wiki_data = {}
if os.path.exists(DATA_JS):
    content = open(DATA_JS, encoding='utf-8').read()
    m = re.search(r'const DINO_DATA\s*=\s*(\{[\s\S]*\});', content)
    if m:
        wiki_data = json.loads(m.group(1))

# ── Fetch + infer ─────────────────────────────────────────────────────────────

results = []  # (name, period, diet, geo)
total = len(new_names)

for i, name in enumerate(new_names, 1):
    print(f"[{i}/{total}] {name}")
    try:
        short, full, extract = fetch_summary(name)
        print(f"  fact: {short[:70]}...")
    except Exception as e:
        print(f"  ⚠ summary failed: {e}")
        short, full, extract = '', '', ''
    time.sleep(1)
    try:
        img = fetch_image(name)
        print(f"  img:  {img[:70]}..." if img else "  ⚠ no image found")
    except Exception as e:
        print(f"  ⚠ image failed: {e}")
        img = ''
    time.sleep(1)

    period = infer_period(extract)
    diet   = infer_diet(extract)
    geo    = infer_geo(extract)
    print(f"  inferred → period: '{period}' | diet: '{diet}' | geo: '{geo}'")

    wiki_data[name] = {'img': img, 'short': short, 'full': full}
    results.append((name, period, diet, geo))

# ── Write dino-data.js ────────────────────────────────────────────────────────

with open(DATA_JS, 'w', encoding='utf-8') as f:
    f.write('// Auto-generated by scripts/fetch-dino-data.py — do not edit manually.\n')
    f.write('// Run `make fetch-data` to refresh.\n')
    f.write('const DINO_DATA = ')
    json.dump(wiki_data, f, indent=2, ensure_ascii=False)
    f.write(';\n')

print(f"\n✓ Updated {DATA_JS}")

# ── Append to dinos.js ────────────────────────────────────────────────────────

new_lines = ['\n  // ── Added by add-dinos.py — set level and length manually ──']
for name, period, diet, geo in results:
    new_lines.append(
        f'  {{ name: "{name}", wiki: "{name}", level: 3, length: 0, '
        f'period: "{period}", diet: "{diet}", geo: "{geo}" }},'
    )

updated = re.sub(r'(\];\s*)$', '\n'.join(new_lines) + '\n\\1', dinos_content, flags=re.MULTILINE)

with open(DINOS_JS, 'w', encoding='utf-8') as f:
    f.write(updated)

print(f"✓ Added {len(results)} dino(s) to {DINOS_JS}")
print("\n⚠  Edit dinos.js to set level (1–5) and length (metres) for each new entry.")
