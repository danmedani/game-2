#!/usr/bin/env python3
"""
Fetch dino data from prehistoric-wiki.fandom.com and write js/prehistoric-data.js.
Uses the same format as dino-data.js so the game can swap sources easily.
Also adds 'length' and 'height' fields (metres) from the wiki's Animal template.

Usage:
  python3 scripts/fetch-prehistoric-wiki.py
  make fetch-prehistoric
"""

import json, re, sys, os, time
import urllib.request, urllib.parse, ssl

ROOT    = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
OUT_JS  = os.path.join(ROOT, 'js', 'prehistoric-data.js')
DINOS_JS = os.path.join(ROOT, 'js', 'dinos.js')

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode    = ssl.CERT_NONE
HEADERS = {'User-Agent': 'DinoGame/1.0 (educational game; contact via github)'}
API     = 'https://prehistoric-wiki.fandom.com/api.php'
BATCH   = 25   # titles per API request (Fandom seems happier with smaller batches)

# ── Helpers ───────────────────────────────────────────────────────────────────

def api_get(params):
    url = API + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20, context=SSL_CTX) as r:
        return json.loads(r.read())

def strip_wiki(text):
    """Remove common wiki markup, return plain text."""
    text = re.sub(r'\[\[File:[^\]]+\]\]', '', text, flags=re.I)
    text = re.sub(r'\[\[(?:[^|\]]+\|)?([^\]]+)\]\]', r'\1', text)
    text = re.sub(r'\{\{[^}]*\}\}', '', text)
    text = re.sub(r"'{2,3}", '', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def parse_metres(raw):
    """
    Parse a length/height string to metres (float) or None.
    Handles formats like:
      '16-20 feet (5-6 meters)'  → 5.5
      '5-6 meters'               → 5.5
      '2.5-3m (8-10ft)'          → 2.75
      '12 meters'                → 12.0
      '12m'                      → 12.0
    """
    raw = raw.strip()

    # Prefer the metric part inside parens if it's the metric version
    # e.g. "16-20 feet (5-6 meters)" → use the parens content
    paren = re.search(r'\(([^)]+(?:m(?:eter|etre)?s?|m\b)[^)]*)\)', raw, re.I)
    if paren:
        raw = paren.group(1)

    # Range e.g. "5-6 meters" or "5–6 m"
    r = re.search(r'(\d+(?:\.\d+)?)\s*[–\-]\s*(\d+(?:\.\d+)?)\s*(?:m(?:eter|etre)?s?|m\b)', raw, re.I)
    if r:
        val = (float(r.group(1)) + float(r.group(2))) / 2
        if 0.1 <= val <= 80:
            return round(val, 1)

    # Single value e.g. "12 meters" or "12m"
    s = re.search(r'(\d+(?:\.\d+)?)\s*(?:m(?:eter|etre)?s?|m\b)', raw, re.I)
    if s:
        val = float(s.group(1))
        if 0.1 <= val <= 80:
            return round(val, 1)

    return None

def parse_animal_template(wikitext):
    """Extract fields from {{Animal|...}} template."""
    m = re.search(r'\{\{Animal([\s\S]*?)\}\}', wikitext)
    if not m:
        return {}
    body = m.group(1)
    fields = {}
    for line in body.split('|'):
        kv = line.strip()
        if '=' in kv:
            k, _, v = kv.partition('=')
            fields[k.strip().lower()] = v.strip()
    return fields

def extract_description(wikitext):
    """Pull the intro paragraph(s) from wikitext (after the infobox)."""
    # Remove the Animal template block
    text = re.sub(r'\{\{Animal[\s\S]*?\}\}', '', wikitext)
    # Remove other templates
    text = re.sub(r'\{\{[^}]*\}\}', '', text)
    # Split into sentences
    plain = strip_wiki(text)
    # First real paragraph
    sentences = re.split(r'(?<=[.!?])\s+', plain.strip())
    short = sentences[0] if sentences else ''
    full  = ' '.join(sentences[1:6]).strip()
    return short, full

# ── Read dino names ───────────────────────────────────────────────────────────

dinos_content = open(DINOS_JS, encoding='utf-8').read()
dino_entries  = re.findall(r'name:\s*"([^"]+)"[^}]*wiki:\s*"([^"]+)"', dinos_content)
# wiki key → display name (for lookup)
wiki_to_name = {wiki: name for name, wiki in dino_entries}
all_wikis    = list(wiki_to_name.keys())

print(f'Fetching {len(all_wikis)} dinos from prehistoric-wiki.fandom.com\n')

# ── Phase 1: batch-fetch wikitext ─────────────────────────────────────────────

raw_pages = {}  # wiki_title → wikitext

for i in range(0, len(all_wikis), BATCH):
    batch = all_wikis[i:i + BATCH]
    titles_str = '|'.join(batch)
    print(f'  Wikitext [{i+1}–{min(i+BATCH, len(all_wikis))}/{len(all_wikis)}] ...', end=' ', flush=True)
    try:
        data = api_get({
            'action':  'query',
            'titles':  titles_str,
            'prop':    'revisions',
            'rvprop':  'content',
            'rvslots': 'main',
            'format':  'json',
        })
        pages = data.get('query', {}).get('pages', {})
        for page in pages.values():
            title = page.get('title', '')
            wt    = (page.get('revisions', [{}])[0]
                        .get('slots', {}).get('main', {}).get('*', ''))
            if wt:
                raw_pages[title] = wt
        print(f'ok ({len(raw_pages)} total)')
    except Exception as e:
        print(f'ERROR: {e}')
    time.sleep(0.6)

# ── Phase 2: parse templates, collect image filenames ─────────────────────────

parsed   = {}  # wiki_title → {fields, short, full, img_filename}
img_files = [] # all filenames to resolve

for title, wikitext in raw_pages.items():
    fields = parse_animal_template(wikitext)
    short, full = extract_description(wikitext)

    img_file = fields.get('image1', '').strip()
    if img_file:
        img_files.append(img_file)

    length = parse_metres(fields.get('length', ''))
    height = parse_metres(fields.get('height', ''))

    parsed[title] = {
        'short':       short,
        'full':        full,
        'img_file':    img_file,
        'length':      length,
        'height':      height,
    }

print(f'\nParsed {len(parsed)} pages, {len(img_files)} images to resolve\n')

# ── Phase 3: batch-resolve image URLs ─────────────────────────────────────────

img_urls = {}  # filename → URL
unique_files = list(dict.fromkeys(img_files))  # dedupe, preserve order

for i in range(0, len(unique_files), BATCH):
    batch = unique_files[i:i + BATCH]
    file_titles = '|'.join(f'File:{f}' for f in batch)
    print(f'  Images [{i+1}–{min(i+BATCH, len(unique_files))}/{len(unique_files)}] ...', end=' ', flush=True)
    try:
        data = api_get({
            'action':  'query',
            'titles':  file_titles,
            'prop':    'imageinfo',
            'iiprop':  'url',
            'format':  'json',
        })
        pages = data.get('query', {}).get('pages', {})
        for page in pages.values():
            ii = page.get('imageinfo', [{}])
            url = ii[0].get('url', '') if ii else ''
            # strip to canonical URL (remove /revision/latest?cb=...)
            url = re.sub(r'/revision/latest.*', '', url)
            # map back to filename
            t = page.get('title', '').removeprefix('File:')
            if url:
                img_urls[t] = url
        print(f'ok')
    except Exception as e:
        print(f'ERROR: {e}')
    time.sleep(0.6)

# ── Phase 4: assemble final data ──────────────────────────────────────────────

result = {}
found = 0
missing = []

for wiki in all_wikis:
    p = parsed.get(wiki)
    if not p:
        missing.append(wiki)
        continue

    img = img_urls.get(p['img_file'], '')
    entry = {
        'img':   img,
        'short': p['short'],
        'full':  p['full'],
    }
    if p['length'] is not None:
        entry['length'] = p['length']
    if p['height'] is not None:
        entry['height'] = p['height']

    result[wiki] = entry
    found += 1

# ── Write output ──────────────────────────────────────────────────────────────

with open(OUT_JS, 'w', encoding='utf-8') as f:
    f.write('// Auto-generated by scripts/fetch-prehistoric-wiki.py — do not edit manually.\n')
    f.write('// Run `make fetch-prehistoric` to refresh.\n')
    f.write('const PREHISTORIC_DATA = ')
    json.dump(result, f, indent=2, ensure_ascii=False)
    f.write(';\n')

print(f'\n✓ Wrote {found} entries to {OUT_JS}')
if missing:
    print(f'⚠ No page found for ({len(missing)}): {", ".join(missing)}')
