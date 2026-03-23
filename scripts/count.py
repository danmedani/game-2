#!/usr/bin/env python3
import re, os

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))

dinos = re.findall(r'name:\s*"([^"]+)"', open(os.path.join(ROOT, 'js', 'dinos.js')).read())
pool  = [l.strip() for l in open(os.path.join(ROOT, 'scripts', 'dino-pool.txt'))
         if l.strip() and not l.startswith('#')]
remaining = [p for p in pool if p not in set(dinos)]

print(f"  {len(dinos)} dinos in game")
print(f"  {len(pool)} in pool  ({len(remaining)} not yet added)")
