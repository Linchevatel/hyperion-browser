#!/usr/bin/env python3
"""Мердж locales/parts/*.json → locales/{ru,en}.json с детектором коллизий."""
import json, glob, sys

def deep_merge(dst, src, path='', collisions=None):
    for k, v in src.items():
        p = f'{path}.{k}' if path else k
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            deep_merge(dst[k], v, p, collisions)
        elif k in dst and dst[k] != v:
            collisions.append((p, dst[k], v))
            dst[k] = v  # последний выигрывает, но коллизия зафиксирована
        else:
            dst[k] = v

for lang in ('ru', 'en'):
    merged, collisions = {}, []
    for part in sorted(glob.glob(f'locales/parts/*.{lang}.json')):
        with open(part) as f:
            deep_merge(merged, json.load(f), collisions=collisions)
    with open(f'locales/{lang}.json', 'w') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    n = sum(1 for _ in json.dumps(merged, ensure_ascii=False).split('": "')) 
    print(f'{lang}: merged, ~{n} строк, коллизий: {len(collisions)}')
    for c in collisions:
        print('  COLLISION:', c[0], '|', repr(c[1])[:50], 'vs', repr(c[2])[:50])
    if collisions:
        sys.exit(1)
