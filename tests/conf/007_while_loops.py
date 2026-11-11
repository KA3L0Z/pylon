# while loops: else clause, break, continue, pass
i = 0
while i < 3:
    print("count", i)
    i += 1
print("after loop:", i)
n = 27
steps = 0
while n != 1:
    n = n // 2 if n % 2 == 0 else 3 * n + 1
    steps += 1
print("collatz steps for 27:", steps)
i = 0
while True:
    i += 1
    if i == 2:
        continue
    if i > 4:
        break
    print("loop body", i)
print("stopped at", i)
i = 0
while i < 3:
    i += 1
else:
    print("else runs when the condition becomes false, i =", i)
i = 0
while i < 10:
    if i == 2:
        print("break skips else")
        break
    i += 1
else:
    print("not printed")
while False:
    print("never")
else:
    print("else runs even if the body never ran")
stack = [1, 2, 3]
while stack:
    print("pop", stack.pop())
a, b = 48, 18
while b:
    a, b = b, a % b
print("gcd:", a)
digits = []
num = 9045
while num > 0:
    digits.append(num % 10)
    num //= 10
print("digits reversed:", digits)
x = 0
while x < 5:
    x += 1
    pass
print("pass loop:", x)
lo, hi, guesses = 0, 100, 0
while lo < hi:
    mid = (lo + hi) // 2
    guesses += 1
    if mid < 37:
        lo = mid + 1
    else:
        hi = mid
print("found", lo, "in", guesses, "guesses")
