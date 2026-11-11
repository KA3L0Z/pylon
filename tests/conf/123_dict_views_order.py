# dict: insertion order, views, iteration patterns
d = {}
d["banana"] = 3
d["apple"] = 1
d["cherry"] = 2
print("insertion order:", d)
d["apple"] = 10
print("update keeps position:", d)
del d["banana"]
d["banana"] = 5
print("re-insert goes last:", d)
print("keys:", list(d.keys()), list(d))
print("values:", list(d.values()))
print("items:", list(d.items()))
print("view reprs:", d.keys(), d.values(), d.items())
keys = d.keys()
values = d.values()
d["date"] = 7
print("views are live:", list(keys), list(values), len(keys))
print("membership:", "apple" in keys, 10 in values, ("apple", 10) in d.items())
for k in d:
    print("key loop:", k, d[k])
for k, v in d.items():
    print("items loop:", k, v)
for i, (k, v) in enumerate(d.items(), 1):
    print("enumerated:", i, k, v)
print("sorted keys:", sorted(d))
print("sorted by value:", sorted(d.items(), key=lambda kv: kv[1]))
print("keys by value desc:", sorted(d, key=lambda k: d[k], reverse=True))
print("first/last key:", next(iter(d)), list(d)[-1])
print("sum values:", sum(d.values()), "max value:", max(d.values()))
print("filter:", {k: v for k, v in d.items() if v > 4})
print("transform:", {k.upper(): v * 2 for k, v in d.items()})
print("invert:", {v: k for k, v in d.items()})
print("zip keys/values:", list(zip(d.keys(), d.values())) == list(d.items()))
for k in list(d):
    if d[k] > 6:
        del d[k]
print("delete while iterating a copy:", d)
for k in d:
    d[k] += 1
print("update values while iterating:", d)
order = {}
for ch in "hello world":
    if ch not in order:
        order[ch] = len(order)
print("first-seen order:", order)
print("dedupe keeping order:", list(dict.fromkeys([3, 1, 3, 2, 1])))
a = {"x": 1, "y": 2}
b = {"y": 2, "x": 1}
print("equal despite order:", a == b, list(a) == list(b))
print("popitem is LIFO:", a.popitem(), a)
big = {n: n * n for n in range(8)}
print("int keys keep insertion order:", list(big)[:4], big[7])
rev = {k: big[k] for k in reversed(list(big))}
print("reversed copy:", list(rev)[:3])
print("items round trip:", dict(list(d.items())) == d)
matrix = {(r, c): r * c for r in range(2) for c in range(2)}
print("tuple keys:", matrix)
graph = {"a": ["b", "c"], "b": ["c"], "c": []}
for node, edges in graph.items():
    print("graph:", node, "->", ", ".join(edges) if edges else "(none)")
print("len of views:", len(d.keys()), len(d.values()), len(d.items()))
print("values can repeat:", list({"a": 1, "b": 1}.values()).count(1))
print("common keys via view:", sorted(d.keys() & {"apple", "zzz"}))
