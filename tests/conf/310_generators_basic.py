# Generators: yield, next, return, StopIteration, generator expressions
def count_up(n):
    i = 1
    while i <= n:
        yield i
        i += 1
print("list:", list(count_up(5)))
for value in count_up(3):
    print("for loop:", value)
g = count_up(2)
print("next:", next(g), next(g))
try:
    next(g)
except StopIteration:
    print("exhausted: StopIteration")
print("next default:", next(g, "done"), next(count_up(0), None))
print("generators are single-use:", list(g), sum(count_up(4)))
def trace():
    print("  started")
    yield 1
    print("  resumed")
    yield 2
    print("  finishing")
t = trace()
print("created, nothing ran yet")
print("first:", next(t))
print("second:", next(t))
print("third:", next(t, "no more"))
def with_return():
    yield "a"
    return "result"
def evens(limit):
    for n in range(limit):
        if n % 2:
            continue
        yield n
def until_big(items, cap):
    for x in items:
        if x > cap:
            return
        yield x
def fib():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b
w = with_return()
next(w)
try:
    next(w)
except StopIteration as stop:
    print("return value:", stop.value)
print("return ends iteration:", list(with_return()))
print("yield in loops:", list(evens(9)), list(until_big([1, 2, 9, 3], 5)))
first = []
for f in fib():
    if f > 50:
        break
    first.append(f)
print("infinite with break:", first)
a, b, c = count_up(3)
print("unpack from generator:", a, b, c, max(count_up(4)), tuple(count_up(2)))
print("enumerate/zip:", list(enumerate(count_up(2))), list(zip(count_up(3), "ab")))
squares = (n * n for n in range(5))
print("genexp:", next(squares), next(squares), list(squares), list(squares))
print("genexp as argument:", sum(n for n in range(5)), ",".join(str(n) for n in range(3)))
lazy = (print("  evaluated", n) or n for n in range(2))
print("genexp is lazy until consumed")
print("consumed:", list(lazy))
