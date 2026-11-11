# Generators: yield from, send, pipelines, islice on infinite generators
from itertools import islice
def inner():
    yield 1
    yield 2
    return "inner done"
def outer():
    result = yield from inner()
    print("  inner returned:", result)
    yield 3
def chain(*iterables):
    for it in iterables:
        yield from it
def flatten(nested):
    for item in nested:
        if isinstance(item, list):
            yield from flatten(item)
        else:
            yield item
print("yield from:", list(outer()))
print("chain:", list(chain([1, 2], "ab", range(2), (9,))))
print("recursive flatten:", list(flatten([1, [2, [3, 4]], [[5]], 6])))
def naturals(start=1):
    n = start
    while True:
        yield n
        n += 1
def running_average():
    total, count, average = 0, 0, None
    while True:
        value = yield average
        total += value
        count += 1
        average = total / count
print("islice:", list(islice(naturals(), 5)), list(islice(naturals(10), 2, 8, 2)))
avg = running_average()
print("prime with next:", next(avg))
print("send:", avg.send(10), avg.send(20), avg.send(60))
def collect(limit):
    received = []
    while len(received) < limit:
        item = yield len(received)
        received.append(item)
    return received
c = collect(3)
next(c)
c.send("a"); c.send("b")
try:
    c.send("c")
except StopIteration as stop:
    print("send until return:", stop.value)
def only_even(source):
    for n in source:
        if n % 2 == 0:
            yield n
def squared(source):
    for n in source:
        yield n * n
def primes():
    found = []
    for n in naturals(2):
        if all(n % p for p in found):
            found.append(n)
            yield n
print("pipeline:", list(squared(only_even(range(1, 11)))))
print("first primes:", list(islice(primes(), 10)))
gen = naturals()
print("shared generator state:", next(gen), list(islice(gen, 3)), next(gen))
print("zip stops at the shortest:", list(zip("abc", naturals())))
