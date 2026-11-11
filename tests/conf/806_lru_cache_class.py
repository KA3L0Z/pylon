# An LRU cache class built on OrderedDict, and one from scratch with a dict and a list
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()
        self.hits = 0
        self.misses = 0
    def get(self, key):
        if key not in self.data:
            self.misses += 1
            return -1
        self.hits += 1
        self.data.move_to_end(key)
        return self.data[key]
    def put(self, key, value):
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            evicted, _ = self.data.popitem(last=False)
            print("  evicted", evicted)
    def __len__(self):
        return len(self.data)
    def __contains__(self, key):
        return key in self.data
    def __repr__(self):
        return "LRUCache(" + ", ".join(f"{k}={v}" for k, v in self.data.items()) + ")"
cache = LRUCache(2)
cache.put(1, "one")
cache.put(2, "two")
print("get 1:", cache.get(1))
cache.put(3, "three")
print("get 2:", cache.get(2))
cache.put(4, "four")
print("get 1:", cache.get(1), "| get 3:", cache.get(3), "| get 4:", cache.get(4))
print("state:", cache, len(cache), 3 in cache, 1 in cache)
cache.put(3, "THREE")
print("update moves to newest:", cache)
print("hits/misses:", cache.hits, cache.misses)

class SimpleLRU:
    def __init__(self, capacity):
        self.capacity = capacity
        self.values = {}
        self.order = []
    def get(self, key, default=None):
        if key not in self.values:
            return default
        self.order.remove(key)
        self.order.append(key)
        return self.values[key]
    def put(self, key, value):
        if key in self.values:
            self.order.remove(key)
        elif len(self.values) == self.capacity:
            del self.values[self.order.pop(0)]
        self.values[key] = value
        self.order.append(key)
lru = SimpleLRU(3)
for key in "abcd":
    lru.put(key, key.upper())
print("simple lru:", lru.order, lru.get("a"), lru.get("b"))
lru.put("e", "E")
print("after touching b and adding e:", lru.order, sorted(lru.values.items()))
