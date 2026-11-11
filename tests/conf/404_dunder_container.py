# Container dunders: __len__ __bool__ __getitem__ __setitem__ __delitem__ __contains__ __iter__ __call__
class Playlist:
    def __init__(self, *songs):
        self._songs = list(songs)
    def __len__(self):
        return len(self._songs)
    def __getitem__(self, index):
        return self._songs[index]
    def __setitem__(self, index, value):
        self._songs[index] = value
    def __delitem__(self, index):
        del self._songs[index]
    def __contains__(self, song):
        return song.lower() in [s.lower() for s in self._songs]
    def __iter__(self):
        return iter(self._songs)
    def __repr__(self):
        return f"Playlist({self._songs})"
p = Playlist("Intro", "Verse", "Outro")
print("len:", len(p))
print("getitem:", p[0], p[-1])
p[1] = "Chorus"
print("setitem:", p)
del p[0]
print("delitem:", p, len(p))
print("contains:", "chorus" in p, "Intro" in p, "intro" not in p)
print("iter:", [s.upper() for s in p], list(p), sorted(p, reverse=True))
print("join/max/tuple:", ", ".join(p), max(p), tuple(p))
first, second = p
print("unpacking:", first, second)
print("truthiness via __len__:", bool(p), bool(Playlist()), "empty" if not Playlist() else "full")
try:
    p[10]
except IndexError:
    print("IndexError propagates from __getitem__")
class Matrix:
    def __init__(self, rows, cols):
        self.rows, self.cols = rows, cols
        self.cells = {}
    def __getitem__(self, pos):
        return self.cells.get(pos, 0)
    def __setitem__(self, pos, value):
        self.cells[pos] = value
    def __contains__(self, pos):
        return pos in self.cells
    def __len__(self):
        return self.rows * self.cols
m = Matrix(2, 3)
m[0, 1] = 5
m[1, 2] += 7
print("tuple index:", m[0, 1], m[1, 2], m[1, 1], (0, 1) in m, (1, 1) in m, len(m))
class Account:
    def __init__(self, balance):
        self.balance = balance
    def __bool__(self):
        return self.balance > 0
    def __len__(self):
        return 99
print("__bool__ wins over __len__:", bool(Account(0)), bool(Account(5)), len(Account(0)))
print("in conditions:", [("open" if Account(b) else "empty") for b in (0, 10)], not Account(0))
class Multiplier:
    def __init__(self, factor):
        self.factor = factor
        self.calls = 0
    def __call__(self, value, extra=0):
        self.calls += 1
        return value * self.factor + extra
triple = Multiplier(3)
print("__call__:", triple(5), triple(2, extra=1), triple.calls, callable(triple), callable(p))
print("callable object as function:", list(map(triple, [1, 2])), sorted([3, 1, 2], key=Multiplier(-1)))
