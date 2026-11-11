# list methods, aliasing and copying
a = [3, 1, 2]
a.append(4)
print("append:", a)
a.append([5, 6])
print("append list nests:", a)
a.pop()
a.extend([5, 6])
print("extend:", a)
a.extend("ab")
print("extend with string:", a)
a.insert(0, "first")
a.insert(2, "mid")
a.insert(100, "end")
a.insert(-1, "before last")
print("insert:", a)
a.remove("mid")
print("remove:", a)
print("pop last:", a.pop(), a)
print("pop index:", a.pop(0), a.pop(-2), a)
print("index:", a.index(1), a.index("a"), [1, 2, 1, 2].index(2, 2))
print("count:", [1, 2, 1, 1].count(1), a.count("zzz"))
a.reverse()
print("reverse:", a)
dup = [1, 2, 2, 3, 2]
dup.remove(2)
print("remove first match only:", dup)
print("methods return None:", a.append(0), a.sort(key=str), a.reverse(), a.clear())
print("after clear:", a, len(a))
stack = []
stack.append(1); stack.append(2); stack.append(3)
print("stack pops:", stack.pop(), stack.pop(), stack)
x = [1, 2, 3]
y = x
y.append(4)
print("alias sees change:", x, x is y)
z = x.copy()
z.append(5)
print("copy is independent:", x, z)
print("other copies:", x[:] == x, list(x) == x, x[:] is x)
grid = [[0] * 3] * 2
grid[0][0] = 1
print("shared rows:", grid)
grid = [[0] * 3 for _ in range(2)]
grid[0][0] = 1
print("independent rows:", grid)
outer = [[1, 2], [3]]
shallow = outer.copy()
shallow[0].append(99)
shallow.append([4])
print("shallow copy shares inner lists:", outer, shallow)
def add_item(items):
    items.append("added")
def replace_items(items):
    items = ["new"]
mine = ["orig"]
add_item(mine)
replace_items(mine)
print("mutation visible, rebinding not:", mine)
a = [1, 2]
b = a
a = a + [3]
print("a = a + [3] makes a new list:", a, b)
a = b
a += [3]
print("a += [3] mutates:", a, b)
nums = [5, 3, 8]
print("index guard:", nums.index(8) if 8 in nums else -1, nums.index(7) if 7 in nums else -1)
print("equal lists are different objects:", [1, 2] == list((1, 2)), x.copy() is x)
