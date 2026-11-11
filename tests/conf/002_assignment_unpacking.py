# Assignment forms: chained, tuple/list unpacking, starred targets, swaps
a = b = c = 5
print("chained:", a, b, c)
x = y = []
x.append(1)
print("chained shares one object:", x, y, x is y)

p, q = 1, 2
print("tuple unpack:", p, q)
p, q = q, p
print("swap:", p, q)
[m, n] = [10, 20]
print("list target:", m, n)
(u, v) = "hi"
print("string unpack:", u, v)
k1, k2 = {"x": 1, "y": 2}
print("dict unpack gives keys:", k1, k2)

first, *rest = [1, 2, 3, 4]
print("first/rest:", first, rest)
*init, last = [1, 2, 3, 4]
print("init/last:", init, last)
head, *mid, tail = "abcde"
print("head/mid/tail:", head, mid, tail)
one, *nothing = [9]
print("star can be empty:", one, nothing)
a, b, *c = range(5)
print("from range:", a, b, c)
x1, *middle, x2 = (1, 2)
print("star between two:", x1, middle, x2)

(a, b), c = (1, 2), 3
print("nested:", a, b, c)
name, (lat, lon) = "home", (4.5, -74.1)
print("nested 2:", name, lat, lon)
for idx, (i, j) in enumerate([(1, 2), (3, 4)]):
    print("loop nested:", idx, i, j)
for key, value in {"a": 1, "b": 2}.items():
    print("items:", key, value)
for first, *others in [(1, 2, 3), (4, 5)]:
    print("loop star:", first, others)

t = 1, 2, 3
print("packing:", t, type(t).__name__)
single, = [7]
print("single element:", single)

a, b = 0, 1
for _ in range(6):
    a, b = b, a + b
print("fib step:", a, b)

lst = [3, 1, 2]
lst[0], lst[2] = lst[2], lst[0]
print("swap items:", lst)
d = {}
d["x"], d["y"] = 1, 2
print("subscript targets:", d)
i = j = k = 0
i += 1
print("chained ints are independent:", i, j, k)
