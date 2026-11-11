# collections.Counter and collections.defaultdict
from collections import Counter, defaultdict

c = Counter("mississippi")
print("counter:", c)
print("counts:", c["s"], c["m"], c["z"], "z" in c, len(c))
print("most_common:", c.most_common(2), c.most_common(1)[0], c.most_common())
print("from list:", Counter([1, 2, 2, 3, 3, 3]), Counter(["a", "b", "a"]))
print("from dict/kwargs:", Counter({"x": 2, "y": 1}), Counter(a=3, b=1))
print("empty:", Counter(), len(Counter()), Counter()["missing"])
c["m"] += 5
c["new"] = 1
print("change counts:", c["m"], c["new"], sum(c.values()))
c.update("ssi")
print("update():", c["s"], c["i"])
del c["new"]
print("after del:", "new" in c, sorted(c.items()))
words = "the cat and the hat and the bat".split()
wc = Counter(words)
print("word counts:", wc.most_common(3), wc["the"], wc["dog"])
print("keys/values:", list(wc.keys()), list(wc.values()), dict(wc))
print("total/unique:", sum(wc.values()), len(wc), max(wc.values()))
a, b = Counter("aabbbc"), Counter("abbd")
print("add:", sorted((a + b).items()))
print("subtract:", sorted((a - b).items()), sorted((b - a).items()))
print("intersection:", sorted((a & b).items()), "union:", sorted((a | b).items()))
print("equality:", Counter("abc") == Counter("cba"), Counter("aab") == Counter("ab"))
print("anagram check:", Counter("listen") == Counter("silent"))
print("counter is a dict:", isinstance(a, dict), a.get("a"), a.get("zz", 0))
print("repeated elements:", [k for k, v in a.items() if v > 1])
print("counter of counts:", Counter(Counter("aabbbcc").values()))
print("missing key is 0 and not added:", a["nope"], "nope" in a)

dd = defaultdict(int)
for ch in "banana":
    dd[ch] += 1
print("defaultdict(int):", dd, dict(dd))
groups = defaultdict(list)
for word in ["apple", "avocado", "banana", "blueberry", "cherry"]:
    groups[word[0]].append(word)
print("defaultdict(list):", dict(groups))
print("repr:", groups["c"], defaultdict(list), defaultdict(int, {"k": 1}))
seen = defaultdict(set)
for k, v in [("x", 1), ("x", 1), ("y", 2), ("x", 3)]:
    seen[k].add(v)
print("defaultdict(set):", {k: sorted(v) for k, v in seen.items()})
print("access creates the key:", dd["zzz"], "zzz" in dd, len(dd))
print("get/in do not create:", dd.get("qqq"), "qqq" in dd, len(dd))
custom = defaultdict(lambda: "N/A")
custom["a"] = "found"
print("lambda factory:", custom["a"], custom["b"], sorted(custom))
nested = defaultdict(lambda: defaultdict(int))
nested["x"]["y"] += 2
nested["x"]["z"] += 1
print("nested:", {k: dict(v) for k, v in nested.items()})
graph = defaultdict(list)
for u, v in [(1, 2), (1, 3), (2, 3)]:
    graph[u].append(v)
    graph[v].append(u)
print("adjacency list:", dict(graph), isinstance(graph, dict))
print("other factories:", defaultdict(float)["x"], repr(defaultdict(str)["x"]), defaultdict(dict)["x"])
print("from existing dict:", defaultdict(int, {"a": 5})["a"], defaultdict(int, {"a": 5})["b"])
