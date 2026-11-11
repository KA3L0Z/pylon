# Smaller statements: walrus operator, del, assert, semicolons, pass, ...
data = [4, 8, 15, 16, 23, 42]
if (n := len(data)) > 3:
    print("walrus in if:", n)
print("walrus value stays bound:", n)
while (item := data.pop()) > 15:
    print("walrus in while:", item)
print("stopped on:", item, "left:", data)
values = [1, 5, 2, 8]
print("walrus in comprehension:", [y for v in values if (y := v * 2) > 4])
print("walrus in expression:", (z := 10) + z)
text = "hello world"
if (pos := text.find("world")) != -1:
    print("found at:", pos)
x = 1
del x
try:
    print(x)
except NameError:
    print("del name: x is gone")
lst = [0, 1, 2, 3, 4, 5, 6]
del lst[0]
print("del item:", lst)
del lst[-1]
print("del last:", lst)
del lst[1:3]
print("del slice:", lst)
lst = list(range(10))
del lst[::3]
print("del stepped slice:", lst)
del lst[:]
print("del everything:", lst)
d = {"a": 1, "b": 2, "c": 3}
del d["b"]
print("del key:", d)
a, b = 1, 2
del a, b
print("del several names: ok")
class Thing:
    pass
t = Thing()
t.size = 3
print("has attr:", hasattr(t, "size"))
del t.size
print("after del attr:", hasattr(t, "size"))
assert True
assert 1 + 1 == 2, "math works"
assert data, "a non-empty list is truthy"
try:
    assert len(data) > 100, "list too short"
except AssertionError as e:
    print("assert failed:", e)
try:
    assert False
except AssertionError as e:
    print("assert without message:", repr(str(e)))
a = 1; b = 2; c = a + b
print("semicolons:", a, b, c)
if c == 3: print("one-liner"); print("two statements")
def todo():
    ...
def also_todo():
    pass
class Empty:
    ...
print("placeholder bodies return:", todo(), also_todo())
print("empty class instance:", isinstance(Empty(), Empty))
total = 0
partial = [total := total + v for v in values]
print("walrus running totals:", partial, total)
