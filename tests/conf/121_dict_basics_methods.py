# dict: creation, access and the standard methods
d = {"a": 1, "b": 2}
print("literal:", d, len(d))
print("dict():", dict(), dict(x=1, y=2), dict([("k", "v"), ("n", 0)]), dict(zip("ab", [1, 2])))
print("from dict:", dict(d) == d, dict(d) is d)
print("access:", d["a"], d.get("a"), d.get("zz"), d.get("zz", 0))
d["c"] = 3
d["a"] = 100
print("add/overwrite:", d)
print("in:", "a" in d, "zz" in d, 100 in d, "zz" not in d)
del d["b"]
print("del:", d)
print("key types:", {1: "int", "1": "str", (1, 2): "tuple", None: "none", 2.5: "float"})
try:
    d["missing"]
except KeyError as e:
    print("KeyError for:", e)

print("pop:", d.pop("a"), d)
print("pop default:", d.pop("nope", "fallback"), d.pop("nope", None))
try:
    d.pop("nope")
except KeyError:
    print("pop missing without default raises KeyError")
d.update({"x": 1, "c": 30})
print("update dict:", d)
d.update(y=2)
d.update([("z", 3)])
print("update kwargs/pairs:", d)
print("setdefault existing:", d.setdefault("x", 999), d["x"])
print("setdefault new:", d.setdefault("w", 5), d["w"])
print("setdefault without value:", d.setdefault("v"), "v" in d)
groups = {}
for word in ["apple", "avocado", "banana", "blueberry", "cherry"]:
    groups.setdefault(word[0], []).append(word)
print("setdefault grouping:", groups)
print("popitem:", d.popitem(), d.popitem(), d)
print("fromkeys:", dict.fromkeys("abc"), dict.fromkeys(["x", "y"], 0))
c = d.copy()
c["new"] = 1
print("copy:", d, c)
c.clear()
print("clear:", c, len(c), bool(c))
try:
    c.popitem()
except KeyError:
    print("popitem on empty dict raises KeyError")
print("merge |:", {"a": 1, "b": 2} | {"b": 20, "c": 30})
m = {"a": 1}
m |= {"b": 2}
print("merge |=:", m)
print("equality ignores order:", {"a": 1, "b": 2} == {"b": 2, "a": 1})
counts = {}
for ch in "mississippi":
    counts[ch] = counts.get(ch, 0) + 1
print("counting with get:", counts)
nested = {"user": {"name": "ann", "tags": ["x"]}}
nested["user"]["tags"].append("y")
nested["user"]["age"] = 30
print("nested:", nested, nested["user"]["name"])
print("nested get:", nested.get("user", {}).get("email", "n/a"))
shallow = nested.copy()
shallow["user"]["name"] = "bob"
shallow["extra"] = True
print("shallow copy shares inner dict:", nested["user"]["name"], "extra" in nested)
print("key with largest value:", max(counts, key=lambda k: counts[k]))
print("sum/len/sorted:", sum(counts.values()), len(counts), sorted(counts))
print("bool:", bool({}), bool({"k": None}))
print("bound method as key:", max(counts, key=counts.get), min(counts, key=counts.get))
