# Functions are values: pass them, return them, store them
def square(x):
    return x * x
def cube(x):
    return x ** 3
def apply(fn, value):
    return fn(value)
print("pass function:", apply(square, 4), apply(cube, 2), apply(len, "abcd"))
alias = square
print("alias:", alias(5), alias is square, alias.__name__)
print("names:", square.__name__, cube.__name__, apply.__name__)
table = {"sq": square, "cube": cube, "neg": lambda x: -x}
print("dispatch dict:", [table[k](3) for k in ["sq", "cube", "neg"]])
def compose(f, g):
    def composed(x):
        return f(g(x))
    return composed
def make_power(n):
    def power(x):
        return x ** n
    return power
inc = lambda x: x + 1
print("compose:", compose(square, inc)(3), compose(inc, square)(3))
powers = [make_power(n) for n in range(4)]
print("function factory:", [p(2) for p in powers])
def apply_n(fn, n, value):
    for _ in range(n):
        value = fn(value)
    return value
def my_map(fn, items):
    return [fn(i) for i in items]
def my_filter(pred, items):
    return [i for i in items if pred(i)]
def my_reduce(fn, items, start):
    acc = start
    for i in items:
        acc = fn(acc, i)
    return acc
nums = [1, 2, 3, 4, 5]
print("apply n times:", apply_n(lambda v: v * 2, 5, 1), apply_n(inc, 3, 0))
print("my_map:", my_map(square, nums))
print("my_filter:", my_filter(lambda n: n % 2, nums))
print("my_reduce:", my_reduce(lambda a, b: a + b, nums, 0), my_reduce(max, nums, 0))
print("builtins as args:", list(map(str, nums)), list(map(abs, [-1, 2])), sorted(["bb", "a"], key=len))
print("map/filter with def:", list(map(square, nums)), list(filter(None, [0, 1, "", "a"])))
def call_with(fn, *args, **kwargs):
    return fn(*args, **kwargs)
def counter():
    counter.calls += 1
    return counter.calls
print("forward args:", call_with(max, 3, 9, 2), call_with(sorted, [3, 1, 2], reverse=True))
print("callable:", callable(square), callable(len), callable("text"), callable(lambda: 0))
counter.calls = 0
counter(); counter()
print("function attribute:", counter.calls, hasattr(counter, "calls"))
bound = "a,b,c".split
print("bound method:", bound(","), bound(",", 1))
ops = [("+", lambda a, b: a + b), ("*", lambda a, b: a * b)]
for symbol, fn in ops:
    print("op", symbol, fn(6, 7))
lo, hi = min, max
print("builtins in variables:", lo(4, 2), hi(4, 2))
print("function chosen by condition:", (square if nums else cube)(3))
print("builtin name:", len.__name__, max.__name__)
print("unbound methods:", [m("hello world") for m in [str.upper, str.title]], apply(str.strip, " x "))
