import re, os, sys

EN = set("""the a an and or of for with to in on at from by is are was were be been this that these those
home club squad matches match news gallery contact latest view all share read more coming upcoming
result results season player players team teams store shop cart checkout order orders total subtotal
shipping payment search loading no not found back next previous submit send filter sort show about us
follow quick links contact us our first last name email phone address city province postal note notes
size color quantity qty price add remove update continue empty available sold out stats statistics
goals assists appearances minutes cards yellow red position number age height weight nationality
date time venue competition round home away draw win loss won lost points played schedule fixtures
standings lineup lineups formation starting bench substitutes events timeline highlights media photos
videos albums album download copy link copied close open menu language login logout register sign
account profile history status tracking track number success failed pending paid processing shipped
delivered cancelled refund thank you page error something went wrong try again reload retry
gallery highlights sponsors partners achievements trophies titles honours honors
""".split())

pat_str = re.compile(r"""(['"`])((?:(?!\1)[^\\]|\\.){2,120})\1""")
files = []
for root in ("pages/public", "components/public"):
    for dp, dn, fn in os.walk(root):
        for f in fn:
            if f.endswith(".js"):
                files.append(os.path.join(dp, f))

for f in sorted(files):
    out = []
    lines = open(f).read().split("\n")
    for i, ln in enumerate(lines, 1):
        s = ln.strip()
        if s.startswith("import ") or s.startswith("//") or "data-testid" in s and "'" not in s.replace("data-testid", ""):
            pass
        cands = []
        for m in pat_str.finditer(ln):
            t = m.group(2)
            if any(w in EN for w in re.findall(r"[A-Za-z']+", t.lower())):
                cands.append(t)
        # jsx text nodes
        for m in re.finditer(r">([^<>{}\n]{3,120})<", ln):
            t = m.group(1).strip()
            if t and any(w in EN for w in re.findall(r"[A-Za-z']+", t.lower())):
                cands.append(t)
        cands = [c for c in cands if not re.match(r"^[a-z-]+$", c) or " " in c]
        cands = [c for c in cands if "/" != c[0] and "var(" not in c and "#" != c[0] and not c.startswith("http")]
        if cands:
            out.append(f"{i}: {' | '.join(dict.fromkeys(cands))}")
    if out:
        print("=== " + f)
        print("\n".join(out))
