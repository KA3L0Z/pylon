# Type builtins and conversions: type, isinstance, issubclass, callable, getattr/setattr/hasattr
print("type():", type(1), type(1.5), type("s"), type(True), type(None))
print("type() containers:", type([1]), type((1,)), type({}), type({1}), type(range(1)))
print("type names:", [type(v).__name__ for v in [1, 1.5, "s", True, None, [], (), {}, set(), frozenset(), range(1)]])
print("type compare:", type(1) == int, type("a") is str, type(1) == type(2), type(1) == type(1.0), type(True) is int)
print("isinstance:", isinstance(1, int), isinstance(1.0, int), isinstance("a", str), isinstance([], list),
      isinstance(None, int))
print("isinstance bool/int:", isinstance(True, int), isinstance(True, bool), isinstance(1, bool))
print("isinstance tuple:", isinstance(1, (int, str)), isinstance("a", (int, float)), isinstance(2.5, (int, float)),
      isinstance([], (list, tuple, dict)))
print("issubclass:", issubclass(bool, int), issubclass(int, bool), issubclass(int, (str, int)),
      issubclass(ValueError, Exception))
print("callable:", callable(len), callable(print), callable(int), callable("s"), callable(None), callable(lambda: 1))

class Point:
    kind = "point"
    def __init__(self, x, y):
        self.x, self.y = x, y
    def norm1(self):
        return abs(self.x) + abs(self.y)

p = Point(3, -4)
print("instance type:", type(p).__name__, type(p) is Point, isinstance(p, Point), callable(Point), callable(p))
print("getattr:", getattr(p, "x"), getattr(p, "kind"), getattr(p, "z", "default"), getattr(p, "norm1")())
print("hasattr:", hasattr(p, "x"), hasattr(p, "z"), hasattr(p, "norm1"), hasattr(Point, "kind"),
      hasattr("s", "upper"), hasattr(1, "upper"))
setattr(p, "x", 10)
setattr(p, "label", "moved")
print("setattr:", p.x, p.label, hasattr(p, "label"))
for name in ["x", "y", "missing"]:
    print("dynamic access:", name, getattr(p, name, None))
try:
    getattr(p, "missing")
except AttributeError:
    print("getattr without default raises AttributeError")
print("getattr on builtins:", getattr("abc", "upper")(), getattr([3, 1, 3], "count")(3))
setattr(Point, "kind", "pt")
print("setattr on class:", p.kind, Point.kind)

print("int():", int("42"), int(3.99), int(-3.99), int(True), int("  7 "), int("-0"), int("101", 2))
print("float():", float("3.5"), float(2), float("1e-3"), float("inf"), float(False))
print("str():", str(42), str(3.0), str(True), str(None), str([1, "a"]), str((1,)), str({"k": 1}))
print("repr():", repr("a"), repr(1), repr([1, "a"]), repr(None), repr(2.50))
print("bool():", bool(""), bool("0"), bool(0), bool(0.1), bool([]), bool([[]]), bool(None), bool(range(0)))
print("list():", list("abc"), list((1, 2)), list({"a": 1, "b": 2}), list(range(3)), list())
print("tuple():", tuple([1, 2]), tuple("ab"), tuple())
print("dict():", dict([("a", 1)]), dict(a=1, b=2), dict(zip("xy", [1, 2])), dict({"k": 1}))
print("set()/frozenset():", sorted(set("hello")), sorted(set([3, 3, 1])), sorted(frozenset([2, 1, 2])), set())
print("round trips:", int(str(123)) + 1, str(int("7") * 6), float(str(2.5)) * 2, list(tuple([1, 2])))
print("chars and codes:", ord("a"), chr(98), bin(5), hex(255), oct(8), int("0x1f", 16))
print("user class type:", type(p))
