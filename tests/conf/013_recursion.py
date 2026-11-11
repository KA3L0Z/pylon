# Recursion (depth stays well under 150)
def factorial(n):
    return 1 if n <= 1 else n * factorial(n - 1)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
def sum_to(n):
    if n == 0:
        return 0
    return n + sum_to(n - 1)
print("factorial:", [factorial(n) for n in range(7)])
print("factorial(25):", factorial(25))
print("fib:", [fib(n) for n in range(12)])
print("sum_to(100):", sum_to(100))
def power(base, exp):
    if exp == 0:
        return 1
    half = power(base, exp // 2)
    return half * half if exp % 2 == 0 else half * half * base
print("fast power:", power(2, 30), power(3, 13))
def flatten(nested):
    flat = []
    for item in nested:
        if isinstance(item, list):
            flat.extend(flatten(item))
        else:
            flat.append(item)
    return flat
print("flatten:", flatten([1, [2, [3, [4, 5]], 6], [[7]], 8]))
def hanoi(n, source, target, spare, moves):
    if n == 0:
        return
    hanoi(n - 1, source, spare, target, moves)
    moves.append(source + "->" + target)
    hanoi(n - 1, spare, target, source, moves)
moves = []
hanoi(3, "A", "C", "B", moves)
print("hanoi moves:", len(moves), moves)
def reverse(s):
    return s if len(s) <= 1 else reverse(s[1:]) + s[0]
def is_palindrome(s):
    if len(s) < 2:
        return True
    return s[0] == s[-1] and is_palindrome(s[1:-1])
print("reverse:", reverse("recursion"))
print("palindromes:", is_palindrome("racecar"), is_palindrome("abca"))
def permutations(items):
    if len(items) <= 1:
        return [items]
    result = []
    for i in range(len(items)):
        for rest in permutations(items[:i] + items[i + 1:]):
            result.append([items[i]] + rest)
    return result
def subsets(items):
    if not items:
        return [[]]
    rest = subsets(items[1:])
    return rest + [[items[0]] + s for s in rest]
print("permutations:", permutations([1, 2, 3]))
print("subsets:", subsets(["a", "b", "c"]))
def is_even(n):
    return True if n == 0 else is_odd(n - 1)
def is_odd(n):
    return False if n == 0 else is_even(n - 1)
print("mutual recursion:", is_even(10), is_odd(7), is_even(7))
