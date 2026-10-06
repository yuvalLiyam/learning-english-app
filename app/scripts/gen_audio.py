"""Generate missing mp3 files with edge-tts. Usage: python scripts/gen_audio.py [--force]"""
import asyncio, json, os, sys
import edge_tts
from phrases import phrases, HERE
PUB = os.path.join(HERE, "..", "public")
V = json.load(open(os.path.join(HERE, "voices.json")))
FORCE = "--force" in sys.argv

async def gen(path, text, lang, speed):
    full = os.path.join(PUB, path)
    if os.path.exists(full) and not FORCE: return False
    os.makedirs(os.path.dirname(full), exist_ok=True)
    voice = V[lang]
    rate = V["slow_rate"] if speed == "slow" else V["rate"]
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(full)
            return True
        except Exception as e:
            if attempt == 3: raise
            await asyncio.sleep(2 * (attempt + 1))

async def main():
    items = phrases()
    sem = asyncio.Semaphore(4)
    made = 0
    async def one(it):
        nonlocal made
        async with sem:
            if await gen(*it): made += 1; print("+", it[0])
    await asyncio.gather(*(one(it) for it in items))
    print(f"done: {made} generated, {len(items)-made} already existed, {len(items)} total")
asyncio.run(main())
