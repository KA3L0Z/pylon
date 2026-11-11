# __repr__/__str__, comparison methods, __hash__, objects as dict keys and set members
class Version:
    def __init__(self, major, minor):
        self.major, self.minor = major, minor
    def _key(self):
        return (self.major, self.minor)
    def __repr__(self):
        return f"Version({self.major}, {self.minor})"
    def __str__(self):
        return f"v{self.major}.{self.minor}"
    def __eq__(self, other):
        return isinstance(other, Version) and self._key() == other._key()
    def __ne__(self, other):
        return not self == other
    def __lt__(self, other):
        return self._key() < other._key()
    def __le__(self, other):
        return self._key() <= other._key()
    def __gt__(self, other):
        return self._key() > other._key()
    def __ge__(self, other):
        return self._key() >= other._key()
    def __hash__(self):
        return hash(self._key())
a, b, c = Version(1, 2), Version(1, 10), Version(1, 2)
print("str/repr:", a, str(b), repr(a), [a, b])
print("format uses str:", f"{a}", "{}".format(b), "%s" % a, f"{a!r}")
print("eq:", a == c, a == b, a is c, a == "v1.2", a == None)
print("ne:", a != b, a != c)
print("order:", a < b, a <= c, a > b, b >= a, a < c)
vs = [Version(2, 0), b, a, Version(0, 9)]
print("sorted:", sorted(vs), "min/max:", min(vs), max(vs))
print("sorted reverse:", [str(v) for v in sorted(vs, reverse=True)])
print("list search uses eq:", Version(2, 0) in vs, Version(9, 9) in vs, vs.index(Version(1, 10)), vs.count(a))
names = {a: "stable", b: "beta"}
print("dict key with custom hash:", names[Version(1, 2)], Version(1, 10) in names, len(names))
names[Version(1, 2)] = "replaced"
print("equal key replaces:", len(names), names[a])
print("set dedupes equal objects:", len({a, b, c}), sorted({a, b, c}))

class Token:
    def __init__(self, label):
        self.label = label
    def __repr__(self):
        return f"Token({self.label})"
t1, t2 = Token("x"), Token("x")
print("default eq is identity:", t1 == t2, t1 == t1, t1 != t2)
seen = {t1: "first", t2: "second"}
print("default hash is identity:", len(seen), seen[t1], seen[t2], Token("x") in seen)
print("set of distinct objects:", len({t1, t2, t1}))
print("list search by identity:", t1 in [t2], t1 in [t2, t1])

class OnlyRepr:
    def __repr__(self):
        return "<only repr>"

class OnlyStr:
    def __str__(self):
        return "only str"
print("str falls back to repr:", str(OnlyRepr()), OnlyRepr(), [OnlyRepr()])
print("str defined:", OnlyStr(), str(OnlyStr()))
