# Decorators: plain, stacked, with arguments, functools.wraps
import functools
def shout(fn):
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs).upper() + "!"
    return wrapper
@shout
def greet(name):
    return "hello " + name
print("plain:", greet("ada"))
print("without wraps the wrapper name shows:", greet.__name__)
manual = shout(lambda s: s + "?")
print("applied by hand:", manual("really"))
def logged(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        print("  calling", fn.__name__, "with", args, kwargs)
        result = fn(*args, **kwargs)
        print("  returned", result)
        return result
    return wrapper
@logged
def add(a, b=10):
    """Add two numbers."""
    return a + b
print("logged:", add(1, b=2))
print("wraps keeps name and doc:", add.__name__, "|", add.__doc__)
def repeat(times):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args):
            return [fn(*args) for _ in range(times)]
        return wrapper
    return decorator
@repeat(3)
def ping(word):
    return word
print("with argument:", ping("hey"), ping.__name__)
def tag(name):
    def decorator(fn):
        def wrapper(text):
            return "<" + name + ">" + fn(text) + "</" + name + ">"
        return wrapper
    return decorator
@tag("b")
@tag("i")
def plain(text):
    return text
print("stacked, bottom one applied first:", plain("x"))
def memoize(fn):
    cache = {}
    @functools.wraps(fn)
    def wrapper(n):
        if n not in cache:
            cache[n] = fn(n)
        wrapper.calls += 1
        return cache[n]
    wrapper.calls = 0
    return wrapper
@memoize
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
print("memoized fib:", fib(30), "wrapper calls:", fib.calls)
