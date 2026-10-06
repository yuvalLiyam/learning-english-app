"""Verify every word has its image and every expected audio file. Exit 1 if anything is missing."""
import os, sys
from phrases import phrases, load_packs, HERE
PUB = os.path.join(HERE, "..", "public")
missing = []
for p in load_packs():
    for w in p["words"]:
        if not os.path.exists(os.path.join(PUB, w["image"])): missing.append(w["image"])
for path, *_ in phrases():
    if not os.path.exists(os.path.join(PUB, path)): missing.append(path)
for extra in ["images/icons/pwa-192.png", "images/icons/pwa-512.png", "images/CREDITS.md"]:
    if not os.path.exists(os.path.join(PUB, extra)): missing.append(extra)
n_words = sum(len(p["words"]) for p in load_packs())
if missing:
    print(f"MISSING {len(missing)} files:"); [print("  ", m) for m in missing]; sys.exit(1)
print(f"OK: {n_words} words, {len(phrases())} audio files, all images present")
