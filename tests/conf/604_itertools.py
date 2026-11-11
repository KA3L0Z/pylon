# itertools
import itertools
from itertools import count, cycle, repeat, chain, islice, accumulate, zip_longest, pairwise
from itertools import permutations, combinations, combinations_with_replacement, product

print("count:", list(islice(count(), 4)), list(islice(count(10), 3)), list(islice(count(0, 5), 4)),
      list(islice(count(5, -1), 3)))
for n in count(1):
    if n * n > 50:
        break
print("count with break:", n)
print("zip with count:", list(zip(count(1), "abc")))
print("cycle:", list(islice(cycle("ab"), 5)), list(islice(cycle([1, 2, 3]), 7)))
colors = cycle(["red", "green"])
print("cycle with next:", next(colors), next(colors), next(colors))
print("repeat:", list(repeat("x", 3)), list(islice(repeat(0), 4)), list(zip("ab", repeat(1))))
print("chain:", list(chain([1, 2], (3,), "ab")), list(chain()), list(chain([1], [], [2])))
print("islice:", list(islice("abcdefg", 3)), list(islice("abcdefg", 2, 5)), list(islice("abcdefg", 0, None, 3)),
      list(islice(range(100), 10, 50, 10)))
print("islice past end:", list(islice([1, 2], 5)), list(islice([], 2)))
print("accumulate:", list(accumulate([1, 2, 3, 4])), list(accumulate([])), list(accumulate([5])))
print("accumulate func:", list(accumulate([3, 1, 4, 1, 5], max)), list(accumulate([1, 2, 3, 4], lambda a, b: a * b)),
      list(accumulate(["a", "b", "c"])))
print("permutations:", list(permutations([1, 2, 3])))
print("permutations r=2:", list(permutations("abc", 2)), len(list(permutations(range(4)))))
print("combinations:", list(combinations([1, 2, 3, 4], 2)), list(combinations("abc", 3)), list(combinations("ab", 3)))
print("combinations_with_replacement:", list(combinations_with_replacement("ab", 2)),
      len(list(combinations_with_replacement(range(3), 2))))
print("product:", list(product([1, 2], "ab")), list(product([0, 1], repeat=2)))
print("product of three:", len(list(product("ab", "cd", "ef"))), list(product("ab", [1], "x")))
print("zip_longest:", list(zip_longest([1, 2, 3], "ab")), list(zip_longest("ab", [1], fillvalue=0)),
      list(zip_longest([1], [2, 3], [4, 5, 6], fillvalue="-")))
print("pairwise:", list(pairwise([1, 2, 3, 4])), list(pairwise("ab")), list(pairwise([1])))
print("module prefix:", list(itertools.chain("ab", "c")), list(itertools.islice(itertools.count(3), 2)))
print("joined permutations:", ["".join(p) for p in permutations("abc")])
print("even pair sums:", [a + b for a, b in combinations([1, 2, 3, 4], 2) if (a + b) % 2 == 0])
print("differences:", [b - a for a, b in pairwise([1, 4, 9, 16])])
print("running max/total:", list(accumulate([2, 7, 1, 8], max)), list(accumulate([10, -3, 5]))[-1])
print("dice sums of 7:", [(a, b) for a, b in product(range(1, 7), repeat=2) if a + b == 7])
print("grid coords:", list(product(range(2), range(3))))
print("flatten with chain:", list(chain(*[[1, 2], [3], [4, 5]])))
print("round robin labels:", [f"{c}{n}" for n, c in zip(range(5), cycle("xy"))])
perms = permutations([1, 2])
print("iterators are single-use:", next(perms), list(perms), list(perms))
print("lengths:", len(list(combinations(range(5), 3))), len(list(permutations(range(4), 2))),
      len(list(product("ab", repeat=3))))
print("subsets:", [list(c) for r in range(3) for c in combinations("ab", r)])
print("sorted input gives sorted output:", list(combinations(sorted("cab"), 2)))
print("multiples of 3:", [x for x in islice(count(1), 10) if x % 3 == 0])
