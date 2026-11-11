# Scope rules: local / global / nonlocal, and closures
count = 0
x = "global x"
def increment():
    global count
    count += 1
def shadow():
    x = "local x"
    return x
increment(); increment()
print("global counter:", count)
print("shadowing:", shadow(), "|", x)
def make_counter():
    n = 0
    def step():
        nonlocal n
        n += 1
        return n
    return step
c1 = make_counter()
c2 = make_counter()
print("counter 1:", c1(), c1(), c1())
print("counter 2 is independent:", c2())
def make_multiplier(factor):
    def multiply(value):
        return value * factor
    return multiply
double, triple = make_multiplier(2), make_multiplier(3)
print("closures:", double(5), triple(5))
def make_accumulator():
    items = []
    def add(item):
        items.append(item)
        return items
    return add
acc = make_accumulator()
acc("a")
print("mutating a captured list needs no nonlocal:", acc("b"))
funcs = []
for i in range(3):
    funcs.append(lambda: i)
print("late binding:", [f() for f in funcs])
funcs = [lambda i=i: i for i in range(3)]
print("default captures the value:", [f() for f in funcs])
def bank(balance):
    def deposit(amount):
        nonlocal balance
        balance += amount
        return balance
    def withdraw(amount):
        nonlocal balance
        balance -= amount
        return balance
    return deposit, withdraw
dep, wd = bank(100)
dep(50)
print("shared closure state:", wd(30))
def set_global():
    global created_here
    created_here = "made inside a function"
set_global()
print("global created in a function:", created_here)
squares = [n * n for n in range(4)]
n = "untouched"
print("comprehension scope:", squares, n)
def late():
    return defined_later
defined_later = "resolved at call time"
print("late global lookup:", late())
