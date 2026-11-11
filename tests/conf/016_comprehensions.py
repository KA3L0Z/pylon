# List, dict and set comprehensions, generator expressions as arguments
print("squares:", [n * n for n in range(6)])
print("filter:", [n for n in range(10) if n % 3 == 0])
print("two conditions:", [n for n in range(20) if n % 2 == 0 if n % 3 == 0])
print("if-else in expression:", ["even" if n % 2 == 0 else "odd" for n in range(4)])
print("from string:", [ch.upper() for ch in "abc"])
print("nested loops:", [(i, j) for i in range(3) for j in range(i)])
print("pairs filtered:", [(a, b) for a in [1, 2, 3] for b in [1, 2, 3] if a < b])
matrix = [[1, 2, 3], [4, 5, 6]]
print("flatten:", [v for row in matrix for v in row])
print("transpose:", [[row[i] for row in matrix] for i in range(3)])
print("nested comp:", [[i * j for j in range(1, 4)] for i in range(1, 4)])
print("with method:", [w.strip().title() for w in [" ann ", "BOB", "cy "]])
print("with enumerate:", [i * v for i, v in enumerate([5, 6, 7])])
print("with zip:", [a + b for a, b in zip([1, 2], [10, 20])])
print("unpack tuples:", [name for name, age in [("ann", 30), ("bob", 17)] if age >= 18])
print("grid init:", [[0] * 3 for _ in range(2)])
print("lengths:", [len(w) for w in "the quick brown fox".split()])

print("dict comp:", {n: n * n for n in range(4)})
print("dict from pairs:", {k: v for k, v in [("a", 1), ("b", 2)]})
print("dict filter:", {k: v for k, v in {"a": 1, "b": 2, "c": 3}.items() if v != 2})
print("dict invert:", {v: k for k, v in {"x": 1, "y": 2}.items()})
print("dict from zip:", {k: v for k, v in zip("abc", range(3))})
print("word lengths:", {w: len(w) for w in ["hi", "hello"]})
print("dict duplicate keys keep last:", {n % 2: n for n in range(5)})
print("dict of lists:", {k: [k * i for i in range(3)] for k in (1, 2)})

print("set comp:", sorted({n % 3 for n in range(10)}))
print("set of lengths:", sorted({len(w) for w in ["a", "bb", "cc", "ddd"]}))
print("set comp one element:", {ch for ch in "aaa"})

print("gen in sum:", sum(n * n for n in range(5)))
print("gen in any/all:", any(n > 3 for n in range(5)), all(n > 0 for n in range(5)))
print("gen in join:", ", ".join(str(n) for n in range(4)))
print("gen in max:", max(len(w) for w in ["a", "abc", "ab"]))
print("gen to tuple:", tuple(n * 2 for n in range(3)))
print("gen in sorted:", sorted(-n for n in range(3)))

n = 100
result = [n for n in range(3)]
print("loop variable does not leak:", n, result)
factor = 3
print("uses outer variable:", [factor * v for v in range(3)])
print("empty result:", [v for v in range(5) if v > 10])
print("nested data:", [p["name"] for p in [{"name": "a"}, {"name": "b"}]])
print("conditional nested:", [[c for c in w if c != "a"] for w in ["banana", "kiwi"]])
print("primes:", [p for p in range(2, 30) if all(p % d for d in range(2, p))])
vowels = "aeiou"
print("count vowels:", sum(1 for ch in "comprehension" if ch in vowels))
print("index of matches:", [i for i, ch in enumerate("banana") if ch == "a"])
