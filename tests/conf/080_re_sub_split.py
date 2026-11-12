# re: sub, subn, split, escape, compiled patterns, errors
import re

print(re.sub(r"\d+", "#", "a1b22c333"))
print(re.sub(r"\d+", "#", "a1b22c333", 2), re.sub(r"\d+", "#", "a1b22c333", count=1))
print(re.sub(r"(\w+)@(\w+)", r"\2 at \1", "ada@tower pip@deck"))
print(re.sub(r"(?P<first>\w+) (?P<second>\w+)", r"\g<second> \g<first>", "hello world"))
print(re.sub(r"(\d)(\d)", r"\g<2>\g<1>0", "12 34"))
print(re.sub(r"\s+", " ", "too    many   spaces\there"))
print(re.sub(r"[aeiou]", "", "regular expression"), re.sub(r"x", "y", "no match"))
print(re.sub(r"\d+", lambda m: str(int(m.group()) * 2), "3 apples and 10 pears"))


def shout(match):
    return match.group(1).upper() + "!"


print(re.sub(r"(\w+)!", shout, "stop! go! wait"))
print(re.sub(r"a", r"\\", "banana"), re.sub(r"a", r"\n", "banana").count("\n"), re.sub(r"(a)(x)?", r"[\1\2]", "ab"))
print(re.sub("x*", "-", "abxd"), re.sub(r"^", "> ", "line"), re.sub(r"$", "!", "end"), re.sub(r"\b", "|", "two words"))
print(re.subn(r"o", "0", "foo boo"), re.subn(r"z", "0", "foo"))
print(re.split(r",\s*", "a, b,c ,  d"), re.split(r"\s+", "  lead and trail  "))
print(re.split(r"[,;]", "a,b;c"), re.split(r"(,)", "a,b,c"), re.split(r",", "a,b,c", 1), re.split(r",", "a,b,c", maxsplit=2))
print(re.split(r"(-)|(\+)", "1-2+3"), re.split("x*", "axbc"), re.split(r"\d", "nodigits"), re.split(r"\W+", "Words, words, words."))
print(re.escape("a.b*c"), re.escape("1+1=2 (ok)"), re.escape("under_score-dash"), re.findall(re.escape("a.b"), "a.b axb"))
compiled = re.compile(r"(\w+)=(\d+)")
print(compiled.sub(r"\2=\1", "x=1, y=22"), compiled.split("a x=1 b y=2 c"), compiled.subn("-", "x=1 y=2"), compiled.findall("x=1, y=22"))
print([m.groups() for m in compiled.finditer("x=1, y=22")], compiled.search("  k=9").span(1))
words = re.compile(r"[a-z]+", re.IGNORECASE)
print(words.findall("Mixed CASE words"), words.flags & re.IGNORECASE == re.IGNORECASE)
print(re.findall(r"""
    (\d+)       # a number
    \s*
    ([a-z]+)    # its unit
""", "12 kg, 5m", re.VERBOSE))
for bad in [r"(", r"[a", r"*a", r"(?P<n>a)(?P<n>b)", r"\\1(a)"]:
    try:
        re.compile(bad)
        print("compiled", bad)
    except re.error:
        print("re.error for", bad)
try:
    re.sub(r"(a)", r"\2", "a")
except re.error:
    print("re.error: bad group reference")
try:
    re.search(r"a", 5)
except TypeError:
    print("TypeError for a non-string")
print(re.match(r"(\d+)-(\d+)", "10-20").group(1, 2), re.match(r"x", "y") is None)
log = """2099-03-14 07:42 [relay-7] ERROR voltage drop
2099-03-14 07:43 [relay-2] INFO heartbeat
2099-03-14 07:45 [relay-7] ERROR voltage drop
2099-03-14 07:51 [gate-1] WARN slow response"""
line_form = re.compile(r"^(\S+) (\d\d):(\d\d) \[([\w-]+)\] (\w+) (.*)$", re.MULTILINE)
counts = {}
for date, hour, minute, source, level, message in line_form.findall(log):
    if level == "ERROR":
        counts[source] = counts.get(source, 0) + 1
print(counts, len(line_form.findall(log)), line_form.search(log).group(4, 5), [m.group(6) for m in line_form.finditer(log)][-1])
