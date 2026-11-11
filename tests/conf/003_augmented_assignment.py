# Augmented assignment on names, subscripts and attributes
n = 10
n += 5; print("+=", n)
n -= 3; print("-=", n)
n *= 2; print("*=", n)
n //= 5; print("//=", n)
n **= 3; print("**=", n)
n %= 7; print("%=", n)
n /= 2; print("/=", n)

b = 6
b &= 3; print("&=", b)
b |= 8; print("|=", b)
b ^= 5; print("^=", b)
b <<= 2; print("<<=", b)
b >>= 1; print(">>=", b)

s = "ab"
s += "cd"
s *= 2
print("str:", s)

nums = [1, 2, 3]
nums[0] += 10
nums[-1] *= 2
print("subscript:", nums)
d = {"a": 1}
d["a"] += 1
d["b"] = d.get("b", 0) + 5
print("dict item:", d)
grid = [[0, 0], [0, 0]]
grid[1][0] += 7
print("nested subscript:", grid)


class Box:
    def __init__(self):
        self.count = 0
        self.items = []


box = Box()
box.count += 3
box.count *= 4
box.items += ["x"]
print("attribute:", box.count, box.items)

a = [1, 2]
alias = a
a += [3]
print("list += is in place:", a, alias, a is alias)
a = a + [4]
print("a = a + b rebinds:", a, alias, a is alias)
t = (1, 2)
t_alias = t
t += (3,)
print("tuple += rebinds:", t, t_alias)
r = [1]
r *= 3
print("list *=:", r)
r += "xy"
print("list += str extends by chars:", r)
r += (7, 8)
print("list += tuple:", r)
