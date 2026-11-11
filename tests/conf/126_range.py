# range: a lazy sequence of ints
r = range(5)
print("repr:", r, range(2, 8), range(0, 10, 3), range(5, 0, -1))
print("list:", list(r), list(range(2, 8)), list(range(0, 10, 3)))
print("negative step:", list(range(5, 0, -1)), list(range(10, -1, -5)), list(range(-1, -6, -2)))
print("empty:", list(range(0)), list(range(5, 2)), list(range(2, 5, -1)), len(range(3, 3)))
print("len:", len(r), len(range(2, 8)), len(range(0, 10, 3)), len(range(10, 0, -3)))
print("index:", r[0], r[-1], range(10, 20)[3], range(0, 100, 7)[-1])
print("slice:", r[1:3], r[::2], r[::-1], range(10)[2:8:3])
print("slice as list:", list(range(10)[2:8:3]), list(range(10)[::-3]))
print("in:", 3 in r, 5 in r, -1 in r, 6 in range(0, 10, 2), 7 in range(0, 10, 2))
print("reversed:", list(reversed(range(4))), list(reversed(range(1, 10, 3))))
print("sum/min/max:", sum(range(101)), min(range(3, 9)), max(range(3, 9)))
print("tuple/sorted:", tuple(range(3)), sorted(range(5, 0, -1)))
print("bool:", bool(range(0)), bool(range(1)))
print("type:", type(r).__name__, isinstance(r, range))
for i in range(3):
    print("loop", i)
for i in range(2, 11, 4):
    print("stepped loop", i)
for i in range(3, 0, -1):
    print("countdown", i)
print("reusable:", list(r), list(r))
letters = "abcd"
for i in range(len(letters)):
    print("index loop:", i, letters[i])
for i in range(len(letters) - 1, -1, -1):
    print("backwards:", i, letters[i])
print("pairs:", [(i, j) for i in range(3) for j in range(i + 1, 3)])
print("evens:", list(range(0, 11, 2)), "odds:", list(range(1, 10, 2)))
print("multiples of 5 below 30:", [n for n in range(5, 30, 5)])
print("like enumerate:", list(zip(range(len(letters)), letters)))
print("ranges of ranges:", [list(range(n)) for n in range(4)])
print("last index:", range(len(letters))[-1], len(letters) - 1)
print("sum of squares:", sum(i * i for i in range(1, 6)))
print("fractions via division:", [i / 4 for i in range(5)])
start, stop, step = 10, 0, -2
print("variables as bounds:", list(range(start, stop, step)))
print("negative bounds:", list(range(-3, 3)), list(range(-3, -8, -2)))
try:
    range(1.5)
except TypeError:
    print("float argument raises TypeError")
try:
    range(0, 5, 0)
except ValueError:
    print("zero step raises ValueError")
try:
    r[10]
except IndexError:
    print("index out of range raises IndexError")
big = range(10 ** 9)
print("a huge range costs nothing:", len(big), big[-1], big[123456789], 999999999 in big, -1 in big)
