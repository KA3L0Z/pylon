# Functions: def, defaults, return values, docstrings, argument passing
def greet(name):
    return "Hello, " + name + "!"
print(greet("Ada"))

def add(a, b=10):
    return a + b
print("default used:", add(1))
print("default overridden:", add(1, 2))
print("keyword call:", add(b=5, a=1))

def no_return():
    x = 1

def bare_return(flag):
    if flag:
        return
    return "reached the end"
print("implicit None:", no_return())
print("bare return:", bare_return(True), bare_return(False))

def stats(values):
    """Return (count, total, mean) of a list."""
    count = len(values)
    total = sum(values)
    return count, total, total / count
count, total, mean = stats([1, 2, 3, 4])
print("multiple return:", count, total, mean)
result = stats([7, 2])
print("as tuple:", result, type(result).__name__)
print("name:", stats.__name__)

def append_to(item, bucket=[]):
    bucket.append(item)
    return bucket
print("mutable default 1:", append_to(1))
print("mutable default 2:", append_to(2))
print("fresh list passed:", append_to(3, []))

def safe_append(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
print("None default:", safe_append(1), safe_append(2))

def modify(lst, n):
    lst.append(99)
    n += 1
    lst = [0]
    return n
data = [1]
num = 5
print("returned:", modify(data, num))
print("list mutated, int unchanged:", data, num)

def outer():
    def helper(x):
        return x * 2
    return helper(21)
print("nested def:", outer())
def is_even(n): return n % 2 == 0
print("one-line def:", is_even(4), is_even(5))
x = 10
def bound_early(v=x):
    return v
x = 20
print("default evaluated at def time:", bound_early())
print("function is truthy and callable:", bool(greet), callable(greet))
print("docstring:", stats.__doc__)
