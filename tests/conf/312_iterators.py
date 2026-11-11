# Iterator protocol: iter(), next(), custom iterator classes
nums = [10, 20, 30]
it = iter(nums)
print("next:", next(it), next(it), next(it))
print("next default:", next(it, "empty"))
try:
    next(it)
except StopIteration:
    print("StopIteration when exhausted")
print("iter of str/tuple/dict/range:", next(iter("abc")), next(iter((7, 8))), next(iter({"k": 1})),
      next(iter(range(5, 9))))
it = iter(nums)
print("iterator is its own iterator:", iter(it) is it)
first = next(it)
print("rest after next:", first, list(it), list(it))
it = iter("abcdef")
print("partial consumption:", [next(it), next(it)], "".join(it))
letters = iter("xyz")
for ch in letters:
    if ch == "y":
        break
print("resume after break:", next(letters))
pairs = iter([1, 2, 3, 4, 5, 6])
print("zip of one iterator pairs items:", list(zip(pairs, pairs)))
class Countdown:
    def __init__(self, start):
        self.current = start
    def __iter__(self):
        return self
    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1
c = Countdown(3)
print("custom iterator:", next(c), list(c), list(c))
print("in for/sum/max:", [n for n in Countdown(4)], sum(Countdown(4)), max(Countdown(4)))
print("next default on custom:", next(Countdown(0), "done"))
class Deck:
    def __init__(self, cards):
        self.cards = cards
    def __iter__(self):
        return DeckIterator(self.cards)
class DeckIterator:
    def __init__(self, cards):
        self.cards = cards
        self.pos = 0
    def __iter__(self):
        return self
    def __next__(self):
        if self.pos >= len(self.cards):
            raise StopIteration
        self.pos += 1
        return self.cards[self.pos - 1]
deck = Deck(["A", "K", "Q"])
print("iterable with separate iterator:", list(deck), list(deck))
print("nested loops over the same iterable:", [a + b for a in deck for b in deck if a < b])
print("builtins accept it:", sorted(deck), ",".join(deck), "K" in deck, dict(enumerate(deck)))
a, b, c2 = deck
print("unpacking:", a, b, c2)
print("zip/enumerate with custom:", list(zip(Countdown(5), "ab")), list(enumerate(Countdown(2), start=1)))
print("map/filter are iterators:", next(map(str, nums)), next(filter(lambda n: n > 15, nums)))
m = map(lambda n: n * 2, nums)
print("map is single-use:", list(m), list(m))
r = reversed(nums)
print("reversed is an iterator:", next(r), list(r))
e = enumerate("ab")
print("enumerate is an iterator:", next(e), next(e), next(e, None))
