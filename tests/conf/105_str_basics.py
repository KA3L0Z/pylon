# str: indexing, slicing, operators, comparison, ord/chr
s = "Hello, World"
print("len:", len(s), len(""))
print("index:", s[0], s[7], s[-1], s[-5])
print("slice:", s[0:5], s[7:], s[:5], s[:])
print("neg slice:", s[-5:], s[:-7], s[-5:-2])
print("step:", s[::2], s[1::2], s[::3])
print("reverse:", s[::-1], s[5::-1], s[-1:-6:-1])
print("out of range slice:", s[5:100], repr(s[100:]), s[-100:3], repr(s[3:1]))
print("negative step bounds:", "abcdef"[4:1:-1], "abcdef"[:2:-1], "abcdef"[2::-1])
print("concat:", "ab" + "cd", "x" + "" + "y")
print("repeat:", "ab" * 3, 3 * "-", "x" * 0 == "", "ab" * -1 == "")
print("in:", "World" in s, "world" in s, "" in s, "lo, W" in s)
print("not in:", "z" not in s)
print("compare:", "a" < "b", "a" < "B", "abc" < "abd", "abc" < "abcd", "10" < "9")
print("equality:", "abc" == "abc", "abc" == "ABC", "abc" != "abd")
print("ord:", ord("a"), ord("A"), ord("0"), ord(" "), ord("z") - ord("a"))
print("chr:", chr(97), chr(65), chr(48), chr(ord("a") + 1))
print("caesar shift:", "".join(chr((ord(c) - 97 + 3) % 26 + 97) for c in "xyz"))
print("iterate:", [c for c in "abc"])
print("list/tuple of str:", list("abc"), tuple("ab"))
print("sorted chars:", sorted("banana"), "".join(sorted("banana")))
print("min/max char:", min("hello"), max("hello"))
print("enumerate:", [(i, c) for i, c in enumerate("ab")])
print("str():", str(12) + str(3.5) + str(True) + str(None) + str([1, "a"]))
print("multiply build:", "-" * 10)
print("adjacent literals:", "abc" "def")
print("quote styles are equal:", 'it is' == "it is")
print("empty is falsy:", bool(""), bool(" "))
print("first/last:", s[0], s[len(s) - 1], s[0] == s[-12])
print("middle char:", "abcde"[len("abcde") // 2])
print("palindrome:", "level" == "level"[::-1], "hello" == "hello"[::-1])
print("char to int:", int("7") + 1, "7" + "1", "7" * 2)
print("slicing copies:", s[:] == s, s[2:4] + s[4:6] == s[2:6])
print("stepped middle:", "abcdefgh"[1:7:2])

t = s
t += "!"
print("+= rebinds, original unchanged:", s, "|", t)
try:
    s[0] = "J"
except TypeError:
    print("item assignment raises TypeError")
try:
    s[100]
except IndexError:
    print("index past the end raises IndexError")
out = ""
for ch in "abc":
    out = ch + out
print("build with loop:", out)
count = 0
for ch in s:
    if ch in "aeiou":
        count += 1
print("vowels:", count)
i = 0
while i < len(s) and s[i] != ",":
    i += 1
print("scan to comma:", i, s[:i])
print("compare as text:", "apple10" < "apple9", "Z" < "a", "" < "a")
print("string in list:", "b" in ["a", "b"], "ab" in ["a", "b"])
