"""Generate / download non-photo images: OpenMoji (CC BY-SA 4.0), color balloons (SVG), number cards (PNG), stickers, avatars.
Only writes missing files. Usage: python scripts/gen_images.py"""
import json, os, io, urllib.request
from phrases import load_packs, HERE
from PIL import Image, ImageDraw, ImageFont
PUB = os.path.join(HERE, "..", "public")
OM = "https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/618x618/{}.png"

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "EnglishKidsGame/1.0"})
    return urllib.request.urlopen(req, timeout=60).read()

def openmoji(hexcode, dest, size=600):
    full = os.path.join(PUB, dest)
    if os.path.exists(full): return
    os.makedirs(os.path.dirname(full), exist_ok=True)
    img = Image.open(io.BytesIO(fetch(OM.format(hexcode)))).convert("RGBA")
    # crop transparent margins, then pad to square with transparent bg
    bbox = img.getbbox()
    if bbox: img = img.crop(bbox)
    w, h = img.size; s = int(max(w, h) * 1.12)
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(img, ((s - w) // 2, (s - h) // 2), img)
    canvas.resize((size, size), Image.LANCZOS).save(full)
    print("+", dest)

def balloon_svg(color, dest):
    full = os.path.join(PUB, dest)
    if os.path.exists(full): return
    os.makedirs(os.path.dirname(full), exist_ok=True)
    stroke = "#555" if color.lower() in ("#fafafa", "#ffffff") else "none"
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<path d="M300 500 q-10 30 10 70" stroke="#888" stroke-width="6" fill="none" stroke-linecap="round"/>
<ellipse cx="300" cy="270" rx="190" ry="230" fill="{color}" stroke="{stroke}" stroke-width="6"/>
<path d="M300 495 l-22 25 h44 z" fill="{color}" stroke="{stroke}" stroke-width="4"/>
<ellipse cx="230" cy="170" rx="45" ry="80" fill="#fff" opacity="0.35" transform="rotate(-20 230 170)"/>
</svg>'''
    open(full, "w", encoding="utf-8").write(svg); print("+", dest)

def number_png(n, dest, obj_png):
    full = os.path.join(PUB, dest)
    if os.path.exists(full): return
    os.makedirs(os.path.dirname(full), exist_ok=True)
    S = 600
    img = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    d = ImageDraw.Draw(img)
    try: font = ImageFont.truetype("arialbd.ttf", 230)
    except Exception: font = ImageFont.load_default()
    d.text((S // 2, 150), str(n), fill="#1e88e5", font=font, anchor="mm")
    obj = Image.open(obj_png).convert("RGBA")
    cols = 5 if n > 4 else n
    rows = (n + cols - 1) // cols
    cell = min(110, (S - 40) // cols)
    o = obj.resize((cell - 8, cell - 8), Image.LANCZOS)
    y0 = 300 + (2 - rows) * cell // 2
    for i in range(n):
        r, c = divmod(i, cols)
        ncols = cols if r < rows - 1 or n % cols == 0 else n % cols
        x0 = (S - ncols * cell) // 2
        img.paste(o, (x0 + c * cell + 4, y0 + r * cell + 4), o)
    img.save(full); print("+", dest)

STICKERS = {  # id: openmoji hex
 "trex":"1F996","sauropod":"1F995","car":"1F697","racecar":"1F3CE","lion":"1F981","tiger":"1F405","dog":"1F436","cat":"1F431",
 "unicorn":"1F984","dragon":"1F409","rocket":"1F680","firetruck":"1F692","police":"1F693","tractor":"1F69C","panda":"1F43C",
 "koala":"1F428","frog":"1F438","whale":"1F433","turtle":"1F422","octopus":"1F419","bus":"1F68C","train":"1F686","plane":"2708",
 "helicopter":"1F681","monkey":"1F412","penguin":"1F427","bear":"1F43B","fox":"1F98A","giraffe":"1F992","zebra":"1F993",
 "star":"2B50","trophy":"1F3C6","rainbow":"1F308","crown":"1F451","robot":"1F916","crocodile":"1F40A","shark":"1F988",
 "owl":"1F989","butterfly":"1F98B","sailboat":"26F5",
}
AVATARS = {"a1":"1F466","a2":"1F467","a3":"1F9D2","a4":"1F476","a5":"1F996","a6":"1F981","a7":"1F984","a8":"1F916"}
GAME_ICONS = {"memory":"1F0CF","listen":"1F442","bubbles":"1FAE7","sort":"1F4E6","where":"1F50D","color":"1F3A8","say":"1F3A4","album":"1F4D2","play":"25B6","parent":"1F512","home":"1F3E0","back":"2B05","sticker_badge":"1F31F","mic":"1F3A4","next":"27A1","hand":"1F446","plus":"2795",
 "zone_animals":"1F6D6","zone_food":"1F37D","zone_dinosaurs":"1F30B","zone_vehicles":"1F17F","zone_clothes":"1F9FA","zone_nature":"2601","replay":"1F50A","learn":"1F393"}

if __name__ == "__main__":
    for p in load_packs():
        for w in p["words"]:
            src = w["source"]
            if src == "photo": continue
            if src.startswith("svg:color:"): balloon_svg(w["color"], w["image"])
            elif src.startswith("svg:number:"):
                openmoji("1F697", "images/_tmp/car.png")
                number_png(int(src.split(":")[2]), w["image"], os.path.join(PUB, "images/_tmp/car.png"))
            else: openmoji(src, w["image"])
    for k, h in STICKERS.items(): openmoji(h, f"images/stickers/{k}.png", 400)
    for k, h in AVATARS.items(): openmoji(h, f"images/avatars/{k}.png", 400)
    for k, h in GAME_ICONS.items(): openmoji(h, f"images/icons/{k}.png", 300)
    # PWA icons: opaque background (iOS needs it)
    for sz in (192, 512):
        dest = os.path.join(PUB, f"images/icons/pwa-{sz}.png")
        if not os.path.exists(dest):
            src = Image.open(os.path.join(PUB, "images/stickers/trex.png")).convert("RGBA")
            bg = Image.new("RGBA", (sz, sz), "#fff8e1")
            ic = src.resize((int(sz*0.8), int(sz*0.8)), Image.LANCZOS)
            bg.paste(ic, ((sz-ic.width)//2, (sz-ic.height)//2), ic); bg.convert("RGB").save(dest); print("+", dest)
    print("images done")
