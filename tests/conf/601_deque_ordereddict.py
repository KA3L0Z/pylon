# collections.deque and collections.OrderedDict
from collections import deque, OrderedDict
d = deque([1, 2, 3])
print("deque:", d, len(d), d[0], d[-1], 2 in d)
d.append(4)
d.appendleft(0)
print("append both ends:", d)
print("pop both ends:", d.pop(), d.popleft(), d)
d.extend([7, 8])
print("extend:", d, list(d))
d.rotate(1)
print("rotate right:", d)
d.rotate(-2)
print("rotate left:", d)
print("iterate:", [x * 2 for x in d], sum(d), max(d))
print("empty:", deque(), bool(deque()), len(deque()))
try:
    deque().popleft()
except IndexError:
    print("popleft from empty raises IndexError")
q = deque()
for job in ["a", "b", "c"]:
    q.append(job)
order = []
while q:
    order.append(q.popleft())
print("fifo queue:", order)
last3 = deque(maxlen=3)
for n in range(1, 6):
    last3.append(n)
    print("maxlen window:", list(last3))
print("maxlen repr:", last3)
last3.appendleft(0)
print("appendleft drops from the right:", list(last3))
print("from iterables:", deque("abc"), deque(range(3)), deque([1, 2, 3, 4], maxlen=2))
stack = deque()
stack.append(1); stack.append(2)
print("as stack:", stack.pop(), stack.pop(), len(stack))
r = deque("abcde")
r.rotate(2)
print("rotate string:", "".join(r))
r.rotate(-7)
print("rotate more than length:", "".join(r))
od = OrderedDict()
od["b"] = 1
od["a"] = 2
od["c"] = 3
print("ordered:", list(od.items()), len(od), od["a"])
od.move_to_end("b")
print("move_to_end:", list(od))
od.move_to_end("c", last=False)
print("move to front:", list(od))
print("popitem last:", od.popitem(), list(od))
print("popitem first:", od.popitem(last=False), list(od))
od["z"] = 26
od["a"] = 99
print("update keeps position:", list(od.items()))
od2 = OrderedDict([("x", 1), ("y", 2)])
print("from pairs:", list(od2.keys()), list(od2.values()), "x" in od2, od2.get("q", 0))
print("dict methods work:", od2.pop("x"), dict(od2), sorted(OrderedDict(b=1, a=2)))
print("equal to a plain dict:", OrderedDict([("k", 1)]) == {"k": 1})
cache = OrderedDict()
for key in ["a", "b", "c", "a", "d"]:
    if key in cache:
        cache.move_to_end(key)
    cache[key] = True
    if len(cache) > 3:
        cache.popitem(last=False)
print("lru order:", list(cache))
