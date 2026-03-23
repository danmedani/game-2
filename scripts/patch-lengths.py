#!/usr/bin/env python3
"""Patch known lengths (metres) for dinos still showing length: 0."""
import re, os

ROOT     = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DINOS_JS = os.path.join(ROOT, 'js', 'dinos.js')

LENGTHS = {
    "Kritosaurus":       8.5,
    "Hadrosaurus":       8.0,
    "Cryolophosaurus":   6.5,
    "Charonosaurus":    10.0,
    "Nemegtosaurus":    15.0,
    "Einiosaurus":       4.5,
    "Muttaburrasaurus":  7.0,
    "Massospondylus":    5.0,
    "Leaellynasaura":    0.9,
    "Dacentrurus":       8.0,
    "Lufengosaurus":     6.0,
    "Futalognkosaurus": 30.0,
    "Tarbosaurus":      12.0,
    "Turiasaurus":      30.0,
    "Shunosaurus":       9.0,
    "Proceratosaurus":   3.0,
    "Omeisaurus":       15.0,
    "Saichania":         7.0,
    "Scipionyx":         0.5,
    "Yi":                0.4,
    "Supersaurus":      33.0,
    "Brachylophosaurus": 9.0,
    "Europasaurus":      6.0,
    "Zuniceratops":      3.5,
    "Anchiornis":        0.4,
    "Bactrosaurus":      6.0,
    "Juravenator":       0.75,
    "Struthiomimus":     4.3,
    "Mapusaurus":       12.0,
    "Zephyrosaurus":     1.8,
    "Thescelosaurus":    3.5,
    "Kosmoceratops":     4.5,
    "Ichthyovenator":    8.0,
    "Daspletosaurus":    9.0,
    "Sinornithosaurus":  1.2,
    "Falcarius":         4.0,
    "Xenoceratops":      6.0,
    "Minmi":             3.0,
    "Epidexipteryx":     0.25,
    "Ornitholestes":     2.0,
    "Nanuqsaurus":       6.0,
    "Giraffatitan":     26.0,
    "Dicraeosaurus":    12.0,
    "Nigersaurus":       9.0,
    "Caudipteryx":       1.0,
    "Rajasaurus":        9.0,
    "Heterodontosaurus": 1.8,
    "Austroraptor":      5.0,
    "Hypacrosaurus":     9.0,
    "Sinovenator":       1.0,
    "Alamosaurus":      18.0,
    "Wuerhosaurus":      7.0,
    "Jobaria":          18.0,
    "Patagosaurus":     15.0,
    "Unenlagia":         2.5,
    "Torosaurus":        7.5,
    "Megalosaurus":      9.0,
    "Prosaurolophus":    8.0,
    "Ornithomimus":      3.8,
    "Dromaeosaurus":     1.8,
    "Stegoceras":        2.5,
    "Melanorosaurus":    8.0,
    "Masiakasaurus":     2.1,
    "Medusaceratops":    6.0,
    "Prenocephale":      2.0,
    "Monolophosaurus":   5.5,
    "Hypsilophodon":     2.0,
    "Zhenyuanlong":      1.2,
    "Centrosaurus":      6.0,
    "Beipiaosaurus":     2.2,
    "Torvosaurus":       9.0,
    "Zanabazar":         2.0,
    "Alioramus":         6.0,
    "Tenontosaurus":     7.0,
    "Rapetosaurus":     15.0,
    "Pinacosaurus":      5.0,
    "Compsognathus":     1.0,
    "Dreadnoughtus":    26.0,
    "Acrocanthosaurus": 11.5,
    "Yangchuanosaurus": 11.0,
    "Puertasaurus":     30.0,
    "Avimimus":          1.5,
    "Nodosaurus":        6.0,
    "Nasutoceratops":    4.5,
    "Saltasaurus":      12.0,
    "Majungasaurus":     8.0,
    "Barosaurus":       26.0,
    "Bambiraptor":       1.0,
    "Dromiceiomimus":    3.5,
    "Tarchia":           5.5,
    "Stygimoloch":       3.0,
    "Homalocephale":     1.8,
    "Polacanthus":       4.0,
    "Yunnanosaurus":     7.0,
    "Huayangosaurus":    4.5,
    "Mamenchisaurus":   26.0,
    "Riojasaurus":      10.0,
    "Elaphrosaurus":     6.2,
}

content = open(DINOS_JS, encoding='utf-8').read()
updated = content
patched = 0

for name, length in LENGTHS.items():
    # Match the specific entry with length: 0
    pat = re.compile(
        rf'(name:\s*"{re.escape(name)}"[^}}]*?length:\s*)0\b',
        re.DOTALL
    )
    new, n = pat.subn(rf'\g<1>{length}', updated)
    if n:
        updated = new
        patched += 1
        print(f'  {name}: {length}m')

with open(DINOS_JS, 'w', encoding='utf-8') as f:
    f.write(updated)

print(f'\n✓ Patched {patched} lengths in dinos.js')

# Report any remaining zeros
remaining = re.findall(r'name:\s*"([^"]+)"[^}]*length:\s*0\b', updated)
if remaining:
    print(f'⚠ Still 0: {", ".join(remaining)}')
