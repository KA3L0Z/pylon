# for loops: iterables, else clause, break/continue, nested loops
for i in range(3):
    print("range", i)
for ch in "abc":
    print("char", ch)
for item in [10, 20]:
    print("list", item)
for key in {"x": 1, "y": 2}:
    print("dict key", key)
for i, name in enumerate(["ann", "bob"]):
    print("enumerate", i, name)
for a, b in zip([1, 2, 3], "xyz"):
    print("zip", a, b)
for i in range(10, 0, -3):
    print("down", i)
for i in range(0):
    print("never")
print("loop var keeps its last value:", i)
for n in [2, 4, 6]:
    if n % 2:
        break
else:
    print("else: no break happened")
for n in [2, 3, 4]:
    if n % 2:
        print("break at", n)
        break
else:
    print("not printed")
for n in []:
    pass
else:
    print("else runs for an empty iterable")
for n in range(6):
    if n % 2 == 0:
        continue
    print("odd", n)
for i in range(3):
    for j in range(3):
        if j == 2:
            break
        if i == 1:
            continue
        print("inner", i, j)
primes = []
for n in range(2, 30):
    for p in primes:
        if n % p == 0:
            break
    else:
        primes.append(n)
print("primes:", primes)
total = 0
for x in range(1, 101):
    total += x
print("sum 1..100:", total)
matrix = [[1, 2, 3], [4, 5, 6]]
for row in matrix:
    for value in row:
        print(value, end=" ")
    print("|")
for i in range(len(matrix)):
    for j in range(len(matrix[i])):
        matrix[i][j] *= 2
print("doubled:", matrix)
nums = [1, 2, 3]
for n in nums[:]:
    if n == 2:
        nums.remove(n)
print("removed while iterating a copy:", nums)
