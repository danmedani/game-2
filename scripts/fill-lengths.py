#!/usr/bin/env python3
"""
Auto-fill length (metres) for dinos that have length: 0 in dinos.js.
Fetches wikitext via Wikipedia API and extracts length from the taxobox.

Usage:
  python3 scripts/fill-lengths.py           # fill length=0 entries
  python3 scripts/fill-lengths.py --dry-run # show proposed changes only
  make fill-lengths
"""

import json, re, sys, os, time
import urllib.request, urllib.parse, ssl

ROOT     = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DINOS_JS = os.path.join(ROOT, 'js', 'dinos.js')

DRY_RUN = '--dry-run' in sys.argv

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode    = ssl.CERT_NONE
HEADERS = {'User-Agent': 'DinoGame/1.0 (educational game; contact via github)'}

def fetch_wikitext(title):
    params = urllib.parse.urlencode({
        'action': 'query',
        'titles': title,
        'prop': 'revisions',
        'rvprop': 'content',
        'rvslots': 'main',
        'format': 'json',
    })
    url = f'https://en.wikipedia.org/w/api.php?{params}'
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20, context=SSL_CTX) as r:
            data = json.loads(r.read())
        pages = data.get('query', {}).get('pages', {})
        page  = next(iter(pages.values()))
        return page.get('revisions', [{}])[0].get('slots', {}).get('main', {}).get('*', '')
    except Exception:
        return ''

def parse_convert(val):
    """Parse {{convert|N|m|...}} or {{convert|N|to|M|m|...}} → metres (midpoint for ranges)."""
    # {{convert|10|m|...}}
    m = re.search(r'\{\{convert\|(\d+(?:\.\d+)?)\|m\b', val, re.I)
    if m:
        return float(m.group(1))
    # {{convert|N|to|M|m|...}} or |N|-|M|m
    m = re.search(r'\{\{convert\|(\d+(?:\.\d+)?)\|(?:to|-)\|(\d+(?:\.\d+)?)\|m\b', val, re.I)
    if m:
        return round((float(m.group(1)) + float(m.group(2))) / 2, 1)
    return None

def extract_length(wikitext):
    """Extract body length in metres from a dinosaur taxobox."""
    # Try | length = {{convert|...}} or | length_m = N
    for pat in [
        r'\|\s*length\s*=\s*(.+)',
        r'\|\s*length_m\s*=\s*(\d+(?:\.\d+)?)',
        r'\|\s*body_length\s*=\s*(.+)',
    ]:
        m = re.search(pat, wikitext, re.I)
        if not m:
            continue
        raw = m.group(1).strip()

        # | length_m = 12
        num = re.match(r'^(\d+(?:\.\d+)?)\s*$', raw)
        if num:
            val = float(num.group(1))
            if 0.1 <= val <= 80:
                return round(val, 1)

        # {{convert|...}}
        val = parse_convert(raw)
        if val and 0.1 <= val <= 80:
            return round(val, 1)

        # bare "12 m" or "12 metres"
        num2 = re.search(r'(\d+(?:\.\d+)?)\s*(?:m\b|metres?|meters?)', raw, re.I)
        if num2:
            val = float(num2.group(1))
            if 0.1 <= val <= 80:
                return round(val, 1)

    # Fallback: search prose for common length phrases
    patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:metres?|meters?|m)\b(?:\s*\([^)]*\))?\s*(?:in\s+)?(?:long|in\s+length)',
        r'length\s+of\s+(?:approximately\s+|about\s+|up\s+to\s+)?(\d+(?:\.\d+)?)\s*(?:metres?|meters?|m)\b',
        r'(?:estimated\s+(?:at|to\s+be)|up\s+to|about|approximately|reached)\s+(\d+(?:\.\d+)?)\s*(?:metres?|meters?|m)\b',
        r'(\d+(?:\.\d+)?)\s*m\s*\(\d+(?:\.\d+)?\s*ft\)',
    ]
    for pat in patterns:
        hit = re.search(pat, wikitext, re.I)
        if hit:
            val = float(hit.group(1))
            if 0.1 <= val <= 80:
                return round(val, 1)

    return None

# ── Parse dinos.js ────────────────────────────────────────────────────────────

content = open(DINOS_JS, encoding='utf-8').read()

entry_pattern = re.compile(
    r'(\{[^}]*name:\s*"([^"]+)"[^}]*wiki:\s*"([^"]+)"[^}]*length:\s*(0(?:\.0+)?)\b[^}]*\})',
    re.DOTALL
)

matches = list(entry_pattern.finditer(content))
print(f'Found {len(matches)} dinos with length=0\n')

updated = content
changed = 0
failed  = []

for i, m in enumerate(matches, 1):
    name = m.group(2)
    wiki = m.group(3)
    print(f'[{i}/{len(matches)}] {name} ...', end=' ', flush=True)

    wikitext = fetch_wikitext(wiki)
    time.sleep(0.5)

    length = extract_length(wikitext)
    if length is None:
        print('⚠ not found')
        failed.append(name)
        continue

    print(f'{length}m')
    if not DRY_RUN:
        old_block = m.group(1)
        new_block = re.sub(r'(length:\s*)0\b', f'\\g<1>{length}', old_block, count=1)
        updated   = updated.replace(old_block, new_block, 1)
        changed  += 1

if DRY_RUN:
    print('\n(dry run — no changes written)')
    sys.exit(0)

with open(DINOS_JS, 'w', encoding='utf-8') as f:
    f.write(updated)

print(f'\n✓ Updated {changed} length(s) in {DINOS_JS}')
if failed:
    print(f'⚠ Could not find length for ({len(failed)}): {", ".join(failed)}')
    print('  → Set these manually in dinos.js')
