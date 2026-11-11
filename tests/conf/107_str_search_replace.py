# str methods: searching, counting, replacing, partition
s = "the quick brown fox jumps over the lazy dog"
print("find:", s.find("quick"), s.find("the"), s.find("cat"))
print("find from start:", s.find("the", 1), s.find("o", 13), s.find("the", 32))
print("find in range:", s.find("o", 0, 10), s.find("q", 0, 5), s.find("q", 0, 4))
print("rfind:", s.rfind("the"), s.rfind("o"), s.rfind("cat"))
print("index:", s.index("fox"), s.index("o"))
try:
    s.index("cat")
except ValueError:
    print("index of a missing substring raises ValueError")
print("count:", s.count("o"), s.count("the"), s.count("z"), s.count("xyz"))
print("count is non-overlapping:", "aaaa".count("aa"), "abababa".count("aba"))
print("startswith:", s.startswith("the"), s.startswith("The"), s.startswith("quick", 4))
print("endswith:", s.endswith("dog"), s.endswith("dog."), s.endswith("lazy", 0, 39))
print("in:", "fox" in s, "Fox" in s, "fox jumps" in s)

print("replace:", s.replace("the", "a"))
print("replace count:", s.replace("o", "0", 2))
print("replace missing:", "abc".replace("x", "y"))
print("replace with empty:", "a-b-c".replace("-", ""))
print("replace longer:", "a,b".replace(",", ", "))
print("replace is not in place:", s[:9])
print("replace chained:", "a.b,c".replace(".", " ").replace(",", " "))
print("replace non-overlapping:", "aaaa".replace("aa", "b"), "aaa".replace("aa", "b"))
print("replace is case-sensitive:", "Hello hello".replace("hello", "bye"))
print("censor:", "darn it, darn!".replace("darn", "*" * 4))

print("partition:", "key=value".partition("="))
print("partition first only:", "a=b=c".partition("="))
print("partition missing:", "novalue".partition("="))
print("partition multi-char sep:", "left -> right".partition(" -> "))
head, sep, tail = "user@example.com".partition("@")
print("partition unpack:", head, sep, tail)
print("partition at ends:", "=x".partition("="), "x=".partition("="))

def find_all(text, sub):
    positions = []
    start = text.find(sub)
    while start != -1:
        positions.append(start)
        start = text.find(sub, start + 1)
    return positions

print("find all:", find_all(s, "o"), find_all("aaaa", "aa"), find_all(s, "cat"))
email = "ada.lovelace@example.org"
at = email.index("@")
print("split by index:", email[:at], email[at + 1:])
name = "archive.tar.gz"
print("extension:", name[name.rfind(".") + 1:], "| stem:", name[:name.find(".")])
call = "f(x, y)"
print("between brackets:", call[call.find("(") + 1:call.find(")")])
print("word order:", " over " in s, s.find("over") > s.find("fox"))
print("words starting with t:", sum(1 for w in s.split() if w.startswith("t")))
print("find vs index agree:", s.find("lazy") == s.index("lazy"))
print("vowel counts:", {ch: s.count(ch) for ch in "aeiou"})
print("first vowel index:", min(i for i in [s.find(v) for v in "aeiou"] if i != -1))
print("endswith tuple:", "img.png".endswith((".png", ".jpg")), "doc.txt".endswith((".png", ".jpg")))
