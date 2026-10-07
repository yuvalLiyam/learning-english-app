"""Single source of truth for every audio file the app needs.
Returns list of (relative_path, text, lang, speed) where speed is 'normal'|'slow'."""
import json, glob, os
HERE = os.path.dirname(os.path.abspath(__file__))
PACKS = os.path.join(HERE, "..", "src", "content", "packs")

UI_EN = {
  "praise_1": "Very good!", "praise_2": "Great job!", "praise_3": "Amazing!", "praise_4": "You did it!", "praise_5": "Super!",
  "praise_6": "Wow, excellent!", "praise_7": "Fantastic!",
  "try_again": "Try again!", "almost": "Almost! Listen again.", "listen": "Listen!", "new_word": "New word!",
  "tap_dino": "Tap the dinosaur to start!", "who_are_you": "Who is playing today?", "choose_game": "Choose a game!",
  "lets_play": "Let's play!", "all_done": "All done! Great work!", "sticker": "You got a new sticker!",
  "game_memory": "Memory!", "game_listen": "Listen and pick!", "game_bubbles": "Bubble pop!", "game_sort": "Sort it!",
  "game_where": "Where is it?", "game_color": "Color it!", "game_say": "Say it!", "game_album": "My stickers!",
  "find_pairs": "Find the pairs!", "say_it_now": "Say it!", "say_word": "Now you say it!", "i_heard": "I heard you!",
  "sort_animals": "Put the animals on the farm!", "sort_food": "Put the food on the plate!",
  "sort_dinosaurs": "Put the dinosaurs on the volcano!", "sort_vehicles": "Put the cars in the garage!",
  "sort_clothes": "Put the clothes in the closet!", "sort_nature": "Put the nature things in the sky!",
  "drag_it": "Drag it to the right place!", "look": "Look!", "bye": "Bye bye! See you soon!",
  "grow": "I am growing! Thank you!",
  "game_learn": "Let's learn new words!", "choose_category": "Choose what to learn!", "say_three": "Now you say it, three times!",
  "again": "Again!", "good_now_games": "Great! Now let's play!",
}
UI_HE = {
  "try_again": "נסה שוב!", "find_pairs": "מצא את הזוגות!", "say_word": "עכשיו אתה תגיד!",
  "sort_animals": "שים את החיות בחווה!", "sort_food": "שים את האוכל בצלחת!",
  "sort_dinosaurs": "שים את הדינוזאורים על הר הגעש!", "sort_vehicles": "שים את המכוניות במוסך!",
  "sort_clothes": "שים את הבגדים בארון!", "sort_nature": "שים את דברי הטבע בשמיים!",
  "drag_it": "גרור למקום הנכון!", "choose_game": "בחר משחק!", "who_are_you": "מי משחק היום?",
  "tap_dino": "לחץ על הדינוזאור כדי להתחיל!", "choose_category": "בחר מה ללמוד!", "say_three": "עכשיו אתה תגיד, שלוש פעמים!",
}

def load_packs():
    packs = []
    for f in sorted(glob.glob(os.path.join(PACKS, "*.json"))):
        packs.append(json.load(open(f, encoding="utf-8")))
    return packs

def phrases():
    out = []
    for k, t in UI_EN.items(): out.append((f"audio/ui/{k}.mp3", t, "en", "normal"))
    for k, t in UI_HE.items(): out.append((f"audio/ui/{k}_he.mp3", t, "he", "normal"))
    for p in load_packs():
        cat = p["id"]
        out.append((f"audio/ui/cat_{cat}.mp3", p["name"] + "!", "en", "normal"))
        out.append((f"audio/ui/cat_{cat}_he.mp3", p["name_he"], "he", "normal"))
        for w in p["words"]:
            en, wid = w["en"], w["id"]
            base = f"audio/words/{wid}"
            out.append((base + ".mp3", en, "en", "normal"))
            out.append((base + "_slow.mp3", en, "en", "slow"))
            out.append((base + "_he.mp3", w["he"], "he", "normal"))
            if cat == "numbers":
                find, pop, where = f"Find {en}!", f"Pop {en}!", f"Where is {en}?"
            elif cat == "colors":
                find, pop, where = f"Find the {en} balloon!", f"Pop the {en} bubble!", f"Where is the {en} balloon?"
                out.append((base + "_color.mp3", f"Color the balloon {en}!", "en", "normal"))
                he_color = w['he'] if w['he'][0] != 'ו' else 'ו' + w['he']  # ב+ורוד -> בוורוד
                out.append((base + "_color_he.mp3", f"תצבע את הבלון ב{he_color}!", "he", "normal"))
            elif w.get("find_en"):
                find = pop = where = w["find_en"]
            else:
                find, pop, where = f"Find the {en}!", f"Pop the {en}!", f"Where is the {en}?"
            out.append((base + "_find.mp3", find, "en", "normal"))
            out.append((base + "_find_he.mp3", w["he_find"], "he", "normal"))
            out.append((base + "_pop.mp3", pop, "en", "normal"))
            out.append((base + "_where.mp3", where, "en", "normal"))
    # sticker names: parsed from src/content/index.ts (STICKER_INFO)
    import re
    ts = open(os.path.join(HERE, "..", "src", "content", "index.ts"), encoding="utf-8").read()
    for sid, en, he in re.findall(r"^\s+(\w+): \{ en: '([^']+)', he: '([^']+)' \},", ts, re.M):
        out.append((f"audio/stickers/{sid}.mp3", en, "en", "normal"))
        out.append((f"audio/stickers/{sid}_he.mp3", he, "he", "normal"))
    return out

if __name__ == "__main__":
    print(len(phrases()), "phrases")
