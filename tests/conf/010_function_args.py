# Function arguments: *args, **kwargs, keyword-only, unpacking at call sites
def total(*args):
    return sum(args)

def show(*args):
    print("args tuple:", args, type(args).__name__)

print("no args:", total())
print("some args:", total(1, 2, 3))
show()
show(1, "two", [3])

def options(**kwargs):
    for key in kwargs:
        print("  kwarg", key, "=", kwargs[key])
    return len(kwargs)

print("count:", options(a=1, b="x"))
print("empty kwargs:", options())

def mixed(first, second=2, *rest, flag=False, **extra):
    print("mixed:", first, second, rest, flag, extra)

mixed(1)
mixed(1, 20)
mixed(1, 20, 30, 40)
mixed(1, flag=True)
mixed(1, 2, 3, flag=True, color="red", size=9)
mixed(second=5, first=4)

def kw_only(parts, *, sep="-", upper=False):
    text = sep.join(parts)
    return text.upper() if upper else text

def required_kw(*, width, height):
    return width * height

print("kw-only defaults:", kw_only(["x", "y"]))
print("kw-only given:", kw_only(["x", "y"], upper=True, sep="+"))
print("required kw-only:", required_kw(height=2, width=5))

def point(x, y, z=0):
    return "(" + str(x) + ", " + str(y) + ", " + str(z) + ")"

coords = [1, 2]
print("star list:", point(*coords))
print("star tuple:", point(*(4, 5, 6)))
print("star string:", point(*"ab"))
named = {"x": 7, "y": 8, "z": 9}
print("double star:", point(**named))
print("star and double star:", point(*[1], **{"y": 2}))
print("positional then keyword:", point(1, z=3, y=2))
print("several stars:", total(*[1, 2], *[3, 4], 5))

def wrapper(*args, **kwargs):
    return point(*args, **kwargs)

print("forwarding:", wrapper(1, 2), wrapper(1, y=5, z=6))
print("skip middle default:", point(1, 2), point(z=30, x=1, y=2))
print("max with star:", max(*[3, 9, 4]))
print("print with star:", *range(3))
print("list display unpack:", [0, *[1, 2], *(3,)])
print("dict display unpack:", {**{"a": 1, "b": 2}, **{"b": 20, "c": 30}})
