# list: indexing, slicing, operators, comparison, nesting, slice assignment
a = [10, 20, 30, 40, 50]
print("len:", len(a), len([]))
print("index:", a[0], a[2], a[-1], a[-2])
print("slice:", a[1:3], a[:2], a[3:], a[:])
print("neg slice:", a[-2:], a[:-2], a[-4:-1])
print("step:", a[::2], a[1::2], a[::3])
print("reverse:", a[::-1], a[3:0:-1], a[::-2])
print("out of range slice:", a[2:100], a[100:], a[-100:2])
print("empty slices:", a[3:1], a[5:], a[1:1])
print("concat/repeat:", [1, 2] + [3], [0] * 4, 2 * ["a", "b"])
print("in:", 30 in a, 99 in a, 99 not in a, [10] in a)
print("compare:", [1, 2, 3] == [1, 2, 3], [1, 2] < [1, 3], [1, 2] < [1, 2, 0], [2] > [1, 9, 9])
print("compare more:", ["a", "b"] < ["a", "c"], [] < [0], [] == [])
print("mixed types:", [1, "two", 3.0, None, True, [5], (6,), {"k": 7}])
nested = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
print("nested index:", nested[1], nested[1][2], nested[-1][0])
print("column:", [row[1] for row in nested])
print("diagonal:", [nested[i][i] for i in range(3)])
print("nested len:", len(nested), len(nested[0]))
print("nested sum:", sum(sum(row) for row in nested))
print("nested slices:", nested[2][::-1], nested[::-1][0])

a[0] = 11
a[-1] = 55
print("item assign:", a)
a[1:3] = [21, 22, 23]
print("slice assign longer:", a)
a[1:4] = [20]
print("slice assign shorter:", a)
a[2:2] = [25, 26]
print("slice insert:", a)
a[:2] = []
print("slice delete via assign:", a)
a[len(a):] = [60, 70]
print("slice append:", a)
a[::2] = ["x", "y", "z"]
print("extended slice assign:", a)
b = list(range(10))
del b[2:5]
print("del slice:", b)
del b[::2]
print("del stepped:", b)
b[1:] = "hi"
print("slice assign from string:", b)
c = [1, 2, 3, 4]
c[1:3] = c[1:3][::-1]
print("reverse middle:", c)
c[:] = [9, 9]
print("replace contents in place:", c)
try:
    c[5]
except IndexError:
    print("read past end raises IndexError")
try:
    c[5] = 1
except IndexError:
    print("assign past end raises IndexError")
print("first/last/middle:", a[0], a[-1], a[len(a) // 2])
print("last three:", list(range(10))[-3:], "all but first:", list(range(5))[1:])
print("chunks:", [list(range(7))[i:i + 3] for i in range(0, 7, 3)])
print("rotate left:", a[1:] + a[:1])
print("slice copy is equal but distinct:", a[:] == a, a[:] is a)
print("list():", list("abc"), list(range(3)), list((1, 2)))
