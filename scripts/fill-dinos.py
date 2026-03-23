#!/usr/bin/env python3
"""
Backfill empty period/diet/geo fields in dinos.js using already-fetched dino-data.js.
Safe to re-run — only touches entries where those fields are empty strings.

Usage:
  python3 scripts/fill-dinos.py
  make fill-dinos
"""

import json, re, os

ROOT     = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DINOS_JS = os.path.join(ROOT, 'js', 'dinos.js')
DATA_JS  = os.path.join(ROOT, 'js', 'dino-data.js')

# ── Load wiki text from dino-data.js ──────────────────────────────────────────

wiki_data = {}
if os.path.exists(DATA_JS):
    content = open(DATA_JS, encoding='utf-8').read()
    m = re.search(r'const DINO_DATA\s*=\s*(\{[\s\S]*\});', content)
    if m:
        wiki_data = json.loads(m.group(1))

def infer_diet(text):
    t = text.lower()
    if any(w in t for w in ['piscivore', 'piscivorous', 'fish-eating', 'fish eater']):
        return 'Piscivore'
    if any(w in t for w in ['omnivore', 'omnivorous']):
        return 'Omnivore'
    if any(w in t for w in ['carnivore', 'carnivorous', 'meat-eating', 'meat eater']):
        return 'Carnivore'
    if any(w in t for w in ['sauropod', 'ornithopod', 'hadrosaur', 'ceratopsian',
                              'ankylosaur', 'stegosaur', 'thyreophoran', 'herbivore',
                              'herbivorous', 'plant-eating', 'plant eater']):
        return 'Herbivore'
    if any(w in t for w in ['theropod', 'predator', 'dromaeosaurid', 'tyrannosaurid',
                              'abelisaurid', 'spinosaurid', 'allosaurid']):
        return 'Carnivore'
    return ''

def infer_period(text):
    m = re.search(r'(Early|Middle|Late)\s+(Triassic|Jurassic|Cretaceous)'
                  r'(?:\s+period)?\s*\(([^)]*\bMa\b[^)]*)\)', text)
    if m:
        return f"{m.group(1)} {m.group(2)} ({m.group(3).strip()})"
    m = re.search(r'(Early|Middle|Late)\s+(Triassic|Jurassic|Cretaceous)', text)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    m = re.search(r'\b(Triassic|Jurassic|Cretaceous)\b', text)
    if m:
        return m.group(1)
    return ''

def infer_geo(text):
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

# ── Process dinos.js ──────────────────────────────────────────────────────────

content = open(DINOS_JS, encoding='utf-8').read()

# Match entries that have at least one empty field (period, diet, or geo)
pattern = re.compile(
    r'\{([^}]*name:\s*"([^"]+)"[^}]*wiki:\s*"([^"]+)"[^}]*'
    r'(?:period:\s*""|diet:\s*""|geo:\s*"")[^}]*)\}',
    re.DOTALL
)

updated = content
filled  = 0
skipped = 0

for match in pattern.finditer(content):
    block     = match.group(0)
    name      = match.group(2)
    wiki_key  = match.group(3)

    entry = wiki_data.get(wiki_key) or wiki_data.get(name)
    if not entry:
        print(f"  ⚠ no wiki data for '{name}' — skipping")
        skipped += 1
        continue

    text = (entry.get('short', '') + ' ' + entry.get('full', '')).strip()
    if not text:
        skipped += 1
        continue

    new_block = block

    # Only fill fields that are currently empty
    if 'period: ""' in block:
        p = infer_period(text)
        new_block = new_block.replace('period: ""', f'period: "{p}"')

    if 'diet: ""' in block:
        d = infer_diet(text)
        new_block = new_block.replace('diet: ""', f'diet: "{d}"')

    if 'geo: ""' in block:
        g = infer_geo(text)
        new_block = new_block.replace('geo: ""', f'geo: "{g}"')

    if new_block != block:
        updated = updated.replace(block, new_block, 1)
        print(f"  ✓ {name}")
        filled += 1

with open(DINOS_JS, 'w', encoding='utf-8') as f:
    f.write(updated)

print(f"\n✓ Filled {filled} entries  |  skipped {skipped} (no data)")
print("⚠  Still need manual review: level (1–5) and length (metres)")
