# lambda expressions and where they are typically used
square = lambda x: x * x
print("square:", square(7))
add = lambda a, b: a + b
print("add:", add(2, 3))
const = lambda: 42
print("no args:", const())
with_default = lambda x, y=10: x + y
print("default:", with_default(1), with_default(1, 2))
varargs = lambda *args: sum(args)
print("varargs:", varargs(1, 2, 3))
names = lambda **kw: sorted(kw)
print("kwargs:", names(b=1, a=2))
print("immediately called:", (lambda x: x + 1)(41))
print("conditional lambda:", (lambda n: "even" if n % 2 == 0 else "odd")(3))

words = ["banana", "Apple", "cherry", "fig"]
print("sort by len:", sorted(words, key=lambda w: len(w)))
print("sort case-insensitive:", sorted(words, key=lambda w: w.lower()))
print("sort by last char:", sorted(words, key=lambda w: w[-1]))
pairs = [(1, "b"), (3, "a"), (2, "c")]
print("sort by second:", sorted(pairs, key=lambda p: p[1]))
print("sort by neg first:", sorted(pairs, key=lambda p: -p[0]))
print("max by key:", max(words, key=lambda w: len(w)))
print("min by key:", min(pairs, key=lambda p: p[1]))
print("map:", list(map(lambda x: x * 2, [1, 2, 3])))
print("map two lists:", list(map(lambda a, b: a + b, [1, 2], [10, 20])))
print("filter:", list(filter(lambda x: x % 2, range(8))))

ops = {
    "add": lambda a, b: a + b,
    "sub": lambda a, b: a - b,
    "mul": lambda a, b: a * b,
}
for name in ["add", "sub", "mul"]:
    print("op", name, ops[name](6, 3))


def apply_twice(fn, value):
    return fn(fn(value))


def make_adder(n):
    return lambda x: x + n


print("apply twice:", apply_twice(lambda s: s + "!", "hi"))
add5 = make_adder(5)
print("lambda closure:", add5(10))
compose = lambda f, g: lambda x: f(g(x))
inc_then_double = compose(lambda x: x * 2, lambda x: x + 1)
print("compose:", inc_then_double(4))
print("tuple result:", (lambda a, b: (b, a))(1, 2))
people = [{"name": "Zed", "age": 30}, {"name": "Amy", "age": 25}, {"name": "Bob", "age": 30}]
by_age_name = sorted(people, key=lambda p: (p["age"], p["name"]))
print("sort by tuple key:", [p["name"] for p in by_age_name])
print("bool key:", sorted([3, -1, 2, -5], key=lambda v: v < 0))
print("abs key:", sorted([3, -1, 2, -5], key=lambda v: abs(v)))
print("lambda in comprehension:", [(lambda v: v ** 2)(v) for v in range(4)])
print("callable:", callable(square), callable(42))
print("lambda name:", square.__name__)
