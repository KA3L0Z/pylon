# str methods: character tests, alignment and padding
print("isdigit:", "123".isdigit(), "12.3".isdigit(), "-12".isdigit(), "".isdigit(), "12a".isdigit())
print("isalpha:", "abc".isalpha(), "abc1".isalpha(), "a b".isalpha(), "".isalpha())
print("isalnum:", "abc123".isalnum(), "abc 123".isalnum(), "abc_1".isalnum(), "".isalnum())
print("isspace:", " ".isspace(), " \t\n".isspace(), "".isspace(), " a ".isspace())
print("isupper:", "ABC".isupper(), "AbC".isupper(), "ABC1!".isupper(), "123".isupper())
print("islower:", "abc".islower(), "aBc".islower(), "abc1!".islower(), "".islower())
print("single chars:", "7".isdigit(), "x".isalpha(), "X".isupper(), " ".isspace())
word = "Passw0rd!"
print("has digit:", any(ch.isdigit() for ch in word))
print("has upper:", any(ch.isupper() for ch in word))
print("has symbol:", any(not ch.isalnum() for ch in word))
print("all letters:", all(ch.isalpha() for ch in word))
print("digits only:", "".join(ch for ch in "a1b22c333" if ch.isdigit()))
print("letters only:", "".join(ch for ch in "h3ll0 w0rld" if ch.isalpha()))
print("count kinds:", sum(c.isupper() for c in "Hello World"), sum(c.isspace() for c in "a b  c"))
print("valid ints:", [t for t in ["42", "4 2", "four", "007", ""] if t.isdigit()])

def is_number(text):
    return text.lstrip("-").replace(".", "", 1).isdigit()

print("is_number:", [is_number(t) for t in ["3.14", "-2", "1.2.3", "abc", "10"]])
print("isdigit then int:", [int(t) if t.isdigit() else t for t in ["1", "x", "22"]])
print("first non-space:", next(ch for ch in "   x y" if not ch.isspace()))
print("combined tests:", "abc".isalpha() and "abc".islower(), "ABC1".isalnum() and "ABC1".isupper())

print("ljust:", repr("ab".ljust(5)), repr("ab".ljust(5, ".")), repr("abcdef".ljust(3)))
print("rjust:", repr("ab".rjust(5)), repr("ab".rjust(5, "0")), repr("abcdef".rjust(3)))
print("center even pad:", repr("ab".center(6)), repr("ab".center(6, "*")))
print("center too short:", repr("abcdef".center(3)))
print("zfill:", "42".zfill(5), "-42".zfill(5), "+7".zfill(4), "12345".zfill(3), "".zfill(2))
print("zfill non-numeric:", "3.5".zfill(6), "abc".zfill(5))
print("banner:", " Menu ".center(20, "="))
print("underline:", "Title" + "\n" + "-" * len("Title"))

rows = [("apple", 3, 0.5), ("kiwi", 12, 0.25), ("watermelon", 1, 3.0)]
for name, qty, price in rows:
    print(name.ljust(12) + str(qty).rjust(4) + str(price).rjust(7) + "|")
for n in [1, 22, 333]:
    print("dotted:", str(n).rjust(5, "."))
print("time:", str(7).zfill(2) + ":" + str(5).zfill(2))
print("binary byte:", bin(5)[2:].zfill(8))
width = 9
print("+" + "-" * width + "+")
print("|" + "hi".center(width) + "|")
print("+" + "-" * width + "+")
print("ids:", ["ID" + str(n).zfill(3) for n in (1, 25, 300)])
print("rjust zero equals zfill:", "7".rjust(3, "0") == "7".zfill(3))
print("center odd pad:", repr("ab".center(5, "*")), repr("abc".center(6, "*")), repr("a".center(4, "*")))
