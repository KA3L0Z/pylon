# tuple: creation, immutability, unpacking, methods, tuples as keys
t = (1, 2, 3)
print("tuple:", t, len(t), type(t).__name__)
print("empty/single:", (), (1,), len(()), len((1,)))
print("parentheses alone are not a tuple:", type((1)).__name__, type((1,)).__name__)
packed = 4, 5
print("packing:", packed)
print("index/slice:", t[0], t[-1], t[1:], t[::-1])
print("concat/repeat:", t + (4,), t * 2, (0,) * 3)
print("in:", 2 in t, 9 in t)
print("count/index:", (1, 2, 1, 1).count(1), (5, 6, 7).index(7))
print("compare:", (1, 2) < (1, 3), (1, 2) == (1, 2), (1, 2) < (1, 2, 0), (2,) > (1, 5))
print("mixed:", (1, "a", 2.5, None, [1], (2,)))
print("from other:", tuple([1, 2]), tuple("abc"), tuple(range(3)), tuple({"k": 1}))
print("to list and back:", list(t), tuple(list(t)) == t)
print("min/max/sum/sorted:", min(t), max(t), sum(t), sorted((3, 1, 2)))
print("iterate:", [x * 2 for x in t])
a, b, c = t
print("unpack:", a, b, c)
first, *rest = t
print("star unpack:", first, rest)
try:
    t[0] = 9
except TypeError:
    print("item assignment raises TypeError")
try:
    t.append(4)
except AttributeError:
    print("no append: AttributeError")
u = t
u += (4,)
print("+= makes a new tuple:", t, u)
inner = ([1, 2], "x")
inner[0].append(3)
print("mutable element can change:", inner)
points = {(0, 0): "origin", (1, 2): "p"}
print("tuple keys:", points[(0, 0)], points[1, 2], (1, 2) in points)
seen = set()
seen.add((1, 2)); seen.add((1, 2)); seen.add((2, 1))
print("tuples in a set:", sorted(seen))

def min_max(values):
    return min(values), max(values)

lo, hi = min_max([4, 1, 9])
print("multiple return:", lo, hi, min_max([2, 2]))
pairs = [(1, "one"), (2, "two")]
for number, name in pairs:
    print("pair:", number, name)
print("zip gives tuples:", list(zip("ab", [1, 2])))
print("enumerate gives tuples:", list(enumerate("ab")))
print("dict items are tuples:", list({"a": 1}.items()))
print("swap:", (b, a))
nested = ((1, 2), (3, 4))
print("nested:", nested[1][0], [s for pair in nested for s in pair])
print("sorted tuples:", sorted([(2, "a"), (1, "b"), (1, "a")]))
print("tuple is never equal to a list:", (1, 2) == [1, 2], list((1, 2)) == [1, 2])
print("truthiness:", bool(()), bool((0,)))
print("slice is a tuple:", type(t[:2]).__name__, t[:2])
print("1-tuples inside a list:", [(1,), ("a",)])
rgb = (255, 128, 0)
print("hex color:", "#" + "".join(format(v, "02x") for v in rgb))
print("max of tuples:", max([(1, "b"), (3, "a"), (3, "c")]))
print("ignore a field:", [name for _, name in pairs])
