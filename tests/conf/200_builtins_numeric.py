# Numeric builtins: abs, min, max, sum, round, divmod, pow
print("abs:", abs(-5), abs(5), abs(-2.5), abs(0))
print("min/max args:", min(3, 1, 2), max(3, 1, 2), max(-1, -5), min(2.5, 1))
print("min/max iterable:", min([4, 2, 8]), max([4, 2, 8]), min("hello"), max("hello"), max((1, 5), (1, 3)))
print("min/max strings:", min(["pear", "apple", "fig"]), max(["pear", "apple", "fig"]))
print("with key:", min(["pear", "apple", "fig"], key=len), max(["pear", "apple", "fig"], key=len))
print("key with several args:", max(-7, 3, 5, key=abs), min(-7, 3, 5, key=abs))
print("first wins on ties:", max(["aa", "bb", "c"], key=len), min([(1, "x"), (1, "a")], key=lambda t: t[0]))
print("default:", min([], default=0), max([], default=None), max([], default="empty"), min([5], default=0))
print("of dict:", min({"b": 1, "a": 2}), max({"b": 1, "a": 2}.values()))
print("of generator:", max(n * n for n in range(-3, 3)), min(len(w) for w in ["ab", "c"]))
print("mixed int/float:", max(1, 2.5), min(1, 2.5), max(2, 2.0), max(2.0, 2))
try:
    max([])
except ValueError:
    print("max of empty raises ValueError")

print("sum:", sum([1, 2, 3]), sum([]), sum((1.5, 2.5)), sum(range(101)), sum({1, 2, 3}))
print("sum start:", sum([1, 2, 3], 10), sum([], 5), sum([0.5, 0.25], 1))
print("sum of bools/generator:", sum([True, True, False]), sum(n for n in range(5) if n % 2))
print("sum lists with start:", sum([[1], [2, 3]], []))
print("sum result types:", type(sum([1, 2])).__name__, type(sum([1, 2.0])).__name__, sum([0.5] * 4))
print("average:", sum([3, 4, 5]) / len([3, 4, 5]))

print("divmod:", divmod(17, 5), divmod(-17, 5), divmod(17, -5), divmod(5, 17), divmod(7.5, 2))
q, r = divmod(125, 60)
print("divmod unpack:", q, r, f"{q}h {r}m")
print("pow:", pow(2, 10), pow(2, -1), pow(2.0, 3), pow(-2, 3), pow(9, 0.5))
print("pow mod:", pow(2, 10, 1000), pow(3, 4, 5), pow(7, 100, 13), pow(2, 64, 10 ** 9 + 7))
print("pow vs **:", pow(3, 4) == 3 ** 4, pow(2, 100) == 2 ** 100)
print("round:", round(2.567, 1), round(2.5), round(3.5), round(-1.5), round(1234, -2), round(7))
print("round half to even:", [round(x) for x in [0.5, 1.5, 2.5, 3.5, -0.5]])
print("combined:", abs(min(-3, 2)), max(abs(x) for x in [-9, 4]), round(sum([1.25, 2.5]) / 2, 1))

nums = [4, -2, 9, 0, -7]
print("spread:", max(nums) - min(nums), "index of max:", nums.index(max(nums)))
print("clamp:", max(0, min(10, 15)), max(0, min(10, -5)), max(0, min(10, 7)))
print("second largest:", sorted(set(nums))[-2], "smallest abs:", min(nums, key=abs))
print("largest by custom key:", max(nums, key=lambda n: (n % 3, n)))
words = ["kiwi", "fig", "banana"]
print("longest/shortest:", max(words, key=len), min(words, key=len), max(len(w) for w in words))
print("argmax via enumerate:", max(enumerate(nums), key=lambda p: p[1]))
print("argmin via range:", min(range(len(nums)), key=lambda i: nums[i]))
print("min/max of tuples:", min([(2, "a"), (1, "z")]), max([(2, "a"), (2, "b")]))
print("sum of digits:", sum(int(d) for d in "90210"), "sum of lengths:", sum(map(len, words)))
print("result types:", type(pow(2, 2)).__name__, type(pow(2, -2)).__name__, type(abs(-1.0)).__name__,
      type(round(2.5)).__name__, type(divmod(7, 2)).__name__)
