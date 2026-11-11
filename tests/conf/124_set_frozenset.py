# set and frozenset (printed sorted, because set order is unspecified)
s = {3, 1, 2, 3, 1}
print("dedupe:", sorted(s), len(s))
print("empty set:", set(), len(set()), type({}).__name__, type(set()).__name__)
print("one element:", {7}, {"only"})
print("from iterables:", sorted(set("hello")), sorted(set([1, 1, 2])), sorted(set(range(4))))
print("in:", 2 in s, 9 in s, 9 not in s)
s.add(4); s.add(4)
print("add:", sorted(s))
s.remove(1)
print("remove:", sorted(s))
s.discard(99)
s.discard(2)
print("discard:", sorted(s))
try:
    s.remove(99)
except KeyError:
    print("remove missing raises KeyError")
one = {42}
print("pop:", one.pop(), one)
s.update([7, 8], {9})
print("update:", sorted(s))
s.clear()
print("clear:", s)

a = {1, 2, 3, 4}
b = {3, 4, 5}
print("union:", sorted(a | b), sorted(a.union(b)))
print("intersection:", sorted(a & b), sorted(a.intersection(b)))
print("difference:", sorted(a - b), sorted(b - a), sorted(a.difference(b)))
print("symmetric difference:", sorted(a ^ b), sorted(a.symmetric_difference(b)))
print("methods take any iterable:", sorted(a.union([9, 10])), sorted(a.intersection(range(3))))
print("subset:", {1, 2} <= a, {1, 2}.issubset(a), {1, 9}.issubset(a), a <= a, a < a)
print("superset:", a >= {1}, a.issuperset({1, 2}), a > {1})
print("disjoint:", a.isdisjoint({8, 9}), a.isdisjoint(b))
print("equality:", {1, 2} == {2, 1}, {1, 2} == {1, 2, 3}, {1, 2} != {1})
c = a.copy()
c |= {10}
print("|=:", sorted(c), sorted(a))
c &= {1, 2, 10}
print("&=:", sorted(c))
c -= {10}
print("-=:", sorted(c))
c ^= {2, 3}
print("^=:", sorted(c))
d = {1, 2, 3}
d.intersection_update({2, 3, 4})
print("intersection_update:", sorted(d))
d.difference_update({3})
print("difference_update:", sorted(d))
d.symmetric_difference_update({2, 5})
print("symmetric_difference_update:", sorted(d))
print("comprehension:", sorted({n * n for n in range(-3, 4)}))
print("min/max/sum/len:", min(a), max(a), sum(a), len(a))
print("unique letters:", len(set("mississippi")), sorted(set("mississippi")))
print("common letters:", sorted(set("apple") & set("pear")))
print("has duplicates:", len([1, 2, 2]) != len(set([1, 2, 2])))
print("iteration visits each once:", sorted(x * 10 for x in a))

f = frozenset([1, 2, 2, 3])
print("frozenset:", sorted(f), len(f), 2 in f, frozenset(), frozenset({5}))
print("frozenset ops:", sorted(f | {9}), sorted(f & {1, 2}), type(f | {9}).__name__, f == {1, 2, 3})
try:
    f.add(4)
except AttributeError:
    print("frozenset has no add")
groups = {frozenset({1, 2}): "pair", frozenset(): "empty"}
print("frozenset as key:", groups[frozenset({2, 1})], groups[frozenset()])
print("set of frozensets:", len({frozenset({1, 2}), frozenset({2, 1}), frozenset({3})}))
