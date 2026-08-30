"""Verifikasi desain Kartu Pertandingan PER MATCH (card_* & result_card_*).

Non-destruktif: tim + 2 match + 2 media uji dibuat lalu DIHAPUS di akhir
(kecuali dijalankan dengan argumen `keep`, dipakai untuk uji UI).
"""
import json
import os
import sys
from pathlib import Path

import requests

BASE = sys.argv[1].rstrip("/")
KEEP = len(sys.argv) > 2 and sys.argv[2] == "keep"
STATE = Path("/tmp/match_card_fixture.json")
EMAIL = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@alsabbat.com")
PASSWORD = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "Alsabbat2026!")

results = []


def check(label, actual, expected):
    ok = actual == expected
    results.append(ok)
    print(f"{'OK  ' if ok else 'FAIL'} {label}: {actual!r} (harap {expected!r})")


def png(path, color):
    from PIL import Image, ImageDraw

    im = Image.new("RGB", (1080, 1350), color)
    ImageDraw.Draw(im).rectangle([120, 200, 960, 1100], fill=(252, 207, 43))
    im.save(path)


DESIGN_A = {
    "card_feed_background": None,  # diisi URL media uji
    "card_feed_focus_x": 20,
    "card_feed_focus_y": 80,
    "card_feed_zoom": 160,
    "card_story_background": None,
    "card_story_focus_x": 65,
    "card_story_focus_y": 35,
    "card_story_zoom": 130,
    "card_transparency": 80,
    "card_overlay_enabled": False,
    "card_overlay_color": "#123456",
    "card_overlay_opacity": 22,
    "card_logo_zoom": 135,
    "card_sponsors_enabled": False,
}

DESIGN_B = {
    "card_feed_focus_x": 90,
    "card_feed_zoom": 110,
    "card_transparency": 10,
    "card_overlay_enabled": True,
    "card_overlay_color": "#FF0000",
    "card_overlay_opacity": 90,
    "card_logo_zoom": 70,
    "card_sponsors_enabled": True,
}

RESULT_DESIGN = {
    "result_card_feed_focus_x": 45,
    "result_card_feed_zoom": 175,
    "result_card_transparency": 55,
    "result_card_overlay_enabled": True,
    "result_card_overlay_color": "#00AA55",
    "result_card_overlay_opacity": 40,
    "result_card_logo_zoom": 120,
    "result_card_sponsors_enabled": False,
}


def main():
    h = {
        "Authorization": "Bearer "
        + requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30).json()[
            "access_token"
        ]
    }
    club_id = requests.get(f"{BASE}/api/club/active", timeout=30).json()["club"]["id"]
    state = {"media": [], "matches": [], "team": None}
    try:
        team = requests.post(
            f"{BASE}/api/teams", headers=h, json={"club_id": club_id, "name": "Tim Uji Kartu"}, timeout=30
        ).json()
        state["team"] = team["id"]

        for i, color in enumerate([(1, 40, 145), (16, 16, 16)]):
            p = f"/tmp/card_bg_{i}.png"
            png(p, color)
            with open(p, "rb") as fh:
                res = requests.post(
                    f"{BASE}/api/media/upload",
                    headers=h,
                    files={"file": (f"card_bg_{i}.png", fh, "image/png")},
                    data={"alt_text": f"BG Kartu {i}"},
                    timeout=60,
                ).json()
            state["media"].append({"id": res["id"], "url": res["url"]})

        DESIGN_A["card_feed_background"] = state["media"][0]["url"]
        DESIGN_A["card_story_background"] = state["media"][1]["url"]

        matches = []
        for label, logo in (("Lawan A", state["media"][0]["url"]), ("Lawan B", None)):
            payload = {
                "team_id": team["id"],
                "opponent": {"name": label, **({"logo": logo} if logo else {})},
                "date": "2026-07-05",
                "status": "SCHEDULED",
                "venue_type": "HOME",
            }
            m = requests.post(f"{BASE}/api/matches", headers=h, json=payload, timeout=30).json()
            matches.append(m["id"])
            state["matches"].append(m["id"])
        a, b = matches

        # ---- A: seluruh desain kartu pertandingan tersimpan
        requests.patch(f"{BASE}/api/matches/{a}", headers=h, json=DESIGN_A, timeout=30).raise_for_status()
        got = requests.get(f"{BASE}/api/matches/{a}", timeout=30).json()
        for key, value in DESIGN_A.items():
            check(f"A {key}", got.get(key), value)
        check("A opponent.logo diteruskan", bool((got.get("opponent") or {}).get("logo")), True)
        check("A result_card_* tetap kosong", got.get("result_card_feed_background"), None)
        check("A result_card_overlay tetap kosong", got.get("result_card_overlay_enabled"), None)

        # ---- B: desain berbeda, A tidak berubah
        requests.patch(f"{BASE}/api/matches/{b}", headers=h, json=DESIGN_B, timeout=30).raise_for_status()
        got_b = requests.get(f"{BASE}/api/matches/{b}", timeout=30).json()
        for key, value in DESIGN_B.items():
            check(f"B {key}", got_b.get(key), value)
        check("B tidak mewarisi background A", got_b.get("card_feed_background"), None)
        got_a2 = requests.get(f"{BASE}/api/matches/{a}", timeout=30).json()
        check("A tetap utuh setelah B diubah (bg)", got_a2.get("card_feed_background"), DESIGN_A["card_feed_background"])
        check("A tetap utuh setelah B diubah (logo zoom)", got_a2.get("card_logo_zoom"), 135)
        check("A tetap utuh setelah B diubah (overlay)", got_a2.get("card_overlay_enabled"), False)

        # ---- Kartu Hasil independen
        requests.patch(f"{BASE}/api/matches/{a}", headers=h, json=RESULT_DESIGN, timeout=30).raise_for_status()
        got_a3 = requests.get(f"{BASE}/api/matches/{a}", timeout=30).json()
        for key, value in RESULT_DESIGN.items():
            check(f"HASIL {key}", got_a3.get(key), value)
        check("card_* tidak terpengaruh Kartu Hasil (bg)", got_a3.get("card_feed_background"), DESIGN_A["card_feed_background"])
        check("card_* tidak terpengaruh Kartu Hasil (overlay)", got_a3.get("card_overlay_color"), "#123456")
        check("card_* tidak terpengaruh Kartu Hasil (zoom logo)", got_a3.get("card_logo_zoom"), 135)

        # ---- payload publik (relations) membawa semua field desain
        rel = requests.get(f"{BASE}/api/matches/{a}/relations", timeout=30).json()["match"]
        check("relations bawa card_logo_zoom", rel.get("card_logo_zoom"), 135)
        check("relations bawa result_card_overlay_color", rel.get("result_card_overlay_color"), "#00AA55")

        STATE.write_text(json.dumps({**state, "match_a": a, "match_b": b}))
        print("\nmatch_a:", a, "| match_b:", b)
    finally:
        if not KEEP:
            for mid in state["matches"]:
                requests.delete(f"{BASE}/api/matches/{mid}", headers=h, timeout=30)
            for media in state["media"]:
                requests.delete(f"{BASE}/api/media/{media['id']}/hard", headers=h, timeout=30)
            if state["team"]:
                requests.delete(f"{BASE}/api/teams/{state['team']}", headers=h, timeout=30)
            STATE.unlink(missing_ok=True)
            print("cleanup: data uji dihapus")

    print(f"\nHASIL: {sum(results)} lolos, {len(results) - sum(results)} gagal")
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
