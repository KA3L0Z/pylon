# functools: lru_cache, cache, reduce, partial, cmp_to_key, wraps
import functools
from functools import lru_cache, cache, reduce, partial, cmp_to_key, wraps
calls = []
@lru_cache(maxsize=None)
def fib(n):
    calls.append(n)
    return n if n < 2 else fib(n - 1) + fib(n - 2)
@cache
def grid_paths(r, c):
    if r == 0 or c == 0:
        return 1
    return grid_paths(r - 1, c) + grid_paths(r, c - 1)
@lru_cache
def slow_square(n):
    print("  computing", n)
    return n * n
@lru_cache(maxsize=2)
def tracked(n):
    print("  miss", n)
    return n * 10
print("lru_cache fib:", fib(30), "| computed once each:", len(calls))
fib(30); fib(10)
print("cached calls do not rerun:", len(calls))
print("cache:", grid_paths(8, 8), grid_paths(2, 2))
print("bare lru_cache:", slow_square(4), slow_square(4), slow_square(5))
tracked(1); tracked(2); tracked(1); tracked(3); tracked(2)
print("maxsize=2 evicted the least recently used entry")
print("wrapped names:", fib.__name__, grid_paths.__name__)
print("reduce:", reduce(lambda a, b: a + b, [1, 2, 3, 4]), reduce(lambda a, b: a * b, range(1, 6)))
print("reduce initial:", reduce(lambda a, b: a + b, [], 0), reduce(lambda a, b: a + b, [1, 2], 10),
      reduce(max, [3, 9, 2]), reduce(lambda a, b: a + b, [7]))
print("reduce to build:", reduce(lambda acc, ch: ch + acc, "abc", ""), reduce(lambda acc, x: acc + [x * 2], [1, 2], []))
try:
    reduce(lambda a, b: a + b, [])
except TypeError:
    print("reduce of empty without initial raises TypeError")
def power(base, exp):
    return base ** exp
square = partial(power, exp=2)
two_to = partial(power, 2)
print("partial:", square(7), two_to(10), partial(max, 100)(5, 250), partial(int, base=2)("1010"))
say = partial(print, "LOG:", sep=" | ")
say("a", "b")
print("partial with sorted:", partial(sorted, reverse=True)([2, 3, 1]))
def by_length_then_alpha(a, b):
    if len(a) != len(b):
        return len(a) - len(b)
    return (a > b) - (a < b)
def largest_number(nums):
    strs = sorted(map(str, nums), key=cmp_to_key(lambda a, b: int(b + a) - int(a + b)))
    return "".join(strs)
words = ["pear", "fig", "apple", "kiwi", "date"]
print("cmp_to_key:", sorted(words, key=cmp_to_key(by_length_then_alpha)))
print("cmp descending:", sorted([3, 1, 2], key=cmp_to_key(lambda a, b: b - a)))
print("largest concatenation:", largest_number([3, 30, 34, 5, 9]))
print("max with cmp:", max(words, key=cmp_to_key(by_length_then_alpha)))
def twice(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs) * 2
    return wrapper
@twice
def three():
    """three doc"""
    return 3
print("wraps:", three(), three.__name__, three.__doc__)
print("module prefix:", functools.reduce(lambda a, b: a - b, [10, 3, 2]))
