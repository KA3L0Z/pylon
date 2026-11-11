# copy, string constants, operator.itemgetter, sys.maxsize
import copy
import string
import sys
from operator import itemgetter

original = [[1, 2], [3, 4], {"k": [5]}]
shallow = copy.copy(original)
deep = copy.deepcopy(original)
original[0].append(99)
original[2]["k"].append(6)
original.append("new")
print("original:", original)
print("shallow shares inner objects:", shallow)
print("deep is independent:", deep)
print("identity:", shallow is original, shallow[0] is original[0], deep[0] is original[0], deep == shallow)
d = {"a": [1], "b": {"c": 2}}
d2 = copy.deepcopy(d)
d2["a"].append(2); d2["b"]["c"] = 3
print("deepcopy dict:", d, d2)
t = (1, [2, 3])
t2 = copy.deepcopy(t)
t2[1].append(4)
print("deepcopy tuple with list:", t, t2)

class Node:
    def __init__(self, value, children=None):
        self.value = value
        self.children = children or []
    def __repr__(self):
        return f"Node({self.value}, {self.children})"

tree = Node(1, [Node(2), Node(3)])
flat = copy.copy(tree)
full = copy.deepcopy(tree)
tree.children[0].value = 20
tree.value = 10
print("copy object:", tree, "|", flat, "|", full)
print("copy of immutables:", copy.copy(5), copy.deepcopy("s"), copy.copy((1, 2)))
grid = [[0] * 2 for _ in range(2)]
snapshot = copy.deepcopy(grid)
grid[0][0] = 7
print("snapshot of grid:", grid, snapshot)

print("ascii_lowercase:", string.ascii_lowercase)
print("ascii_uppercase:", string.ascii_uppercase)
print("ascii_letters:", string.ascii_letters, len(string.ascii_letters))
print("digits:", string.digits)
print("punctuation:", string.punctuation, len(string.punctuation))
print("membership:", "q" in string.ascii_lowercase, "Q" in string.ascii_lowercase, "7" in string.digits,
      "!" in string.punctuation)
print("alphabet position:", string.ascii_lowercase.index("e") + 1, string.ascii_uppercase[25])
print("strip punctuation:", "".join(ch for ch in "Hello, World! (ok)" if ch not in string.punctuation))
print("is pangram:", set(string.ascii_lowercase) <= set("the quick brown fox jumps over the lazy dog"))
print("caesar:", "".join(string.ascii_lowercase[(string.ascii_lowercase.index(c) + 3) % 26] for c in "xyz"))

rows = [("bob", 25, "nyc"), ("ann", 30, "lima"), ("cy", 25, "oslo")]
print("itemgetter sort:", sorted(rows, key=itemgetter(1)), sorted(rows, key=itemgetter(0))[0])
print("itemgetter call:", itemgetter(2)(rows[0]), itemgetter(1)([10, 20, 30]), itemgetter("k")({"k": "v"}))
print("itemgetter max/min:", max(rows, key=itemgetter(1)), min(rows, key=itemgetter(0)))
print("itemgetter map:", list(map(itemgetter(0), rows)))
records = [{"name": "x", "qty": 3}, {"name": "y", "qty": 1}]
print("itemgetter on dicts:", [r["name"] for r in sorted(records, key=itemgetter("qty"))])
print("sys.maxsize:", sys.maxsize, sys.maxsize == 2 ** 63 - 1, sys.maxsize + 1)
best = sys.maxsize
for v in [40, 7, 19]:
    best = min(best, v)
print("maxsize as initial minimum:", best, -sys.maxsize - 1 < 0)
print("itemgetter multiple:", itemgetter(1, 0)(rows[0]), sorted(rows, key=itemgetter(1, 0)))
