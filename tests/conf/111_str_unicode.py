# Non-ASCII text: accented letters behave like any other character
s = "café"
print("text:", s)
print("len:", len(s), len("ñ"), len("über"))
print("index/slice:", s[3], s[-1], s[1:], s[::-1])
print("upper/lower:", s.upper(), "ÁRBOL".lower(), "ñandú".upper())
print("capitalize/title:", "élan vital".capitalize(), "josé maría".title())
print("swapcase:", "Año Único".swapcase())
print("ord:", ord("é"), ord("ñ"), ord("ü"), ord("Á"))
print("chr:", chr(233), chr(241), chr(252), chr(193))
print("in:", "é" in s, "e" in s, "fé" in s)
print("compare:", "é" == "e", "é" > "z", "a" < "á")
print("sorted by code point:", sorted(["zapato", "árbol", "casa", "ñu"]))
print("isalpha/isalnum:", "ñ".isalpha(), "café".isalpha(), "año1".isalpha(), "año1".isalnum())
print("isupper/islower:", "É".isupper(), "é".islower(), "Él".isupper())
print("find/count/replace:", s.find("é"), "canción".count("n"), "niño".replace("ñ", "n"))
print("repr:", repr(s), [s, "ñ"], {"clave": "valor ú"})
print("f-string width:", f"{s:>8}|", f"{s:*^9}", f"{'ñu':<6}|")
print("just:", "é".rjust(3, "."), "é".ljust(3, "."), "día".center(7, "-"))
print("concat/repeat:", "ñ" * 3, "ma" + "ñ" + "ana")
print("iterate:", [c for c in "día"])
print("startswith/endswith:", "ópera".startswith("ó"), "ópera".endswith("a"))
print("dict key:", {"año": 2024}["año"])
print("max/min:", max("añz"), min("éa"))
print("code points:", [ord(c) for c in "áéíóúñ"])
print("vowels with accents:", sum(1 for c in "murciélago" if c in "aeiouáéíóú"))
print("upper/lower round trip:", "Ñandú".upper().lower() == "ñandú")

def strip_accents(text):
    table = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u"}
    return "".join(table.get(c, c) for c in text)

print("strip accents:", strip_accents("pingüino añejo, canción"))
print("escapes:", "é" == "é", "\xf1" == "ñ", len("é"))
print("%-format:", "%s tiene %d años" % ("José", 30))
print("splitlines:", "línea uno\nlínea dos".splitlines())
print("partition:", "clave=válor".partition("="))
print("reverse words:", " ".join("el niño comió".split()[::-1]))
print("title each:", [w.title() for w in ["ángel", "ÓSCAR", "íñigo"]])
print("split/join:", "-".join("más o menos".split()))
print("strip:", "ááholaáá".strip("á"), "ñuñ".rstrip("ñ"))
print("zfill/len:", "é".zfill(3), len("é".zfill(3)))
words = ["mañana", "manzana", "maní"]
print("sorted words:", sorted(words), sorted(words, key=len))
print("longest:", max(words, key=len))
counts = {}
for ch in "ñandú añejo":
    if ch.isalpha():
        counts[ch] = counts.get(ch, 0) + 1
print("letter counts:", counts)
print("chr/ord round trip:", chr(ord("ñ")), chr(ord("é") + 1) == "ê")
print("str.format:", "{} y {}".format("Ángel", "Inés"), "{:>6}".format("sí"))
print("slice with accents:", "corazón"[-2:], "corazón"[:4], "corazón"[5])
print("equality is exact:", "cafe" == "café", "café" == "caf" + chr(233))
