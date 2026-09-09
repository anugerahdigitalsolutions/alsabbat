"""Static check UI parity Android → iOS (styling saja, iOS sebagai referensi).

Memastikan penyebab perbedaan render Android sudah ditangani lewat shared style,
bukan cabang platform baru, dan tidak ada style khusus-iOS yang diubah.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SRC = Path("/app/mobile/src")
FAILS: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"{'PASS' if ok else 'FAIL'} — {name}{(' :: ' + detail) if detail else ''}")
    if not ok:
        FAILS.append(name)


theme = (SRC / "theme/index.js").read_text()
txt = (SRC / "components/Txt.js").read_text()
field = (SRC / "components/Field.js").read_text()
buttons = (SRC / "components/Buttons.js").read_text()
tabs = (SRC / "navigation/TabNavigator.js").read_text()
match_card = (SRC / "components/MatchCard.js").read_text()
member_card = (SRC / "screens/MemberCardScreen.js").read_text()
match_detail = (SRC / "screens/MatchDetailScreen.js").read_text()

# ---- typography / metrik teks (penyebab tinggi & posisi teks berbeda) -------
check("token androidTextFix tersedia di theme", "androidTextFix" in theme and "includeFontPadding: false" in theme)
check("Txt memakai androidTextFix (semua teks satu primitif)", "androidTextFix" in txt)
check("Txt mematikan font scaling sistem (proporsi = iOS)", "allowFontScaling={false}" in txt)
check("TextInput memakai androidTextFix", "androidTextFix" in field)
check("TextInput Android tanpa underline", 'underlineColorAndroid="transparent"' in field)

# ---- shadow / bentuk tombol ------------------------------------------------
check(
    "shadow iOS tidak diubah (shadowColor/Opacity/Radius/Offset tetap)",
    all(k in theme for k in ("shadowColor: colors.accent", "shadowOpacity: 0.35", "shadowRadius: 16", "shadowOffset: { width: 0, height: 8 }")),
)
check("elevation gold dimatikan hanya untuk Android", "Platform.OS === 'android' ? 0 : 8" in theme)
check("shadow card/nav iOS tetap apa adanya", "elevation: 8," in theme and "elevation: 14," in theme)
check("tombol utama punya latar solid (outline pill benar di Android)", "wrapAccent" in buttons and "backgroundColor: colors.accentTo" in buttons)
check("bentuk tombol tetap pill radius sama", "borderRadius: radii.pill" in buttons and "minHeight: 50" in buttons)
check("ukuran icon tombol sama di kedua platform", buttons.count("size={17}") >= 2)

# ---- kontainer gradient + shadow ------------------------------------------
check("MatchCard featured punya latar solid", "overflow: 'hidden', backgroundColor: colors.accentTo" in match_card)
check("Kartu member punya latar solid", "backgroundColor: colors.navyDeep" in member_card)
check("Scorecard match detail punya latar solid", "backgroundColor: colors.surfaceSolid" in match_detail)

# ---- cabang platform hanya untuk hal teknis --------------------------------
check("animasi tab sama (tidak lagi khusus Android)", "animation: 'fade'" in tabs and "Platform" not in tabs)

platform_hits = []
for path in SRC.rglob("*.js"):
    body = path.read_text()
    for match in re.finditer(r"Platform\.OS === '(ios|android)'", body):
        platform_hits.append(f"{path.relative_to(SRC)}:{body[:match.start()].count(chr(10)) + 1}")

allowed = ("hooks/usePushNotifications.js", "KeyboardAvoiding")
keyboard_only = all(
    ("usePushNotifications" in hit) or ("Screen" in hit) or True for hit in platform_hits
)
print("   cabang Platform.OS tersisa:", platform_hits)
check(
    "tidak ada cabang platform untuk styling di komponen UI",
    not any(hit.startswith("components/") for hit in platform_hits),
)
check("cabang platform styling di theme dibatasi pada elevation", theme.count("Platform.OS") == 1)

# ---- responsif -------------------------------------------------------------
sizes = re.findall(r"width:\s*(\d{3,})", (SRC / "components/Buttons.js").read_text())
check("tidak ada lebar tombol hardcode (tetap responsif)", not sizes, str(sizes))

print()
print("HASIL:", "SEMUA CEK LULUS" if not FAILS else f"{len(FAILS)} CEK GAGAL -> {FAILS}")
sys.exit(1 if FAILS else 0)
