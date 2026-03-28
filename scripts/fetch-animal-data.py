#!/usr/bin/env python3
"""
Fetch animal facts and image URLs from Wikipedia and write animal-game/js/animal-data.js.
Run via: make fetch-animal-data
"""

import json
import time
import urllib.request
import urllib.parse
import ssl
import re
import sys
import os

# macOS Python often lacks bundled CA certs; unverified is fine for this local fetch script
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

WIKI_TITLES = [
    # Modern animals — Level 1
    "Lion", "African_elephant", "Tiger", "Giraffe", "Plains_zebra",
    "Gorilla", "Chimpanzee", "Polar_bear", "Giant_panda", "Blue_whale",
    "Great_white_shark", "Common_bottlenose_dolphin", "Emperor_penguin",
    "Bald_eagle", "Nile_crocodile", "Hippopotamus", "White_rhinoceros",
    "Red_kangaroo", "Gray_wolf", "Cheetah",
    # Modern animals — Level 2
    "Brown_bear", "Orca", "American_bison", "Komodo_dragon", "Jaguar",
    "Leopard", "Moose", "Ostrich", "Green_anaconda", "Oceanic_manta_ray",
    "Leatherback_sea_turtle", "Platypus", "Narwhal", "West_Indian_manatee",
    "Greater_flamingo", "Red_fox", "Spotted_hyena", "Capybara", "Mandrill",
    "Aldabra_giant_tortoise",
    # Modern animals — Level 3
    "Musk_ox", "Snowy_owl", "African_wild_dog", "Okapi", "Southern_cassowary",
    "Malayan_tapir", "Sunda_pangolin", "Common_wombat", "Tasmanian_devil",
    "Sun_bear", "Saiga_antelope", "Dromedary", "Pale-throated_sloth",
    "Common_vampire_bat", "Red_howler_monkey", "Proboscis_monkey",
    "Galápagos_tortoise", "Wolverine", "Binturong", "Axolotl",
    # Modern animals — Level 4
    "Fossa_(animal)", "Aye-aye", "Kākāpō", "Shoebill", "Resplendent_quetzal",
    "Alpaca", "Electric_eel", "Gharial", "Giant_armadillo", "Brown_kiwi",
    "Numbat", "Arapaima", "Tuatara", "Dugong", "Sea_otter",
    "Philippine_eagle", "Babirusa", "Snow_leopard", "Irrawaddy_dolphin", "Olm",
    # Modern animals — Level 5
    "Saola", "Vaquita", "Coelacanth", "Goblin_shark", "Spotted-tailed_quoll",
    "Western_long-beaked_echidna", "Naked_mole_rat", "Pronghorn",
    "Philippine_tarsier", "Aardvark", "Pygmy_hippopotamus", "Dhole", "Gelada",
    "Markhor", "Greater_Egyptian_jerboa", "Gerenuk", "Bongo_(antelope)",
    "Baiji", "Hirola", "Striped_polecat",
    # Extinct Cenozoic — Level 1
    "Woolly_mammoth", "Smilodon", "Megatherium", "Gastornis", "Dire_wolf",
    "Cave_bear", "Megaloceros", "Paraceratherium", "Megalodon", "Glyptodon",
    "Gigantopithecus", "Andrewsarchus", "Woolly_rhinoceros",
    "South_Island_giant_moa", "Dodo", "Giant_short-faced_bear", "Doedicurus",
    "Thylacine", "Cave_lion", "Sivatherium",
    # Extinct Cenozoic — Level 2
    "Titanoboa", "Basilosaurus", "Macrauchenia", "Hyracotherium", "Entelodon",
    "Chalicotherium", "Thylacoleo", "Procoptodon", "Diprotodon",
    "Elasmotherium", "Deinotherium", "Thylacosmilus", "Arsinoitherium",
    "Ambulocetus", "Palaeomastodon", "Megantereon", "Pelagornis", "Aepyornis",
    "Haast's_eagle", "Moropus",
    # Extinct Cenozoic — Level 3
    "Megacerops", "Uintatherium", "Mesohippus", "Daeodon", "Homotherium",
    "Miracinonyx", "Titanis", "Kelenken", "Sivapithecus", "Merychippus",
    "Anoplotherium", "Aepycamelus", "Cervalces_scotti", "American_mastodon",
    "Megistotherium", "Phorusrhacus", "Pakicetus", "Toxodon",
    "Josephoartigasia", "Agriotherium",
    # Extinct Cenozoic — Level 4
    "Embolotherium", "Hyaenodon", "Platybelodon", "Stegodon", "Barbourofelis",
    "Nimravus", "Leptictidium", "Borhyaena", "Miacis", "Phenacodus",
    "Pezosiren", "Icaronycteris", "Archaeoindris", "Odobenocetops",
    "Cetotherium", "Notharctus", "Telicomys", "Palaeoloxodon", "Kutchicetus",
    "Archaeobelodon",
    # Extinct Cenozoic — Level 5
    "Argyrolagus", "Astrapotherium", "Pyrotherium", "Hapalops",
    "Gobiatherium", "Protypotherium", "Peltephilus", "Necrolestes",
    "Microchoerus", "Xotodon", "Kolponomos", "Anthracotherium", "Eurohippus",
    "Heptodon", "Deltatheridium", "Andrewsornis", "Anisodon", "Coryphodon",
    "Barylambda", "Patriofelis",
]

HEADERS = {'User-Agent': 'CenozoiQuest/1.0 (educational game; contact via github)'}


def fetch_summary(title):
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as r:
            data = json.loads(r.read())
        extract = data.get('extract', '')
        m = re.search(r'.+?[.!?](?=\s+[A-Z]|\s*$)', extract, re.DOTALL)
        short = m.group(0).strip() if m else extract[:200].strip()
        full = extract[len(m.group(0)):].strip() if m else ''
        return short, full
    except Exception as e:
        print(f"  ⚠ summary failed for {title}: {e}", file=sys.stderr)
        return '', ''


def fetch_image(title):
    params = urllib.parse.urlencode({
        'action': 'query',
        'titles': title,
        'prop': 'pageimages',
        'format': 'json',
        'pithumbsize': 600,
    })
    url = f"https://en.wikipedia.org/w/api.php?{params}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as r:
            data = json.loads(r.read())
        page = list(data['query']['pages'].values())[0]
        return page.get('thumbnail', {}).get('source', '')
    except Exception as e:
        print(f"  ⚠ image failed for {title}: {e}", file=sys.stderr)
        return ''


results = {}
total = len(WIKI_TITLES)

for i, title in enumerate(WIKI_TITLES, 1):
    print(f"[{i}/{total}] {title}")
    short, full = fetch_summary(title)
    time.sleep(1.0)
    img = fetch_image(title)
    time.sleep(1.0)
    results[title] = {'img': img, 'short': short, 'full': full}
    if not img:
        print(f"        (no image)")
    if not short:
        print(f"        (no fact)")

# Write output relative to this script's location (→ animal-game/js/animal-data.js)
out_path = os.path.join(os.path.dirname(__file__), '..', 'animal-game', 'js', 'animal-data.js')
out_path = os.path.normpath(out_path)

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('// Auto-generated by scripts/fetch-animal-data.py — do not edit manually.\n')
    f.write('// Run `make fetch-animal-data` to refresh.\n')
    f.write('const ANIMAL_DATA = ')
    json.dump(results, f, indent=2, ensure_ascii=False)
    f.write(';\n')

ok = sum(1 for v in results.values() if v['img'])
print(f"\n✓ Done! {ok}/{total} images, wrote {out_path}")
